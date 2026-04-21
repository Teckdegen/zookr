'use client'

import Link from 'next/link'
import { AppLayout } from '@/components/AppLayout'
import { SkullIcon, SwordIcon, SkeletonHead, DiceIcon } from '@/components/icons'

type GameDef = {
  id: string
  title: string
  subtitle: string
  desc: string
  mode: 'solo' | 'pvp' | '1v1'
  players: string
  href: string
  live: boolean
  icon: React.ReactNode
}

const GAMES: GameDef[] = [
  // ── LIVE ─────────────────────────────────────────────────────────────────
  {
    id: 'coin-flip', title: 'COIN FLIP', subtitle: 'Heads or Tails',
    desc: 'Flip the skull. Land on your side and double your bet. House edge pays the winner.',
    mode: '1v1', players: '1 vs house', href: '/game/coin', live: true,
    icon: <SkeletonHead size={32} className="text-[#DC143C]" />,
  },
  {
    id: 'dead-price', title: 'DEAD PRICE', subtitle: 'Stop the reel',
    desc: 'A spinning reel of prices — stop it on the right number. One shot.',
    mode: 'solo', players: '1 vs house', href: '/game/price', live: true,
    icon: <SkullIcon size={32} className="text-[#DC143C]" />,
  },
  {
    id: 'war-rooms', title: 'WAR ROOMS', subtitle: 'Dice & Flash Price PvP',
    desc: 'Enter a room, stake tokens, outroll or outpick warriors. Winner takes 80% of pot.',
    mode: 'pvp', players: '2–6 players', href: '/rooms', live: true,
    icon: <SwordIcon size={32} className="text-[#DC143C]" />,
  },

  // ── Solo vs House ────────────────────────────────────────────────────────
  {
    id: 'skull-slots', title: 'SKULL SLOTS', subtitle: '3-reel fortune',
    desc: 'Three reels of skull symbols. Line up three skulls and claim the jackpot.',
    mode: 'solo', players: '1 vs house', href: '/game/slots', live: true,
    icon: <SkullIcon size={32} className="text-[#DC143C]" />,
  },
  {
    id: 'skull-scratch', title: 'SKULL SCRATCH', subtitle: 'Scratch your fate',
    desc: 'Scratch 6 panels — match 3 symbols and win. Instant result.',
    mode: 'solo', players: '1 vs house', href: '/game/scratch', live: true,
    icon: <SkullIcon size={32} className="text-[#DC143C]" />,
  },
  {
    id: 'war-ladder', title: 'WAR LADDER', subtitle: 'Climb or die',
    desc: 'A 10-step multiplier ladder. Cash out at any step or go all the way and risk it all.',
    mode: 'solo', players: '1 vs house', href: '/game/ladder', live: true,
    icon: <SwordIcon size={32} className="text-[#DC143C]" />,
  },

  // ── PvP (losers pay winners, house takes 20%) ────────────────────────────
  {
    id: 'token-duel', title: 'TOKEN DUEL', subtitle: '1v1 random draw',
    desc: 'Both players stake equal tokens. A random number is drawn for each — higher wins. Loser pays winner 80%.',
    mode: '1v1', players: '1v1', href: '/game/pvp/token-duel', live: true,
    icon: <SwordIcon size={32} className="text-[#DC143C]" />,
  },
  {
    id: 'death-race', title: 'DEATH RACE', subtitle: '5 horses, one winner',
    desc: '2–5 players each back a different horse. Server picks the winner at random — loser pool pays winner 80%.',
    mode: 'pvp', players: '2–5 players', href: '/game/pvp/death-race', live: true,
    icon: <SkullIcon size={32} className="text-[#DC143C]" />,
  },
  {
    id: 'ghost-dice', title: 'GHOST DICE', subtitle: 'Highest roll wins',
    desc: '2–4 warriors each roll. Highest total takes the pot. All losers pay the winner. House takes 20%.',
    mode: 'pvp', players: '2–4 players', href: '/game/pvp/ghost-dice', live: true,
    icon: <DiceIcon size={32} value={6} className="text-[#DC143C]" />,
  },
  {
    id: 'bone-raffle', title: 'BONE RAFFLE', subtitle: 'Lucky draw',
    desc: 'Buy in with tokens — all stakes go to pot. One random warrior wins 80% of everything.',
    mode: 'pvp', players: '2–10 players', href: '/game/pvp/bone-raffle', live: true,
    icon: <SkullIcon size={32} className="text-[#DC143C]" />,
  },
  {
    id: 'dead-mans-draw', title: "DEAD MAN'S DRAW", subtitle: 'Closest to 21 wins',
    desc: '2–4 players draw cards, aiming for 21. Go over and bust. Survivor closest to 21 takes the full pot.',
    mode: 'pvp', players: '2–4 players', href: '/game/pvp/dead-mans-draw', live: true,
    icon: <SkeletonHead size={32} className="text-[#DC143C]" />,
  },
  {
    id: 'valhalla-roulette', title: 'VALHALLA ROULETTE', subtitle: 'Spin the wheel',
    desc: '2–8 warriors each pick a number or colour. The server spins — winner collects the loser stakes.',
    mode: 'pvp', players: '2–8 players', href: '/game/pvp/valhalla-roulette', live: true,
    icon: <SkullIcon size={32} className="text-[#DC143C]" />,
  },
  {
    id: 'warrior-dice', title: "WARRIOR'S DICE", subtitle: '3 rolls, best total',
    desc: '1v1 — each warrior rolls three dice. Best total after 3 rounds wins. Loser pays winner 80%.',
    mode: '1v1', players: '1v1', href: '/game/pvp/warriors-dice', live: true,
    icon: <DiceIcon size={32} value={5} className="text-[#DC143C]" />,
  },
  {
    id: 'bone-crusher', title: 'BONE CRUSHER', subtitle: 'Skull, Shield, Axe',
    desc: 'Skull crushes Shield. Shield blocks Axe. Axe cuts Skull. Best of 5. Loser pays winner 80%.',
    mode: '1v1', players: '1v1', href: '/game/pvp/bone-crusher', live: true,
    icon: <SwordIcon size={32} className="text-[#DC143C]" />,
  },
  {
    id: 'arena-duel', title: 'ARENA DUEL', subtitle: 'Last warrior standing',
    desc: 'Enter the arena with HP. Each round deals random damage. First to reach 0 loses and pays the winner.',
    mode: '1v1', players: '1v1', href: '/game/pvp/arena-duel', live: true,
    icon: <SwordIcon size={32} className="text-[#DC143C]" />,
  },
  {
    id: 'night-hunt', title: 'NIGHT HUNT', subtitle: 'Hidden number duel',
    desc: '2–4 players each secretly pick 1–10. Unique picks only — if you share a number, you lose. Survivors split the pot.',
    mode: 'pvp', players: '2–4 players', href: '/game/pvp/night-hunt', live: true,
    icon: <SkeletonHead size={32} className="text-[#DC143C]" />,
  },
  {
    id: 'gold-rush', title: 'GOLD RUSH', subtitle: 'Mine the most, win all',
    desc: '4 warriors mine for gold across 5 rounds (RNG). Most gold at the end collects from all losers.',
    mode: 'pvp', players: '4 players', href: '/game/pvp/gold-rush', live: true,
    icon: <SkullIcon size={32} className="text-[#DC143C]" />,
  },
  {
    id: 'last-warrior', title: 'LAST WARRIOR', subtitle: 'Battle royale',
    desc: 'Up to 8 players enter. Each round eliminates one random warrior. Last one standing wins all stakes.',
    mode: 'pvp', players: '3–8 players', href: '/game/pvp/last-warrior', live: true,
    icon: <SwordIcon size={32} className="text-[#DC143C]" />,
  },
  {
    id: 'valhalla-draft', title: 'VALHALLA DRAFT', subtitle: 'Best hand wins',
    desc: '2–4 players draw from a shared deck. Highest unique card wins the round. Best of 5 rounds takes the pot.',
    mode: 'pvp', players: '2–4 players', href: '/game/pvp/valhalla-draft', live: true,
    icon: <SkeletonHead size={32} className="text-[#DC143C]" />,
  },
  {
    id: 'death-wheel', title: 'DEATH WHEEL', subtitle: '4 warriors, one spin',
    desc: '4 players each claim a quadrant of the wheel. It spins once. Whoever the needle lands on pays the other three.',
    mode: 'pvp', players: '4 players', href: '/game/pvp/death-wheel', live: true,
    icon: <SkullIcon size={32} className="text-[#DC143C]" />,
  },
]

