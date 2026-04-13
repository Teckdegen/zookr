'use client'

import { useState } from 'react'
import { useAccount } from 'wagmi'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type GameMode = 'dice' | 'flash_price'

function generateCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

export default function CreateRoomPage() {
  const { address } = useAccount()
  const router = useRouter()
  const [name, setName] = useState('')
  const [gameMode, setGameMode] = useState<GameMode>('dice')
  const [maxPlayers, setMaxPlayers] = useState<2 | 4 | 6>(4)
  const [stake, setStake] = useState(2)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!address || !name.trim()) return
    setLoading(true)
    setError('')

    const { data: user } = await supabase
      .from('users')
      .select('id, username')
      .eq('wallet_address', address.toLowerCase())
      .single()

    if (!user) { setError('User not found.'); setLoading(false); return }

    const code = generateCode()

    const { data: room, error: roomErr } = await supabase
      .from('rooms')
      .insert({
        name: name.trim(),
        code,
        host_user_id: user.id,
        game_mode: gameMode,
        status: 'waiting',
        max_players: maxPlayers,
        stake_amount: stake,
      })
      .select()
      .single()

    if (roomErr || !room) {
      setError('Could not create room.')
      setLoading(false)
      return
    }

    // Join as first member
    await supabase.from('room_members').insert({
      room_id: room.id,
      user_id: user.id,
      username: user.username,
    })

    router.push(`/rooms/${room.id}`)
  }

  return (
    <main className="min-h-screen bg-[#0A0806] flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <button
          onClick={() => router.back()}
          className="font-mono text-[9px] text-[#7A6E58] tracking-widest uppercase mb-8 hover:text-[#D4BF9A] transition-colors"
        >
          ← Back
        </button>

        <p className="font-mono text-[10px] tracking-[0.3em] text-[#7A6E58] uppercase mb-4">
          ☠ Open a War Room
        </p>
        <h1 className="font-serif text-4xl font-bold text-[#D4BF9A] mb-2">Name your</h1>
        <h1 className="font-serif text-4xl font-bold italic text-[#DC143C] mb-8">battlefield.</h1>

        <div className="w-8 h-[2px] bg-[#DC143C] mb-8" />

        <form onSubmit={handleCreate} className="flex flex-col gap-5">
          {/* Room name */}
          <input
            className="input-zookr"
            placeholder="Room name..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={30}
            required
          />

          {/* Game mode */}
          <div>
            <p className="font-mono text-[9px] text-[#7A6E58] tracking-widest uppercase mb-2">
              Game Mode
            </p>
            <div className="grid grid-cols-2 gap-px bg-[#2E2618]">
              {(['dice', 'flash_price'] as GameMode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setGameMode(m)}
                  className={`py-3 font-mono text-[10px] tracking-widest uppercase transition-colors ${
                    gameMode === m
                      ? 'bg-[#DC143C] text-[#D4BF9A]'
                      : 'bg-[#1E1B14] text-[#7A6E58] hover:text-[#D4BF9A]'
                  }`}
                >
                  {m === 'dice' ? '🎲 Dice' : '⚡ Flash Price'}
                </button>
              ))}
            </div>
          </div>

          {/* Max players */}
          <div>
            <p className="font-mono text-[9px] text-[#7A6E58] tracking-widest uppercase mb-2">
              Warriors (2, 4, or 6)
            </p>
            <div className="grid grid-cols-3 gap-px bg-[#2E2618]">
              {([2, 4, 6] as (2 | 4 | 6)[]).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setMaxPlayers(n)}
                  className={`py-3 font-mono text-sm tracking-widest transition-colors ${
                    maxPlayers === n
                      ? 'bg-[#DC143C] text-[#D4BF9A]'
                      : 'bg-[#1E1B14] text-[#7A6E58] hover:text-[#D4BF9A]'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Stake */}
          <div>
            <p className="font-mono text-[9px] text-[#7A6E58] tracking-widest uppercase mb-2">
              Stake Per Warrior
            </p>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStake(s)}
                  className={`flex-1 py-3 font-mono text-[10px] border transition-colors ${
                    stake === s
                      ? 'border-[#DC143C] text-[#DC143C] bg-[#DC143C]/10'
                      : 'border-[#2E2618] text-[#7A6E58]'
                  }`}
                >
                  ${s}
                </button>
              ))}
            </div>
            <p className="font-mono text-[9px] text-[#7A6E58] mt-2">
              Pot: ${stake * maxPlayers} · Winner gets ${(stake * maxPlayers * 0.7).toFixed(2)}
            </p>
          </div>

          {error && (
            <p className="font-mono text-[10px] text-[#DC143C]">{error}</p>
          )}

          <button className="btn-filled" type="submit" disabled={loading || !name.trim()}>
            {loading ? 'Opening...' : 'Open Room'}
          </button>
        </form>
      </div>
    </main>
  )
}
