import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { payoutFromMaster } from '@/lib/onchain'
import { getTokenPricesUSD } from '@/lib/tokenPrice'

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
    // Already paid out — just return cached result
    return NextResponse.json({
      winner_address: lobby.winner_address,
      winner_username: lobby.winner_address === lobby.p1_address ? lobby.p1_username : lobby.p2_username,
      payout_tx_hash: lobby.payout_tx_hash,
    })
  }
  if (lobby.status !== 'playing') {
    return NextResponse.json({ error: 'Lobby not in playing state' }, { status: 400 })
  }

  const gd = lobby.game_data as Record<string, unknown>
  const rawWinner = gd?.winner as string | undefined

  // Determine winner address
  const winnerAddress = rawWinner === 'p1' ? lobby.p1_address : lobby.p2_address
  const winnerUsername = rawWinner === 'p1' ? lobby.p1_username : lobby.p2_username

  if (!winnerAddress) {
    return NextResponse.json({ error: 'Could not determine winner' }, { status: 500 })
  }

  // Calculate payout: (stake_usd * 2) * 0.8 tokens
  const prices = await getTokenPricesUSD()
  const token = (lobby.token as 'DEAD' | 'UDEAD') || 'DEAD'
  const tokenPrice = prices[token] || 0

  let payoutTxHash = 'pending'

  if (tokenPrice > 0) {
    const payoutUsd = (lobby.stake_usd * 2) * 0.8
    const payoutTokens = payoutUsd / tokenPrice

    try {
      payoutTxHash = await payoutFromMaster(winnerAddress, token, payoutTokens)
    } catch (e) {
      console.error('[pvp/result] payout failed:', e)
      payoutTxHash = 'failed'
    }
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
  })
}
