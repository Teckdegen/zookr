'use client'

import { useState, useEffect } from 'react'
import { AppLayout } from '@/components/AppLayout'
import { PvPLobby } from '@/components/PvPLobby'

const HORSE_EMOJI = ['🐴', '🦴', '💀', '⚔️', '🔥']
const HORSE_NAMES = ['Dark Horse', 'Bone Rider', 'Death Mare', 'Iron Steed', 'Hellfire']

type Phase = 'lobby' | 'picking' | 'racing' | 'result'

export default function DeathRacePage() {
  const [phase, setPhase] = useState<Phase>('lobby')
  const [lobbyId, setLobbyId] = useState<string | null>(null)
  const [gameData, setGameData] = useState<Record<string, unknown>>({})
  const [isP1, setIsP1] = useState(false)
  const [myPick, setMyPick] = useState<number | null>(null)
  const [racePos, setRacePos] = useState([0, 0, 0, 0, 0])
  const [payoutDone, setPayoutDone] = useState(false)

  const winningHorse = gameData.winning_horse as number
  const won = myPick !== null && myPick === winningHorse

  function handleGameStart(lid: string, data: Record<string, unknown>, p1: boolean) {
    setLobbyId(lid)
    setGameData(data)
    setIsP1(p1)
    setPhase('picking')
  }

  function pickHorse(n: number) {
    setMyPick(n)
    setPhase('racing')
  }

  useEffect(() => {
    if (phase !== 'racing') return
    let step = 0
    const iv = setInterval(() => {
      step++
      setRacePos(prev => prev.map((p, i) => {
        const boost = i + 1 === winningHorse ? 12 : 8
        return Math.min(100, p + Math.random() * boost)
      }))
      if (step >= 15) {
        clearInterval(iv)
        setTimeout(() => {
          setPhase('result')
          if (!payoutDone && lobbyId) {
            setPayoutDone(true)
            fetch('/api/pvp/result', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ lobby_id: lobbyId }) })
          }
        }, 500)
      }
    }, 200)
    return () => clearInterval(iv)
  }, [phase, winningHorse, lobbyId, payoutDone])

  return (
    <AppLayout active="play" fullBleed>
      <div className="min-h-[calc(100vh-56px)] bg-[#0A0806] flex flex-col">
        <div className="px-4 py-3 border-b border-[#2E2618] bg-[#1E1B14] flex items-center gap-3">
          <p className="font-mono text-[9px] text-[#7A6E58] tracking-widest uppercase">Death Race</p>
          <span className="font-mono text-[9px] text-[#2E2618]">·</span>
          <p className="font-mono text-[9px] text-[#7A6E58]">Pick your horse</p>
        </div>

        {phase === 'lobby' && (
          <div className="flex-1 flex items-center justify-center">
            <PvPLobby gameType="death-race" gameTitle="Death Race" onGameStart={handleGameStart} />
          </div>
        )}

        {phase === 'picking' && (
          <div className="flex-1 flex flex-col items-center justify-center gap-8 px-6">
            <div className="text-center">
              <p className="font-mono text-[9px] text-[#7A6E58] tracking-[0.3em] uppercase mb-2">Choose your mount</p>
              <h2 className="font-serif text-3xl text-[#D4BF9A]">Pick a Horse</h2>
            </div>
            <div className="grid grid-cols-5 gap-3 w-full max-w-md">
              {HORSE_EMOJI.map((emoji, i) => (
                <button key={i} onClick={() => pickHorse(i + 1)}
                  className="flex flex-col items-center gap-2 p-4 border border-[#2E2618] bg-[#1E1B14] hover:border-[#DC143C] hover:bg-[#DC143C]/5 transition-all group">
                  <span className="text-3xl">{emoji}</span>
                  <span className="font-mono text-[8px] text-[#7A6E58] group-hover:text-[#DC143C] text-center leading-tight">{i+1}</span>
                </button>
              ))}
            </div>
            <p className="font-mono text-[9px] text-[#7A6E58]">Horse #{isP1 ? 'P1' : 'P2'} — your pick is hidden from opponent</p>
          </div>
        )}

        {(phase === 'racing' || phase === 'result') && (
          <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6">
            <p className="font-mono text-[9px] text-[#7A6E58] tracking-[0.3em] uppercase">
              {phase === 'racing' ? 'RACE IN PROGRESS...' : 'RACE COMPLETE'}
            </p>
            <div className="w-full max-w-lg flex flex-col gap-3">
              {HORSE_EMOJI.map((emoji, i) => {
                const num = i + 1
                const isWinner = num === winningHorse && phase === 'result'
                const isMine = num === myPick
                return (
                  <div key={i} className="flex items-center gap-3">
                    <span className="font-mono text-[9px] text-[#7A6E58] w-4">{num}</span>
                    <div className="flex-1 bg-[#1E1B14] h-8 relative overflow-hidden border border-[#2E2618]">
                      <div
                        className={`h-full transition-all duration-200 flex items-center ${
                          isWinner ? 'bg-[#D4BF9A]/20' : 'bg-[#DC143C]/10'
                        }`}
                        style={{ width: `${racePos[i]}%` }}
                      />
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-lg">{emoji}</span>
                    </div>
                    <div className="w-16 flex flex-col items-end">
                      {isMine && <span className="font-mono text-[8px] text-[#DC143C]">YOUR PICK</span>}
                      {isWinner && <span className="font-mono text-[8px] text-[#D4BF9A]">WINNER</span>}
                    </div>
                  </div>
                )
              })}
            </div>
            {phase === 'result' && (
              <div className="text-center">
                <p className={`font-serif text-3xl font-bold mb-2 ${won ? 'text-[#D4BF9A]' : 'text-[#DC143C]'}`}>
                  {won ? 'YOUR HORSE WON!' : 'WRONG HORSE'}
                </p>
                <p className="font-mono text-[10px] text-[#7A6E58] mb-6">
                  {HORSE_NAMES[(winningHorse-1)]} crossed the finish line
                </p>
                <button onClick={() => { setPhase('lobby'); setMyPick(null); setRacePos([0,0,0,0,0]); setPayoutDone(false); setLobbyId(null) }}
                  className="px-8 py-3 bg-[#DC143C] font-mono text-[10px] tracking-widest text-[#D4BF9A] hover:bg-[#B01030] transition-colors">
                  RACE AGAIN
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
