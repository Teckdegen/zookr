'use client'

import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { AppLayout } from '@/components/AppLayout'
import { PvPLobby } from '@/components/PvPLobby'

type Phase = 'lobby' | 'playing' | 'result'

export default function TokenDuelPage() {
  const { address } = useAccount()
  const [phase, setPhase] = useState<Phase>('lobby')
  const [lobbyId, setLobbyId] = useState<string | null>(null)
  const [gameData, setGameData] = useState<Record<string, unknown>>({})
  const [isP1, setIsP1] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const [payoutDone, setPayoutDone] = useState(false)

  const p1Num = gameData.p1_number as number
  const p2Num = gameData.p2_number as number
  const winner = gameData.winner as string
  const myRole = isP1 ? 'p1' : 'p2'
  const won = winner === myRole

  function handleGameStart(lid: string, data: Record<string, unknown>, p1: boolean) {
    setLobbyId(lid)
    setGameData(data)
    setIsP1(p1)
    setPhase('playing')
  }

  useEffect(() => {
    if (phase !== 'playing') return
    const t = setTimeout(() => setRevealed(true), 1200)
    return () => clearTimeout(t)
  }, [phase])

  useEffect(() => {
    if (!revealed || payoutDone || !lobbyId) return
    setPayoutDone(true)
    fetch('/api/pvp/result', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lobby_id: lobbyId }),
    })
  }, [revealed, payoutDone, lobbyId])

  return (
    <AppLayout active="play" fullBleed>
      <div className="min-h-[calc(100vh-56px)] bg-[#0A0806] flex flex-col">
        <div className="px-4 py-3 border-b border-[#2E2618] bg-[#1E1B14] flex items-center gap-3">
          <p className="font-mono text-[9px] text-[#7A6E58] tracking-widest uppercase">Token Duel</p>
          <span className="font-mono text-[9px] text-[#2E2618]">·</span>
          <p className="font-mono text-[9px] text-[#7A6E58]">Higher number wins</p>
        </div>

        {phase === 'lobby' && (
          <div className="flex-1 flex items-center justify-center">
            <PvPLobby gameType="token-duel" gameTitle="Token Duel" onGameStart={handleGameStart} />
          </div>
        )}

        {(phase === 'playing' || phase === 'result') && (
          <div className="flex-1 flex flex-col items-center justify-center gap-10 px-6">
            <p className="font-mono text-[9px] text-[#7A6E58] tracking-[0.3em] uppercase">
              {revealed ? 'Numbers revealed' : 'Drawing numbers...'}
            </p>

            <div className="flex items-center gap-12">
              {/* P1 card */}
              <div className="flex flex-col items-center gap-3">
                <p className="font-mono text-[9px] text-[#7A6E58] tracking-widest uppercase">
                  {isP1 ? 'YOU' : 'OPPONENT'}
                </p>
                <div className={`w-28 h-36 border-2 flex items-center justify-center transition-all duration-700 ${
                  revealed
                    ? winner === 'p1'
                      ? 'border-[#D4BF9A] bg-[#D4BF9A]/5'
                      : 'border-[#DC143C] bg-[#DC143C]/5'
                    : 'border-[#2E2618] bg-[#1E1B14]'
                }`}
                  style={{ transform: revealed ? 'rotateY(0deg)' : 'rotateY(90deg)', transition: 'all 0.7s ease' }}>
                  {revealed ? (
                    <span className="font-serif text-5xl font-bold text-[#D4BF9A]">{p1Num}</span>
                  ) : (
                    <span className="font-mono text-2xl text-[#2E2618]">?</span>
                  )}
                </div>
              </div>

              <div className="flex flex-col items-center gap-2">
                <span className="font-mono text-[10px] text-[#7A6E58]">VS</span>
                {revealed && (
                  <span className={`font-serif text-xl font-bold ${won ? 'text-[#D4BF9A]' : 'text-[#DC143C]'}`}>
                    {won ? 'WIN' : 'LOSS'}
                  </span>
                )}
              </div>

              {/* P2 card */}
              <div className="flex flex-col items-center gap-3">
                <p className="font-mono text-[9px] text-[#7A6E58] tracking-widest uppercase">
                  {isP1 ? 'OPPONENT' : 'YOU'}
                </p>
                <div className={`w-28 h-36 border-2 flex items-center justify-center transition-all duration-700 ${
                  revealed
                    ? winner === 'p2'
                      ? 'border-[#D4BF9A] bg-[#D4BF9A]/5'
                      : 'border-[#DC143C] bg-[#DC143C]/5'
                    : 'border-[#2E2618] bg-[#1E1B14]'
                }`}
                  style={{ transform: revealed ? 'rotateY(0deg)' : 'rotateY(90deg)', transition: 'all 0.9s ease' }}>
                  {revealed ? (
                    <span className="font-serif text-5xl font-bold text-[#D4BF9A]">{p2Num}</span>
                  ) : (
                    <span className="font-mono text-2xl text-[#2E2618]">?</span>
                  )}
                </div>
              </div>
            </div>

            {revealed && (
              <div className={`text-center ${won ? 'text-[#D4BF9A]' : 'text-[#DC143C]'}`}>
                <p className="font-serif text-3xl font-bold mb-2">{won ? 'VALHALLA AWAITS' : 'DEFEATED'}</p>
                <p className="font-mono text-[10px] text-[#7A6E58]">
                  {isP1 ? p1Num : p2Num} vs {isP1 ? p2Num : p1Num} — {p1Num > p2Num ? 'P1' : 'P2'} wins
                </p>
                <button
                  onClick={() => { setPhase('lobby'); setRevealed(false); setPayoutDone(false); setLobbyId(null) }}
                  className="mt-6 px-8 py-3 bg-[#DC143C] font-mono text-[10px] tracking-widest text-[#D4BF9A] hover:bg-[#B01030] transition-colors"
                >
                  PLAY AGAIN
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
