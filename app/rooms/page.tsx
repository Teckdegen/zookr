'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Ticker } from '@/components/Ticker'
import { AppLayout } from '@/components/AppLayout'
import { SkullIcon } from '@/components/icons'
import { SkeletonRoomCard } from '@/components/SkeletonChart'

type Room = { id: string; name: string; code: string; game_mode: string; status: string; max_players: number; stake_amount: number }

export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    const { data } = await supabase.from('rooms').select('*').eq('status', 'waiting').order('created_at', { ascending: false })
    setRooms(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
    const channel = supabase.channel('rooms-list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, load)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  return (
    <AppLayout active="rooms">
      <Ticker />

      <div className="max-w-4xl mx-auto px-4 md:px-8 py-6 md:py-10">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <SkullIcon size={16} className="text-[#DC143C]" />
            <h1 className="font-serif text-2xl md:text-3xl font-bold text-[#D4BF9A]">War Rooms</h1>
          </div>
          <Link href="/rooms/create">
            <button className="btn-blood py-2 px-4 text-[10px]">+ Open Room</button>
          </Link>
        </div>

        <p className="font-mono text-[9px] tracking-[0.3em] text-[#7A6E58] uppercase mb-4">
          Active Rooms
        </p>

        {loading ? (
          <div className="flex flex-col gap-px bg-[#2E2618]">
            {Array.from({ length: 4 }).map((_, i) => <SkeletonRoomCard key={i} />)}
          </div>
        ) : rooms.length === 0 ? (
          <div className="border border-[#2E2618] bg-[#1E1B14] p-16 text-center">
            <SkullIcon size={40} className="text-[#2E2618] mx-auto mb-4" />
            <p className="font-serif text-2xl text-[#7A6E58] mb-2">No rooms open.</p>
            <p className="font-mono text-[10px] text-[#7A6E58] mb-6">Be the first warrior to open one.</p>
            <Link href="/rooms/create">
              <button className="btn-blood">Open a Room</button>
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-px bg-[#2E2618]">
            {rooms.map((room) => (
              <Link key={room.id} href={`/rooms/${room.id}`}>
                <div className="bg-[#1E1B14] px-6 py-5 flex justify-between items-center hover:bg-[#2E2618] transition-colors cursor-pointer h-full">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="w-2 h-2 rounded-full bg-[#DC143C] animate-pulse shrink-0" />
                      <span className="font-mono text-sm text-[#D4BF9A]">{room.name}</span>
                    </div>
                    <div className="flex gap-4 ml-5">
                      <span className="font-mono text-[9px] text-[#7A6E58] uppercase tracking-widest">{room.game_mode}</span>
                      <span className="font-mono text-[9px] text-[#7A6E58]">Stake ${room.stake_amount}</span>
                      <span className="font-mono text-[9px] text-[#7A6E58]">{room.max_players} max</span>
                    </div>
                  </div>
                  <span className="font-mono text-[9px] text-[#DC143C] tracking-widest">JOIN →</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
