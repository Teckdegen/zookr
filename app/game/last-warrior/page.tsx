'use client'

import { useState, useEffect } from 'react'
import { AppLayout } from '@/components/AppLayout'
import { PvPLobby } from '@/components/PvPLobby'

type Phase = 'lobby' | 'battling' | 'result'

function Skull({ alive }: { alive: boolean }) {
  return (
    <span className={`text-3xl transition-all duration-300 ${alive ? '' : 'opacity-20 grayscale'}`}>
      {alive ? '💀' : '🦴'}
    </span>
  )
}

export default function LastWarriorPage() {
  const [phase, setPhase] = useState<Phase>('lobby')
  const [lobbyId, setLobbyId] = useState<string | null>(null)
  const [gameData, setGameData] = useState<Record<string, unknown>>({})
  const [isP1, setIsP1] = useState(false)
  const [currentRound, setCurrentRound] = useState(0)
  const [p1Lives, setP1Lives] = useState(3)
  const [p2Lives, setP2Lives] = useState(3)
  const [payoutDone, setPayoutDone] = useState(false)

  const rounds = (gameData.rounds as string[]) || []
  const winner = gameData.winner as string
  const myRole = isP1 ? 'p1' : 'p2'
  const won = winner === myRole

  function handleGameStart(lid: string, data: Record<string, unknown>, p1: boolean) {
    setLobbyId(lid); setGameData(data); setIsP1(p1); setPhase('battling')
  }

  useEffect(() => {
    if (phase !== 'battling' || rounds.length === 0) return
    let r = 0; let p1l = 3; let p2l = 3
    const iv = setInterval(() => {
      if (r >= rounds.length) { clearInterval(iv); return }
      const loser = rounds[r]
      if (loser === 'p1') p1l = Math.max(0, p1l - 1)
      else if (loser === 'p2') p2l = Math.max(0, p2l - 1)
      setP1Lives(p1l)
      setP2Lives(p2l)
      r++
      setCurrentRound(r)
      if (p1l === 0 || p2l === 0) {
        clearInterval(iv)
        setTimeout(() => {
          setPhase('result')
          if (!payoutDone && lobbyId) {
            setPayoutDone(true)
            fetch('/api/pvp/result', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ lobby_id: lobbyId }) })
          }
        }, 600)
      }
    }, 900)
    return () => clearInterval(iv)
  }, [phase, rounds, lobbyId, payoutDone])

  const myLives = isP1 ? p1Lives : p2Lives
  const oppLives = isP1 ? p2Lives : p1Lives
  const lastLoser = currentRound > 0 ? rounds[currentRound - 1] : null
  const iLostLastRound = lastLoser === myRole

  return (
    <AppLayout active="play" fullBleed>
      <div className="min-h-[calc(100vh-56px)] bg-[#0A0806] flex flex-col">
        <div className="px-4 py-3 border-b border-[#2E2618] bg-[#1E1B14] flex items-center gap-3">
          <p className="font-mono text-[9px] text-[#7A6E58] tracking-widest uppercase">Last Warrior</p>
          <span className="font-mono text-[9px] text-[#2E2618]">·</span>
          <p className="font-mono text-[9px] text-[#7A6E58]">3 lives each</p>
        </div>

        {phase === 'lobby' && (
          <div className="flex-1 flex items-center justify-center">
            <PvPLobby gameType="last-warrior" gameTitle="Last Warrior" onGameStart={handleGameStart} />
          </div>
        )}

        {(phase === 'battling' || phase === 'result') && (
          <div className="flex-1 flex flex-col items-center justify-center gap-10 px-6">
            <p className="font-mono text-[9px] text-[#7A6E58] tracking-[0.3em] uppercase">
              {phase === 'battling' ? `ROUND ${currentRound}` : 'BATTLE ENDED'}
            </p>

            <div className="flex items-start gap-16">
              <div className="flex flex-col items-center gap-3">
                <p className="font-mono text-[9px] text-[#7A6E58]">YOU</p>
                <div className="flex gap-2">
                  {[0,1,2].map(i => <Skull key={i} alive={i < myLives} />)}
                </div>
                <p className="font-mono text-sm font-bold text-[#D4BF9A]">{myLives} lives</p>
              </div>

              <div className="flex flex-col items-center justify-center pt-4">
                {lastLoser && phase === 'battling' && (
                  <span className={`font-mono text-[9px] ${iLostLastRound ? 'text-[#DC143C]' : 'text-[#D4BF9A]'}`}>
                    {iLostLastRound ? '← LOST LIFE' : 'LOST LIFE →'}
                  </span>
                )}
              </div>

              <div className="flex flex-col items-center gap-3">
                <p className="font-mono text-[9px] text-[#7A6E58]">OPPONENT</p>
                <div className="flex gap-2">
                  {[0,1,2].map(i => <Skull key={i} alive={i < oppLives} />)}
                </div>
                <p className="font-mono text-sm font-bold text-[#D4BF9A]">{oppLives} lives</p>
              </div>
            </div>

            {phase === 'result' && (
              <div className="text-center">
                <p className={`font-serif text-3xl font-bold mb-2 ${won ? 'text-[#D4BF9A]' : 'text-[#DC143C]'}`}>
                  {won ? 'LAST WARRIOR!' : 'ALL LIVES LOST'}
                </p>
                <button onClick={() => { setPhase('lobby'); setCurrentRound(0); setP1Lives(3); setP2Lives(3); setPayoutDone(false); setLobbyId(null) }}
                  className="mt-4 px-8 py-3 bg-[#DC143C] font-mono text-[10px] tracking-widest text-[#D4BF9A] hover:bg-[#B01030] transition-colors">
                  FIGHT AGAIN
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
