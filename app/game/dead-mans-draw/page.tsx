'use client'

import { useState, useEffect } from 'react'
import { AppLayout } from '@/components/AppLayout'
import { PvPLobby } from '@/components/PvPLobby'

function Card({ value, flipped, delay }: { value: number; flipped: boolean; delay: number }) {
  const label = value === 1 ? 'A' : value === 10 ? '10' : value === 11 ? 'J' : value === 12 ? 'Q' : value === 13 ? 'K' : String(value)
  return (
    <div className="relative w-16 h-24" style={{ perspective: '600px' }}>
      <div className="w-full h-full relative"
        style={{
          transformStyle: 'preserve-3d',
          transform: flipped ? 'rotateY(0deg)' : 'rotateY(180deg)',
          transition: `transform 0.5s ease ${delay}ms`,
        }}>
        {/* Front */}
        <div className="absolute inset-0 bg-[#1E1B14] border border-[#D4BF9A]/30 flex items-center justify-center"
          style={{ backfaceVisibility: 'hidden' }}>
          <span className="font-serif text-2xl font-bold text-[#D4BF9A]">{label}</span>
        </div>
        {/* Back */}
        <div className="absolute inset-0 bg-[#DC143C]/10 border border-[#DC143C]/30 flex items-center justify-center"
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
          <span className="text-2xl">💀</span>
        </div>
      </div>
    </div>
  )
}

type Phase = 'lobby' | 'revealing' | 'result'

export default function DeadMansDrawPage() {
  const [phase, setPhase] = useState<Phase>('lobby')
  const [lobbyId, setLobbyId] = useState<string | null>(null)
  const [gameData, setGameData] = useState<Record<string, unknown>>({})
  const [isP1, setIsP1] = useState(false)
  const [flippedCount, setFlippedCount] = useState(0)
  const [payoutDone, setPayoutDone] = useState(false)

  const p1Cards = (gameData.p1_cards as number[]) || []
  const p2Cards = (gameData.p2_cards as number[]) || []
  const p1Total = gameData.p1_total as number
  const p2Total = gameData.p2_total as number
  const winner = gameData.winner as string
  const myRole = isP1 ? 'p1' : 'p2'
  const won = winner === myRole

  function handleGameStart(lid: string, data: Record<string, unknown>, p1: boolean) {
    setLobbyId(lid); setGameData(data); setIsP1(p1); setPhase('revealing')
  }

  useEffect(() => {
    if (phase !== 'revealing') return
    const maxCards = 3
    let count = 0
    const iv = setInterval(() => {
      count++
      setFlippedCount(count)
      if (count >= maxCards) {
        clearInterval(iv)
        setTimeout(() => {
          setPhase('result')
          if (!payoutDone && lobbyId) {
            setPayoutDone(true)
            fetch('/api/pvp/result', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ lobby_id: lobbyId }) })
          }
        }, 800)
      }
    }, 600)
    return () => clearInterval(iv)
  }, [phase, lobbyId, payoutDone])

  return (
    <AppLayout active="play" fullBleed>
      <div className="min-h-[calc(100vh-56px)] bg-[#0A0806] flex flex-col">
        <div className="px-4 py-3 border-b border-[#2E2618] bg-[#1E1B14] flex items-center gap-3">
          <p className="font-mono text-[9px] text-[#7A6E58] tracking-widest uppercase">Dead Man&apos;s Draw</p>
          <span className="font-mono text-[9px] text-[#2E2618]">·</span>
          <p className="font-mono text-[9px] text-[#7A6E58]">Closest to 21 wins</p>
        </div>

        {phase === 'lobby' && (
          <div className="flex-1 flex items-center justify-center">
            <PvPLobby gameType="dead-mans-draw" gameTitle="Dead Man's Draw" onGameStart={handleGameStart} />
          </div>
        )}

        {(phase === 'revealing' || phase === 'result') && (
          <div className="flex-1 flex flex-col items-center justify-center gap-10 px-6">
            <p className="font-mono text-[9px] text-[#7A6E58] tracking-[0.3em] uppercase">
              {phase === 'revealing' ? 'DEALING CARDS...' : 'HANDS REVEALED'}
            </p>

            <div className="flex flex-col gap-8 w-full max-w-md">
              {/* P1 Hand */}
              <div className={`p-4 border ${winner === 'p1' && phase === 'result' ? 'border-[#D4BF9A]' : 'border-[#2E2618]'} bg-[#1E1B14]`}>
                <p className="font-mono text-[9px] text-[#7A6E58] tracking-widest mb-3">{isP1 ? 'YOUR HAND' : "OPPONENT'S HAND"}</p>
                <div className="flex gap-2">
                  {p1Cards.map((c, i) => (
                    <Card key={i} value={c} flipped={flippedCount > i} delay={0} />
                  ))}
                </div>
                {phase === 'result' && (
                  <p className="font-mono text-sm text-[#D4BF9A] mt-3">
                    Total: <span className={p1Total > 21 ? 'text-[#DC143C]' : ''}>{p1Total}</span>
                    {p1Total > 21 && ' (BUST)'}
                  </p>
                )}
              </div>

              {/* P2 Hand */}
              <div className={`p-4 border ${winner === 'p2' && phase === 'result' ? 'border-[#D4BF9A]' : 'border-[#2E2618]'} bg-[#1E1B14]`}>
                <p className="font-mono text-[9px] text-[#7A6E58] tracking-widest mb-3">{isP1 ? "OPPONENT'S HAND" : 'YOUR HAND'}</p>
                <div className="flex gap-2">
                  {p2Cards.map((c, i) => (
                    <Card key={i} value={c} flipped={flippedCount > i} delay={100} />
                  ))}
                </div>
                {phase === 'result' && (
                  <p className="font-mono text-sm text-[#D4BF9A] mt-3">
                    Total: <span className={p2Total > 21 ? 'text-[#DC143C]' : ''}>{p2Total}</span>
                    {p2Total > 21 && ' (BUST)'}
                  </p>
                )}
              </div>
            </div>

            {phase === 'result' && (
              <div className="text-center">
                <p className={`font-serif text-3xl font-bold mb-2 ${won ? 'text-[#D4BF9A]' : 'text-[#DC143C]'}`}>
                  {won ? 'CLOSEST TO 21!' : 'BUSTED OR OUTDRAWN'}
                </p>
                <button onClick={() => { setPhase('lobby'); setFlippedCount(0); setPayoutDone(false); setLobbyId(null) }}
                  className="mt-4 px-8 py-3 bg-[#DC143C] font-mono text-[10px] tracking-widest text-[#D4BF9A] hover:bg-[#B01030] transition-colors">
                  DRAW AGAIN
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
