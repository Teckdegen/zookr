'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppLayout } from '@/components/AppLayout'
import { SkullIcon } from '@/components/icons'
import { PvPLobby } from '@/components/PvPLobby'

export default function ValhallaDraftPage() {
  const router = useRouter()
  const [lobbyId, setLobbyId] = useState<string | null>(null)
  const [gameData, setGameData] = useState<Record<string, unknown> | null>(null)
  const [isP1, setIsP1] = useState(false)
  const [drawnIdx, setDrawnIdx] = useState(0)
  const [myCards, setMyCards] = useState<number[]>([])
  const [drawing, setDrawing] = useState(false)
  const [resolving, setResolving] = useState(false)
  const [result, setResult] = useState<{ winner_username: string; payout_usd: number; game_data: Record<string, unknown> } | null>(null)

  function handleGameStart(id: string, data: Record<string, unknown>, p1: boolean) {
    setLobbyId(id); setGameData(data); setIsP1(p1); setDrawnIdx(0); setMyCards([])
  }

  const allCards = gameData?.cards as number[] | undefined
  const myIndices = isP1
    ? (gameData?.p1_cards_idx as number[] | undefined) || [0, 2, 4]
    : (gameData?.p2_cards_idx as number[] | undefined) || [1, 3]

  async function handleDraw() {
    if (!allCards || drawnIdx >= myIndices.length || drawing) return
    setDrawing(true)
    await new Promise(r => setTimeout(r, 600))
    const cardIdx = myIndices[drawnIdx]
    const card = allCards[cardIdx]
    setMyCards(prev => [...prev, card])
    setDrawnIdx(i => i + 1)
    setDrawing(false)

    if (drawnIdx + 1 >= myIndices.length) {
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
    const gd = result.game_data as { cards: number[]; p1_cards_idx: number[]; p2_cards_idx: number[]; winner: string }
    const myActualCards = (isP1 ? gd.p1_cards_idx : gd.p2_cards_idx).map(i => gd.cards[i])
    const theirCards = (isP1 ? gd.p2_cards_idx : gd.p1_cards_idx).map(i => gd.cards[i])
    const myScore = myActualCards.reduce((a, b) => a + b, 0)
    const theirScore = theirCards.reduce((a, b) => a + b, 0)
    const iWon = (isP1 && gd.winner === 'p1') || (!isP1 && gd.winner === 'p2')
    return (
      <AppLayout active="play" fullBleed>
        <div className="min-h-screen bg-[#0A0806] flex flex-col items-center justify-center gap-6 px-6">
          <h1 className={`font-serif text-4xl font-bold ${iWon ? 'text-[#D4BF9A]' : 'text-[#DC143C]'}`}>
            {iWon ? 'VALHALLA' : 'DEFEATED'}
          </h1>
          <div className="grid grid-cols-2 gap-8 text-center">
            <div>
              <p className="font-mono text-[9px] text-[#7A6E58] mb-2">YOU</p>
              <div className="flex gap-1 justify-center mb-1">
                {myActualCards.map((c, i) => (
                  <span key={i} className="border border-[#D4BF9A] bg-[#1E1B14] px-2 py-1 font-serif text-lg text-[#D4BF9A]">{c}</span>
                ))}
              </div>
              <p className="font-mono text-sm text-[#D4BF9A]">Score: {myScore}</p>
            </div>
            <div>
              <p className="font-mono text-[9px] text-[#7A6E58] mb-2">OPPONENT</p>
              <div className="flex gap-1 justify-center mb-1">
                {theirCards.map((c, i) => (
                  <span key={i} className="border border-[#DC143C] bg-[#1E1B14] px-2 py-1 font-serif text-lg text-[#DC143C]">{c}</span>
                ))}
              </div>
              <p className="font-mono text-sm text-[#DC143C]">Score: {theirScore}</p>
            </div>
          </div>
          <p className={`font-mono text-2xl ${iWon ? 'text-[#D4BF9A]' : 'text-[#7A6E58]'}`}>
            {iWon ? `+$${result.payout_usd.toFixed(2)}` : 'Lost stake'}
          </p>
          <button onClick={() => { setResult(null); setGameData(null); setLobbyId(null); setMyCards([]); setDrawnIdx(0) }}
            className="mt-4 w-48 py-3 bg-[#DC143C] font-mono text-xs tracking-widest text-[#D4BF9A] hover:bg-[#B01030] transition-colors">
            DRAFT AGAIN
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
          <h2 className="font-serif text-3xl text-[#D4BF9A]">VALHALLA DRAFT</h2>
          <p className="font-mono text-[10px] text-[#7A6E58]">Card {drawnIdx} / {myIndices.length} drawn</p>
          <div className="flex gap-2">
            {myIndices.map((_, i) => (
              <div key={i} className={`w-12 h-16 border flex items-center justify-center font-serif text-xl transition-all ${
                i < myCards.length ? 'border-[#D4BF9A] bg-[#D4BF9A]/10 text-[#D4BF9A]' : 'border-[#2E2618] text-[#2E2618]'
              }`}>
                {i < myCards.length ? myCards[i] : '?'}
              </div>
            ))}
          </div>
          {myCards.length > 0 && (
            <p className="font-mono text-[10px] text-[#7A6E58]">
              Current score: <span className="text-[#D4BF9A]">{myCards.reduce((a, b) => a + b, 0)}</span>
            </p>
          )}
          {drawnIdx < myIndices.length && (
            <button onClick={handleDraw} disabled={drawing || resolving}
              className="w-48 py-4 bg-[#DC143C] font-mono text-sm tracking-widest text-[#D4BF9A] hover:bg-[#B01030] disabled:opacity-50 transition-colors">
              {drawing ? 'DRAWING...' : resolving ? 'RESOLVING...' : 'DRAW CARD'}
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
          <p className="font-mono text-[9px] text-[#7A6E58] tracking-widest uppercase">Valhalla Draft</p>
          <span className="font-mono text-[9px] text-[#2E2618]">·</span>
          <p className="font-mono text-[9px] text-[#7A6E58]">Best hand wins</p>
        </div>
        <div className="flex-1 flex items-center justify-center bg-[#0A0806]">
          <PvPLobby gameType="valhalla-draft" gameTitle="VALHALLA DRAFT" onGameStart={handleGameStart} />
        </div>
      </div>
    </AppLayout>
  )
}
