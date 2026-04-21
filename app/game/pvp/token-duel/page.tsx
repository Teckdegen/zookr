'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppLayout } from '@/components/AppLayout'
import { SkullIcon } from '@/components/icons'
import { PvPLobby } from '@/components/PvPLobby'

export default function TokenDuelPage() {
  const router = useRouter()
  const [lobbyId, setLobbyId] = useState<string | null>(null)
  const [gameData, setGameData] = useState<Record<string, unknown> | null>(null)
  const [isP1, setIsP1] = useState(false)
  const [resolving, setResolving] = useState(false)
  const [result, setResult] = useState<{ winner_username: string; payout_usd: number; game_data: Record<string, unknown> } | null>(null)

  async function handleResolve(id: string) {
    setResolving(true)
    const res = await fetch('/api/pvp/resolve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lobby_id: id }),
    })
    const data = await res.json()
    setResult(data)
    setResolving(false)
  }

  function handleGameStart(id: string, data: Record<string, unknown>, p1: boolean) {
    setLobbyId(id)
    setGameData(data)
    setIsP1(p1)
  }

  if (result && gameData) {
    const gd = result.game_data as { p1_number: number; p2_number: number; winner: string }
    const myNumber = isP1 ? gd.p1_number : gd.p2_number
    const theirNumber = isP1 ? gd.p2_number : gd.p1_number
    const iWon = (isP1 && gd.winner === 'p1') || (!isP1 && gd.winner === 'p2')
    return (
      <AppLayout active="play" fullBleed>
        <div className="min-h-screen bg-[#0A0806] flex flex-col items-center justify-center gap-6 px-6">
          <SkullIcon size={48} className={iWon ? 'text-[#D4BF9A]' : 'text-[#DC143C]'} />
          <h1 className={`font-serif text-4xl font-bold ${iWon ? 'text-[#D4BF9A]' : 'text-[#DC143C]'}`}>
            {iWon ? 'VALHALLA' : 'DEFEATED'}
          </h1>
          <div className="font-mono text-sm text-[#7A6E58] text-center space-y-1">
            <p>You drew: <span className="text-[#D4BF9A] text-xl">{myNumber}</span></p>
            <p>Opponent drew: <span className="text-[#DC143C] text-xl">{theirNumber}</span></p>
          </div>
          <p className={`font-mono text-2xl ${iWon ? 'text-[#D4BF9A]' : 'text-[#7A6E58]'}`}>
            {iWon ? `+$${result.payout_usd.toFixed(2)}` : 'Lost stake'}
          </p>
          <button onClick={() => { setResult(null); setGameData(null); setLobbyId(null) }}
            className="mt-4 w-48 py-3 bg-[#DC143C] font-mono text-xs tracking-widest text-[#D4BF9A] hover:bg-[#B01030] transition-colors">
            PLAY AGAIN
          </button>
        </div>
      </AppLayout>
    )
  }

  if (lobbyId && gameData) {
    return (
      <AppLayout active="play" fullBleed>
        <div className="min-h-screen bg-[#0A0806] flex flex-col items-center justify-center gap-8 px-6">
          <SkullIcon size={40} className="text-[#DC143C] animate-pulse" />
          <h2 className="font-serif text-3xl text-[#D4BF9A]">TOKEN DUEL</h2>
          <p className="font-mono text-[10px] text-[#7A6E58] tracking-widest text-center">
            Both draws are in. The server decides fate.
          </p>
          <button
            onClick={() => handleResolve(lobbyId)}
            disabled={resolving}
            className="w-48 py-4 bg-[#DC143C] font-mono text-sm tracking-widest text-[#D4BF9A] hover:bg-[#B01030] transition-colors disabled:opacity-50"
          >
            {resolving ? 'DRAWING...' : 'DRAW'}
          </button>
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
          <p className="font-mono text-[9px] text-[#7A6E58] tracking-widest uppercase">Token Duel</p>
          <span className="font-mono text-[9px] text-[#2E2618]">·</span>
          <p className="font-mono text-[9px] text-[#7A6E58]">1v1 random draw</p>
        </div>
        <div className="flex-1 flex items-center justify-center bg-[#0A0806]">
          <PvPLobby gameType="token-duel" gameTitle="TOKEN DUEL" onGameStart={handleGameStart} />
        </div>
      </div>
    </AppLayout>
  )
}
