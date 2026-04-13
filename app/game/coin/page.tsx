'use client'

import { useRef, useState, useEffect } from 'react'
import { useAccount, useWriteContract } from 'wagmi'
import { parseUnits } from 'viem'
import { useRouter } from 'next/navigation'
import { AppLayout } from '@/components/AppLayout'
import { SkullIcon } from '@/components/icons'
import { TOKENS, ERC20_ABI } from '@/lib/wagmi'
import { getTokenPricesUSD, usdToTokens } from '@/lib/tokenPrice'

type Token = 'DEAD' | 'UDEAD'
type Side  = 'heads' | 'tails'
type Phase = 'idle' | 'signing' | 'flipping' | 'result'

const MASTER_ADDRESS = process.env.NEXT_PUBLIC_MASTER_WALLET_ADDRESS as `0x${string}`
const SKULL_IMG = 'https://www.image2url.com/r2/default/images/1776122004235-7b55981b-e92b-4619-b49e-143bb1183ab0.png'

function playSound(type: 'win' | 'loss') {
  try {
    const ctx  = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
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
    } else {
      osc.frequency.setValueAtTime(300, ctx.currentTime)
      osc.frequency.setValueAtTime(180, ctx.currentTime + 0.2)
      gain.gain.setValueAtTime(0.3, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
      osc.start(); osc.stop(ctx.currentTime + 0.4)
    }
  } catch {}
}

