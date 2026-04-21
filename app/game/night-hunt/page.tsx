'use client'

import { useState, useEffect } from 'react'
import { AppLayout } from '@/components/AppLayout'
import { PvPLobby } from '@/components/PvPLobby'

type Phase = 'lobby' | 'picking' | 'revealing' | 'result'

export default function NightHuntPage() {
  const [phase, setPhase] = useState<Phase>('lobby')
  const [lobbyId, setLobbyId] = useState<string | null>(null)
  const [gameData, setGameData] = useState<Record<string, unknown>>({})
  const [isP1, setIsP1] = useState(false)
  const [myPick, setMyPick] = useState<number | null>(null)
  const [payoutDone, setPayoutDone] = useState(false)

  const p1Pick = gameData.p1_pick as number
  const p2Pick = gameData.p2_pick as number
  const winner = gameData.winner as string
  const myRole = isP1 ? 'p1' : 'p2'
  const won = winner === myRole
  const myServerPick = isP1 ? p1Pick : p2Pick
  const oppServerPick = isP1 ? p2Pick : p1Pick

  function handleGameStart(lid: string, data: Record<string, unknown>, p1: boolean) {
    setLobbyId(lid); setGameData(data); setIsP1(p1); setPhase('picking')
  }

  function pick(n: number) {
    setMyPick(n)
    setPhase('revealing')
  }

  useEffect(() => {
    if (phase !== 'revealing') return
    const t = setTimeout(() => {
      setPhase('result')
      if (!payoutDone && lobbyId) {
        setPayoutDone(true)
        fetch('/api/pvp/result', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ lobby_id: lobbyId }) })
      }
    }, 2000)
    return () => clearTimeout(t)
  }, [phase, lobbyId, payoutDone])

  return (
    <AppLayout active="play" fullBleed>
      <div className="min-h-[calc(100vh-56px)] bg-[#0A0806] flex flex-col">
        <div className="px-4 py-3 border-b border-[#2E2618] bg-[#1E1B14] flex items-center gap-3">
          <p className="font-mono text-[9px] text-[#7A6E58] tracking-widest uppercase">Night Hunt</p>
          <span className="font-mono text-[9px] text-[#2E2618]">·</span>
          <p className="font-mono text-[9px] text-[#7A6E58]">Higher unique number wins</p>
        </div>

        {phase === 'lobby' && (
          <div className="flex-1 flex items-center justify-center">
            <PvPLobby gameType="night-hunt" gameTitle="Night Hunt" onGameStart={handleGameStart} />
          </div>
        )}

        {phase === 'picking' && (
          <div className="flex-1 flex flex-col items-center justify-center gap-8 px-6">
            <div className="text-center">
              <p className="font-mono text-[9px] text-[#7A6E58] tracking-[0.3em] uppercase mb-2">Choose your number</p>
              <h2 className="font-serif text-2xl text-[#D4BF9A]">Pick 1 — 10</h2>
              <p className="font-mono text-[9px] text-[#7A6E58] mt-2">Higher unique number wins. If tied, repick happens automatically.</p>
            </div>
            <div className="grid grid-cols-5 gap-3 max-w-xs">
              {Array.from({length:10},(_,i)=>(
                <button key={i+1} onClick={() => pick(i+1)}
                  className="aspect-square flex items-center justify-center font-serif text-2xl font-bold border border-[#2E2618] bg-[#1E1B14] hover:border-[#DC143C] hover:bg-[#DC143C]/10 text-[#7A6E58] hover:text-[#D4BF9A] transition-all">
                  {i+1}
                </button>
              ))}
            </div>
          </div>
        )}

        {(phase === 'revealing' || phase === 'result') && (
          <div className="flex-1 flex flex-col items-center justify-center gap-10 px-6">
            <p className="font-mono text-[9px] text-[#7A6E58] tracking-[0.3em] uppercase animate-pulse">
              {phase === 'revealing' ? 'REVEALING PICKS...' : 'NUMBERS REVEALED'}
            </p>

            <div className="flex items-center gap-16">
              <div className="text-center">
                <p className="font-mono text-[9px] text-[#7A6E58] mb-3">YOU</p>
                <div className={`w-24 h-24 border-2 flex items-center justify-center transition-all ${
                  phase === 'result' && won ? 'border-[#D4BF9A]' : phase === 'result' ? 'border-[#DC143C]' : 'border-[#2E2618] animate-pulse'
                }`}>
                  <span className="font-serif text-4xl font-bold text-[#D4BF9A]">{myServerPick || myPick}</span>
                </div>
              </div>
              <p className="font-mono text-xl text-[#7A6E58]">VS</p>
              <div className="text-center">
                <p className="font-mono text-[9px] text-[#7A6E58] mb-3">OPPONENT</p>
                <div className={`w-24 h-24 border-2 flex items-center justify-center transition-all ${
                  phase === 'result' && !won ? 'border-[#D4BF9A]' : phase === 'result' ? 'border-[#DC143C]' : 'border-[#2E2618] animate-pulse'
                }`}>
                  {phase === 'result' ? (
                    <span className="font-serif text-4xl font-bold text-[#D4BF9A]">{oppServerPick}</span>
                  ) : (
                    <span className="font-mono text-2xl text-[#2E2618]">?</span>
                  )}
                </div>
              </div>
            </div>

            {phase === 'result' && (
              <div className="text-center">
                <p className={`font-serif text-3xl font-bold mb-2 ${won ? 'text-[#D4BF9A]' : 'text-[#DC143C]'}`}>
                  {won ? 'HIGHER NUMBER WINS' : 'OUTRANKED'}
                </p>
                <button onClick={() => { setPhase('lobby'); setMyPick(null); setPayoutDone(false); setLobbyId(null) }}
                  className="mt-4 px-8 py-3 bg-[#DC143C] font-mono text-[10px] tracking-widest text-[#D4BF9A] hover:bg-[#B01030] transition-colors">
                  HUNT AGAIN
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
