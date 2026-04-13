import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateFullSequence, getNextResult } from '@/lib/sequence'

export const dynamic = 'force-dynamic'

// Peeks at the next outcome without consuming it — Dead Price uses this
// to decide whether to include the real price in the reel before the user bets.
export async function POST(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )

  const { wallet_address, bet_amount_usd } = await req.json()
  if (!wallet_address) return NextResponse.json({ outcome: 'loss' })

  const { data: user } = await supabase
    .from('users').select('id')
    .eq('wallet_address', wallet_address.toLowerCase()).single()
  if (!user) return NextResponse.json({ outcome: 'loss' })

  let { data: seq } = await supabase.from('win_sequences').select('*').eq('user_id', user.id).single()

  if (!seq) {
    const sequence = generateFullSequence(bet_amount_usd ?? 1, 200)
    const { data: newSeq } = await supabase
      .from('win_sequences')
      .insert({ user_id: user.id, sequence: JSON.stringify(sequence), current_index: 0, deposit_tier: bet_amount_usd ?? 1, total_games: 0 })
      .select().single()
    seq = newSeq
  }

  const outcome = getNextResult(JSON.parse(seq.sequence), seq.current_index)
  return NextResponse.json({ outcome })
}
