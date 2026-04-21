'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppLayout } from '@/components/AppLayout'
import { SkullIcon } from '@/components/icons'
import { PvPLobby } from '@/components/PvPLobby'

const HORSES = ['🐴', '🐴', '🐴', '🐴', '🐴']

export default function DeathRacePage() {
  const router = useRouter()
  const [lobbyId, setLobbyId] = useState<string | null>(null)
  const [gameData, setGameData] = useState<Record<string, unknown> | null>(null)
  const [isP1, setIsP1] = useState(false)
  const [myPick, setMyPick] = useState<number | null>(null)
  const [resolving, setResolving] = useState(false)
  const [racing, setRacing] = useState(false)
  const [result, setResult] = useState<{ winner_username: string; payout_usd: number; game_data: Record<string, unknown> } | null>(null)

  function handleGameStart(id: string, data: Record<string, unknown>, p1: boolean) {
    setLobbyId(id); setGameData(data); setIsP1(p1)
  }

  async function handleRace() {
    if (!lobbyId || myPick === null) return
    setRacing(true)
    await new Promise(r => setTimeout(r, 2000))
    setRacing(false)
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
    const gd = result.game_data as { winning_horse: number; winner: string }
    const iWon = (isP1 && gd.winner === 'p1') || (!isP1 && gd.winner === 'p2')
    return (
      <AppLayout active="play" fullBleed>
        <div className="min-h-screen bg-[#0A0806] flex flex-col items-center justify-center gap-6 px-6">
          <h1 className={`font-serif text-4xl font-bold ${iWon ? 'text-[#D4BF9A]' : 'text-[#DC143C]'}`}>
            {iWon ? 'VALHALLA' : 'DEFEATED'}
          </h1>
          <div className="font-mono text-sm text-[#7A6E58] text-center space-y-2">
            <p className="text-4xl">{HORSES[gd.winning_horse - 1]} <span className="text-[#D4BF9A]">#{gd.winning_horse}</span></p>
            <p>Horse #{gd.winning_horse} wins the race!</p>
            <p>You picked: <span className="text-[#D4BF9A]">Horse #{myPick}</span></p>
          </div>
          <p className={`font-mono text-2xl ${iWon ? 'text-[#D4BF9A]' : 'text-[#7A6E58]'}`}>
            {iWon ? `+$${result.payout_usd.toFixed(2)}` : 'Lost stake'}
          </p>
          <button onClick={() => { setResult(null); setGameData(null); setLobbyId(null); setMyPick(null) }}
            className="mt-4 w-48 py-3 bg-[#DC143C] font-mono text-xs tracking-widest text-[#D4BF9A] hover:bg-[#B01030] transition-colors">
            RACE AGAIN
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
          <h2 className="font-serif text-3xl text-[#D4BF9A]">DEATH RACE</h2>
          {!myPick ? (
            <>
              <p className="font-mono text-[10px] text-[#7A6E58] tracking-widest">PICK YOUR HORSE</p>
              <div className="flex gap-4">
                {HORSES.map((_, i) => (
                  <button key={i} onClick={() => setMyPick(i + 1)}
                    className="w-16 h-16 border border-[#2E2618] hover:border-[#DC143C] flex flex-col items-center justify-center gap-1 transition-colors">
                    <span className="text-2xl">{HORSES[i]}</span>
                    <span className="font-mono text-[9px] text-[#7A6E58]">#{i + 1}</span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <p className="font-mono text-[10px] text-[#7A6E58]">
                You picked: <span className="text-[#D4BF9A]">Horse #{myPick}</span>
              </p>
              {racing ? (
                <div className="flex gap-2 animate-pulse">
                  {HORSES.map((h, i) => (
                    <span key={i} className="text-3xl"
                      style={{ transform: `translateX(${Math.random() * 20}px)`, transition: 'transform 0.2s' }}>
                      {h}
                    </span>
                  ))}
                </div>
              ) : null}
              <button onClick={handleRace} disabled={racing || resolving}
                className="w-48 py-4 bg-[#DC143C] font-mono text-sm tracking-widest text-[#D4BF9A] hover:bg-[#B01030] disabled:opacity-50 transition-colors">
                {racing ? 'RACING...' : resolving ? 'RESOLVING...' : 'START RACE'}
              </button>
            </>
          )}
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
          <p className="font-mono text-[9px] text-[#7A6E58] tracking-widest uppercase">Death Race</p>
          <span className="font-mono text-[9px] text-[#2E2618]">·</span>
          <p className="font-mono text-[9px] text-[#7A6E58]">5 horses, one winner</p>
        </div>
        <div className="flex-1 flex items-center justify-center bg-[#0A0806]">
          <PvPLobby gameType="death-race" gameTitle="DEATH RACE" onGameStart={handleGameStart} />
        </div>
      </div>
    </AppLayout>
  )
}
