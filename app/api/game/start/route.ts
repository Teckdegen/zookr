// Called after the user has signed + broadcast the bet transaction on the client.
// 1. Verifies the bet tx actually landed on-chain (master wallet received tokens)
// 2. Checks master wallet can cover a potential 2x payout
// 3. Consumes the next sequence outcome
// 4. Stores a pending session
// 5. Returns session_id + outcome so the client can animate the game

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateFullSequence, getNextResult } from '@/lib/sequence'
import { readMasterBalance, publicClient } from '@/lib/onchain'

// Vercel: allow up to 60s for on-chain tx confirmation
export const maxDuration = 60

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export async function POST(req: NextRequest) {
  const {
    wallet_address,    // user's connected wallet
    game_type,         // 'expert_option' | 'dead_price'
    token,             // 'DEAD' | 'UDEAD'
    bet_amount_usd,    // 1-5 — used for win-rate tier
    bet_amount_tokens, // actual token amount
    bet_tx_hash,       // tx hash the client already broadcast
  } = await req.json()

  if (!wallet_address || !game_type || !token || !bet_amount_usd || !bet_amount_tokens || !bet_tx_hash) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  if (bet_amount_usd < 1 || bet_amount_usd > 5) {
    return NextResponse.json({ error: 'Stake must be $1–$5' }, { status: 400 })
  }

  // ── Verify the bet tx confirmed on-chain ─────────────────────────────────
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
    return NextResponse.json({ error: 'Bet transaction not confirmed' }, { status: 400 })
  }

  // ── Get user ──────────────────────────────────────────────────────────────
  const { data: user } = await supabase
    .from('users').select('id')
    .eq('wallet_address', wallet_address.toLowerCase()).single()

  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  // ── Determine outcome from sequence ──────────────────────────────────────
  let { data: seq } = await supabase
    .from('win_sequences').select('*')
    .eq('user_id', user.id).single()

  if (!seq) {
    const sequence = generateFullSequence(bet_amount_usd, 200)
    const { data: newSeq } = await supabase
      .from('win_sequences')
      .insert({
        user_id:       user.id,
        sequence:      JSON.stringify(sequence),
        current_index: 0,
        deposit_tier:  bet_amount_usd,
        total_games:   0,
      })
      .select().single()
    seq = newSeq
  }

  const sequence = JSON.parse(seq.sequence)
  let outcome = getNextResult(sequence, seq.current_index)
  const payout = bet_amount_tokens * 2

  // Pre-check master wallet pool — force loss if pool can't cover payout
  if (outcome === 'win') {
    const masterBalance = await readMasterBalance(token)
    if (masterBalance < payout) {
      outcome = 'loss'
    }
  }

  // Consume sequence index atomically
  await supabase.from('win_sequences')
    .update({ current_index: seq.current_index + 1, total_games: seq.total_games + 1 })
    .eq('id', seq.id)

  // ── Store pending session ─────────────────────────────────────────────────
  const { data: session } = await supabase
    .from('game_sessions')
    .insert({
      user_id:          user.id,
      game_type,
      token,
      bet_amount:       bet_amount_tokens,
      bet_amount_usd,
      sequence_outcome: outcome,
      bet_tx_hash,
      result:           'pending',
      payout:           0,
      status:           'pending',
    })
    .select().single()

  return NextResponse.json({
    session_id: session?.id,
    outcome,
    // Always send real_price for dead_price so client can place it in the reel.
    // On a loss the client will snap past it — user sees a near-miss.
  })
}
