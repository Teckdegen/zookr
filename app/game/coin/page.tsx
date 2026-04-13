'use client'

import { useEffect, useRef, useState } from 'react'
import { useAccount, useWriteContract } from 'wagmi'
import { parseUnits } from 'viem'
import { useRouter } from 'next/navigation'
import { AppLayout } from '@/components/AppLayout'
import { SkullIcon } from '@/components/icons'
import { TOKENS, ERC20_ABI } from '@/lib/wagmi'
import { getTokenPricesUSD, usdToTokens } from '@/lib/tokenPrice'

type Token = 'DEAD' | 'UDEAD'
type Side = 'heads' | 'tails'
type Phase = 'idle' | 'signing' | 'flipping' | 'result'

const MASTER_ADDRESS = process.env.NEXT_PUBLIC_MASTER_WALLET_ADDRESS as `0x${string}`

// ── Sounds ────────────────────────────────────────────────────────────────────
function playSound(type: 'win' | 'loss' | 'flip') {
  try {
    const ctx  = new (window.AudioContext || (window as any).webkitAudioContext)()
    const osc  = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain); gain.connect(ctx.destination)
    if (type === 'win') {
      osc.frequency.setValueAtTime(523, ctx.currentTime)
      osc.frequency.setValueAtTime(659, ctx.currentTime + 0.1)
      osc.frequency.setValueAtTime(784, ctx.currentTime + 0.2)
      gain.gain.setValueAtTime(0.3, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6)
      osc.start(); osc.stop(ctx.currentTime + 0.6)
    } else if (type === 'loss') {
      osc.frequency.setValueAtTime(300, ctx.currentTime)
      osc.frequency.setValueAtTime(180, ctx.currentTime + 0.2)
      gain.gain.setValueAtTime(0.3, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
      osc.start(); osc.stop(ctx.currentTime + 0.4)
    } else {
      osc.type = 'square'
      osc.frequency.setValueAtTime(200, ctx.currentTime)
      osc.frequency.linearRampToValueAtTime(400, ctx.currentTime + 0.06)
      gain.gain.setValueAtTime(0.08, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06)
      osc.start(); osc.stop(ctx.currentTime + 0.06)
    }
  } catch {}
}

