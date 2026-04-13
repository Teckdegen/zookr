// Called when the game ends (user stops reel / countdown finishes).
// Bet was already confirmed on-chain before /api/game/start was called.
// This route fires the 2x payout from master → user's wallet if they won.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { readMasterBalance, payoutFromMaster } from '@/lib/onchain'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export async function POST(req: NextRequest) {
  const { session_id, pick, price_correct } = await req.json()

  if (!session_id) {
    return NextResponse.json({ error: 'Missing session_id' }, { status: 400 })
  }

  // ── Load session ──────────────────────────────────────────────────────────
  const { data: session } = await supabase
    .from('game_sessions').select('*')
    .eq('id', session_id).single()

  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

  // Idempotent — return stored result on double-submit
  if (session.status === 'complete') {
    return NextResponse.json({ result: session.result, payout: session.payout })
  }

  let result: 'win' | 'loss' = session.sequence_outcome

  // For expert_option (War Chart): sequence must say win AND price moved correctly.
  // If price didn't move in the right direction, it's always a loss regardless of sequence.
  if (session.game_type === 'expert_option') {
    if (!price_correct) result = 'loss'
  }
  const payout = session.bet_amount * 2
  let displayPrice: string | null = null
  let payoutTxHash: string | null = null

  // ── Final pool check ──────────────────────────────────────────────────────
  if (result === 'win') {
    const masterBalance = await readMasterBalance(session.token)
    if (masterBalance < payout) {
      result = 'loss'
      if (pick != null) {
        const pickNum = parseFloat(pick)
        if (!isNaN(pickNum)) {
          const decimals = pickNum < 0.01 ? 6 : pickNum < 1 ? 4 : 2
          displayPrice = (pickNum * 1.0001).toFixed(decimals)
        }
      }
    }
  }

  // ── Fire payout to user's wallet ──────────────────────────────────────────
  if (result === 'win') {
    try {
      // Get the user's connected wallet address
      const { data: user } = await supabase
        .from('users').select('wallet_address')
        .eq('id', session.user_id).single()

      if (user) {
        payoutTxHash = await payoutFromMaster(user.wallet_address, session.token, payout)
      }
    } catch (e) {
      console.error('[game/resolve] payout failed:', e)
      result = 'loss'
    }
  }

  // ── Mark complete ─────────────────────────────────────────────────────────
  await supabase.from('game_sessions').update({
    result,
    payout:         result === 'win' ? payout : 0,
    payout_tx_hash: payoutTxHash,
    status:         'complete',
  }).eq('id', session_id)

  await supabase.from('transactions').insert({
    user_id: session.user_id,
    type:    result === 'win' ? 'win' : 'bet',
    token:   session.token,
    amount:  result === 'win' ? payout : session.bet_amount,
    tx_hash: result === 'win' ? payoutTxHash : session.bet_tx_hash,
  })

  return NextResponse.json({
    result,
    payout:         result === 'win' ? payout : 0,
    bet_tx_hash:    session.bet_tx_hash,
    payout_tx_hash: payoutTxHash,
    display_price:  displayPrice,
  })
}
