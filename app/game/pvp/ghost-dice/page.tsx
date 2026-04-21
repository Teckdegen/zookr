'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppLayout } from '@/components/AppLayout'
import { SkullIcon } from '@/components/icons'
import { PvPLobby } from '@/components/PvPLobby'

function DiceFace({ value, spinning }: { value: number; spinning: boolean }) {
  const dots = Array.from({ length: value })
  return (
    <div className={`w-24 h-24 border-2 rounded bg-[#0A0806] flex items-center justify-center ${spinning ? 'border-[#DC143C] animate-pulse' : 'border-[#D4BF9A]'}`}>
      {spinning ? (
        <span className="font-serif text-4xl text-[#DC143C]">?</span>
      ) : (
        <div className="grid grid-cols-3 gap-1 p-2 w-full h-full">
          {dots.map((_, i) => (
            <div key={i} className="w-2 h-2 rounded-full bg-[#D4BF9A] mx-auto" />
          ))}
        </div>
      )}
    </div>
  )
}

export default function GhostDicePage() {
  const router = useRouter()
  const [lobbyId, setLobbyId] = useState<string | null>(null)
  const [gameData, setGameData] = useState<Record<string, unknown> | null>(null)
  const [isP1, setIsP1] = useState(false)
  const [rolling, setRolling] = useState(false)
  const [resolving, setResolving] = useState(false)
  const [displayRoll, setDisplayRoll] = useState(6)
  const [result, setResult] = useState<{ winner_username: string; payout_usd: number; game_data: Record<string, unknown> } | null>(null)

  function handleGameStart(id: string, data: Record<string, unknown>, p1: boolean) {
    setLobbyId(id); setGameData(data); setIsP1(p1)
  }

  async function handleRoll() {
    if (!lobbyId || rolling || resolving) return
    setRolling(true)
    const interval = setInterval(() => setDisplayRoll(Math.floor(Math.random() * 6) + 1), 100)
    await new Promise(r => setTimeout(r, 1500))
    clearInterval(interval)
    setRolling(false)
    setResolving(true)
    const res = await fetch('/api/pvp/resolve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lobby_id: lobbyId }),
    })
    const data = await res.json()
    const gd = data.game_data as { p1_roll: number; p2_roll: number }
    setDisplayRoll(isP1 ? gd.p1_roll : gd.p2_roll)
    setResult(data)
    setResolving(false)
  }

  if (result && gameData) {
    const gd = result.game_data as { p1_roll: number; p2_roll: number; winner: string }
    const myRoll = isP1 ? gd.p1_roll : gd.p2_roll
    const theirRoll = isP1 ? gd.p2_roll : gd.p1_roll
    const iWon = (isP1 && gd.winner === 'p1') || (!isP1 && gd.winner === 'p2')
    return (
      <AppLayout active="play" fullBleed>
        <div className="min-h-screen bg-[#0A0806] flex flex-col items-center justify-center gap-6 px-6">
          <h1 className={`font-serif text-4xl font-bold ${iWon ? 'text-[#D4BF9A]' : 'text-[#DC143C]'}`}>
            {iWon ? 'VALHALLA' : 'DEFEATED'}
          </h1>
          <div className="flex gap-8 items-center">
            <div className="text-center">
              <p className="font-mono text-[9px] text-[#7A6E58] mb-2">YOU</p>
              <DiceFace value={myRoll} spinning={false} />
              <p className="font-mono text-lg text-[#D4BF9A] mt-1">{myRoll}</p>
            </div>
            <p className="font-mono text-[#7A6E58]">vs</p>
            <div className="text-center">
              <p className="font-mono text-[9px] text-[#7A6E58] mb-2">OPPONENT</p>
              <DiceFace value={theirRoll} spinning={false} />
              <p className="font-mono text-lg text-[#DC143C] mt-1">{theirRoll}</p>
            </div>
          </div>
          <p className={`font-mono text-2xl ${iWon ? 'text-[#D4BF9A]' : 'text-[#7A6E58]'}`}>
            {iWon ? `+$${result.payout_usd.toFixed(2)}` : 'Lost stake'}
          </p>
          <button onClick={() => { setResult(null); setGameData(null); setLobbyId(null); setDisplayRoll(6) }}
            className="mt-4 w-48 py-3 bg-[#DC143C] font-mono text-xs tracking-widest text-[#D4BF9A] hover:bg-[#B01030] transition-colors">
            ROLL AGAIN
          </button>
        </div>
      </AppLayout>
    )
  }

  if (lobbyId && gameData) {
    return (
      <AppLayout active="play" fullBleed>
        <div className="min-h-screen bg-[#0A0806] flex flex-col items-center justify-center gap-8 px-6">
          <SkullIcon size={40} className="text-[#DC143C]" />
          <h2 className="font-serif text-3xl text-[#D4BF9A]">GHOST DICE</h2>
          <DiceFace value={displayRoll} spinning={rolling} />
          <button onClick={handleRoll} disabled={rolling || resolving}
            className="w-48 py-4 bg-[#DC143C] font-mono text-sm tracking-widest text-[#D4BF9A] hover:bg-[#B01030] disabled:opacity-50 transition-colors">
            {rolling ? 'ROLLING...' : resolving ? 'RESOLVING...' : 'ROLL DICE'}
          </button>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout active="play" fullBleed>
      <div className="flex flex-col min-h-[calc(100vh-56px)]">
        <div className="px-4 md:px-6 py-3 border-b border-[#2E2618] bg-[#1E1B14] flex items-center gap-3">
          <button onClick={() => router.back()} className="font-mono text-[9px] text-[#7A6E58] mr-2">←</button>
          <SkullIcon size={14} className="text-[#7A6E58]" />
          <p className="font-mono text-[9px] text-[#7A6E58] tracking-widest uppercase">Ghost Dice</p>
          <span className="font-mono text-[9px] text-[#2E2618]">·</span>
          <p className="font-mono text-[9px] text-[#7A6E58]">Highest roll wins</p>
        </div>
        <div className="flex-1 flex items-center justify-center bg-[#0A0806]">
          <PvPLobby gameType="ghost-dice" gameTitle="GHOST DICE" onGameStart={handleGameStart} />
        </div>
      </div>
    </AppLayout>
  )
}
