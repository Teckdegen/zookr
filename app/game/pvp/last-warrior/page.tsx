'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppLayout } from '@/components/AppLayout'
import { SkullIcon } from '@/components/icons'
import { PvPLobby } from '@/components/PvPLobby'

export default function LastWarriorPage() {
  const router = useRouter()
  const [lobbyId, setLobbyId] = useState<string | null>(null)
  const [gameData, setGameData] = useState<Record<string, unknown> | null>(null)
  const [isP1, setIsP1] = useState(false)
  const [roundIndex, setRoundIndex] = useState(0)
  const [eliminated, setEliminated] = useState<string[]>([])
  const [animating, setAnimating] = useState(false)
  const [resolving, setResolving] = useState(false)
  const [result, setResult] = useState<{ winner_username: string; payout_usd: number; game_data: Record<string, unknown> } | null>(null)

  function handleGameStart(id: string, data: Record<string, unknown>, p1: boolean) {
    setLobbyId(id); setGameData(data); setIsP1(p1); setRoundIndex(0); setEliminated([])
  }

  const rounds = gameData?.rounds as string[] | undefined

  async function handleNextRound() {
    if (!rounds || roundIndex >= rounds.length || animating) return
    setAnimating(true)
    await new Promise(r => setTimeout(r, 1000))
    const elim = rounds[roundIndex]
    setEliminated(prev => [...prev, elim])
    setRoundIndex(i => i + 1)
    setAnimating(false)

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

  const p1Alive = !eliminated.includes('p1')
  const p2Alive = !eliminated.includes('p2')

  if (result && gameData) {
    const gd = result.game_data as { winner: string }
    const iWon = (isP1 && gd.winner === 'p1') || (!isP1 && gd.winner === 'p2')
    return (
      <AppLayout active="play" fullBleed>
        <div className="min-h-screen bg-[#0A0806] flex flex-col items-center justify-center gap-6 px-6">
          <h1 className={`font-serif text-4xl font-bold ${iWon ? 'text-[#D4BF9A]' : 'text-[#DC143C]'}`}>
            {iWon ? 'LAST WARRIOR' : 'ELIMINATED'}
          </h1>
          <div className="flex gap-12 text-center">
            <div>
              <p className="font-mono text-[9px] text-[#7A6E58] mb-2">YOU</p>
              <span className={`text-5xl ${(isP1 ? p1Alive : p2Alive) ? '' : 'grayscale opacity-40'}`}>⚔️</span>
              <p className={`font-mono text-[9px] mt-1 ${(isP1 ? p1Alive : p2Alive) ? 'text-[#D4BF9A]' : 'text-[#DC143C]'}`}>
                {(isP1 ? p1Alive : p2Alive) ? 'STANDING' : 'FALLEN'}
              </p>
            </div>
            <div>
              <p className="font-mono text-[9px] text-[#7A6E58] mb-2">OPPONENT</p>
              <span className={`text-5xl ${(isP1 ? p2Alive : p1Alive) ? '' : 'grayscale opacity-40'}`}>⚔️</span>
              <p className={`font-mono text-[9px] mt-1 ${(isP1 ? p2Alive : p1Alive) ? 'text-[#D4BF9A]' : 'text-[#DC143C]'}`}>
                {(isP1 ? p2Alive : p1Alive) ? 'STANDING' : 'FALLEN'}
              </p>
            </div>
          </div>
          <p className={`font-mono text-2xl ${iWon ? 'text-[#D4BF9A]' : 'text-[#7A6E58]'}`}>
            {iWon ? `+$${result.payout_usd.toFixed(2)}` : 'Lost stake'}
          </p>
          <button onClick={() => { setResult(null); setGameData(null); setLobbyId(null); setEliminated([]); setRoundIndex(0) }}
            className="mt-4 w-48 py-3 bg-[#DC143C] font-mono text-xs tracking-widest text-[#D4BF9A] hover:bg-[#B01030] transition-colors">
            BATTLE AGAIN
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
          <h2 className="font-serif text-3xl text-[#D4BF9A]">LAST WARRIOR</h2>
          <div className="flex gap-12 text-center">
            <div>
              <p className="font-mono text-[9px] text-[#7A6E58] mb-2">YOU</p>
              <span className={`text-5xl transition-all ${p1Alive && isP1 || p2Alive && !isP1 ? '' : 'grayscale opacity-30'}`}>⚔️</span>
              <p className={`font-mono text-[9px] mt-1 ${
                (isP1 ? p1Alive : p2Alive) ? 'text-[#D4BF9A]' : 'text-[#DC143C]'
              }`}>{(isP1 ? p1Alive : p2Alive) ? 'ALIVE' : 'ELIMINATED'}</p>
            </div>
            <div>
              <p className="font-mono text-[9px] text-[#7A6E58] mb-2">OPPONENT</p>
              <span className={`text-5xl transition-all ${(isP1 ? p2Alive : p1Alive) ? '' : 'grayscale opacity-30'}`}>⚔️</span>
              <p className={`font-mono text-[9px] mt-1 ${
                (isP1 ? p2Alive : p1Alive) ? 'text-[#D4BF9A]' : 'text-[#DC143C]'
              }`}>{(isP1 ? p2Alive : p1Alive) ? 'ALIVE' : 'ELIMINATED'}</p>
            </div>
          </div>
          <p className="font-mono text-[10px] text-[#7A6E58]">Round {roundIndex} / {rounds?.length || '?'}</p>
          {animating && (
            <p className="font-mono text-[10px] text-[#DC143C] animate-pulse">A WARRIOR FALLS...</p>
          )}
          {roundIndex < (rounds?.length || 0) && !resolving && (
            <button onClick={handleNextRound} disabled={animating}
              className="w-48 py-4 bg-[#DC143C] font-mono text-sm tracking-widest text-[#D4BF9A] hover:bg-[#B01030] disabled:opacity-50 transition-colors">
              {animating ? 'FIGHTING...' : 'NEXT ROUND'}
            </button>
          )}
          {resolving && <p className="font-mono text-[10px] text-[#7A6E58] animate-pulse">RESOLVING...</p>}
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
          <p className="font-mono text-[9px] text-[#7A6E58] tracking-widest uppercase">Last Warrior</p>
          <span className="font-mono text-[9px] text-[#2E2618]">·</span>
          <p className="font-mono text-[9px] text-[#7A6E58]">Battle royale</p>
        </div>
        <div className="flex-1 flex items-center justify-center bg-[#0A0806]">
          <PvPLobby gameType="last-warrior" gameTitle="LAST WARRIOR" onGameStart={handleGameStart} />
        </div>
      </div>
    </AppLayout>
  )
}
