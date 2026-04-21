'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppLayout } from '@/components/AppLayout'
import { SkullIcon } from '@/components/icons'
import { PvPLobby } from '@/components/PvPLobby'

export default function GoldRushPage() {
  const router = useRouter()
  const [lobbyId, setLobbyId] = useState<string | null>(null)
  const [gameData, setGameData] = useState<Record<string, unknown> | null>(null)
  const [isP1, setIsP1] = useState(false)
  const [roundIndex, setRoundIndex] = useState(0)
  const [mining, setMining] = useState(false)
  const [mined, setMined] = useState<number[]>([])
  const [resolving, setResolving] = useState(false)
  const [result, setResult] = useState<{ winner_username: string; payout_usd: number; game_data: Record<string, unknown> } | null>(null)

  function handleGameStart(id: string, data: Record<string, unknown>, p1: boolean) {
    setLobbyId(id); setGameData(data); setIsP1(p1); setRoundIndex(0); setMined([])
  }

  const rounds = gameData?.rounds as { p1: number; p2: number }[] | undefined

  async function handleMine() {
    if (!rounds || roundIndex >= rounds.length || mining) return
    setMining(true)
    await new Promise(r => setTimeout(r, 800))
    const round = rounds[roundIndex]
    const gold = isP1 ? round.p1 : round.p2
    setMined(prev => [...prev, gold])
    setRoundIndex(i => i + 1)
    setMining(false)

    if (roundIndex + 1 >= rounds.length) {
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
  }

  if (result && gameData) {
    const gd = result.game_data as { p1_total: number; p2_total: number; winner: string }
    const myTotal = isP1 ? gd.p1_total : gd.p2_total
    const theirTotal = isP1 ? gd.p2_total : gd.p1_total
    const iWon = (isP1 && gd.winner === 'p1') || (!isP1 && gd.winner === 'p2')
    return (
      <AppLayout active="play" fullBleed>
        <div className="min-h-screen bg-[#0A0806] flex flex-col items-center justify-center gap-6 px-6">
          <h1 className={`font-serif text-4xl font-bold ${iWon ? 'text-[#D4BF9A]' : 'text-[#DC143C]'}`}>
            {iWon ? 'VALHALLA' : 'DEFEATED'}
          </h1>
          <div className="flex gap-12 text-center">
            <div>
              <p className="font-mono text-[9px] text-[#7A6E58] mb-1">YOU</p>
              <p className="font-serif text-4xl text-[#D4BF9A]">⛏️ {myTotal}</p>
            </div>
            <div>
              <p className="font-mono text-[9px] text-[#7A6E58] mb-1">OPPONENT</p>
              <p className="font-serif text-4xl text-[#DC143C]">⛏️ {theirTotal}</p>
            </div>
          </div>
          <p className={`font-mono text-2xl ${iWon ? 'text-[#D4BF9A]' : 'text-[#7A6E58]'}`}>
            {iWon ? `+$${result.payout_usd.toFixed(2)}` : 'Lost stake'}
          </p>
          <button onClick={() => { setResult(null); setGameData(null); setLobbyId(null); setMined([]); setRoundIndex(0) }}
            className="mt-4 w-48 py-3 bg-[#DC143C] font-mono text-xs tracking-widest text-[#D4BF9A] hover:bg-[#B01030] transition-colors">
            MINE AGAIN
          </button>
        </div>
      </AppLayout>
    )
  }

  if (lobbyId && gameData) {
    const total = mined.reduce((a, b) => a + b, 0)
    return (
      <AppLayout active="play" fullBleed>
        <div className="min-h-screen bg-[#0A0806] flex flex-col items-center justify-center gap-8 px-6">
          <SkullIcon size={40} className="text-[#DC143C]" />
          <h2 className="font-serif text-3xl text-[#D4BF9A]">GOLD RUSH</h2>
          <p className="font-mono text-[10px] text-[#7A6E58]">Round {roundIndex} / 5 — Total: <span className="text-[#D4BF9A]">⛏️ {total}</span></p>
          <div className="flex gap-2">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className={`w-12 h-16 border flex items-center justify-center font-serif text-lg transition-all ${
                i < mined.length ? 'border-[#D4BF9A] text-[#D4BF9A] bg-[#D4BF9A]/10' : 'border-[#2E2618] text-[#2E2618]'
              }`}>
                {i < mined.length ? mined[i] : '?'}
              </div>
            ))}
          </div>
          {mining && <p className="font-mono text-[10px] text-[#DC143C] animate-pulse">MINING...</p>}
          {roundIndex < 5 && (
            <button onClick={handleMine} disabled={mining || resolving}
              className="w-48 py-4 bg-[#DC143C] font-mono text-sm tracking-widest text-[#D4BF9A] hover:bg-[#B01030] disabled:opacity-50 transition-colors">
              {mining ? 'MINING...' : resolving ? 'RESOLVING...' : 'MINE'}
            </button>
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
          <p className="font-mono text-[9px] text-[#7A6E58] tracking-widest uppercase">Gold Rush</p>
          <span className="font-mono text-[9px] text-[#2E2618]">·</span>
          <p className="font-mono text-[9px] text-[#7A6E58]">Mine the most, win all</p>
        </div>
        <div className="flex-1 flex items-center justify-center bg-[#0A0806]">
          <PvPLobby gameType="gold-rush" gameTitle="GOLD RUSH" onGameStart={handleGameStart} />
        </div>
      </div>
    </AppLayout>
  )
}