// ── 3-D Coin ─────────────────────────────────────────────────────────────────
function Coin({ rotation, transitioning, phase, result }: {
  rotation: number
  transitioning: boolean
  phase: Phase
  result: 'win' | 'loss' | null
}) {
  const ringColor =
    phase === 'flipping' ? '#DC143C' :
    phase === 'result' && result === 'win' ? '#D4BF9A' : '#2E2618'

  return (
    <div className="relative flex items-center justify-center" style={{ perspective: '900px' }}>
      {/* 3-D coin */}
      <div
        className="w-44 h-44 relative"
        style={{
          transformStyle: 'preserve-3d',
          transform: `rotateY(${rotation}deg)`,
          transition: transitioning ? 'transform 2.6s cubic-bezier(0.22, 0.61, 0.36, 1)' : 'none',
        }}
      >
        {/* HEADS face — upright skull */}
        <div
          className="absolute inset-0 rounded-full overflow-hidden"
          style={{ backfaceVisibility: 'hidden' }}
        >
          <div className={`w-full h-full rounded-full border-4 overflow-hidden ${
            phase === 'result' && result === 'win' ? 'border-[#D4BF9A]' : 'border-[#DC143C]'
          }`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={SKULL_IMG} alt="" className="w-full h-full object-cover object-top" />
          </div>
          <span className="absolute bottom-1 left-0 right-0 text-center font-mono text-[8px] text-[#D4BF9A] tracking-[0.2em]">HEADS</span>
        </div>

        {/* TAILS face — upside-down skull (the bottom of the character) */}
        <div
          className="absolute inset-0 rounded-full overflow-hidden"
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
        >
          <div className="w-full h-full rounded-full border-4 border-[#7A6E58] overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={SKULL_IMG} alt="" className="w-full h-full object-cover object-bottom rotate-180" />
          </div>
          <span className="absolute bottom-1 left-0 right-0 text-center font-mono text-[8px] text-[#DC143C] tracking-[0.2em]">TAILS</span>
        </div>
      </div>

      {/* Glow ring */}
      <div
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{ border: `2px solid ${ringColor}`, boxShadow: phase === 'flipping' ? `0 0 24px ${ringColor}60` : 'none' }}
      />
      {phase === 'flipping' && (
        <div className="absolute inset-0 rounded-full border border-[#DC143C]/20 animate-ping scale-110 pointer-events-none" />
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function CoinFlipPage() {
  const { address } = useAccount()
  const router = useRouter()
  const { writeContractAsync } = useWriteContract()

  const [token, setToken]         = useState<Token>('DEAD')
  const [stakeUsd, setStakeUsd]   = useState(1)
  const [tokenPrices, setTokenPrices] = useState<{ DEAD: number; UDEAD: number }>({ DEAD: 0, UDEAD: 0 })
  const [pick, setPick]           = useState<Side | null>(null)
  const [phase, setPhase]         = useState<Phase>('idle')
  const [result, setResult]       = useState<'win' | 'loss' | null>(null)
  const [landedSide, setLandedSide] = useState<Side | null>(null)
  const [error, setError]         = useState('')

  // Coin 3-D rotation
  const [coinRotation, setCoinRotation]       = useState(0)
  const [coinTransition, setCoinTransition]   = useState(false)

  const sessionIdRef = useRef<string | null>(null)
  const outcomeRef   = useRef<'win' | 'loss' | null>(null)

  const tokenAmount = tokenPrices[token] > 0 ? usdToTokens(stakeUsd, tokenPrices[token]) : 0

  useEffect(() => { getTokenPricesUSD().then(setTokenPrices) }, [])

  async function handleFlip(side: Side) {
    if (phase !== 'idle') return
    if (!address) { router.push('/'); return }
    if (tokenAmount <= 0) { setError('Price unavailable, try again'); return }

    setError(''); setPick(side); setPhase('signing')

    try {
      const rawAmount = parseUnits(tokenAmount.toFixed(18), TOKENS[token].decimals)
      const betTxHash = await writeContractAsync({
        address: TOKENS[token].address,
        abi: ERC20_ABI,
        functionName: 'transfer',
        args: [MASTER_ADDRESS, rawAmount],
      })

      const res  = await fetch('/api/game/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet_address: address, game_type: 'expert_option', token,
          bet_amount_usd: stakeUsd, bet_amount_tokens: tokenAmount, bet_tx_hash: betTxHash,
        }),
      })
      const data = await res.json()
      if (!res.ok || data.error) { setError(data.error ?? 'Failed to start game'); setPhase('idle'); return }

      sessionIdRef.current = data.session_id
      outcomeRef.current   = data.outcome

      const won    = data.outcome === 'win'
      const landed: Side = won ? side : (side === 'heads' ? 'tails' : 'heads')
      setLandedSide(landed)
      setPhase('flipping')

      // Reset coin to 0 without transition, then animate to landing angle
      setCoinTransition(false)
      setCoinRotation(0)
      setTimeout(() => {
        const spins    = (8 + Math.floor(Math.random() * 4)) * 360 // 8-11 full rotations
        const landAngle = landed === 'tails' ? 180 : 360           // tails=180°, heads=360° (full rotation)
        setCoinTransition(true)
        setCoinRotation(spins + landAngle)
        setTimeout(() => resolveFlip(), 2800)
      }, 50)

    } catch (e: unknown) {
      setError((e as { shortMessage?: string })?.shortMessage || 'Transaction rejected')
      setPhase('idle'); setPick(null)
    }
  }

  async function resolveFlip() {
    const res  = await fetch('/api/game/resolve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionIdRef.current, price_correct: true }),
    })
    const data = await res.json()
    playSound(data.result === 'win' ? 'win' : 'loss')
    setResult(data.result)
    setPhase('result')
  }

  function reset() {
    setPhase('idle'); setPick(null); setResult(null); setLandedSide(null); setError('')
    sessionIdRef.current = null; outcomeRef.current = null
    setCoinTransition(false); setCoinRotation(0)
  }

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

          <div className="flex-1 flex flex-col items-center justify-center bg-[#0A0806] px-6 py-12 gap-10">
            <p className="font-mono text-[9px] text-[#7A6E58] tracking-[0.3em] uppercase text-center">
              {phase === 'idle'     ? 'Pick a side. Sign. Fate decides.'
               : phase === 'signing'  ? 'Confirming on-chain...'
               : phase === 'flipping' ? 'The coin is in the air...'
               : landedSide === pick  ? 'It landed your way.' : 'Wrong side.'}
            </p>

            <Coin
              rotation={coinRotation}
              transitioning={coinTransition}
              phase={phase}
              result={result}
            />

            {pick && phase !== 'idle' && (
              <p className="font-mono text-[9px] text-[#7A6E58] tracking-widest">
                YOUR PICK: <span className="text-[#D4BF9A]">{pick.toUpperCase()}</span>
              </p>
            )}
          </div>
        </div>

        {/* Controls sidebar */}
        <div className="shrink-0 md:w-72 md:border-l border-t md:border-t-0 border-[#2E2618] bg-[#1E1B14] p-4 md:p-6 flex flex-col gap-4">

          <div>
            <p className="font-mono text-[9px] text-[#7A6E58] tracking-widest uppercase mb-2">Token</p>
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
              {/* HEADS button — skull upright */}
              <button onClick={() => handleFlip('heads')}
                className="w-full py-3 border border-[#2E2618] font-mono text-xs tracking-widest text-[#D4BF9A] bg-[#0A0806] hover:border-[#D4BF9A] hover:bg-[#D4BF9A]/5 transition-colors flex items-center justify-center gap-3">
                <div className="w-7 h-7 rounded-full overflow-hidden border border-[#DC143C] shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={SKULL_IMG} alt="" className="w-full h-full object-cover object-top" />
                </div>
                HEADS
              </button>
              {/* TAILS button — skull upside down */}
              <button onClick={() => handleFlip('tails')}
                className="w-full py-3 border border-[#2E2618] font-mono text-xs tracking-widest text-[#DC143C] bg-[#0A0806] hover:border-[#DC143C] hover:bg-[#DC143C]/5 transition-colors flex items-center justify-center gap-3">
                <div className="w-7 h-7 rounded-full overflow-hidden border border-[#7A6E58] shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={SKULL_IMG} alt="" className="w-full h-full object-cover object-bottom rotate-180" />
                </div>
                TAILS
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
        <ResultOverlay result={result} stakeUsd={stakeUsd} pick={pick!} landed={landedSide!} onReset={reset} />
      )}
    </AppLayout>
  )
}

