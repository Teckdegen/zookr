'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppLayout } from '@/components/AppLayout'
import { SkullIcon } from '@/components/icons'
import { PvPLobby } from '@/components/PvPLobby'

export default function DeathWheelPage() {
  const router = useRouter()
  const [lobbyId, setLobbyId] = useState<string | null>(null)
  const [gameData, setGameData] = useState<Record<string, unknown> | null>(null)
  const [isP1, setIsP1] = useState(false)
  const [spinning, setSpinning] = useState(false)
  const [spinDeg, setSpinDeg] = useState(0)
  const [displayNum, setDisplayNum] = useState(0)
  const [resolving, setResolving] = useState(false)
  const [result, setResult] = useState<{ winner_username: string; payout_usd: number; game_data: Record<string, unknown> } | null>(null)

  function handleGameStart(id: string, data: Record<string, unknown>, p1: boolean) {
    setLobbyId(id); setGameData(data); setIsP1(p1)
  }

  async function handleSpin() {
    if (!lobbyId || spinning || resolving) return
    setSpinning(true)
    const interval = setInterval(() => {
      setDisplayNum(Math.floor(Math.random() * 100))
      setSpinDeg(d => d + 30)
    }, 80)
    await new Promise(r => setTimeout(r, 2500))
    clearInterval(interval)
    setSpinning(false)
    setResolving(true)
    const res = await fetch('/api/pvp/resolve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lobby_id: lobbyId }),
    })
    const data = await res.json()
    const gd = data.game_data as { spin_degrees: number; winner: string }
    setDisplayNum(gd.spin_degrees % 100)
    setResult(data)
    setResolving(false)
  }

  if (result && gameData) {
    const gd = result.game_data as { spin_degrees: number; winner: string }
    const finalNum = gd.spin_degrees % 100
    const iWon = (isP1 && gd.winner === 'p1') || (!isP1 && gd.winner === 'p2')
    return (
      <AppLayout active="play" fullBleed>
        <div className="min-h-screen bg-[#0A0806] flex flex-col items-center justify-center gap-6 px-6">
          <h1 className={`font-serif text-4xl font-bold ${iWon ? 'text-[#D4BF9A]' : 'text-[#DC143C]'}`}>
            {iWon ? 'VALHALLA' : 'DEFEATED'}
          </h1>
          <div className={`w-40 h-40 rounded-full border-4 flex flex-col items-center justify-center ${
            iWon ? 'border-[#D4BF9A]' : 'border-[#DC143C]'
          }`}>
            <p className="font-serif text-5xl font-bold text-[#D4BF9A]">{finalNum}</p>
            <p className="font-mono text-[9px] text-[#7A6E58]">{finalNum < 50 ? 'P1 ZONE' : 'P2 ZONE'}</p>
          </div>
          <div className="font-mono text-sm text-[#7A6E58] text-center space-y-1">
            <p>0-49: <span className="text-[#D4BF9A]">Player 1 wins</span></p>
            <p>50-99: <span className="text-[#DC143C]">Player 2 wins</span></p>
            <p>You are: <span className="text-[#D4BF9A]">{isP1 ? 'Player 1 (0-49)' : 'Player 2 (50-99)'}</span></p>
          </div>
          <p className={`font-mono text-2xl ${iWon ? 'text-[#D4BF9A]' : 'text-[#7A6E58]'}`}>
            {iWon ? `+$${result.payout_usd.toFixed(2)}` : 'Lost stake'}
          </p>
          <button onClick={() => { setResult(null); setGameData(null); setLobbyId(null) }}
            className="mt-4 w-48 py-3 bg-[#DC143C] font-mono text-xs tracking-widest text-[#D4BF9A] hover:bg-[#B01030] transition-colors">
            SPIN AGAIN
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
          <h2 className="font-serif text-3xl text-[#D4BF9A]">DEATH WHEEL</h2>

          <div
            className="w-40 h-40 rounded-full border-4 border-[#DC143C] flex items-center justify-center transition-transform"
            style={{ transform: `rotate(${spinDeg}deg)`, transition: spinning ? 'transform 0.08s linear' : 'none' }}
          >
            <span className="font-serif text-4xl text-[#D4BF9A]">{spinning ? displayNum : '?'}</span>
          </div>

          <div className="font-mono text-[10px] text-[#7A6E58] text-center space-y-1">
            <p>You are: <span className="text-[#D4BF9A]">{isP1 ? 'Player 1 — wins if 0-49' : 'Player 2 — wins if 50-99'}</span></p>
          </div>

          <button onClick={handleSpin} disabled={spinning || resolving}
            className="w-48 py-4 bg-[#DC143C] font-mono text-sm tracking-widest text-[#D4BF9A] hover:bg-[#B01030] disabled:opacity-50 transition-colors">
            {spinning ? 'SPINNING...' : resolving ? 'RESOLVING...' : 'SPIN WHEEL'}
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
          <p className="font-mono text-[9px] text-[#7A6E58] tracking-widest uppercase">Death Wheel</p>
          <span className="font-mono text-[9px] text-[#2E2618]">·</span>
          <p className="font-mono text-[9px] text-[#7A6E58]">Spin the wheel</p>
        </div>
        <div className="flex-1 flex items-center justify-center bg-[#0A0806]">
          <PvPLobby gameType="death-wheel" gameTitle="DEATH WHEEL" onGameStart={handleGameStart} />
        </div>
      </div>
    </AppLayout>
  )
}
