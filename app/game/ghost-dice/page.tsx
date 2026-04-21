'use client'

import { useState, useEffect } from 'react'
import { AppLayout } from '@/components/AppLayout'
import { PvPLobby } from '@/components/PvPLobby'

function Die({ value, rolling }: { value: number; rolling: boolean }) {
  const dots: Record<number, number[][]> = {
    1: [[50,50]],
    2: [[25,25],[75,75]],
    3: [[25,25],[50,50],[75,75]],
    4: [[25,25],[75,25],[25,75],[75,75]],
    5: [[25,25],[75,25],[50,50],[25,75],[75,75]],
    6: [[25,25],[75,25],[25,50],[75,50],[25,75],[75,75]],
  }
  const d = dots[value] || dots[1]
  return (
    <div className={`w-24 h-24 bg-[#1E1B14] border-2 border-[#2E2618] relative rounded-lg ${rolling ? 'animate-spin' : ''}`}
      style={{ transition: rolling ? 'none' : 'border-color 0.3s' }}>
      {d.map(([x,y], i) => (
        <div key={i} className="absolute w-4 h-4 rounded-full bg-[#D4BF9A]"
          style={{ left:`${x}%`, top:`${y}%`, transform:'translate(-50%,-50%)' }} />
      ))}
    </div>
  )
}

type Phase = 'lobby' | 'rolling' | 'result'

export default function GhostDicePage() {
  const [phase, setPhase] = useState<Phase>('lobby')
  const [lobbyId, setLobbyId] = useState<string | null>(null)
  const [gameData, setGameData] = useState<Record<string, unknown>>({})
  const [isP1, setIsP1] = useState(false)
  const [rolling, setRolling] = useState(false)
  const [displayP1, setDisplayP1] = useState(1)
  const [displayP2, setDisplayP2] = useState(1)
  const [payoutDone, setPayoutDone] = useState(false)

  const p1Roll = gameData.p1_roll as number
  const p2Roll = gameData.p2_roll as number
  const winner = gameData.winner as string
  const myRole = isP1 ? 'p1' : 'p2'
  const won = winner === myRole

  function handleGameStart(lid: string, data: Record<string, unknown>, p1: boolean) {
    setLobbyId(lid); setGameData(data); setIsP1(p1); setPhase('rolling')
  }

  useEffect(() => {
    if (phase !== 'rolling') return
    setRolling(true)
    let ticks = 0
    const iv = setInterval(() => {
      ticks++
      setDisplayP1(Math.ceil(Math.random() * 6))
      setDisplayP2(Math.ceil(Math.random() * 6))
      if (ticks >= 20) {
        clearInterval(iv)
        setRolling(false)
        setDisplayP1(p1Roll)
        setDisplayP2(p2Roll)
        setTimeout(() => {
          setPhase('result')
          if (!payoutDone && lobbyId) {
            setPayoutDone(true)
            fetch('/api/pvp/result', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ lobby_id: lobbyId }) })
          }
        }, 300)
      }
    }, 80)
    return () => clearInterval(iv)
  }, [phase, p1Roll, p2Roll, lobbyId, payoutDone])

  return (
    <AppLayout active="play" fullBleed>
      <div className="min-h-[calc(100vh-56px)] bg-[#0A0806] flex flex-col">
        <div className="px-4 py-3 border-b border-[#2E2618] bg-[#1E1B14] flex items-center gap-3">
          <p className="font-mono text-[9px] text-[#7A6E58] tracking-widest uppercase">Ghost Dice</p>
          <span className="font-mono text-[9px] text-[#2E2618]">·</span>
          <p className="font-mono text-[9px] text-[#7A6E58]">Highest roll wins</p>
        </div>

        {phase === 'lobby' && (
          <div className="flex-1 flex items-center justify-center">
            <PvPLobby gameType="ghost-dice" gameTitle="Ghost Dice" onGameStart={handleGameStart} />
          </div>
        )}

        {(phase === 'rolling' || phase === 'result') && (
          <div className="flex-1 flex flex-col items-center justify-center gap-10 px-6">
            <p className="font-mono text-[9px] text-[#7A6E58] tracking-[0.3em] uppercase animate-pulse">
              {rolling ? 'ROLLING THE BONES...' : 'DICE CAST'}
            </p>

            <div className="flex items-center gap-16">
              <div className="flex flex-col items-center gap-4">
                <p className="font-mono text-[9px] text-[#7A6E58] tracking-widest">{isP1 ? 'YOU' : 'OPPONENT'}</p>
                <Die value={displayP1} rolling={rolling} />
                {!rolling && <p className="font-serif text-4xl font-bold text-[#D4BF9A]">{displayP1}</p>}
              </div>
              <p className="font-mono text-xl text-[#7A6E58]">VS</p>
              <div className="flex flex-col items-center gap-4">
                <p className="font-mono text-[9px] text-[#7A6E58] tracking-widest">{isP1 ? 'OPPONENT' : 'YOU'}</p>
                <Die value={displayP2} rolling={rolling} />
                {!rolling && <p className="font-serif text-4xl font-bold text-[#D4BF9A]">{displayP2}</p>}
              </div>
            </div>

            {phase === 'result' && (
              <div className="text-center">
                <p className={`font-serif text-3xl font-bold mb-2 ${won ? 'text-[#D4BF9A]' : 'text-[#DC143C]'}`}>
                  {won ? 'HIGHER ROLL WINS' : 'LOWER ROLL FALLS'}
                </p>
                <button onClick={() => { setPhase('lobby'); setPayoutDone(false); setLobbyId(null) }}
                  className="mt-4 px-8 py-3 bg-[#DC143C] font-mono text-[10px] tracking-widest text-[#D4BF9A] hover:bg-[#B01030] transition-colors">
                  ROLL AGAIN
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
