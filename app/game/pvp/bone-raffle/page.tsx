'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppLayout } from '@/components/AppLayout'
import { SkullIcon } from '@/components/icons'
import { PvPLobby } from '@/components/PvPLobby'

export default function BoneRafflePage() {
  const router = useRouter()
  const [lobbyId, setLobbyId] = useState<string | null>(null)
  const [gameData, setGameData] = useState<Record<string, unknown> | null>(null)
  const [isP1, setIsP1] = useState(false)
  const [drawing, setDrawing] = useState(false)
  const [entered, setEntered] = useState(false)
  const [result, setResult] = useState<{ winner_username: string; payout_usd: number; game_data: Record<string, unknown> } | null>(null)

  function handleGameStart(id: string, data: Record<string, unknown>, p1: boolean) {
    setLobbyId(id); setGameData(data); setIsP1(p1)
  }

  async function handleDraw() {
    if (!lobbyId || drawing) return
    setDrawing(true)
    await new Promise(r => setTimeout(r, 2000))
    const res = await fetch('/api/pvp/resolve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lobby_id: lobbyId }),
    })
    const data = await res.json()
    setResult(data)
    setDrawing(false)
  }

  if (result && gameData) {
    const gd = result.game_data as { winner: string; pick: number }
    const iWon = (isP1 && gd.winner === 'p1') || (!isP1 && gd.winner === 'p2')
    return (
      <AppLayout active="play" fullBleed>
        <div className="min-h-screen bg-[#0A0806] flex flex-col items-center justify-center gap-6 px-6">
          <SkullIcon size={64} className={iWon ? 'text-[#D4BF9A]' : 'text-[#DC143C]'} />
          <h1 className={`font-serif text-4xl font-bold ${iWon ? 'text-[#D4BF9A]' : 'text-[#DC143C]'}`}>
            {iWon ? 'VALHALLA' : 'DEFEATED'}
          </h1>
          <div className="font-mono text-sm text-[#7A6E58] text-center space-y-2">
            <p>Raffle number drawn: <span className="text-[#D4BF9A] text-xl">{gd.pick}</span></p>
            <p>Your ticket: <span className="text-[#D4BF9A]">#{isP1 ? 1 : 2}</span></p>
            <p>Winner: <span className="text-[#D4BF9A]">{result.winner_username}</span></p>
          </div>
          <p className={`font-mono text-2xl ${iWon ? 'text-[#D4BF9A]' : 'text-[#7A6E58]'}`}>
            {iWon ? `+$${result.payout_usd.toFixed(2)}` : 'Lost stake'}
          </p>
          <button onClick={() => { setResult(null); setGameData(null); setLobbyId(null); setEntered(false) }}
            className="mt-4 w-48 py-3 bg-[#DC143C] font-mono text-xs tracking-widest text-[#D4BF9A] hover:bg-[#B01030] transition-colors">
            ENTER AGAIN
          </button>
        </div>
      </AppLayout>
    )
  }

  if (lobbyId && gameData) {
    return (
      <AppLayout active="play" fullBleed>
        <div className="min-h-screen bg-[#0A0806] flex flex-col items-center justify-center gap-8 px-6">
          <SkullIcon size={40} className="text-[#DC143C]" />
          <h2 className="font-serif text-3xl text-[#D4BF9A]">BONE RAFFLE</h2>
          <div className="border border-[#2E2618] bg-[#1E1B14] p-6 text-center">
            <p className="font-mono text-[9px] text-[#7A6E58] mb-2">YOUR TICKET</p>
            <p className="font-serif text-6xl text-[#D4BF9A]">#{isP1 ? 1 : 2}</p>
          </div>
          {!entered ? (
            <button onClick={() => setEntered(true)}
              className="w-48 py-4 bg-[#DC143C] font-mono text-sm tracking-widest text-[#D4BF9A] hover:bg-[#B01030] transition-colors">
              ENTER RAFFLE
            </button>
          ) : (
            <button onClick={handleDraw} disabled={drawing}
              className="w-48 py-4 bg-[#DC143C] font-mono text-sm tracking-widest text-[#D4BF9A] hover:bg-[#B01030] disabled:opacity-50 transition-colors">
              {drawing ? 'DRAWING...' : 'DRAW WINNER'}
            </button>
          )}
          {drawing && (
            <div className="flex gap-2 animate-pulse">
              <span className="font-mono text-[9px] text-[#7A6E58]">Drawing a winner...</span>
            </div>
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
          <p className="font-mono text-[9px] text-[#7A6E58] tracking-widest uppercase">Bone Raffle</p>
          <span className="font-mono text-[9px] text-[#2E2618]">·</span>
          <p className="font-mono text-[9px] text-[#7A6E58]">Lucky draw</p>
        </div>
        <div className="flex-1 flex items-center justify-center bg-[#0A0806]">
          <PvPLobby gameType="bone-raffle" gameTitle="BONE RAFFLE" onGameStart={handleGameStart} />
        </div>
      </div>
    </AppLayout>
  )
}