const MODE_LABEL: Record<string, string> = {
  solo: 'Solo vs House',
  '1v1': '1 v 1',
  pvp: 'PvP',
}

export default function GamesPage() {
  const live   = GAMES.filter((g) => g.live)
  const pvp    = GAMES.filter((g) => !g.live && g.mode !== 'solo')
  const solo   = GAMES.filter((g) => !g.live && g.mode === 'solo')

  function Section({ title, games }: { title: string; games: GameDef[] }) {
    return (
      <div className="mb-12">
        <p className="font-mono text-[9px] tracking-[0.35em] text-[#7A6E58] uppercase mb-4">{title}</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-[#2E2618]">
          {games.map((g) => (
            g.live ? (
              <Link key={g.id} href={g.href}>
                <Card g={g} />
              </Link>
            ) : (
              <Card key={g.id} g={g} />
            )
          ))}
        </div>
      </div>
    )
  }

  return (
    <AppLayout active="play">
      <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-12 py-8">
        <div className="mb-8">
          <p className="font-mono text-[9px] tracking-[0.35em] text-[#7A6E58] uppercase mb-2">All Games</p>
          <h1 className="font-serif text-3xl md:text-4xl font-bold text-[#D4BF9A]">Choose your fate.</h1>
          <p className="font-mono text-[10px] text-[#7A6E58] mt-2">
            Losers always pay winners. House takes 20%. No mercy.
          </p>
        </div>

        <Section title="Live Now" games={live} />
        {pvp.length > 0 && <Section title="PvP — Losers Pay Winners (House 20%)" games={pvp} />}
        {solo.length > 0 && <Section title="Solo vs House" games={solo} />}
      </div>
    </AppLayout>
  )
}

function Card({ g }: { g: GameDef }) {
  return (
    <div className={`bg-[#1E1B14] p-5 flex flex-col gap-3 h-full
      ${g.live ? 'hover:bg-[#2E2618] cursor-pointer transition-all group border-t-2 border-t-[#DC143C]' : 'opacity-60'}`}>
      <div className="flex items-start justify-between">
        {g.icon}
        <div className="flex flex-col items-end gap-1">
          {g.live
            ? <span className="font-mono text-[8px] text-[#DC143C] border border-[#DC143C]/40 px-2 py-0.5 tracking-widest">LIVE</span>
            : <span className="font-mono text-[8px] text-[#7A6E58] border border-[#2E2618] px-2 py-0.5 tracking-widest">SOON</span>
          }
          <span className="font-mono text-[8px] text-[#7A6E58] tracking-wider">{MODE_LABEL[g.mode]}</span>
        </div>
      </div>
      <div>
        <p className={`font-serif text-lg font-bold mb-0.5 ${g.live ? 'text-[#D4BF9A] group-hover:text-white' : 'text-[#7A6E58]'}`}>
          {g.title}
        </p>
        <p className="font-mono text-[9px] text-[#DC143C] tracking-wider mb-2">{g.subtitle}</p>
        <p className="font-mono text-[10px] text-[#7A6E58] leading-relaxed">{g.desc}</p>
      </div>
      <div className="mt-auto flex items-center justify-between pt-3 border-t border-[#2E2618]">
        <span className="font-mono text-[9px] text-[#7A6E58]">{g.players}</span>
        {g.live && <span className="font-mono text-[9px] text-[#DC143C]">PLAY →</span>}
      </div>
    </div>
  )
}
