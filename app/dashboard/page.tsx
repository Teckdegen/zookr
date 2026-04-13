'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useAccount } from 'wagmi'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Ticker } from '@/components/Ticker'
import { AppLayout } from '@/components/AppLayout'
import { SkullIcon, SwordIcon } from '@/components/icons'
import { SkeletonBalance, SkeletonRoomCard } from '@/components/SkeletonChart'
import { usePriceFeed } from '@/hooks/usePriceFeed'

type Room = { id: string; name: string; game_mode: string; max_players: number; stake_amount: number }

export default function DashboardPage() {
  const { address, isConnected } = useAccount()
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [balance, setBalance] = useState({ dead: 0, udead: 0 })
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)

  // Live prices for USD conversion
  const deadFeed  = usePriceFeed('DEAD',  15000)
  const udeadFeed = usePriceFeed('UDEAD', 15000)
  const deadPrice  = deadFeed.price?.priceUsd  ?? 0
  const udeadPrice = udeadFeed.price?.priceUsd ?? 0
  const totalUsd   = balance.dead * deadPrice + balance.udead * udeadPrice

  useEffect(() => {
    if (!isConnected || !address) { router.push('/'); return }

    async function load() {
      const { data: user } = await supabase
        .from('users').select('username')
        .eq('wallet_address', address!.toLowerCase()).single()

      if (!user) { router.push('/onboard'); return }
      setUsername(user.username)

      // Real on-chain balance from connected wallet
      const balRes = await fetch(`/api/wallet/balance?wallet_address=${address}`)
      const balData = balRes.ok ? await balRes.json() : { dead: 0, udead: 0 }
      setBalance({ dead: balData.dead ?? 0, udead: balData.udead ?? 0 })

      const { data: roomData } = await supabase
        .from('rooms').select('*').eq('status', 'waiting')
        .order('created_at', { ascending: false }).limit(5)
      setRooms(roomData ?? [])
      setLoading(false)
    }

    load()
  }, [isConnected, address, router])

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0A0806] flex items-center justify-center">
        <div className="flex items-center gap-3">
          <SkullIcon size={16} className="text-[#DC143C] animate-pulse" />
          <p className="font-mono text-[10px] text-[#7A6E58] tracking-widest animate-pulse">ENTERING VALHALLA...</p>
        </div>
      </main>
    )
  }

  return (
    <AppLayout active="home">
      <Ticker />

      <div className="md:hidden border-b border-[#2E2618] px-6 py-4 flex justify-between items-center bg-[#1E1B14]">
        <div className="flex items-center gap-2">
          <SkullIcon size={16} className="text-[#DC143C]" />
          <span className="font-serif text-lg text-[#D4BF9A]">ZOOKR</span>
        </div>
        <span className="font-mono text-[10px] text-[#7A6E58]">@{username}</span>
      </div>

      <div className="max-w-5xl mx-auto px-4 md:px-8 py-6 md:py-10">
        <div className="grid md:grid-cols-3 gap-6">

          {/* Left col */}
          <div className="md:col-span-1 flex flex-col gap-4">

            {/* Wallet balance card */}
            <div className="border border-[#2E2618] bg-[#1E1B14] p-6 relative overflow-hidden">
              {/* Top accent line */}
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#DC143C] via-[#8B0000] to-transparent" />

              <p className="font-mono text-[9px] tracking-[0.3em] text-[#7A6E58] uppercase mb-1">Wallet Balance</p>
              <p className="font-mono text-[9px] text-[#7A6E58] mb-4">
                {address?.slice(0, 6)}...{address?.slice(-4)}
              </p>

              {loading ? <SkeletonBalance /> : (
                <>
                  {/* USD total */}
                  <div className="mb-5">
                    <p className="font-serif text-4xl font-bold text-[#D4BF9A] leading-none">
                      ${totalUsd > 0 ? totalUsd.toFixed(2) : '—'}
                    </p>
                    <p className="font-mono text-[9px] text-[#7A6E58] mt-1">USD value</p>
                  </div>

                  {/* Token breakdown */}
                  <div className="flex flex-col gap-2 pt-4 border-t border-[#2E2618]">
                    <div className="flex justify-between items-center">
                      <span className="font-mono text-[10px] text-[#7A6E58]">$DEAD</span>
                      <div className="text-right">
                        <span className="font-mono text-sm text-[#D4BF9A]">
                          {balance.dead.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </span>
                        {deadPrice > 0 && (
                          <span className="font-mono text-[9px] text-[#7A6E58] ml-2">
                            ≈ ${(balance.dead * deadPrice).toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-mono text-[10px] text-[#7A6E58]">$UDEAD</span>
                      <div className="text-right">
                        <span className="font-mono text-sm text-[#D4BF9A]">
                          {balance.udead.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </span>
                        {udeadPrice > 0 && (
                          <span className="font-mono text-[9px] text-[#7A6E58] ml-2">
                            ≈ ${(balance.udead * udeadPrice).toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Game modes */}
            <div>
              <p className="font-mono text-[9px] tracking-[0.3em] text-[#7A6E58] uppercase mb-3">Choose Your Fate</p>
              <div className="grid grid-cols-2 md:grid-cols-1 gap-px bg-[#2E2618]">
                <Link href="/game/price">
                  <div className="bg-[#1E1B14] p-5 flex items-center gap-3 hover:bg-[#2E2618] transition-colors cursor-pointer">
                    <SkullIcon size={24} className="text-[#DC143C] shrink-0" />
                    <div>
                      <p className="font-serif text-base font-bold text-[#D4BF9A]">DEAD PRICE</p>
                      <p className="font-mono text-[9px] text-[#7A6E58]">Stop the reel</p>
                    </div>
                  </div>
                </Link>
                <Link href="/game/coin">
                  <div className="bg-[#1E1B14] p-5 flex items-center gap-3 hover:bg-[#2E2618] transition-colors cursor-pointer">
                    <SwordIcon size={24} className="text-[#DC143C] shrink-0" />
                    <div>
                      <p className="font-serif text-base font-bold text-[#D4BF9A]">COIN FLIP</p>
                      <p className="font-mono text-[9px] text-[#7A6E58]">Heads or tails</p>
                    </div>
                  </div>
                </Link>
                <Link href="/game/chart">
                  <div className="bg-[#1E1B14] p-5 flex items-center gap-3 hover:bg-[#2E2618] transition-colors cursor-pointer opacity-60">
                    <SwordIcon size={24} className="text-[#7A6E58] shrink-0" />
                    <div>
                      <p className="font-serif text-base font-bold text-[#7A6E58]">WAR CHART</p>
                      <p className="font-mono text-[9px] text-[#7A6E58]">🔒 Private access</p>
                    </div>
                  </div>
                </Link>
              </div>
            </div>
          </div>

          {/* Right col — war rooms */}
          <div className="md:col-span-2">
            <div className="flex justify-between items-center mb-3">
              <p className="font-mono text-[9px] tracking-[0.3em] text-[#7A6E58] uppercase">War Rooms</p>
              <Link href="/rooms/create">
                <button className="font-mono text-[9px] text-[#DC143C] tracking-widest uppercase hover:underline flex items-center gap-1">
                  <SkullIcon size={10} />+ Open Room
                </button>
              </Link>
            </div>

            <div className="flex flex-col gap-px bg-[#2E2618]">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => <SkeletonRoomCard key={i} />)
              ) : rooms.length === 0 ? (
                <div className="bg-[#1E1B14] px-6 py-12 text-center">
                  <SkullIcon size={32} className="text-[#2E2618] mx-auto mb-4" />
                  <p className="font-mono text-[10px] text-[#7A6E58] tracking-wide mb-4">No rooms open. Be the first warrior.</p>
                  <Link href="/rooms/create">
                    <button className="btn-blood">Open a Room</button>
                  </Link>
                </div>
              ) : (
                rooms.map((room) => (
                  <Link key={room.id} href={`/rooms/${room.id}`}>
                    <div className="bg-[#1E1B14] px-6 py-4 flex justify-between items-center hover:bg-[#2E2618] transition-colors cursor-pointer">
                      <div className="flex items-center gap-3">
                        <span className="w-2 h-2 rounded-full bg-[#DC143C] shrink-0 animate-pulse" />
                        <div>
                          <p className="font-mono text-sm text-[#D4BF9A]">{room.name}</p>
                          <p className="font-mono text-[9px] text-[#7A6E58] mt-0.5">
                            {room.game_mode} · ${room.stake_amount} stake
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        <span className="font-mono text-[9px] text-[#7A6E58] hidden sm:block">{room.max_players} max</span>
                        <span className="font-mono text-[9px] text-[#DC143C] tracking-widest">→</span>
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
