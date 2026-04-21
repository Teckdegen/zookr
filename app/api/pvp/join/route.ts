import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { publicClient } from '@/lib/onchain'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// ── Game data generators ──────────────────────────────────────────────────────

function r(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function generateGameData(game_type: string): Record<string, unknown> {
  switch (game_type) {
    case 'token-duel': {
      const p1 = r(1, 100)
      const p2 = r(1, 100)
      return { p1_number: p1, p2_number: p2, winner: p1 > p2 ? 'p1' : p2 > p1 ? 'p2' : 'p1' }
    }
    case 'death-race': {
      return { winning_horse: r(1, 5) }
    }
    case 'ghost-dice': {
      const p1 = r(1, 6)
      const p2 = r(1, 6)
      return { p1_roll: p1, p2_roll: p2, winner: p1 > p2 ? 'p1' : p2 > p1 ? 'p2' : 'tie' }
    }
    case 'bone-raffle': {
      return { winner: r(0, 1) === 0 ? 'p1' : 'p2', pick: r(1, 100) }
    }
    case 'dead-mans-draw': {
      function deal() {
        const cards = [r(1,10), r(1,10), r(1,10)]
        const total = cards.reduce((a,b) => a+b, 0)
        return { cards, total }
      }
      const p1 = deal(); const p2 = deal()
      const winner = p1.total <= 21 && p2.total <= 21
        ? (p1.total >= p2.total ? 'p1' : 'p2')
        : p1.total > 21 ? 'p2' : 'p1'
      return { p1_cards: p1.cards, p2_cards: p2.cards, p1_total: p1.total, p2_total: p2.total, winner }
    }
    case 'valhalla-roulette': {
      const spin = r(0, 35)
      return { spin_result: spin, winner: 'tbd' } // winner determined after picks
    }
    case 'warrior-dice': {
      const rounds = Array.from({length:3}, () => ({ p1: r(1,6), p2: r(1,6) }))
      const p1w = rounds.filter(ro => ro.p1 > ro.p2).length
      const p2w = rounds.filter(ro => ro.p2 > ro.p1).length
      return { rounds, p1_wins: p1w, p2_wins: p2w, winner: p1w >= p2w ? 'p1' : 'p2' }
    }
    case 'bone-crusher': {
      const moves = ['skull','shield','axe'] as const
      function beats(a: string, b: string) {
        return (a==='skull'&&b==='shield')||(a==='shield'&&b==='axe')||(a==='axe'&&b==='skull')
      }
      const rounds = Array.from({length:5}, () => {
        const p1m = moves[r(0,2)]; const p2m = moves[r(0,2)]
        const rw = beats(p1m,p2m) ? 'p1' : beats(p2m,p1m) ? 'p2' : 'tie'
        return { p1: p1m, p2: p2m, winner: rw }
      })
      const p1w = rounds.filter(ro => ro.winner==='p1').length
      const p2w = rounds.filter(ro => ro.winner==='p2').length
      return { rounds, winner: p1w >= p2w ? 'p1' : 'p2' }
    }
    case 'arena-duel': {
      let p1hp = 100; let p2hp = 100
      const rounds = []
      while (p1hp > 0 && p2hp > 0) {
        const p1dmg = r(10,30); const p2dmg = r(10,30)
        p1hp = Math.max(0, p1hp - p2dmg)
        p2hp = Math.max(0, p2hp - p1dmg)
        rounds.push({ p1_dmg: p1dmg, p2_dmg: p2dmg, p1_hp: p1hp, p2_hp: p2hp })
        if (rounds.length > 20) break
      }
      return { rounds, winner: p1hp > p2hp ? 'p1' : 'p2' }
    }
    case 'night-hunt': {
      const p1p = r(1,10); let p2p = r(1,10)
      if (p2p === p1p) p2p = p1p === 10 ? p1p - 1 : p1p + 1
      return { p1_pick: p1p, p2_pick: p2p, winner: p1p > p2p ? 'p1' : 'p2' }
    }
    case 'gold-rush': {
      const rounds = Array.from({length:5}, () => ({ p1: r(1,10), p2: r(1,10) }))
      const p1t = rounds.reduce((a,ro) => a+ro.p1, 0)
      const p2t = rounds.reduce((a,ro) => a+ro.p2, 0)
      return { rounds, p1_total: p1t, p2_total: p2t, winner: p1t >= p2t ? 'p1' : 'p2' }
    }
    case 'last-warrior': {
      const rounds: string[] = []
      let p1lives = 3; let p2lives = 3
      while (p1lives > 0 && p2lives > 0) {
        const loser = r(0,1) === 0 ? 'p1' : 'p2'
        rounds.push(loser)
        if (loser === 'p1') p1lives--; else p2lives--
        if (rounds.length > 10) break
      }
      return { rounds, p1_lives: p1lives, p2_lives: p2lives, winner: p1lives > 0 ? 'p1' : 'p2' }
    }
    case 'valhalla-draft': {
      const cards = Array.from({length:5}, () => r(1,13))
      const p1idx = [0,2,4]; const p2idx = [1,3]
      const p1score = p1idx.reduce((a,i) => a+cards[i], 0)
      const p2score = p2idx.reduce((a,i) => a+cards[i], 0)
      return { cards, p1_cards_idx: p1idx, p2_cards_idx: p2idx, winner: p1score >= p2score ? 'p1' : 'p2' }
    }
    case 'death-wheel': {
      const deg = r(720, 1440)
      // normalize final angle mod 360 into p1 (0-179) or p2 (180-359) half
      const final = deg % 360
      return { spin_degrees: deg, winner: final < 180 ? 'p1' : 'p2' }
    }
    default:
      return { winner: r(0,1) === 0 ? 'p1' : 'p2' }
  }
}

export async function POST(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.SUPABASE_SERVICE_KEY || 'placeholder'
  )

  const { lobby_id, wallet_address, username, bet_tx_hash } = await req.json()

  if (!lobby_id || !wallet_address || !bet_tx_hash) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  // Verify tx
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

  // Get lobby
  const { data: lobby } = await supabase
    .from('pvp_lobbies')
    .select('*')
    .eq('id', lobby_id)
    .single()

  if (!lobby) return NextResponse.json({ error: 'Lobby not found' }, { status: 404 })
  if (lobby.status !== 'waiting') return NextResponse.json({ error: 'Lobby not open' }, { status: 400 })
  if (lobby.p1_address === wallet_address.toLowerCase()) {
    return NextResponse.json({ error: 'Cannot join your own lobby' }, { status: 400 })
  }

  // Generate server-side game data
  const game_data = generateGameData(lobby.game_type)

  const { error } = await supabase
    .from('pvp_lobbies')
    .update({
      p2_address: wallet_address.toLowerCase(),
      p2_username: username || 'Warrior',
      p2_tx_hash: bet_tx_hash,
      status: 'playing',
      game_data,
    })
    .eq('id', lobby_id)

  if (error) return NextResponse.json({ error: 'Failed to join lobby' }, { status: 500 })

  return NextResponse.json({ lobby_id, game_data })
}
