'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppLayout } from '@/components/AppLayout'
import { SkullIcon } from '@/components/icons'
import { PvPLobby } from '@/components/PvPLobby'

export default function WarriorsDicePage() {
  const router = useRouter()
  const [lobbyId, setLobbyId] = useState<string | null>(null)
  const [gameData, setGameData] = useState<Record<string, unknown> | null>(null)
  const [isP1, setIsP1] = useState(false)
  const [resolving, setResolving] = useState(false)
  const [result, setResult] = useState<{ winner_username: string; payout_usd: number; game_data: Record<string, unknown> } | null>(null)

  function handleGameStart(id: string, data: Record<string, unknown>, p1: boolean) {
    setLobbyId(id); setGameData(data); setIsP1(p1)
  }

  async function handleResolve() {
    if (!lobbyId || resolving) return
    setResolving(true)
    const res = await fetch('/api/pvp/resolve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lobby_id: lobbyId }),
    })
    const data = await res.json()
    setResult(data)
    setResolving(false)
  }

  if (result && gameData) {
    const gd = result.game_data as { rounds: { p1: number; p2: number }[]; p1_wins: number; p2_wins: number; winner: string }
    const iWon = (isP1 && gd.winner === 'p1') || (!isP1 && gd.winner === 'p2')
    return (
      <AppLayout active="play" fullBleed>
        <div className="min-h-screen bg-[#0A0806] flex flex-col items-center justify-center gap-6 px-6">
          <h1 className={`font-serif text-4xl font-bold ${iWon ? 'text-[#D4BF9A]' : 'text-[#DC143C]'}`}>
            {iWon ? 'VALHALLA' : 'DEFEATED'}
          </h1>
          <div className="w-full max-w-xs space-y-2">
            {gd.rounds.map((r, i) => {
              const myRoll = isP1 ? r.p1 : r.p2
              const theirRoll = isP1 ? r.p2 : r.p1
              const won = myRoll > theirRoll
              return (
                <div key={i} className={`flex justify-between items-center px-4 py-2 border ${won ? 'border-[#D4BF9A]/40' : 'border-[#DC143C]/40'}`}>
                  <span className="font-mono text-[9px] text-[#7A6E58]">Round {i + 1}</span>
                  <span className={`font-mono text-sm ${won ? 'text-[#D4BF9A]' : 'text-[#DC143C]'}`}>{myRoll}</span>
                  <span className="font-mono text-[9px] text-[#7A6E58]">vs</span>
                  <span className={`font-mono text-sm ${!won ? 'text-[#D4BF9A]' : 'text-[#DC143C]'}`}>{theirRoll}</span>
                  <span className="font-mono text-[9px]">{won ? '✓' : '✗'}</span>
                </div>
              )
            })}
          </div>
          <p className="font-mono text-[10px] text-[#7A6E58]">
            You won {isP1 ? gd.p1_wins : gd.p2_wins} of 3 rounds
          </p>
          <p className={`font-mono text-2xl ${iWon ? 'text-[#D4BF9A]' : 'text-[#7A6E58]'}`}>
            {iWon ? `+$${result.payout_usd.toFixed(2)}` : 'Lost stake'}
          </p>
          <button onClick={() => { setResult(null); setGameData(null); setLobbyId(null) }}
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
          <h2 className="font-serif text-3xl text-[#D4BF9A]">WARRIOR&apos;S DICE</h2>
          <p className="font-mono text-[10px] text-[#7A6E58] text-center">3 rounds. Server rolls both dice.<br />Most rounds won wins.</p>
          <button onClick={handleResolve} disabled={resolving}
            className="w-48 py-4 bg-[#DC143C] font-mono text-sm tracking-widest text-[#D4BF9A] hover:bg-[#B01030] disabled:opacity-50 transition-colors">
            {resolving ? 'ROLLING...' : 'ROLL ALL 3'}
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
          <p className="font-mono text-[9px] text-[#7A6E58] tracking-widest uppercase">Warrior&apos;s Dice</p>
          <span className="font-mono text-[9px] text-[#2E2618]">·</span>
          <p className="font-mono text-[9px] text-[#7A6E58]">3 rolls, best total</p>
        </div>
        <div className="flex-1 flex items-center justify-center bg-[#0A0806]">
          <PvPLobby gameType="warrior-dice" gameTitle="WARRIOR'S DICE" onGameStart={handleGameStart} />
        </div>
      </div>
    </AppLayout>
  )
}