function ResultOverlay({ result, stakeUsd, pick, landed, onReset }: {
  result: 'win' | 'loss'; stakeUsd: number; pick: Side; landed: Side; onReset: () => void
}) {
  const isWin = result === 'win'
  return (
    <div className={`fixed inset-0 flex flex-col items-center justify-center z-50 ${isWin ? 'bg-[#1E1B14]' : 'bg-[#0A0806]'}`}>
      {/* Big skull coin */}
      <div className={`w-28 h-28 rounded-full overflow-hidden border-4 mb-6 ${isWin ? 'border-[#D4BF9A]' : 'border-[#7A6E58]'}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={SKULL_IMG} alt=""
          className={`w-full h-full object-cover ${landed === 'tails' ? 'object-bottom rotate-180' : 'object-top'}`}
        />
      </div>

      {isWin ? (
        <>
          <p className="font-mono text-[10px] text-[#7A6E58] tracking-[0.4em] uppercase mb-2">Welcome to</p>
          <h1 className="font-serif text-5xl md:text-7xl font-bold text-[#D4BF9A]">VALHALLA</h1>
          <p className="font-mono text-sm text-[#7A6E58] mt-4">{landed.toUpperCase()} — your call.</p>
          <p className="font-mono text-2xl text-[#DC143C] mt-3 mb-2">+ ${(stakeUsd * 2).toFixed(2)}</p>
        </>
      ) : (
        <>
          <h1 className="font-serif text-3xl md:text-5xl font-bold text-[#D4BF9A] mb-2">The coin betrayed you.</h1>
          <p className="font-mono text-sm text-[#7A6E58] mt-2">
            Landed <span className="text-[#DC143C]">{landed.toUpperCase()}</span> · You picked {pick.toUpperCase()}
          </p>
          <p className="font-mono text-xl text-[#DC143C] mt-4 mb-2">- ${stakeUsd.toFixed(2)}</p>
        </>
      )}
      <button className="btn-blood mt-10 max-w-[200px] w-full py-3" onClick={onReset}>Flip Again</button>
    </div>
  )
}
