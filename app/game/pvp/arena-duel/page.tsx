'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppLayout } from '@/components/AppLayout'
import { SkullIcon } from '@/components/icons'
import { PvPLobby } from '@/components/PvPLobby'

function HpBar({ hp, label, color }: { hp: number; label: string; color: string }) {
  return (
    <div className="w-full max-w-xs">
      <div className="flex justify-between mb-1">
        <span className="font-mono text-[9px] text-[#7A6E58]">{label}</span>
        <span className="font-mono text-[9px]" style={{ color }}>{hp} HP</span>
      </div>
      <div className="h-3 bg-[#1E1B14] border border-[#2E2618]">
        <div className="h-full transition-all duration-500" style={{ width: `${Math.max(0, hp)}%`, backgroundColor: color }} />
      </div>
    </div>
  )
}

export default function ArenaDuelPage() {
  const router = useRouter()
  const [lobbyId, setLobbyId] = useState<string | null>(null)
  const [gameData, setGameData] = useState<Record<string, unknown> | null>(null)
  const [isP1, setIsP1] = useState(false)
  const [resolving, setResolving] = useState(false)
  const [roundIndex, setRoundIndex] = useState(0)
  const [p1Hp, setP1Hp] = useState(100)
  const [p2Hp, setP2Hp] = useState(100)
  const [attacking, setAttacking] = useState(false)
  const [result, setResult] = useState<{ winner_username: string; payout_usd: number; game_data: Record<string, unknown> } | null>(null)
  const [allRounds, setAllRounds] = useState<{ p1_dmg: number; p2_dmg: number; p1_hp: number; p2_hp: number }[]>([])

  function handleGameStart(id: string, data: Record<string, unknown>, p1: boolean) {
    setLobbyId(id); setGameData(data); setIsP1(p1)
    setRoundIndex(0); setP1Hp(100); setP2Hp(100); setAllRounds([])
  }

  async function handleAttack() {
    if (!gameData || attacking) return
    const rounds = gameData.rounds as { p1_dmg: number; p2_dmg: number; p1_hp: number; p2_hp: number }[]
    if (roundIndex >= rounds.length) return
    setAttacking(true)
    await new Promise(r => setTimeout(r, 400))
    const round = rounds[roundIndex]
    setP1Hp(round.p1_hp)
    setP2Hp(round.p2_hp)
    setRoundIndex(i => i + 1)
    setAllRounds(prev => [...prev, round])
    setAttacking(false)

    if (round.p1_hp <= 0 || round.p2_hp <= 0) {
      // trigger resolve
      setResolving(true)
      const res = await fetch('/api/pvp/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lobby_id: lobbyId }),
      })
      const data = await res.json()
      setResult(data)
      setResolving(false)
    }
  }

  const rounds = gameData?.rounds as { p1_dmg: number; p2_dmg: number; p1_hp: number; p2_hp: number }[] | undefined
  const isDone = rounds && roundIndex >= rounds.length
  const myHp = isP1 ? p1Hp : p2Hp
  const theirHp = isP1 ? p2Hp : p1Hp

  if (result && gameData) {
    const gd = result.game_data as { winner: string }
    const iWon = (isP1 && gd.winner === 'p1') || (!isP1 && gd.winner === 'p2')
    return (
      <AppLayout active="play" fullBleed>
        <div className="min-h-screen bg-[#0A0806] flex flex-col items-center justify-center gap-6 px-6">
          <SkullIcon size={64} className={iWon ? 'text-[#D4BF9A]' : 'text-[#DC143C]'} />
          <h1 className={`font-serif text-4xl font-bold ${iWon ? 'text-[#D4BF9A]' : 'text-[#DC143C]'}`}>
            {iWon ? 'VALHALLA' : 'DEFEATED'}
          </h1>
          <HpBar hp={myHp} label="YOUR HP" color="#D4BF9A" />
          <HpBar hp={theirHp} label="OPPONENT HP" color="#DC143C" />
          <p className={`font-mono text-2xl ${iWon ? 'text-[#D4BF9A]' : 'text-[#7A6E58]'}`}>
            {iWon ? `+$${result.payout_usd.toFixed(2)}` : 'Lost stake'}
          </p>
          <button onClick={() => { setResult(null); setGameData(null); setLobbyId(null); setP1Hp(100); setP2Hp(100); setRoundIndex(0) }}
            className="mt-4 w-48 py-3 bg-[#DC143C] font-mono text-xs tracking-widest text-[#D4BF9A] hover:bg-[#B01030] transition-colors">
            DUEL AGAIN
          </button>
        </div>
      </AppLayout>
    )
  }

  if (lobbyId && gameData) {
    const lastRound = allRounds[allRounds.length - 1]
    return (
      <AppLayout active="play" fullBleed>
        <div className="min-h-screen bg-[#0A0806] flex flex-col items-center justify-center gap-6 px-6">
          <h2 className="font-serif text-3xl text-[#D4BF9A]">ARENA DUEL</h2>
          <div className="w-full max-w-xs space-y-4">
            <HpBar hp={myHp} label="YOU" color="#D4BF9A" />
            <HpBar hp={theirHp} label="OPPONENT" color="#DC143C" />
          </div>
          {lastRound && (
            <div className="font-mono text-[10px] text-[#7A6E58] text-center">
              <p>You dealt <span className="text-[#D4BF9A]">{isP1 ? lastRound.p1_dmg : lastRound.p2_dmg}</span> damage</p>
              <p>Received <span className="text-[#DC143C]">{isP1 ? lastRound.p2_dmg : lastRound.p1_dmg}</span> damage</p>
            </div>
          )}
          <p className="font-mono text-[9px] text-[#7A6E58]">Round {roundIndex} / {rounds?.length || '?'}</p>
          {!isDone && !result && (
            <button onClick={handleAttack} disabled={attacking || resolving}
              className="w-48 py-4 bg-[#DC143C] font-mono text-sm tracking-widest text-[#D4BF9A] hover:bg-[#B01030] disabled:opacity-50 transition-colors">
              {attacking ? 'ATTACKING...' : 'ATTACK'}
            </button>
          )}
          {isDone && !result && (
            <button onClick={handleAttack} disabled={resolving}
              className="w-48 py-4 bg-[#DC143C] font-mono text-sm tracking-widest text-[#D4BF9A] hover:bg-[#B01030] disabled:opacity-50 transition-colors">
              {resolving ? 'RESOLVING...' : 'FINISH'}
            </button>
          )}
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout active="play" fullBleed>
      <div className="flex flex-col min-h-[calc(100vh-56px)]">
        <div className="px-4 md:px-6 py-3 border-b border-[#2E2618] bg-[#1E1B14] flex items-center gap-3">
          <button onClick={() => router.back()} className="font-mono text-[9px] text-[#7A6E58] mr-2">←</button>
          <SkullIcon size={14} className="text-[#7A6E58]" />
          <p className="font-mono text-[9px] text-[#7A6E58] tracking-widest uppercase">Arena Duel</p>
          <span className="font-mono text-[9px] text-[#2E2618]">·</span>
          <p className="font-mono text-[9px] text-[#7A6E58]">Last warrior standing</p>
        </div>
        <div className="flex-1 flex items-center justify-center bg-[#0A0806]">
          <PvPLobby gameType="arena-duel" gameTitle="ARENA DUEL" onGameStart={handleGameStart} />
        </div>
      </div>
    </AppLayout>
  )
}
