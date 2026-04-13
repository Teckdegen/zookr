import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { fetchTokenPrice } from '@/lib/priceFeed'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

const DEAD_ADDRESS  = process.env.NEXT_PUBLIC_DEAD_TOKEN_ADDRESS  || ''
const UDEAD_ADDRESS = process.env.NEXT_PUBLIC_UDEAD_TOKEN_ADDRESS || ''

export async function POST(req: NextRequest) {
  const { round_id, user_id, pick, token } = await req.json()

  if (!round_id || !user_id || !pick) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  await supabase.from('room_round_entries').insert({
    round_id,
    user_id,
    pick: pick.toString(),
    result: 'pending',
  })

  const { data: round } = await supabase
    .from('room_rounds').select('*').eq('id', round_id).single()

  const { data: entries } = await supabase
    .from('room_round_entries').select('*').eq('round_id', round_id)

  if (!round || !entries) return NextResponse.json({ waiting: true })
  if (entries.length < round.player_count) return NextResponse.json({ waiting: true })

  // All players in — determine winner
  let winnerId: string | null = null
  let winnerPick = ''

  if (round.game_type === 'flash_price') {
    const tokenAddress = token === 'UDEAD' ? UDEAD_ADDRESS : DEAD_ADDRESS
    const priceData = await fetchTokenPrice(tokenAddress)
    const realPrice = priceData?.priceUsd ?? 0

    let closestDiff = Infinity
    for (const entry of entries) {
      const diff = Math.abs(parseFloat(entry.pick) - realPrice)
      if (diff < closestDiff) {
        closestDiff = diff
        winnerId = entry.user_id
        winnerPick = entry.pick
      }
    }
  } else {
    // Dice: highest roll wins
    let bestRoll = -1
    for (const entry of entries) {
      const val = parseInt(entry.pick)
      if (val > bestRoll) {
        bestRoll = val
        winnerId = entry.user_id
        winnerPick = entry.pick
      }
    }
  }

  if (!winnerId) return NextResponse.json({ waiting: true })

  const { data: winnerUser } = await supabase
    .from('users').select('username').eq('id', winnerId).single()

  const winnerUsername = winnerUser?.username ?? 'Unknown'
  const payout = round.winner_payout
  const usedToken = token === 'UDEAD' ? 'UDEAD' : 'DEAD'

  await supabase.from('room_rounds')
    .update({ status: 'complete', winner_id: winnerId })
    .eq('id', round_id)

  for (const entry of entries) {
    await supabase.from('room_round_entries')
      .update({ result: entry.user_id === winnerId ? 'win' : 'loss' })
      .eq('id', entry.id)

    await supabase.from('transactions').insert({
      user_id: entry.user_id,
      type:    entry.user_id === winnerId ? 'room_win' : 'room_loss',
      token:   usedToken,
      amount:  entry.user_id === winnerId ? payout : round.stake_amount,
    })
  }

  const { data: roomData } = await supabase
    .from('room_rounds').select('room_id').eq('id', round_id).single()

  if (roomData) {
    await supabase.channel(`room:${roomData.room_id}`).send({
      type: 'broadcast',
      event: 'round_result',
      payload: {
        winner_id:       winnerId,
        winner_username: winnerUsername,
        winner_pick:     winnerPick,
        payout,
      },
    })
  }

  return NextResponse.json({ result: 'complete', winner_id: winnerId, winner_username: winnerUsername })
}
