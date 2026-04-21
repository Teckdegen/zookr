'use client'

import { useState, useEffect } from 'react'
import { AppLayout } from '@/components/AppLayout'
import { PvPLobby } from '@/components/PvPLobby'

type Move = 'skull' | 'shield' | 'axe'
const MOVE_EMOJI: Record<Move, string> = { skull: '💀', shield: '🛡️', axe: '⚔️' }
const MOVE_LABEL: Record<Move, string> = { skull: 'SKULL', shield: 'SHIELD', axe: 'AXE' }
const RULE = 'Skull crushes Shield · Shield blocks Axe · Axe cuts Skull'

type Phase = 'lobby' | 'playing' | 'result'

export default function BoneCrusherPage() {
  const [phase, setPhase] = useState<Phase>('lobby')
  const [lobbyId, setLobbyId] = useState<string | null>(null)
  const [gameData, setGameData] = useState<Record<string, unknown>>({})
  const [isP1, setIsP1] = useState(false)
  const [currentRound, setCurrentRound] = useState(0)
  const [payoutDone, setPayoutDone] = useState(false)

  type RoundData = { p1: Move; p2: Move; winner: string }
  const rounds = (gameData.rounds as RoundData[]) || []
  const winner = gameData.winner as string
  const myRole = isP1 ? 'p1' : 'p2'
  const won = winner === myRole

  const myWins = rounds.slice(0,currentRound).filter(r => r.winner === myRole).length
  const oppWins = rounds.slice(0,currentRound).filter(r => r.winner !== myRole && r.winner !== 'tie').length

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
    }, 1000)
    return () => clearInterval(iv)
  }, [phase, rounds.length, lobbyId, payoutDone])

  return (
    <AppLayout active="play" fullBleed>
      <div className="min-h-[calc(100vh-56px)] bg-[#0A0806] flex flex-col">
        <div className="px-4 py-3 border-b border-[#2E2618] bg-[#1E1B14] flex items-center gap-3">
          <p className="font-mono text-[9px] text-[#7A6E58] tracking-widest uppercase">Bone Crusher</p>
          <span className="font-mono text-[9px] text-[#2E2618]">·</span>
          <p className="font-mono text-[9px] text-[#7A6E58]">Best of 5</p>
        </div>

        {phase === 'lobby' && (
          <div className="flex-1 flex items-center justify-center">
            <PvPLobby gameType="bone-crusher" gameTitle="Bone Crusher" onGameStart={handleGameStart} />
          </div>
        )}

        {(phase === 'playing' || phase === 'result') && (
          <div className="flex-1 flex flex-col items-center justify-center gap-8 px-6">
            <p className="font-mono text-[9px] text-[#7A6E58] text-center">{RULE}</p>

            {/* Score */}
            <div className="flex items-center gap-12">
              <div className="text-center">
                <p className="font-mono text-[9px] text-[#7A6E58]">{isP1 ? 'YOU' : 'OPPONENT'}</p>
                <p className="font-serif text-4xl font-bold text-[#D4BF9A]">{myWins}</p>
              </div>
              <p className="font-mono text-xl text-[#7A6E58]">—</p>
              <div className="text-center">
                <p className="font-mono text-[9px] text-[#7A6E58]">{isP1 ? 'OPPONENT' : 'YOU'}</p>
                <p className="font-serif text-4xl font-bold text-[#D4BF9A]">{oppWins}</p>
              </div>
            </div>

            {/* Rounds */}
            <div className="flex flex-col gap-2 w-full max-w-sm">
              {rounds.slice(0, currentRound).map((ro, i) => {
                const myMove = isP1 ? ro.p1 : ro.p2
                const oppMove = isP1 ? ro.p2 : ro.p1
                const rWon = ro.winner === myRole
                return (
                  <div key={i} className={`flex items-center justify-between p-3 border ${
                    rWon ? 'border-[#D4BF9A]/30 bg-[#D4BF9A]/5' : ro.winner === 'tie' ? 'border-[#2E2618]' : 'border-[#DC143C]/30 bg-[#DC143C]/5'
                  }`}>
                    <span className="font-mono text-[9px] text-[#7A6E58]">R{i+1}</span>
                    <div className="flex items-center gap-4">
                      <span className="text-2xl">{MOVE_EMOJI[myMove]}</span>
                      <span className="font-mono text-[8px] text-[#7A6E58]">{MOVE_LABEL[myMove]}</span>
                      <span className="font-mono text-[9px] text-[#7A6E58]">vs</span>
                      <span className="font-mono text-[8px] text-[#7A6E58]">{MOVE_LABEL[oppMove]}</span>
                      <span className="text-2xl">{MOVE_EMOJI[oppMove]}</span>
                    </div>
                    <span className={`font-mono text-[9px] ${rWon ? 'text-[#D4BF9A]' : ro.winner === 'tie' ? 'text-[#7A6E58]' : 'text-[#DC143C]'}`}>
                      {ro.winner === 'tie' ? 'TIE' : rWon ? 'WIN' : 'LOSS'}
                    </span>
                  </div>
                )
              })}
            </div>

            {phase === 'result' && (
              <div className="text-center">
                <p className={`font-serif text-3xl font-bold mb-2 ${won ? 'text-[#D4BF9A]' : 'text-[#DC143C]'}`}>
                  {won ? 'CRUSHER WINS!' : 'CRUSHED'}
                </p>
                <button onClick={() => { setPhase('lobby'); setCurrentRound(0); setPayoutDone(false); setLobbyId(null) }}
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
