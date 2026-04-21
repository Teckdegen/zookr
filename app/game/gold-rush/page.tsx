'use client'

import { useState, useEffect } from 'react'
import { AppLayout } from '@/components/AppLayout'
import { PvPLobby } from '@/components/PvPLobby'

type Phase = 'lobby' | 'mining' | 'result'

export default function GoldRushPage() {
  const [phase, setPhase] = useState<Phase>('lobby')
  const [lobbyId, setLobbyId] = useState<string | null>(null)
  const [gameData, setGameData] = useState<Record<string, unknown>>({})
  const [isP1, setIsP1] = useState(false)
  const [currentRound, setCurrentRound] = useState(0)
  const [displayP1Total, setDisplayP1Total] = useState(0)
  const [displayP2Total, setDisplayP2Total] = useState(0)
  const [payoutDone, setPayoutDone] = useState(false)

  type RoundData = { p1: number; p2: number }
  const rounds = (gameData.rounds as RoundData[]) || []
  const p1Total = (gameData.p1_total as number) || 0
  const p2Total = (gameData.p2_total as number) || 0
  const winner = gameData.winner as string
  const myRole = isP1 ? 'p1' : 'p2'
  const won = winner === myRole

  function handleGameStart(lid: string, data: Record<string, unknown>, p1: boolean) {
    setLobbyId(lid); setGameData(data); setIsP1(p1); setPhase('mining')
  }

  useEffect(() => {
    if (phase !== 'mining' || rounds.length === 0) return
    let r = 0; let p1acc = 0; let p2acc = 0
    const iv = setInterval(() => {
      if (r >= rounds.length) { clearInterval(iv); return }
      p1acc += rounds[r].p1
      p2acc += rounds[r].p2
      setDisplayP1Total(p1acc)
      setDisplayP2Total(p2acc)
      r++
      setCurrentRound(r)
      if (r >= rounds.length) {
        clearInterval(iv)
        setTimeout(() => {
          setPhase('result')
          if (!payoutDone && lobbyId) {
            setPayoutDone(true)
            fetch('/api/pvp/result', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ lobby_id: lobbyId }) })
          }
        }, 600)
      }
    }, 800)
    return () => clearInterval(iv)
  }, [phase, rounds, lobbyId, payoutDone])

  const myTotal = isP1 ? displayP1Total : displayP2Total
  const oppTotal = isP1 ? displayP2Total : displayP1Total

  return (
    <AppLayout active="play" fullBleed>
      <div className="min-h-[calc(100vh-56px)] bg-[#0A0806] flex flex-col">
        <div className="px-4 py-3 border-b border-[#2E2618] bg-[#1E1B14] flex items-center gap-3">
          <p className="font-mono text-[9px] text-[#7A6E58] tracking-widest uppercase">Gold Rush</p>
          <span className="font-mono text-[9px] text-[#2E2618]">·</span>
          <p className="font-mono text-[9px] text-[#7A6E58]">5 mining rounds</p>
        </div>

        {phase === 'lobby' && (
          <div className="flex-1 flex items-center justify-center">
            <PvPLobby gameType="gold-rush" gameTitle="Gold Rush" onGameStart={handleGameStart} />
          </div>
        )}

        {(phase === 'mining' || phase === 'result') && (
          <div className="flex-1 flex flex-col items-center justify-center gap-8 px-6">
            <p className="font-mono text-[9px] text-[#7A6E58] tracking-[0.3em] uppercase">
              {phase === 'mining' ? `ROUND ${currentRound} / ${rounds.length}` : 'MINING COMPLETE'}
            </p>

            {/* Gold counters */}
            <div className="flex items-center gap-16">
              <div className="text-center">
                <p className="font-mono text-[9px] text-[#7A6E58] mb-2">YOU</p>
                <p className="font-serif text-5xl font-bold text-[#D4BF9A]">{myTotal}</p>
                <p className="font-mono text-[9px] text-[#7A6E58] mt-1">⛏️ gold</p>
              </div>
              <div className="text-center">
                <p className="font-mono text-2xl text-[#DC143C]">⚔️</p>
              </div>
              <div className="text-center">
                <p className="font-mono text-[9px] text-[#7A6E58] mb-2">OPPONENT</p>
                <p className="font-serif text-5xl font-bold text-[#D4BF9A]">{oppTotal}</p>
                <p className="font-mono text-[9px] text-[#7A6E58] mt-1">⛏️ gold</p>
              </div>
            </div>

            {/* Round breakdown */}
            <div className="grid grid-cols-5 gap-2 w-full max-w-sm">
              {rounds.map((ro, i) => {
                const myGold = isP1 ? ro.p1 : ro.p2
                const oppGold = isP1 ? ro.p2 : ro.p1
                const active = i < currentRound
                return (
                  <div key={i} className={`p-2 border text-center transition-all ${
                    active
                      ? myGold >= oppGold ? 'border-[#D4BF9A]/30 bg-[#D4BF9A]/5' : 'border-[#DC143C]/30 bg-[#DC143C]/5'
                      : 'border-[#2E2618] opacity-30'
                  }`}>
                    <p className="font-mono text-[8px] text-[#7A6E58]">R{i+1}</p>
                    {active && (
                      <>
                        <p className="font-serif text-lg font-bold text-[#D4BF9A]">+{myGold}</p>
                        <p className="font-mono text-[8px] text-[#7A6E58]">vs +{oppGold}</p>
                      </>
                    )}
                  </div>
                )
              })}
            </div>

            {phase === 'result' && (
              <div className="text-center">
                <p className={`font-serif text-3xl font-bold mb-2 ${won ? 'text-[#D4BF9A]' : 'text-[#DC143C]'}`}>
                  {won ? 'RICHEST WARRIOR WINS!' : 'OUTMINED'}
                </p>
                <p className="font-mono text-[10px] text-[#7A6E58] mb-4">
                  You: {isP1 ? p1Total : p2Total} · Opponent: {isP1 ? p2Total : p1Total}
                </p>
                <button onClick={() => { setPhase('lobby'); setCurrentRound(0); setDisplayP1Total(0); setDisplayP2Total(0); setPayoutDone(false); setLobbyId(null) }}
                  className="px-8 py-3 bg-[#DC143C] font-mono text-[10px] tracking-widest text-[#D4BF9A] hover:bg-[#B01030] transition-colors">
                  MINE AGAIN
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
