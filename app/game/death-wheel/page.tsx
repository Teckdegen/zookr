'use client'

import { useState, useEffect } from 'react'
import { AppLayout } from '@/components/AppLayout'
import { PvPLobby } from '@/components/PvPLobby'

type Phase = 'lobby' | 'spinning' | 'result'

export default function DeathWheelPage() {
  const [phase, setPhase] = useState<Phase>('lobby')
  const [lobbyId, setLobbyId] = useState<string | null>(null)
  const [gameData, setGameData] = useState<Record<string, unknown>>({})
  const [isP1, setIsP1] = useState(false)
  const [rotation, setRotation] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const [payoutDone, setPayoutDone] = useState(false)

  const spinDeg = (gameData.spin_degrees as number) || 0
  const winner = gameData.winner as string
  const myRole = isP1 ? 'p1' : 'p2'
  const won = winner === myRole

  function handleGameStart(lid: string, data: Record<string, unknown>, p1: boolean) {
    setLobbyId(lid); setGameData(data); setIsP1(p1); setPhase('spinning')
  }

  useEffect(() => {
    if (phase !== 'spinning' || !spinDeg) return
    setSpinning(true)
    setRotation(spinDeg)
    const t = setTimeout(() => {
      setSpinning(false)
      setPhase('result')
      if (!payoutDone && lobbyId) {
        setPayoutDone(true)
        fetch('/api/pvp/result', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ lobby_id: lobbyId }) })
      }
    }, 3500)
    return () => clearTimeout(t)
  }, [phase, spinDeg, lobbyId, payoutDone])

  // Final angle mod 360 tells us which half
  const finalAngle = spinDeg % 360

  return (
    <AppLayout active="play" fullBleed>
      <div className="min-h-[calc(100vh-56px)] bg-[#0A0806] flex flex-col">
        <div className="px-4 py-3 border-b border-[#2E2618] bg-[#1E1B14] flex items-center gap-3">
          <p className="font-mono text-[9px] text-[#7A6E58] tracking-widest uppercase">Death Wheel</p>
          <span className="font-mono text-[9px] text-[#2E2618]">·</span>
          <p className="font-mono text-[9px] text-[#7A6E58]">Spin the wheel of fate</p>
        </div>

        {phase === 'lobby' && (
          <div className="flex-1 flex items-center justify-center">
            <PvPLobby gameType="death-wheel" gameTitle="Death Wheel" onGameStart={handleGameStart} />
          </div>
        )}

        {(phase === 'spinning' || phase === 'result') && (
          <div className="flex-1 flex flex-col items-center justify-center gap-10 px-6">
            <p className="font-mono text-[9px] text-[#7A6E58] tracking-[0.3em] uppercase animate-pulse">
              {spinning ? 'SPINNING THE WHEEL OF FATE...' : 'THE WHEEL HAS SPOKEN'}
            </p>

            {/* Wheel */}
            <div className="relative flex items-center justify-center" style={{width:240,height:240}}>
              {/* Pointer */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-10">
                <div className="w-0 h-0" style={{
                  borderLeft: '8px solid transparent',
                  borderRight: '8px solid transparent',
                  borderTop: '16px solid #D4BF9A',
                }}/>
              </div>

              {/* Wheel disc */}
              <div
                className="w-56 h-56 rounded-full relative overflow-hidden border-4 border-[#2E2618]"
                style={{
                  transform: `rotate(${rotation}deg)`,
                  transition: spinning
                    ? `transform 3.5s cubic-bezier(0.17, 0.67, 0.1, 1)`
                    : 'none',
                }}
              >
                {/* P1 half (top / 0-179) */}
                <div className="absolute inset-0" style={{
                  background: 'conic-gradient(from 0deg, #DC143C 0deg 180deg, #1E1B14 180deg 360deg)',
                }}>
                  {/* P1 label */}
                  <div className="absolute" style={{top:'25%',left:'50%',transform:'translate(-50%,-50%)'}}>
                    <span className="font-mono text-[10px] font-bold text-[#D4BF9A] tracking-widest">
                      {isP1 ? 'YOU' : 'OPP'}
                    </span>
                  </div>
                  {/* P2 label */}
                  <div className="absolute" style={{top:'75%',left:'50%',transform:'translate(-50%,-50%)'}}>
                    <span className="font-mono text-[10px] font-bold text-[#7A6E58] tracking-widest">
                      {isP1 ? 'OPP' : 'YOU'}
                    </span>
                  </div>
                </div>

                {/* Center circle */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-[#0A0806] border-2 border-[#2E2618] flex items-center justify-center">
                    <span className="text-lg">💀</span>
                  </div>
                </div>
              </div>
            </div>

            {phase === 'result' && (
              <div className="text-center">
                <p className="font-mono text-[9px] text-[#7A6E58] mb-2">
                  Needle landed at {Math.round(finalAngle)}° — {finalAngle < 180 ? 'P1 (top half)' : 'P2 (bottom half)'}
                </p>
                <p className={`font-serif text-3xl font-bold mb-2 ${won ? 'text-[#D4BF9A]' : 'text-[#DC143C]'}`}>
                  {won ? 'THE WHEEL CHOSE YOU!' : 'THE WHEEL CHOSE YOUR OPPONENT'}
                </p>
                <button onClick={() => { setPhase('lobby'); setRotation(0); setPayoutDone(false); setLobbyId(null) }}
                  className="mt-4 px-8 py-3 bg-[#DC143C] font-mono text-[10px] tracking-widest text-[#D4BF9A] hover:bg-[#B01030] transition-colors">
                  SPIN AGAIN
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
