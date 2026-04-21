'use client'

import { useState, useEffect } from 'react'
import { AppLayout } from '@/components/AppLayout'
import { PvPLobby } from '@/components/PvPLobby'

const CARD_LABELS = ['','A','2','3','4','5','6','7','8','9','10','J','Q','K']

type Phase = 'lobby' | 'flipping' | 'result'

function DraftCard({ value, flipped, highlight }: { value: number; flipped: boolean; highlight?: 'win' | 'lose' | null }) {
  return (
    <div className="relative w-14 h-20" style={{perspective: '500px'}}>
      <div className="w-full h-full relative" style={{
        transformStyle: 'preserve-3d',
        transform: flipped ? 'rotateY(0deg)' : 'rotateY(180deg)',
        transition: 'transform 0.5s ease',
      }}>
        <div className={`absolute inset-0 border-2 flex items-center justify-center ${
          highlight === 'win' ? 'border-[#D4BF9A] bg-[#D4BF9A]/10' :
          highlight === 'lose' ? 'border-[#DC143C]/30 bg-[#DC143C]/5' :
          'border-[#2E2618] bg-[#1E1B14]'
        }`} style={{backfaceVisibility:'hidden'}}>
          <span className="font-serif text-xl font-bold text-[#D4BF9A]">{CARD_LABELS[value]}</span>
        </div>
        <div className="absolute inset-0 border-2 border-[#2E2618] bg-[#DC143C]/5 flex items-center justify-center"
          style={{backfaceVisibility:'hidden', transform:'rotateY(180deg)'}}>
          <span className="text-lg">💀</span>
        </div>
      </div>
    </div>
  )
}

export default function ValhallaDraftPage() {
  const [phase, setPhase] = useState<Phase>('lobby')
  const [lobbyId, setLobbyId] = useState<string | null>(null)
  const [gameData, setGameData] = useState<Record<string, unknown>>({})
  const [isP1, setIsP1] = useState(false)
  const [flippedCount, setFlippedCount] = useState(0)
  const [payoutDone, setPayoutDone] = useState(false)

  const cards = (gameData.cards as number[]) || []
  const p1Idx = (gameData.p1_cards_idx as number[]) || [0,2,4]
  const p2Idx = (gameData.p2_cards_idx as number[]) || [1,3]
  const winner = gameData.winner as string
  const myRole = isP1 ? 'p1' : 'p2'
  const won = winner === myRole

  const myCardIdx = isP1 ? p1Idx : p2Idx
  const oppCardIdx = isP1 ? p2Idx : p1Idx

  const myScore = myCardIdx.reduce((a,i) => a + (cards[i] || 0), 0)
  const oppScore = oppCardIdx.reduce((a,i) => a + (cards[i] || 0), 0)

  function handleGameStart(lid: string, data: Record<string, unknown>, p1: boolean) {
    setLobbyId(lid); setGameData(data); setIsP1(p1); setPhase('flipping')
  }

  useEffect(() => {
    if (phase !== 'flipping' || cards.length === 0) return
    let c = 0
    const iv = setInterval(() => {
      c++
      setFlippedCount(c)
      if (c >= 5) {
        clearInterval(iv)
        setTimeout(() => {
          setPhase('result')
          if (!payoutDone && lobbyId) {
            setPayoutDone(true)
            fetch('/api/pvp/result', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ lobby_id: lobbyId }) })
          }
        }, 600)
      }
    }, 700)
    return () => clearInterval(iv)
  }, [phase, cards.length, lobbyId, payoutDone])

  function cardHighlight(idx: number): 'win'|'lose'|null {
    if (phase !== 'result') return null
    if (myCardIdx.includes(idx)) return won ? 'win' : 'lose'
    return null
  }

  return (
    <AppLayout active="play" fullBleed>
      <div className="min-h-[calc(100vh-56px)] bg-[#0A0806] flex flex-col">
        <div className="px-4 py-3 border-b border-[#2E2618] bg-[#1E1B14] flex items-center gap-3">
          <p className="font-mono text-[9px] text-[#7A6E58] tracking-widest uppercase">Valhalla Draft</p>
          <span className="font-mono text-[9px] text-[#2E2618]">·</span>
          <p className="font-mono text-[9px] text-[#7A6E58]">Best hand wins</p>
        </div>

        {phase === 'lobby' && (
          <div className="flex-1 flex items-center justify-center">
            <PvPLobby gameType="valhalla-draft" gameTitle="Valhalla Draft" onGameStart={handleGameStart} />
          </div>
        )}

        {(phase === 'flipping' || phase === 'result') && (
          <div className="flex-1 flex flex-col items-center justify-center gap-10 px-6">
            <p className="font-mono text-[9px] text-[#7A6E58] tracking-[0.3em] uppercase">
              {phase === 'flipping' ? 'DEALING CARDS...' : 'FINAL HANDS'}
            </p>

            {/* 5 shared cards */}
            <div className="flex gap-3">
              {cards.map((c, i) => (
                <div key={i} className="flex flex-col items-center gap-1">
                  <DraftCard value={c} flipped={flippedCount > i} highlight={phase === 'result' ? cardHighlight(i) : null} />
                  {phase === 'result' && (
                    <span className={`font-mono text-[8px] ${myCardIdx.includes(i) ? 'text-[#DC143C]' : 'text-[#7A6E58]'}`}>
                      {myCardIdx.includes(i) ? 'YOURS' : "OPP'S"}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {phase === 'result' && (
              <>
                <div className="flex items-center gap-12">
                  <div className="text-center">
                    <p className="font-mono text-[9px] text-[#7A6E58]">YOUR SCORE</p>
                    <p className="font-serif text-3xl font-bold text-[#D4BF9A]">{myScore}</p>
                  </div>
                  <div className="text-center">
                    <p className="font-mono text-[9px] text-[#7A6E58]">OPP SCORE</p>
                    <p className="font-serif text-3xl font-bold text-[#D4BF9A]">{oppScore}</p>
                  </div>
                </div>
                <div className="text-center">
                  <p className={`font-serif text-3xl font-bold mb-2 ${won ? 'text-[#D4BF9A]' : 'text-[#DC143C]'}`}>
                    {won ? 'BEST HAND WINS!' : 'OUTDRAWN'}
                  </p>
                  <button onClick={() => { setPhase('lobby'); setFlippedCount(0); setPayoutDone(false); setLobbyId(null) }}
                    className="mt-4 px-8 py-3 bg-[#DC143C] font-mono text-[10px] tracking-widest text-[#D4BF9A] hover:bg-[#B01030] transition-colors">
                    DRAFT AGAIN
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
