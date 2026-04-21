'use client'

import { useState, useEffect } from 'react'
import { AppLayout } from '@/components/AppLayout'
import { PvPLobby } from '@/components/PvPLobby'

type Phase = 'lobby' | 'fighting' | 'result'

export default function ArenaDuelPage() {
  const [phase, setPhase] = useState<Phase>('lobby')
  const [lobbyId, setLobbyId] = useState<string | null>(null)
  const [gameData, setGameData] = useState<Record<string, unknown>>({})
  const [isP1, setIsP1] = useState(false)
  const [currentRound, setCurrentRound] = useState(0)
  const [displayP1Hp, setDisplayP1Hp] = useState(100)
  const [displayP2Hp, setDisplayP2Hp] = useState(100)
  const [payoutDone, setPayoutDone] = useState(false)

  type RoundData = { p1_dmg: number; p2_dmg: number; p1_hp: number; p2_hp: number }
  const rounds = (gameData.rounds as RoundData[]) || []
  const winner = gameData.winner as string
  const myRole = isP1 ? 'p1' : 'p2'
  const won = winner === myRole

  const myHp = isP1 ? displayP1Hp : displayP2Hp
  const oppHp = isP1 ? displayP2Hp : displayP1Hp
  const myMaxHp = 100
  const oppMaxHp = 100

  function handleGameStart(lid: string, data: Record<string, unknown>, p1: boolean) {
    setLobbyId(lid); setGameData(data); setIsP1(p1); setPhase('fighting')
  }

  useEffect(() => {
    if (phase !== 'fighting' || rounds.length === 0) return
    let r = 0
    const iv = setInterval(() => {
      const ro = rounds[r]
      if (!ro) { clearInterval(iv); return }
      setDisplayP1Hp(ro.p1_hp)
      setDisplayP2Hp(ro.p2_hp)
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
    }, 700)
    return () => clearInterval(iv)
  }, [phase, rounds, lobbyId, payoutDone])

  function HpBar({ hp, maxHp, label }: { hp: number; maxHp: number; label: string }) {
    const pct = Math.max(0, (hp / maxHp) * 100)
    const color = pct > 50 ? '#D4BF9A' : pct > 25 ? '#DC8B00' : '#DC143C'
    return (
      <div className="flex flex-col gap-1 w-full">
        <div className="flex justify-between items-center">
          <span className="font-mono text-[9px] text-[#7A6E58]">{label}</span>
          <span className="font-mono text-sm font-bold" style={{color}}>{hp} HP</span>
        </div>
        <div className="h-4 bg-[#1E1B14] border border-[#2E2618] overflow-hidden">
          <div className="h-full transition-all duration-500" style={{ width:`${pct}%`, backgroundColor: color }} />
        </div>
      </div>
    )
  }

  const lastRound = currentRound > 0 ? rounds[currentRound - 1] : null

  return (
    <AppLayout active="play" fullBleed>
      <div className="min-h-[calc(100vh-56px)] bg-[#0A0806] flex flex-col">
        <div className="px-4 py-3 border-b border-[#2E2618] bg-[#1E1B14] flex items-center gap-3">
          <p className="font-mono text-[9px] text-[#7A6E58] tracking-widest uppercase">Arena Duel</p>
          <span className="font-mono text-[9px] text-[#2E2618]">·</span>
          <p className="font-mono text-[9px] text-[#7A6E58]">Last warrior standing</p>
        </div>

        {phase === 'lobby' && (
          <div className="flex-1 flex items-center justify-center">
            <PvPLobby gameType="arena-duel" gameTitle="Arena Duel" onGameStart={handleGameStart} />
          </div>
        )}

        {(phase === 'fighting' || phase === 'result') && (
          <div className="flex-1 flex flex-col items-center justify-center gap-8 px-6 max-w-md mx-auto w-full">
            <p className="font-mono text-[9px] text-[#7A6E58] tracking-[0.3em] uppercase">
              {phase === 'fighting' ? `ROUND ${currentRound}` : 'BATTLE OVER'}
            </p>

            {/* HP Bars */}
            <div className="w-full flex flex-col gap-4">
              <HpBar hp={isP1 ? displayP1Hp : displayP2Hp} maxHp={myMaxHp} label="YOU" />
              <HpBar hp={isP1 ? displayP2Hp : displayP1Hp} maxHp={oppMaxHp} label="OPPONENT" />
            </div>

            {/* Damage log */}
            {lastRound && phase === 'fighting' && (
              <div className="flex items-center gap-8">
                <div className="text-center">
                  <p className="font-mono text-[9px] text-[#7A6E58]">YOU TOOK</p>
                  <p className="font-serif text-2xl font-bold text-[#DC143C]">
                    -{isP1 ? lastRound.p2_dmg : lastRound.p1_dmg}
                  </p>
                </div>
                <span className="font-mono text-[#7A6E58]">⚔️</span>
                <div className="text-center">
                  <p className="font-mono text-[9px] text-[#7A6E58]">YOU DEALT</p>
                  <p className="font-serif text-2xl font-bold text-[#D4BF9A]">
                    -{isP1 ? lastRound.p1_dmg : lastRound.p2_dmg}
                  </p>
                </div>
              </div>
            )}

            {phase === 'result' && (
              <div className="text-center">
                <p className={`font-serif text-3xl font-bold mb-2 ${won ? 'text-[#D4BF9A]' : 'text-[#DC143C]'}`}>
                  {won ? 'LAST WARRIOR STANDING' : 'FALLEN IN BATTLE'}
                </p>
                <p className="font-mono text-[10px] text-[#7A6E58] mb-4">
                  Final: You {myHp} HP · Opponent {oppHp} HP
                </p>
                <button onClick={() => { setPhase('lobby'); setCurrentRound(0); setDisplayP1Hp(100); setDisplayP2Hp(100); setPayoutDone(false); setLobbyId(null) }}
                  className="px-8 py-3 bg-[#DC143C] font-mono text-[10px] tracking-widest text-[#D4BF9A] hover:bg-[#B01030] transition-colors">
                  ENTER ARENA AGAIN
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