export default function CoinFlipPage() {
  const { address } = useAccount()
  const router = useRouter()
  const { writeContractAsync } = useWriteContract()

  const [token, setToken]       = useState<Token>('DEAD')
  const [stakeUsd, setStakeUsd] = useState(1)
  const [tokenPrices, setTokenPrices] = useState<{ DEAD: number; UDEAD: number }>({ DEAD: 0, UDEAD: 0 })
  const [pick, setPick]         = useState<Side | null>(null)
  const [phase, setPhase]       = useState<Phase>('idle')
  const [result, setResult]     = useState<'win' | 'loss' | null>(null)
  const [landedSide, setLandedSide] = useState<Side | null>(null)
  const [error, setError]       = useState('')
  const [flipCount, setFlipCount] = useState(0)

  const sessionIdRef = useRef<string | null>(null)
  const outcomeRef   = useRef<'win' | 'loss' | null>(null)
  const flipTimer    = useRef<ReturnType<typeof setInterval> | null>(null)

  const stakeNum    = stakeUsd
  const tokenAmount = tokenPrices[token] > 0 ? usdToTokens(stakeNum, tokenPrices[token]) : 0

  useEffect(() => { getTokenPricesUSD().then(setTokenPrices) }, [])

  async function handleFlip(side: Side) {
    if (phase !== 'idle') return
    if (!address) { router.push('/'); return }
    if (tokenAmount <= 0) { setError('Price unavailable, try again'); return }

    setError('')
    setPick(side)
    setPhase('signing')

    try {
      const rawAmount = parseUnits(tokenAmount.toFixed(18), TOKENS[token].decimals)

      const betTxHash = await writeContractAsync({
        address: TOKENS[token].address,
        abi: ERC20_ABI,
        functionName: 'transfer',
        args: [MASTER_ADDRESS, rawAmount],
      })

      const res = await fetch('/api/game/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet_address:    address,
          game_type:         'expert_option', // reuses same sequence engine
          token,
          bet_amount_usd:    stakeNum,
          bet_amount_tokens: tokenAmount,
          bet_tx_hash:       betTxHash,
        }),
      })
      const data = await res.json()

      if (!res.ok || data.error) {
        setError(data.error ?? 'Failed to start game')
        setPhase('idle')
        return
      }

      sessionIdRef.current = data.session_id
      outcomeRef.current   = data.outcome
      setPhase('flipping')

      // Animate coin flip — rapid side changes
      let count = 0
      const totalFlips = 18 + Math.floor(Math.random() * 8)
      flipTimer.current = setInterval(() => {
        count++
        setFlipCount(count)
        playSound('flip')
        if (count >= totalFlips) {
          clearInterval(flipTimer.current!)
          // Land on the correct side based on outcome
          const won = outcomeRef.current === 'win'
          const landed: Side = won ? side : (side === 'heads' ? 'tails' : 'heads')
          setLandedSide(landed)
          setTimeout(() => resolveGame(landed), 600)
        }
      }, 80)

    } catch (e: any) {
      setError(e?.shortMessage || 'Transaction rejected')
      setPhase('idle')
      setPick(null)
    }
  }

  async function resolveGame(landed: Side) {
    const res = await fetch('/api/game/resolve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id:    sessionIdRef.current,
        price_correct: true, // coin flip doesn't use price direction
      }),
    })
    const data = await res.json()
    playSound(data.result === 'win' ? 'win' : 'loss')
    setResult(data.result)
    setPhase('result')
  }

  function reset() {
    setPhase('idle'); setPick(null); setResult(null); setLandedSide(null)
    setError(''); setFlipCount(0)
    sessionIdRef.current = null; outcomeRef.current = null
    clearInterval(flipTimer.current!)
  }

  // Which face to show during animation
  const showingFace: Side = flipCount % 2 === 0 ? 'heads' : 'tails'
  const displayFace = phase === 'flipping' ? showingFace : (landedSide ?? 'heads')

  return (
    <AppLayout active="play" fullBleed>
      <div className="flex flex-col md:flex-row min-h-[calc(100vh-56px)]">

        {/* Main area */}
        <div className="flex-1 flex flex-col">
          <div className="px-4 md:px-6 py-3 border-b border-[#2E2618] bg-[#1E1B14] flex items-center gap-3">
            <button onClick={() => router.back()} className="font-mono text-[9px] text-[#7A6E58] mr-2 md:hidden">←</button>
            <SkullIcon size={14} className="text-[#7A6E58]" />
            <p className="font-mono text-[9px] text-[#7A6E58] tracking-widest uppercase">Coin Flip</p>
            <span className="font-mono text-[9px] text-[#2E2618]">·</span>
            <p className="font-mono text-[9px] text-[#7A6E58]">Heads or Tails</p>
          </div>

          {/* Coin display */}
          <div className="flex-1 flex flex-col items-center justify-center bg-[#0A0806] px-6 py-12">
            <p className="font-mono text-[9px] text-[#7A6E58] tracking-[0.3em] uppercase mb-10 text-center">
              {phase === 'idle'     ? 'Pick a side. Sign. Fate decides.'
               : phase === 'signing'  ? 'Confirming on-chain...'
               : phase === 'flipping' ? 'The coin is in the air...'
               : landedSide === pick  ? 'It landed your way.' : 'Wrong side.'}
            </p>

            {/* Coin */}
            <div className={`relative w-40 h-40 mb-10 transition-all duration-300 ${
              phase === 'flipping' ? 'scale-110' : 'scale-100'
            }`}>
              <div className={`w-full h-full rounded-full border-4 flex items-center justify-center transition-all duration-150 ${
                phase === 'flipping'
                  ? 'border-[#DC143C] bg-[#1E1B14]'
                  : phase === 'result' && result === 'win'
                    ? 'border-[#D4BF9A] bg-[#1E1B14]'
                    : 'border-[#2E2618] bg-[#1E1B14]'
              }`}>
                {phase === 'idle' ? (
                  <SkullIcon size={56} className="text-[#2E2618]" />
                ) : displayFace === 'heads' ? (
                  <div className="flex flex-col items-center">
                    <SkullIcon size={48} className={phase === 'result' && result === 'win' ? 'text-[#DC143C]' : 'text-[#7A6E58]'} />
                    <p className="font-mono text-[9px] text-[#7A6E58] tracking-widest mt-1">HEADS</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <span className="font-serif text-5xl font-bold text-[#7A6E58]">☽</span>
                    <p className="font-mono text-[9px] text-[#7A6E58] tracking-widest mt-1">TAILS</p>
                  </div>
                )}
              </div>

              {/* Spin ring during flip */}
              {phase === 'flipping' && (
                <div className="absolute inset-0 rounded-full border-2 border-[#DC143C]/30 animate-ping" />
              )}
            </div>

            {/* Pick display */}
            {pick && phase !== 'idle' && (
              <p className="font-mono text-[9px] text-[#7A6E58] tracking-widest">
                YOUR PICK: <span className="text-[#D4BF9A]">{pick.toUpperCase()}</span>
              </p>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="shrink-0 md:w-72 md:border-l border-t md:border-t-0 border-[#2E2618] bg-[#1E1B14] p-4 md:p-6 flex flex-col gap-4">

          {/* Token */}
          <div>
            <p className="font-mono text-[9px] text-[#7A6E58] tracking-widest uppercase mb-2">Collateral Token</p>
            <div className="grid grid-cols-2 gap-px bg-[#2E2618]">
              {(['DEAD', 'UDEAD'] as Token[]).map((t) => (
                <button key={t} onClick={() => { if (phase === 'idle') setToken(t) }}
                  disabled={phase !== 'idle'}
                  className={`py-2 font-mono text-[10px] tracking-widest transition-colors ${
                    token === t ? 'bg-[#DC143C] text-[#D4BF9A]' : 'bg-[#1E1B14] text-[#7A6E58] hover:text-[#D4BF9A]'
                  }`}>
                  ${t}
                </button>
              ))}
            </div>
          </div>

          {/* Stake */}
          <div>
            <p className="font-mono text-[9px] text-[#7A6E58] tracking-widest uppercase mb-2">Stake</p>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <button key={s} onClick={() => { if (phase === 'idle') setStakeUsd(s) }}
                  disabled={phase !== 'idle'}
                  className={`flex-1 py-2 font-mono text-[10px] border transition-colors ${
                    stakeUsd === s ? 'border-[#DC143C] text-[#DC143C] bg-[#DC143C]/10' : 'border-[#2E2618] text-[#7A6E58]'
                  }`}>
                  ${s}
                </button>
              ))}
            </div>
            {tokenPrices[token] > 0 && (
              <p className="font-mono text-[9px] text-[#7A6E58] mt-2">
                = {tokenAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })} ${token}
              </p>
            )}
          </div>

          {error && <p className="font-mono text-[10px] text-[#DC143C]">{error}</p>}

          {phase === 'idle' && (
            <div className="flex flex-col gap-2">
              <button onClick={() => handleFlip('heads')}
                className="w-full py-4 border border-[#2E2618] font-mono text-xs tracking-widest text-[#D4BF9A] bg-[#1E1B14] hover:border-[#D4BF9A] hover:bg-[#D4BF9A]/5 transition-colors flex items-center justify-center gap-3">
                <SkullIcon size={16} className="text-[#D4BF9A]" /> HEADS
              </button>
              <button onClick={() => handleFlip('tails')}
                className="w-full py-4 border border-[#2E2618] font-mono text-xs tracking-widest text-[#DC143C] bg-[#1E1B14] hover:border-[#DC143C] hover:bg-[#DC143C]/5 transition-colors flex items-center justify-center gap-3">
                <span className="text-lg leading-none">☽</span> TAILS
              </button>
            </div>
          )}

          {(phase === 'signing' || phase === 'flipping') && (
            <div className="flex-1 flex items-center justify-center">
              <p className="font-mono text-[10px] text-[#7A6E58] tracking-widest animate-pulse text-center">
                {phase === 'signing' ? 'CONFIRMING ON-CHAIN...' : 'FATE DECIDES...'}
              </p>
            </div>
          )}
        </div>
      </div>

      {phase === 'result' && result && (
        <ResultOverlay result={result} stakeUsd={stakeNum} pick={pick!} landed={landedSide!} onReset={reset} />
      )}
    </AppLayout>
  )
}

