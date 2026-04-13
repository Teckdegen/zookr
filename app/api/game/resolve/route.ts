import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { readMasterBalance, payoutFromMaster } from '@/lib/onchain'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  // createClient inside handler — env vars only exist at runtime, not build time
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )

  const { session_id, pick, price_correct } = await req.json()
  if (!session_id) return NextResponse.json({ error: 'Missing session_id' }, { status: 400 })

  const { data: session } = await supabase
    .from('game_sessions').select('*').eq('id', session_id).single()
  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

  if (session.status === 'complete') {
    return NextResponse.json({ result: session.result, payout: session.payout })
  }

  let result: 'win' | 'loss' = session.sequence_outcome

  // War Chart: sequence win only pays if price actually moved the right direction
  if (session.game_type === 'expert_option' && !price_correct) result = 'loss'

  const payout = session.bet_amount * 2
  let displayPrice: string | null = null
  let payoutTxHash: string | null = null

  // Final pool check — master wallet must have enough to pay
  if (result === 'win') {
    const masterBalance = await readMasterBalance(session.token)
    if (masterBalance < payout) {
      result = 'loss'
      if (pick != null) {
        const n = parseFloat(pick)
        if (!isNaN(n)) {
          const dec = n < 0.01 ? 6 : n < 1 ? 4 : 2
          displayPrice = (n * 1.0001).toFixed(dec)
        }
      }
    }
  }

  // Fire payout to user's connected wallet
  if (result === 'win') {
    try {
      const { data: user } = await supabase
        .from('users').select('wallet_address').eq('id', session.user_id).single()
      if (user) {
        payoutTxHash = await payoutFromMaster(user.wallet_address, session.token, payout)
      }
    } catch (e) {
      console.error('[resolve] payout failed:', e)
      result = 'loss'
    }
  }

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
    payout_tx_hash: payoutTxHash,
    display_price:  displayPrice,
  })
}
