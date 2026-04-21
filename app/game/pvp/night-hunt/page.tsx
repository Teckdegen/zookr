'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppLayout } from '@/components/AppLayout'
import { SkullIcon } from '@/components/icons'
import { PvPLobby } from '@/components/PvPLobby'

export default function NightHuntPage() {
  const router = useRouter()
  const [lobbyId, setLobbyId] = useState<string | null>(null)
  const [gameData, setGameData] = useState<Record<string, unknown> | null>(null)
  const [isP1, setIsP1] = useState(false)
  const [myPick, setMyPick] = useState<number | null>(null)
  const [resolving, setResolving] = useState(false)
  const [result, setResult] = useState<{ winner_username: string; payout_usd: number; game_data: Record<string, unknown> } | null>(null)

  function handleGameStart(id: string, data: Record<string, unknown>, p1: boolean) {
    setLobbyId(id); setGameData(data); setIsP1(p1); setMyPick(null)
  }

  async function handleReveal() {
    if (!lobbyId || myPick === null || resolving) return
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

  if (result && gameData) {
    const gd = result.game_data as { p1_pick: number; p2_pick: number; winner: string }
    const myActualPick = isP1 ? gd.p1_pick : gd.p2_pick
    const theirPick = isP1 ? gd.p2_pick : gd.p1_pick
    const iWon = (isP1 && gd.winner === 'p1') || (!isP1 && gd.winner === 'p2')
    const same = gd.p1_pick === gd.p2_pick
    return (
      <AppLayout active="play" fullBleed>
        <div className="min-h-screen bg-[#0A0806] flex flex-col items-center justify-center gap-6 px-6">
          <h1 className={`font-serif text-4xl font-bold ${iWon ? 'text-[#D4BF9A]' : 'text-[#DC143C]'}`}>
            {iWon ? 'VALHALLA' : 'DEFEATED'}
          </h1>
          <div className="flex gap-12 text-center">
            <div>
              <p className="font-mono text-[9px] text-[#7A6E58] mb-2">YOU</p>
              <p className="font-serif text-6xl text-[#D4BF9A]">{myActualPick}</p>
            </div>
            <div>
              <p className="font-mono text-[9px] text-[#7A6E58] mb-2">OPPONENT</p>
              <p className="font-serif text-6xl text-[#DC143C]">{theirPick}</p>
            </div>
          </div>
          {same && <p className="font-mono text-[10px] text-[#DC143C]">Both picked same — P1 wins by default</p>}
          <p className={`font-mono text-2xl ${iWon ? 'text-[#D4BF9A]' : 'text-[#7A6E58]'}`}>
            {iWon ? `+$${result.payout_usd.toFixed(2)}` : 'Lost stake'}
          </p>
          <button onClick={() => { setResult(null); setGameData(null); setLobbyId(null); setMyPick(null) }}
            className="mt-4 w-48 py-3 bg-[#DC143C] font-mono text-xs tracking-widest text-[#D4BF9A] hover:bg-[#B01030] transition-colors">
            HUNT AGAIN
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
          <h2 className="font-serif text-3xl text-[#D4BF9A]">NIGHT HUNT</h2>
          <p className="font-mono text-[10px] text-[#7A6E58] text-center">Pick a number 1-10.<br />Unique pick wins. Same picks = P1 wins.</p>
          {myPick === null ? (
            <div className="grid grid-cols-5 gap-2">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <button key={n} onClick={() => setMyPick(n)}
                  className="w-12 h-12 border border-[#2E2618] hover:border-[#DC143C] hover:bg-[#DC143C]/10 font-mono text-lg text-[#D4BF9A] transition-colors">
                  {n}
                </button>
              ))}
            </div>
          ) : (
            <>
              <div className="border border-[#DC143C] bg-[#DC143C]/10 p-6 text-center">
                <p className="font-mono text-[9px] text-[#7A6E58] mb-1">YOUR SECRET PICK</p>
                <p className="font-serif text-5xl text-[#D4BF9A]">{myPick}</p>
              </div>
              <button onClick={handleReveal} disabled={resolving}
                className="w-48 py-4 bg-[#DC143C] font-mono text-sm tracking-widest text-[#D4BF9A] hover:bg-[#B01030] disabled:opacity-50 transition-colors">
                {resolving ? 'REVEALING...' : 'REVEAL'}
              </button>
            </>
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
          <p className="font-mono text-[9px] text-[#7A6E58] tracking-widest uppercase">Night Hunt</p>
          <span className="font-mono text-[9px] text-[#2E2618]">·</span>
          <p className="font-mono text-[9px] text-[#7A6E58]">Hidden number duel</p>
        </div>
        <div className="flex-1 flex items-center justify-center bg-[#0A0806]">
          <PvPLobby gameType="night-hunt" gameTitle="NIGHT HUNT" onGameStart={handleGameStart} />
        </div>
      </div>
    </AppLayout>
  )
}