function ResultOverlay({ result, stakeUsd, pick, landed, onReset }: {
  result: 'win' | 'loss'; stakeUsd: number; pick: Side; landed: Side; onReset: () => void
}) {
  const isWin = result === 'win'
  return (
    <div className={`fixed inset-0 flex flex-col items-center justify-center z-50 valhalla-enter ${isWin ? 'bg-[#1E1B14]' : 'bg-[#0A0806]'}`}>
      {isWin ? (
        <>
          <SkullIcon size={48} className="text-[#DC143C] mb-6" />
          <p className="font-mono text-[10px] text-[#7A6E58] tracking-[0.4em] uppercase mb-2">Welcome to</p>
          <h1 className="font-serif text-5xl md:text-7xl font-bold text-[#D4BF9A]">VALHALLA</h1>
          <p className="font-mono text-sm text-[#7A6E58] mt-4">{landed.toUpperCase()} — your call.</p>
          <p className="font-mono text-2xl text-[#DC143C] mt-3 mb-2">+ ${(stakeUsd * 2).toFixed(2)}</p>
        </>
      ) : (
        <>
          <SkullIcon size={48} className="text-[#7A6E58] mb-6" />
          <h1 className="font-serif text-3xl md:text-5xl font-bold text-[#D4BF9A] mb-2">The coin betrayed you.</h1>
          <p className="font-mono text-sm text-[#7A6E58] mt-2">
            Landed <span className="text-[#DC143C]">{landed.toUpperCase()}</span> · You picked {pick.toUpperCase()}
          </p>
          <p className="font-mono text-xl text-[#DC143C] mt-4 mb-2">- ${stakeUsd.toFixed(2)}</p>
        </>
      )}
      <button className="btn-filled mt-10 max-w-[200px]" onClick={onReset}>Flip Again</button>
    </div>
  )
}
