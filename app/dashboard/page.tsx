'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useAccount } from 'wagmi'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Ticker } from '@/components/Ticker'
import { AppLayout } from '@/components/AppLayout'
import { SkullIcon, SwordIcon, SkeletonHead } from '@/components/icons'
import { SkeletonRoomCard } from '@/components/SkeletonChart'
import { usePriceFeed } from '@/hooks/usePriceFeed'

const SKULL_IMG = 'https://www.image2url.com/r2/default/images/1776122004235-7b55981b-e92b-4619-b49e-143bb1183ab0.png'

type Room = { id: string; name: string; game_mode: string; max_players: number; stake_amount: number }

const GAMES = [
  { href: '/game/price', label: 'DEAD PRICE',  sub: 'Stop the reel',  icon: <SkullIcon size={22} className="text-[#DC143C]" />,  locked: false },
  { href: '/game/coin',  label: 'COIN FLIP',   sub: 'Heads or tails', icon: <SkeletonHead size={22} className="text-[#DC143C]" />, locked: false },
  { href: '/game/chart', label: 'WAR CHART',   sub: 'Private access', icon: <SwordIcon size={22} className="text-[#7A6E58]" />,  locked: true  },
]

export default function DashboardPage() {
  const { address, isConnected } = useAccount()
  const router = useRouter()
  const [username, setUsername]   = useState('')
  const [balance, setBalance]     = useState({ dead: 0, udead: 0 })
  const [rooms, setRooms]         = useState<Room[]>([])
  const [loading, setLoading]     = useState(true)
  const [balLoading, setBalLoading] = useState(true)

  const deadFeed  = usePriceFeed('DEAD',  20000)
  const udeadFeed = usePriceFeed('UDEAD', 20000)
  const deadPrice  = deadFeed.price?.priceUsd  ?? 0
  const udeadPrice = udeadFeed.price?.priceUsd ?? 0
  const pricesReady = !deadFeed.loading && !udeadFeed.loading
  const totalUsd    = balance.dead * deadPrice + balance.udead * udeadPrice

  useEffect(() => {
    if (!isConnected || !address) { router.push('/'); return }
    async function load() {
      const { data: user } = await supabase.from('users').select('username')
        .eq('wallet_address', address!.toLowerCase()).single()
      if (!user) { router.push('/onboard'); return }
      setUsername(user.username)

      const balRes  = await fetch(`/api/wallet/balance?wallet_address=${address}`)
      const balData = balRes.ok ? await balRes.json() : { dead: 0, udead: 0 }
      setBalance({ dead: balData.dead ?? 0, udead: balData.udead ?? 0 })
      setBalLoading(false)

      const { data: roomData } = await supabase.from('rooms').select('*')
        .eq('status', 'waiting').order('created_at', { ascending: false }).limit(6)
      setRooms(roomData ?? [])
      setLoading(false)
    }
    load()
  }, [isConnected, address, router])

  if (loading && balLoading) {
    return (
      <main className="min-h-screen bg-[#0A0806] flex items-center justify-center">
        <div className="flex items-center gap-3">
          <SkullIcon size={16} className="text-[#DC143C] animate-pulse" />
          <p className="font-mono text-[10px] text-[#7A6E58] tracking-widest animate-pulse">ENTERING VALHALLA...</p>
        </div>
      </main>
    )
  }

  const usdDisplay = balLoading || !pricesReady
    ? '...'
    : `$${totalUsd.toFixed(2)}`

  return (
    <AppLayout active="home">
      <Ticker />

      {/* ── Mobile greeting bar ── */}
      <div className="md:hidden border-b border-[#2E2618] px-5 py-3 flex justify-between items-center bg-[#1E1B14]">
        <div className="flex items-center gap-2">
          <SkullIcon size={14} className="text-[#DC143C]" />
          <span className="font-serif text-base text-[#D4BF9A]">ZOOKR</span>
        </div>
        <span className="font-mono text-[10px] text-[#7A6E58]">@{username}</span>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-12 py-6 md:py-8 space-y-6">

        {/* ── TOP BANNER: balance + greeting ── */}
        <div className="relative overflow-hidden border border-[#2E2618] bg-[#1E1B14]">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#DC143C] via-[#8B0000] to-transparent" />

          {/* Skull watermark */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={SKULL_IMG} alt="" aria-hidden
            className="pointer-events-none select-none absolute right-0 top-0 h-full w-auto object-contain opacity-[0.05]" />

          <div className="relative px-6 md:px-10 py-6 md:py-8 flex flex-col md:flex-row md:items-center gap-6 md:gap-0">
            {/* Left: greeting + address */}
            <div className="flex-1">
              <p className="font-mono text-[9px] tracking-[0.35em] text-[#7A6E58] uppercase mb-1">Welcome back</p>
              <h2 className="font-serif text-2xl md:text-3xl font-bold text-[#D4BF9A]">@{username}</h2>
              <p className="font-mono text-[9px] text-[#7A6E58] mt-1">
                {address?.slice(0, 8)}...{address?.slice(-6)}
              </p>
            </div>

            {/* Divider */}
            <div className="hidden md:block w-px self-stretch bg-[#2E2618] mx-10" />

            {/* Center: total USD */}
            <div className="flex-1 md:text-center">
              <p className="font-mono text-[9px] tracking-[0.3em] text-[#7A6E58] uppercase mb-1">Portfolio Value</p>
              <p className={`font-serif text-4xl md:text-5xl font-bold text-[#D4BF9A] leading-none ${(balLoading || !pricesReady) ? 'animate-pulse' : ''}`}>
                {usdDisplay}
              </p>
              <p className="font-mono text-[9px] text-[#7A6E58] mt-1">USD</p>
            </div>

            {/* Divider */}
            <div className="hidden md:block w-px self-stretch bg-[#2E2618] mx-10" />

            {/* Right: token breakdown */}
            <div className="flex-1 flex flex-col gap-3">
              {[
                { sym: 'DEAD',  bal: balance.dead,  price: deadPrice,  loading: deadFeed.loading },
                { sym: 'UDEAD', bal: balance.udead, price: udeadPrice, loading: udeadFeed.loading },
              ].map(({ sym, bal, price, loading: pl }) => (
                <div key={sym} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full ${pl ? 'bg-[#7A6E58] animate-pulse' : 'bg-[#DC143C]'}`} />
                    <span className="font-mono text-[10px] text-[#7A6E58]">${sym}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-sm text-[#D4BF9A]">
                      {bal.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                    {price > 0 && (
                      <span className="font-mono text-[9px] text-[#7A6E58] ml-2">
                        @ ${price < 0.01 ? price.toFixed(6) : price.toFixed(4)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── MAIN GRID ── */}
        <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">

          {/* Game cards — 1 col on md, stays 1 col on lg */}
          <div className="md:col-span-1 flex flex-col gap-3">
            <p className="font-mono text-[9px] tracking-[0.35em] text-[#7A6E58] uppercase">Choose Your Fate</p>
            {GAMES.map((g) => (
              <Link key={g.href} href={g.href}>
                <div className={`border border-[#2E2618] bg-[#1E1B14] px-5 py-4 flex items-center gap-4
                  ${g.locked ? 'opacity-50 cursor-not-allowed' : 'hover:border-[#DC143C]/50 hover:bg-[#2E2618] transition-all cursor-pointer group'}`}>
                  <div className="shrink-0">{g.icon}</div>
                  <div>
                    <p className={`font-serif text-base font-bold ${g.locked ? 'text-[#7A6E58]' : 'text-[#D4BF9A] group-hover:text-white'}`}>{g.label}</p>
                    <p className="font-mono text-[9px] text-[#7A6E58]">{g.locked ? '🔒 ' : ''}{g.sub}</p>
                  </div>
                  {!g.locked && <span className="ml-auto font-mono text-[10px] text-[#DC143C] opacity-0 group-hover:opacity-100 transition-opacity">→</span>}
                </div>
              </Link>
            ))}

            {/* War Rooms quick link */}
            <Link href="/rooms">
              <div className="border border-[#2E2618] bg-[#1E1B14] px-5 py-4 flex items-center gap-4 hover:border-[#DC143C]/50 hover:bg-[#2E2618] transition-all cursor-pointer group">
                <SkullIcon size={22} className="text-[#DC143C] shrink-0" />
                <div>
                  <p className="font-serif text-base font-bold text-[#D4BF9A] group-hover:text-white">WAR ROOMS</p>
                  <p className="font-mono text-[9px] text-[#7A6E58]">PvP battle rooms</p>
                </div>
                <span className="ml-auto font-mono text-[10px] text-[#DC143C] opacity-0 group-hover:opacity-100 transition-opacity">→</span>
              </div>
            </Link>
          </div>

          {/* War Rooms list — 2 col on md, 3 col on lg */}
          <div className="md:col-span-2 lg:col-span-3 flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <p className="font-mono text-[9px] tracking-[0.35em] text-[#7A6E58] uppercase">Live War Rooms</p>
              <Link href="/rooms/create">
                <button className="font-mono text-[9px] text-[#DC143C] tracking-widest uppercase hover:underline flex items-center gap-1 border border-[#DC143C]/30 px-3 py-1.5 hover:bg-[#DC143C]/5 transition-colors">
                  <SkullIcon size={10} className="mr-1" />+ Open Room
                </button>
              </Link>
            </div>

            {loading ? (
              <div className="flex flex-col gap-px bg-[#2E2618]">
                {Array.from({ length: 4 }).map((_, i) => <SkeletonRoomCard key={i} />)}
              </div>
            ) : rooms.length === 0 ? (
              <div className="border border-[#2E2618] bg-[#1E1B14] px-6 py-16 text-center flex flex-col items-center gap-4">
                <SkullIcon size={40} className="text-[#2E2618]" />
                <p className="font-mono text-[10px] text-[#7A6E58] tracking-wide">No rooms open. Be the first warrior.</p>
                <Link href="/rooms/create">
                  <button className="btn-blood text-xs px-6 py-2">Open a Room</button>
                </Link>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-[#2E2618]">
                {rooms.map((room) => (
                  <Link key={room.id} href={`/rooms/${room.id}`}>
                    <div className="bg-[#1E1B14] px-5 py-4 flex flex-col gap-2 hover:bg-[#2E2618] transition-colors cursor-pointer h-full group">
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#DC143C] animate-pulse shrink-0" />
                        <p className="font-mono text-sm text-[#D4BF9A] truncate group-hover:text-white">{room.name}</p>
                      </div>
                      <div className="flex items-center justify-between mt-auto">
                        <p className="font-mono text-[9px] text-[#7A6E58] uppercase tracking-wider">
                          {room.game_mode === 'flash_price' ? 'Flash Price' : 'Dice'} · ${room.stake_amount}
                        </p>
                        <span className="font-mono text-[9px] text-[#7A6E58]">{room.max_players} max</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
