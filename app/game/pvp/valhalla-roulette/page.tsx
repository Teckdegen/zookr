'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppLayout } from '@/components/AppLayout'
import { SkullIcon } from '@/components/icons'
import { PvPLobby } from '@/components/PvPLobby'

function getColor(n: number): 'red' | 'black' | 'green' {
  if (n === 0) return 'green'
  const reds = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]
  return reds.includes(n) ? 'red' : 'black'
}

export default function ValhallaRoulettePage() {
  const router = useRouter()
  const [lobbyId, setLobbyId] = useState<string | null>(null)
  const [gameData, setGameData] = useState<Record<string, unknown> | null>(null)
  const [isP1, setIsP1] = useState(false)
  const [myPick, setMyPick] = useState<'red' | 'black' | null>(null)
  const [spinning, setSpinning] = useState(false)
  const [spinNum, setSpinNum] = useState(0)
  const [resolving, setResolving] = useState(false)
  const [result, setResult] = useState<{ winner_username: string; payout_usd: number; game_data: Record<string, unknown> } | null>(null)

  function handleGameStart(id: string, data: Record<string, unknown>, p1: boolean) {
    setLobbyId(id); setGameData(data); setIsP1(p1)
  }

  async function handleSpin() {
    if (!lobbyId || spinning || !myPick) return
    setSpinning(true)
    const interval = setInterval(() => setSpinNum(Math.floor(Math.random() * 37)), 100)
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
    const gd = data.game_data as { spin_result: number }
    setSpinNum(gd.spin_result)
    setResult(data)
    setResolving(false)
  }

  if (result && gameData) {
    const gd = result.game_data as { spin_result: number; winner: string }
    const landedColor = getColor(gd.spin_result)
    const iWon = (isP1 && gd.winner === 'p1') || (!isP1 && gd.winner === 'p2')
    const colorClass = landedColor === 'red' ? 'text-[#DC143C]' : landedColor === 'green' ? 'text-green-400' : 'text-[#7A6E58]'
    return (
      <AppLayout active="play" fullBleed>
        <div className="min-h-screen bg-[#0A0806] flex flex-col items-center justify-center gap-6 px-6">
          <h1 className={`font-serif text-4xl font-bold ${iWon ? 'text-[#D4BF9A]' : 'text-[#DC143C]'}`}>
            {iWon ? 'VALHALLA' : 'DEFEATED'}
          </h1>
          <div className={`w-32 h-32 rounded-full border-4 flex items-center justify-center ${
            landedColor === 'red' ? 'border-[#DC143C] bg-[#DC143C]/20' : landedColor === 'green' ? 'border-green-400 bg-green-400/20' : 'border-[#2E2618] bg-[#1E1B14]'
          }`}>
            <span className={`font-serif text-4xl font-bold ${colorClass}`}>{gd.spin_result}</span>
          </div>
          <div className="font-mono text-sm text-[#7A6E58] text-center space-y-1">
            <p>Landed: <span className={colorClass}>{gd.spin_result} — {landedColor.toUpperCase()}</span></p>
            <p>You picked: <span className="text-[#D4BF9A]">{myPick?.toUpperCase()}</span></p>
          </div>
          <p className={`font-mono text-2xl ${iWon ? 'text-[#D4BF9A]' : 'text-[#7A6E58]'}`}>
            {iWon ? `+$${result.payout_usd.toFixed(2)}` : 'Lost stake'}
          </p>
          <button onClick={() => { setResult(null); setGameData(null); setLobbyId(null); setMyPick(null) }}
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
          <h2 className="font-serif text-3xl text-[#D4BF9A]">VALHALLA ROULETTE</h2>

          <div className={`w-40 h-40 rounded-full border-4 flex items-center justify-center transition-all ${
            spinning ? 'border-[#DC143C] animate-spin' : 'border-[#2E2618]'
          }`}>
            <span className="font-serif text-5xl text-[#D4BF9A]">{spinning ? spinNum : '?'}</span>
          </div>

          {!myPick ? (
            <>
              <p className="font-mono text-[10px] text-[#7A6E58] tracking-widest">PICK YOUR COLOR</p>
              <div className="flex gap-4">
                <button onClick={() => setMyPick('red')}
                  className="w-24 py-3 bg-[#DC143C] font-mono text-xs tracking-widest text-[#D4BF9A] hover:bg-[#B01030] transition-colors">
                  RED
                </button>
                <button onClick={() => setMyPick('black')}
                  className="w-24 py-3 bg-[#1E1B14] border border-[#7A6E58] font-mono text-xs tracking-widest text-[#7A6E58] hover:border-[#D4BF9A] transition-colors">
                  BLACK
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="font-mono text-[10px] text-[#7A6E58]">
                Your pick: <span className={myPick === 'red' ? 'text-[#DC143C]' : 'text-[#D4BF9A]'}>{myPick.toUpperCase()}</span>
              </p>
              <button onClick={handleSpin} disabled={spinning || resolving}
                className="w-48 py-4 bg-[#DC143C] font-mono text-sm tracking-widest text-[#D4BF9A] hover:bg-[#B01030] disabled:opacity-50 transition-colors">
                {spinning ? 'SPINNING...' : resolving ? 'RESOLVING...' : 'SPIN'}
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
          <p className="font-mono text-[9px] text-[#7A6E58] tracking-widest uppercase">Valhalla Roulette</p>
          <span className="font-mono text-[9px] text-[#2E2618]">·</span>
          <p className="font-mono text-[9px] text-[#7A6E58]">Spin the wheel</p>
        </div>
        <div className="flex-1 flex items-center justify-center bg-[#0A0806]">
          <PvPLobby gameType="valhalla-roulette" gameTitle="VALHALLA ROULETTE" onGameStart={handleGameStart} />
        </div>
      </div>
    </AppLayout>
  )
}
