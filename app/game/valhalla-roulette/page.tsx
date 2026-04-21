'use client'

import { useState, useEffect } from 'react'
import { AppLayout } from '@/components/AppLayout'
import { PvPLobby } from '@/components/PvPLobby'

type Phase = 'lobby' | 'picking' | 'spinning' | 'result'

export default function ValhallaRoulettePage() {
  const [phase, setPhase] = useState<Phase>('lobby')
  const [lobbyId, setLobbyId] = useState<string | null>(null)
  const [gameData, setGameData] = useState<Record<string, unknown>>({})
  const [isP1, setIsP1] = useState(false)
  const [myPick, setMyPick] = useState<number | null>(null)
  const [ballAngle, setBallAngle] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const [payoutDone, setPayoutDone] = useState(false)

  const spinResult = gameData.spin_result as number
  const myNum = myPick
  const p1Pick = (gameData.p1_pick as number) || 0
  const p2Pick = (gameData.p2_pick as number) || 0
  const opponentPick = isP1 ? p2Pick : p1Pick

  // Determine winner: closest to spin result
  function getWinner(spin: number, p1: number, p2: number): string {
    if (p1 === spin) return 'p1'
    if (p2 === spin) return 'p2'
    return Math.abs(p1 - spin) <= Math.abs(p2 - spin) ? 'p1' : 'p2'
  }

  const winner = phase === 'result'
    ? getWinner(spinResult, isP1 ? (myNum ?? 0) : opponentPick, isP1 ? opponentPick : (myNum ?? 0))
    : ''
  const won = (isP1 && winner === 'p1') || (!isP1 && winner === 'p2')

  function handleGameStart(lid: string, data: Record<string, unknown>, p1: boolean) {
    setLobbyId(lid); setGameData(data); setIsP1(p1); setPhase('picking')
  }

  function handlePick(n: number) {
    setMyPick(n)
    setPhase('spinning')
  }

  useEffect(() => {
    if (phase !== 'spinning' || spinResult === undefined) return
    setSpinning(true)
    const targetAngle = 720 + (spinResult / 36) * 360
    setBallAngle(targetAngle)
    const t = setTimeout(() => {
      setSpinning(false)
      setPhase('result')
      if (!payoutDone && lobbyId) {
        setPayoutDone(true)
        fetch('/api/pvp/result', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ lobby_id: lobbyId }) })
      }
    }, 3000)
    return () => clearTimeout(t)
  }, [phase, spinResult, lobbyId, payoutDone])

  return (
    <AppLayout active="play" fullBleed>
      <div className="min-h-[calc(100vh-56px)] bg-[#0A0806] flex flex-col">
        <div className="px-4 py-3 border-b border-[#2E2618] bg-[#1E1B14] flex items-center gap-3">
          <p className="font-mono text-[9px] text-[#7A6E58] tracking-widest uppercase">Valhalla Roulette</p>
          <span className="font-mono text-[9px] text-[#2E2618]">·</span>
          <p className="font-mono text-[9px] text-[#7A6E58]">Pick 0-35, closest wins</p>
        </div>

        {phase === 'lobby' && (
          <div className="flex-1 flex items-center justify-center">
            <PvPLobby gameType="valhalla-roulette" gameTitle="Valhalla Roulette" onGameStart={handleGameStart} />
          </div>
        )}

        {phase === 'picking' && (
          <div className="flex-1 flex flex-col items-center justify-center gap-6 px-4">
            <div className="text-center">
              <p className="font-mono text-[9px] text-[#7A6E58] tracking-[0.3em] uppercase mb-1">Pick your number</p>
              <h2 className="font-serif text-2xl text-[#D4BF9A]">0 — 35</h2>
            </div>
            <div className="grid grid-cols-9 gap-1 max-w-lg w-full">
              {Array.from({length:36},(_,i)=>(
                <button key={i} onClick={() => handlePick(i)}
                  className="aspect-square flex items-center justify-center font-mono text-[10px] border border-[#2E2618] bg-[#1E1B14] hover:border-[#DC143C] hover:bg-[#DC143C]/10 text-[#7A6E58] hover:text-[#D4BF9A] transition-all">
                  {i}
                </button>
              ))}
            </div>
          </div>
        )}

        {(phase === 'spinning' || phase === 'result') && (
          <div className="flex-1 flex flex-col items-center justify-center gap-8 px-6">
            {/* Wheel visualization */}
            <div className="relative" style={{ width: 200, height: 200 }}>
              <div className="w-full h-full rounded-full border-4 border-[#2E2618] bg-[#1E1B14] flex items-center justify-center"
                style={{ background: 'conic-gradient(from 0deg, #DC143C 0deg 180deg, #1E1B14 180deg 360deg)' }}>
                <div className="w-16 h-16 rounded-full bg-[#0A0806] border-2 border-[#2E2618] flex items-center justify-center">
                  <span className="font-serif text-xl font-bold text-[#D4BF9A]">
                    {phase === 'result' ? spinResult : '?'}
                  </span>
                </div>
              </div>
              {/* Ball */}
              <div
                className="absolute w-4 h-4 rounded-full bg-[#D4BF9A] border border-[#7A6E58]"
                style={{
                  top: '50%', left: '50%',
                  transformOrigin: '-72px 0',
                  transform: `rotate(${ballAngle}deg) translateX(-72px)`,
                  transition: spinning ? 'transform 3s cubic-bezier(0.2, 0.8, 0.3, 1)' : 'none',
                  marginTop: -8, marginLeft: -8,
                }}
              />
            </div>

            <div className="text-center">
              <p className="font-mono text-[9px] text-[#7A6E58] tracking-widest mb-2">
                {spinning ? 'WHEEL SPINNING...' : `LANDED ON ${spinResult}`}
              </p>
              {myPick !== null && (
                <p className="font-mono text-[10px] text-[#7A6E58]">
                  Your pick: <span className="text-[#D4BF9A]">{myPick}</span>
                </p>
              )}
            </div>

            {phase === 'result' && (
              <div className="text-center">
                <p className={`font-serif text-3xl font-bold mb-2 ${won ? 'text-[#D4BF9A]' : 'text-[#DC143C]'}`}>
                  {won ? 'CLOSEST WINS!' : 'TOO FAR FROM THE NUMBER'}
                </p>
                <button onClick={() => { setPhase('lobby'); setMyPick(null); setBallAngle(0); setPayoutDone(false); setLobbyId(null) }}
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
