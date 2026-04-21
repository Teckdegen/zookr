'use client'

import { useState, useEffect } from 'react'
import { AppLayout } from '@/components/AppLayout'
import { PvPLobby } from '@/components/PvPLobby'

type Phase = 'lobby' | 'drawing' | 'result'

export default function BoneRafflePage() {
  const [phase, setPhase] = useState<Phase>('lobby')
  const [lobbyId, setLobbyId] = useState<string | null>(null)
  const [gameData, setGameData] = useState<Record<string, unknown>>({})
  const [isP1, setIsP1] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const [shuffling, setShuffling] = useState(false)
  const [payoutDone, setPayoutDone] = useState(false)

  const winner = gameData.winner as string
  const myRole = isP1 ? 'p1' : 'p2'
  const won = winner === myRole

  function handleGameStart(lid: string, data: Record<string, unknown>, p1: boolean) {
    setLobbyId(lid); setGameData(data); setIsP1(p1); setPhase('drawing')
  }

  useEffect(() => {
    if (phase !== 'drawing') return
    setShuffling(true)
    const t1 = setTimeout(() => {
      setShuffling(false)
      setRevealed(true)
      setPhase('result')
      if (!payoutDone && lobbyId) {
        setPayoutDone(true)
        fetch('/api/pvp/result', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ lobby_id: lobbyId }) })
      }
    }, 3000)
    return () => clearTimeout(t1)
  }, [phase, lobbyId, payoutDone])

  return (
    <AppLayout active="play" fullBleed>
      <div className="min-h-[calc(100vh-56px)] bg-[#0A0806] flex flex-col">
        <div className="px-4 py-3 border-b border-[#2E2618] bg-[#1E1B14] flex items-center gap-3">
          <p className="font-mono text-[9px] text-[#7A6E58] tracking-widest uppercase">Bone Raffle</p>
          <span className="font-mono text-[9px] text-[#2E2618]">·</span>
          <p className="font-mono text-[9px] text-[#7A6E58]">One lucky skull wins all</p>
        </div>

        {phase === 'lobby' && (
          <div className="flex-1 flex items-center justify-center">
            <PvPLobby gameType="bone-raffle" gameTitle="Bone Raffle" onGameStart={handleGameStart} />
          </div>
        )}

        {(phase === 'drawing' || phase === 'result') && (
          <div className="flex-1 flex flex-col items-center justify-center gap-12 px-6">
            <p className="font-mono text-[9px] text-[#7A6E58] tracking-[0.3em] uppercase">
              {shuffling ? 'DRAWING WINNER...' : 'RESULT'}
            </p>

            <div className="flex items-center gap-16">
              {/* P1 Ticket */}
              <div className="flex flex-col items-center gap-4">
                <p className="font-mono text-[9px] text-[#7A6E58] tracking-widest">{isP1 ? 'YOUR TICKET' : "OPPONENT'S TICKET"}</p>
                <div className={`w-32 h-44 border-2 flex flex-col items-center justify-center gap-3 transition-all duration-1000 ${
                  shuffling ? 'animate-bounce' : revealed && winner === 'p1'
                    ? 'border-[#D4BF9A] bg-[#D4BF9A]/5 scale-110'
                    : 'border-[#2E2618] bg-[#1E1B14] opacity-60'
                }`}>
                  <span className="text-5xl">{shuffling ? '🎲' : winner === 'p1' ? '💀' : '🦴'}</span>
                  <span className="font-mono text-[8px] text-[#7A6E58] tracking-widest">TICKET #1</span>
                  {revealed && winner === 'p1' && (
                    <span className="font-mono text-[8px] text-[#D4BF9A] tracking-widest">WINNER</span>
                  )}
                </div>
              </div>

              {/* P2 Ticket */}
              <div className="flex flex-col items-center gap-4">
                <p className="font-mono text-[9px] text-[#7A6E58] tracking-widest">{isP1 ? "OPPONENT'S TICKET" : 'YOUR TICKET'}</p>
                <div className={`w-32 h-44 border-2 flex flex-col items-center justify-center gap-3 transition-all duration-1000 ${
                  shuffling ? 'animate-bounce' : revealed && winner === 'p2'
                    ? 'border-[#D4BF9A] bg-[#D4BF9A]/5 scale-110'
                    : 'border-[#2E2618] bg-[#1E1B14] opacity-60'
                }`}>
                  <span className="text-5xl">{shuffling ? '🎲' : winner === 'p2' ? '💀' : '🦴'}</span>
                  <span className="font-mono text-[8px] text-[#7A6E58] tracking-widest">TICKET #2</span>
                  {revealed && winner === 'p2' && (
                    <span className="font-mono text-[8px] text-[#D4BF9A] tracking-widest">WINNER</span>
                  )}
                </div>
              </div>
            </div>

            {revealed && (
              <div className="text-center">
                <p className={`font-serif text-3xl font-bold mb-2 ${won ? 'text-[#D4BF9A]' : 'text-[#DC143C]'}`}>
                  {won ? 'YOUR SKULL WAS CHOSEN' : 'FATE CHOSE ANOTHER'}
                </p>
                <button onClick={() => { setPhase('lobby'); setRevealed(false); setPayoutDone(false); setLobbyId(null) }}
                  className="mt-4 px-8 py-3 bg-[#DC143C] font-mono text-[10px] tracking-widest text-[#D4BF9A] hover:bg-[#B01030] transition-colors">
                  RAFFLE AGAIN
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
