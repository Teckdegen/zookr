'use client'

import { useState, useEffect } from 'react'
import { AppLayout } from '@/components/AppLayout'
import { PvPLobby } from '@/components/PvPLobby'

function Die({ value }: { value: number }) {
  const dots: Record<number, number[][]> = {
    1: [[50,50]],
    2: [[25,25],[75,75]],
    3: [[25,25],[50,50],[75,75]],
    4: [[25,25],[75,25],[25,75],[75,75]],
    5: [[25,25],[75,25],[50,50],[25,75],[75,75]],
    6: [[25,25],[75,25],[25,50],[75,50],[25,75],[75,75]],
  }
  return (
    <div className="w-14 h-14 bg-[#1E1B14] border border-[#2E2618] relative rounded">
      {(dots[value]||[]).map(([x,y],i)=>(
        <div key={i} className="absolute w-3 h-3 rounded-full bg-[#D4BF9A]"
          style={{left:`${x}%`,top:`${y}%`,transform:'translate(-50%,-50%)'}}/>
      ))}
    </div>
  )
}

type Phase = 'lobby' | 'playing' | 'result'

export default function WarriorDicePage() {
  const [phase, setPhase] = useState<Phase>('lobby')
  const [lobbyId, setLobbyId] = useState<string | null>(null)
  const [gameData, setGameData] = useState<Record<string, unknown>>({})
  const [isP1, setIsP1] = useState(false)
  const [currentRound, setCurrentRound] = useState(0)
  const [payoutDone, setPayoutDone] = useState(false)

  type Round = { p1: number; p2: number }
  const rounds = (gameData.rounds as Round[]) || []
  const p1Wins = (gameData.p1_wins as number) || 0
  const p2Wins = (gameData.p2_wins as number) || 0
  const winner = gameData.winner as string
  const myRole = isP1 ? 'p1' : 'p2'
  const won = winner === myRole

  function handleGameStart(lid: string, data: Record<string, unknown>, p1: boolean) {
    setLobbyId(lid); setGameData(data); setIsP1(p1); setPhase('playing')
  }

  useEffect(() => {
    if (phase !== 'playing' || rounds.length === 0) return
    let r = 0
    const iv = setInterval(() => {
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
        }, 800)
      }
    }, 900)
    return () => clearInterval(iv)
  }, [phase, rounds.length, lobbyId, payoutDone])

  return (
    <AppLayout active="play" fullBleed>
      <div className="min-h-[calc(100vh-56px)] bg-[#0A0806] flex flex-col">
        <div className="px-4 py-3 border-b border-[#2E2618] bg-[#1E1B14] flex items-center gap-3">
          <p className="font-mono text-[9px] text-[#7A6E58] tracking-widest uppercase">Warrior&apos;s Dice</p>
          <span className="font-mono text-[9px] text-[#2E2618]">·</span>
          <p className="font-mono text-[9px] text-[#7A6E58]">Best of 3 rounds</p>
        </div>

        {phase === 'lobby' && (
          <div className="flex-1 flex items-center justify-center">
            <PvPLobby gameType="warrior-dice" gameTitle="Warrior's Dice" onGameStart={handleGameStart} />
          </div>
        )}

        {(phase === 'playing' || phase === 'result') && (
          <div className="flex-1 flex flex-col items-center justify-center gap-8 px-6">
            {/* Score */}
            <div className="flex items-center gap-8">
              <div className="text-center">
                <p className="font-mono text-[9px] text-[#7A6E58] tracking-widest">{isP1 ? 'YOU' : 'OPPONENT'}</p>
                <p className="font-serif text-4xl font-bold text-[#D4BF9A]">{p1Wins}</p>
              </div>
              <p className="font-mono text-xl text-[#7A6E58]">—</p>
              <div className="text-center">
                <p className="font-mono text-[9px] text-[#7A6E58] tracking-widest">{isP1 ? 'OPPONENT' : 'YOU'}</p>
                <p className="font-serif text-4xl font-bold text-[#D4BF9A]">{p2Wins}</p>
              </div>
            </div>

            {/* Rounds */}
            <div className="flex flex-col gap-3 w-full max-w-sm">
              {rounds.slice(0, currentRound).map((ro, i) => {
                const rWinner = ro.p1 > ro.p2 ? 'p1' : ro.p2 > ro.p1 ? 'p2' : 'tie'
                return (
                  <div key={i} className={`flex items-center justify-between p-3 border ${
                    rWinner === myRole ? 'border-[#D4BF9A]/30 bg-[#D4BF9A]/5' : 'border-[#DC143C]/30 bg-[#DC143C]/5'
                  }`}>
                    <p className="font-mono text-[9px] text-[#7A6E58]">ROUND {i+1}</p>
                    <div className="flex items-center gap-4">
                      <Die value={ro.p1} />
                      <span className="font-mono text-[9px] text-[#7A6E58]">vs</span>
                      <Die value={ro.p2} />
                    </div>
                    <p className={`font-mono text-[9px] ${rWinner === myRole ? 'text-[#D4BF9A]' : 'text-[#DC143C]'}`}>
                      {rWinner === 'tie' ? 'TIE' : rWinner === myRole ? 'WIN' : 'LOSS'}
                    </p>
                  </div>
                )
              })}
            </div>

            {phase === 'result' && (
              <div className="text-center">
                <p className={`font-serif text-3xl font-bold mb-2 ${won ? 'text-[#D4BF9A]' : 'text-[#DC143C]'}`}>
                  {won ? 'WARRIOR VICTORIOUS' : 'WARRIOR DEFEATED'}
                </p>
                <button onClick={() => { setPhase('lobby'); setCurrentRound(0); setPayoutDone(false); setLobbyId(null) }}
                  className="mt-4 px-8 py-3 bg-[#DC143C] font-mono text-[10px] tracking-widest text-[#D4BF9A] hover:bg-[#B01030] transition-colors">
                  BATTLE AGAIN
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
