// Run in Supabase SQL editor:
// CREATE TABLE pvp_lobbies (
//   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
//   game_type text NOT NULL,
//   status text DEFAULT 'waiting',
//   stake_usd numeric NOT NULL,
//   token text NOT NULL,
//   p1_address text, p1_username text, p1_tx_hash text,
//   p2_address text, p2_username text, p2_tx_hash text,
//   winner_address text, payout_tx_hash text,
//   game_data jsonb DEFAULT '{}',
//   created_at timestamptz DEFAULT now()
// );

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { payoutFromMaster } from '@/lib/onchain'
import { getTokenPricesUSD, usdToTokens } from '@/lib/tokenPrice'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.SUPABASE_SERVICE_KEY || 'placeholder'
  )

  const { lobby_id } = await req.json()
  if (!lobby_id) return NextResponse.json({ error: 'Missing lobby_id' }, { status: 400 })

  const { data: lobby } = await supabase
    .from('pvp_lobbies')
    .select('*')
    .eq('id', lobby_id)
    .single()

  if (!lobby) return NextResponse.json({ error: 'Lobby not found' }, { status: 404 })
  if (lobby.status === 'complete') {
    return NextResponse.json({
      winner_address: lobby.winner_address,
      payout_tx_hash: lobby.payout_tx_hash,
      game_data: lobby.game_data,
    })
  }

  const gameData = lobby.game_data as Record<string, unknown>
  const winner = gameData.winner as string // 'p1' or 'p2'

  const winnerAddress = winner === 'p1' ? lobby.p1_address : lobby.p2_address
  const winnerUsername = winner === 'p1' ? lobby.p1_username : lobby.p2_username

  // Payout: both staked stake_usd, house takes 20%, winner gets 80% of total pot
  const totalUsd = lobby.stake_usd * 2
  const payoutUsd = totalUsd * 0.8

  let payoutTxHash: string | null = null
  try {
    const prices = await getTokenPricesUSD()
    const tokenPrice = prices[lobby.token as 'DEAD' | 'UDEAD'] || 0
    if (tokenPrice > 0 && winnerAddress) {
      const payoutTokens = usdToTokens(payoutUsd, tokenPrice)
      payoutTxHash = await payoutFromMaster(winnerAddress, lobby.token as 'DEAD' | 'UDEAD', payoutTokens)
    }
  } catch (e) {
    console.error('[pvp/resolve] payout failed:', e)
  }

  await supabase
    .from('pvp_lobbies')
    .update({
      status: 'complete',
      winner_address: winnerAddress,
      payout_tx_hash: payoutTxHash,
    })
    .eq('id', lobby_id)

  return NextResponse.json({
    winner_address: winnerAddress,
    winner_username: winnerUsername,
    payout_tx_hash: payoutTxHash,
    game_data: gameData,
    payout_usd: payoutUsd,
  })
}
