'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppLayout } from '@/components/AppLayout'
import { SkullIcon } from '@/components/icons'
import { PvPLobby } from '@/components/PvPLobby'

export default function DeadMansDrawPage() {
  const router = useRouter()
  const [lobbyId, setLobbyId] = useState<string | null>(null)
  const [gameData, setGameData] = useState<Record<string, unknown> | null>(null)
  const [isP1, setIsP1] = useState(false)
  const [resolving, setResolving] = useState(false)
  const [result, setResult] = useState<{ winner_username: string; payout_usd: number; game_data: Record<string, unknown> } | null>(null)
  const [revealedCards, setRevealedCards] = useState(0)

  function handleGameStart(id: string, data: Record<string, unknown>, p1: boolean) {
    setLobbyId(id); setGameData(data); setIsP1(p1); setRevealedCards(0)
  }

  const myCards = gameData ? (isP1 ? gameData.p1_cards as number[] : gameData.p2_cards as number[]) : []
  const myTotal = myCards.slice(0, revealedCards).reduce((a, b) => a + b, 0)
  const bust = myTotal > 21

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
    const gd = result.game_data as { p1_cards: number[]; p2_cards: number[]; p1_total: number; p2_total: number; winner: string }
    const myTotal2 = isP1 ? gd.p1_total : gd.p2_total
    const theirTotal = isP1 ? gd.p2_total : gd.p1_total
    const iWon = (isP1 && gd.winner === 'p1') || (!isP1 && gd.winner === 'p2')
    return (
      <AppLayout active="play" fullBleed>
        <div className="min-h-screen bg-[#0A0806] flex flex-col items-center justify-center gap-6 px-6">
          <h1 className={`font-serif text-4xl font-bold ${iWon ? 'text-[#D4BF9A]' : 'text-[#DC143C]'}`}>
            {iWon ? 'VALHALLA' : 'DEFEATED'}
          </h1>
          <div className="grid grid-cols-2 gap-8 font-mono text-sm text-[#7A6E58] text-center">
            <div>
              <p className="mb-2 text-[#D4BF9A]">YOU</p>
              <div className="flex gap-1 justify-center mb-2">
                {(isP1 ? gd.p1_cards : gd.p2_cards).map((c, i) => (
                  <span key={i} className="border border-[#2E2618] bg-[#1E1B14] px-2 py-1 font-serif text-lg text-[#D4BF9A]">{c}</span>
                ))}
              </div>
              <p>Total: <span className={myTotal2 > 21 ? 'text-[#DC143C]' : 'text-[#D4BF9A]'}>{myTotal2}{myTotal2 > 21 ? ' BUST' : ''}</span></p>
            </div>
            <div>
              <p className="mb-2 text-[#DC143C]">OPPONENT</p>
              <div className="flex gap-1 justify-center mb-2">
                {(isP1 ? gd.p2_cards : gd.p1_cards).map((c, i) => (
                  <span key={i} className="border border-[#2E2618] bg-[#1E1B14] px-2 py-1 font-serif text-lg text-[#DC143C]">{c}</span>
                ))}
              </div>
              <p>Total: <span className={theirTotal > 21 ? 'text-[#DC143C]' : 'text-[#7A6E58]'}>{theirTotal}{theirTotal > 21 ? ' BUST' : ''}</span></p>
            </div>
          </div>
          <p className={`font-mono text-2xl ${iWon ? 'text-[#D4BF9A]' : 'text-[#7A6E58]'}`}>
            {iWon ? `+$${result.payout_usd.toFixed(2)}` : 'Lost stake'}
          </p>
          <button onClick={() => { setResult(null); setGameData(null); setLobbyId(null); setRevealedCards(0) }}
            className="mt-4 w-48 py-3 bg-[#DC143C] font-mono text-xs tracking-widest text-[#D4BF9A] hover:bg-[#B01030] transition-colors">
            DRAW AGAIN
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
          <h2 className="font-serif text-3xl text-[#D4BF9A]">DEAD MAN&apos;S DRAW</h2>
          <div className="text-center">
            <p className="font-mono text-[9px] text-[#7A6E58] mb-2">YOUR HAND</p>
            <div className="flex gap-2 justify-center mb-4">
              {myCards.map((c, i) => (
                <div key={i}
                  className={`w-12 h-16 border flex items-center justify-center font-serif text-xl transition-all ${
                    i < revealedCards
                      ? 'border-[#D4BF9A] bg-[#1E1B14] text-[#D4BF9A]'
                      : 'border-[#2E2618] bg-[#2E2618] text-[#2E2618]'
                  }`}>
                  {i < revealedCards ? c : '?'}
                </div>
              ))}
            </div>
            <p className={`font-mono text-lg ${bust ? 'text-[#DC143C]' : 'text-[#D4BF9A]'}`}>
              Total: {myTotal} {bust ? '— BUST!' : ''}
            </p>
          </div>
          <div className="flex gap-3">
            {revealedCards < myCards.length && !bust && (
              <button onClick={() => setRevealedCards(p => p + 1)}
                className="w-24 py-3 bg-[#DC143C] font-mono text-xs tracking-widest text-[#D4BF9A] hover:bg-[#B01030] transition-colors">
                HIT
              </button>
            )}
            {revealedCards > 0 && !result && (
              <button onClick={handleResolve} disabled={resolving}
                className="w-24 py-3 border border-[#D4BF9A] font-mono text-xs tracking-widest text-[#D4BF9A] hover:bg-[#D4BF9A]/10 disabled:opacity-50 transition-colors">
                {resolving ? '...' : bust ? 'RESOLVE' : 'STAND'}
              </button>
            )}
          </div>
          {bust && !result && (
            <p className="font-mono text-[10px] text-[#DC143C]">You busted! Click RESOLVE to finish.</p>
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
          <p className="font-mono text-[9px] text-[#7A6E58] tracking-widest uppercase">Dead Man&apos;s Draw</p>
          <span className="font-mono text-[9px] text-[#2E2618]">·</span>
          <p className="font-mono text-[9px] text-[#7A6E58]">Closest to 21 wins</p>
        </div>
        <div className="flex-1 flex items-center justify-center bg-[#0A0806]">
          <PvPLobby gameType="dead-mans-draw" gameTitle="DEAD MAN'S DRAW" onGameStart={handleGameStart} />
        </div>
      </div>
    </AppLayout>
  )
}
