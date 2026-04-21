// Run in Supabase SQL editor:
// CREATE TABLE pvp_lobbies (
//   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
//   game_type TEXT NOT NULL,
//   status TEXT DEFAULT 'waiting',
//   p1_user_id TEXT, p1_address TEXT, p1_username TEXT, p1_tx_hash TEXT,
//   p2_user_id TEXT, p2_address TEXT, p2_username TEXT, p2_tx_hash TEXT,
//   stake_usd DECIMAL, token TEXT DEFAULT 'DEAD',
//   winner_address TEXT, payout_tx_hash TEXT,
//   game_data JSONB DEFAULT '{}',
//   created_at TIMESTAMPTZ DEFAULT NOW()
// );

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { publicClient } from '@/lib/onchain'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.SUPABASE_SERVICE_KEY || 'placeholder'
  )

  const { game_type, wallet_address, username, stake_usd, token, bet_tx_hash } = await req.json()

  if (!game_type || !wallet_address || !stake_usd || !token || !bet_tx_hash) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  // Verify bet tx on-chain
  try {
    const receipt = await publicClient.waitForTransactionReceipt({
      hash: bet_tx_hash as `0x${string}`,
      confirmations: 1,
      timeout: 60_000,
    })
    if (receipt.status !== 'success') {
      return NextResponse.json({ error: 'Bet transaction reverted' }, { status: 400 })
    }
  } catch {
    return NextResponse.json({ error: 'Bet transaction not confirmed in time' }, { status: 400 })
  }

  const { data: lobby, error } = await supabase
    .from('pvp_lobbies')
    .insert({
      game_type,
      status: 'waiting',
      p1_address: wallet_address.toLowerCase(),
      p1_username: username || 'Warrior',
      p1_tx_hash: bet_tx_hash,
      stake_usd,
      token,
      game_data: {},
    })
    .select()
    .single()

  if (error || !lobby) {
    return NextResponse.json({ error: 'Failed to create lobby' }, { status: 500 })
  }

  return NextResponse.json({ lobby_id: lobby.id })
}
