'use client'

import { useEffect, useRef, useState } from 'react'
import { useAccount, useWriteContract } from 'wagmi'
import { parseUnits } from 'viem'
import { useRouter } from 'next/navigation'
import { AppLayout } from '@/components/AppLayout'
import { SkeletonChart } from '@/components/SkeletonChart'
import { SkullIcon, SwordIcon } from '@/components/icons'
import { usePriceFeed } from '@/hooks/usePriceFeed'
import { TOKENS, ERC20_ABI } from '@/lib/wagmi'
import { getTokenPricesUSD, usdToTokens } from '@/lib/tokenPrice'

type Token = 'DEAD' | 'UDEAD'
type Direction = 'RISE' | 'FALL'
type Phase = 'idle' | 'signing' | 'countdown' | 'result'

const MASTER_ADDRESS = process.env.NEXT_PUBLIC_MASTER_WALLET_ADDRESS as `0x${string}`
const COUNTDOWN_SECS = 5

// ── Sounds ────────────────────────────────────────────────────────────────────
function playSound(type: 'win' | 'loss' | 'tick') {
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
      // tick
      osc.type = 'square'
      osc.frequency.setValueAtTime(440, ctx.currentTime)
      gain.gain.setValueAtTime(0.05, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05)
      osc.start(); osc.stop(ctx.currentTime + 0.05)
    }
  } catch {}
}

// ── Candle type ───────────────────────────────────────────────────────────────
interface Candle {
  open: number
  high: number
  low: number
  close: number
  time: number
}

// ── CandleChart ───────────────────────────────────────────────────────────────
function CandleChart({
  candles,
  openPrice,
  phase,
}: {
  candles: Candle[]
  openPrice: number | null
  phase: Phase
}) {
  if (candles.length === 0) return <SkeletonChart />

  const W = 320
  const H = 180
  const PAD = 8
  const allPrices = candles.flatMap((c) => [c.high, c.low])
  const minP = Math.min(...allPrices)
  const maxP = Math.max(...allPrices)
  const range = maxP - minP || minP * 0.001

  function toY(p: number) {
    return PAD + ((maxP - p) / range) * (H - PAD * 2)
  }

  const barW = Math.max(2, (W - PAD * 2) / candles.length - 1)

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      style={{ height: H }}
      preserveAspectRatio="none"
    >
      {/* Open price reference line */}
      {openPrice !== null && phase !== 'idle' && (
        <>
          <line
            x1={PAD}
            x2={W - PAD}
            y1={toY(openPrice)}
            y2={toY(openPrice)}
            stroke="#DC143C"
            strokeWidth="1"
            strokeDasharray="4 3"
            opacity="0.7"
          />
          <text
            x={W - PAD - 2}
            y={toY(openPrice) - 3}
            fill="#DC143C"
            fontSize="7"
            textAnchor="end"
            fontFamily="monospace"
            opacity="0.8"
          >
            OPEN
          </text>
        </>
      )}

      {/* Candles */}
      {candles.map((c, i) => {
        const x = PAD + i * ((W - PAD * 2) / candles.length) + barW / 2
        const isGreen = c.close >= c.open
        const color = isGreen ? '#4ade80' : '#DC143C'
        const bodyTop = toY(Math.max(c.open, c.close))
        const bodyBot = toY(Math.min(c.open, c.close))
        const bodyH = Math.max(1, bodyBot - bodyTop)

        return (
          <g key={i}>
            {/* Wick */}
            <line
              x1={x}
              x2={x}
              y1={toY(c.high)}
              y2={toY(c.low)}
              stroke={color}
              strokeWidth="1"
              opacity="0.6"
            />
            {/* Body */}
            <rect
              x={x - barW / 2}
              y={bodyTop}
              width={barW}
              height={bodyH}
              fill={color}
              opacity="0.85"
            />
          </g>
        )
      })}
    </svg>
  )
}

// ── ResultOverlay ─────────────────────────────────────────────────────────────
function ResultOverlay({
  result,
  stakeUsd,
  onReset,
}: {
  result: 'win' | 'loss'
  stakeUsd: number
  onReset: () => void
}) {
  const isWin = result === 'win'
  return (
    <div
      className={`fixed inset-0 flex flex-col items-center justify-center z-50 valhalla-enter ${
        isWin ? 'bg-[#1E1B14]' : 'bg-[#0A0806]'
      }`}
    >
      {isWin ? (
        <>
          <SkullIcon size={48} className="text-[#DC143C] mb-6" />
          <p className="font-mono text-[10px] text-[#7A6E58] tracking-[0.4em] uppercase mb-2">
            Welcome to
          </p>
          <h1 className="font-serif text-5xl md:text-7xl font-bold text-[#D4BF9A]">VALHALLA</h1>
          <p className="font-mono text-2xl text-[#DC143C] mt-6 mb-2">
            + ${(stakeUsd * 2).toFixed(2)}
          </p>
          <p className="font-mono text-xs text-[#7A6E58]">The warriors feast tonight.</p>
        </>
      ) : (
        <>
          <SkullIcon size={48} className="text-[#7A6E58] mb-6" />
          <h1 className="font-serif text-3xl md:text-5xl font-bold text-[#D4BF9A] mb-2">
            The market took you.
          </h1>
          <p className="font-mono text-xl text-[#DC143C] mt-4 mb-2">
            - ${stakeUsd.toFixed(2)}
          </p>
          <p className="font-mono text-xs text-[#7A6E58] mt-1">Rise again, warrior.</p>
        </>
      )}
      <button className="btn-filled mt-10 max-w-[200px]" onClick={onReset}>
        Fight Again
      </button>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function WarChartPlayPage() {
  const { address } = useAccount()
  const router = useRouter()
  const { writeContractAsync } = useWriteContract()

  // Bet config
  const [token, setToken]       = useState<Token>('DEAD')
  const [stakeUsd, setStakeUsd] = useState(1)
  const [tokenPrices, setTokenPrices] = useState<{ DEAD: number; UDEAD: number }>({ DEAD: 0, UDEAD: 0 })

  // Game state
  const [phase, setPhase]       = useState<Phase>('idle')
  const [pick, setPick]         = useState<Direction | null>(null)
  const [countdown, setCountdown] = useState(COUNTDOWN_SECS)
  const [result, setResult]     = useState<'win' | 'loss' | null>(null)
  const [candles, setCandles]   = useState<Candle[]>([])
  const [error, setError]       = useState('')

  // Refs
  const outcomeRef         = useRef<'win' | 'loss' | null>(null)
  const openPriceRef       = useRef<number | null>(null)
  const pickRef            = useRef<Direction | null>(null)
  const lastCandleCloseRef = useRef<number>(0)
  const sessionIdRef       = useRef<string | null>(null)
  const countdownTimer     = useRef<ReturnType<typeof setInterval> | null>(null)
  const nudgeTickRef       = useRef(0)

  const feed      = usePriceFeed(token, 1000)
  const livePrice = feed.price?.priceUsd ?? 0

  const stakeNum    = stakeUsd
  const tokenAmount = tokenPrices[token] > 0 ? usdToTokens(stakeNum, tokenPrices[token]) : 0

  useEffect(() => { getTokenPricesUSD().then(setTokenPrices) }, [])

  // Build candles from price history
  useEffect(() => {
    if (feed.history.length < 2) return

    const built: Candle[] = []
    const step = 3 // group every 3 ticks into one candle
    for (let i = 0; i + step <= feed.history.length; i += step) {
      const slice = feed.history.slice(i, i + step)
      built.push({
        open:  slice[0],
        close: slice[slice.length - 1],
        high:  Math.max(...slice),
        low:   Math.min(...slice),
        time:  i,
      })
    }
    setCandles(built)
  }, [feed.history])

  // Keep lastCandleCloseRef in sync with latest candle close
  useEffect(() => {
    if (candles.length > 0) {
      lastCandleCloseRef.current = candles[candles.length - 1].close
    }
  }, [candles])

  // During countdown: nudge the last candle close toward the wrong side of open price
  // so the chart visually drifts against the player's pick (forced loss mechanic)
  useEffect(() => {
    if (phase !== 'countdown') return
    if (openPriceRef.current === null) return

    nudgeTickRef.current += 1
    const tick = nudgeTickRef.current
    const open = openPriceRef.current
    const dir  = pickRef.current

    // Each tick nudge the last candle close slightly toward the losing side
    setCandles((prev) => {
      if (prev.length === 0) return prev
      const last = prev[prev.length - 1]
      // nudge magnitude grows each tick: 0.01% → 0.05% of open price
      const magnitude = open * 0.0001 * Math.min(tick, 5)
      // If player picked RISE, nudge close below open; if FALL, nudge above
      const nudge = dir === 'RISE' ? -magnitude : magnitude
      const newClose = last.close + nudge
      const updated: Candle = {
        ...last,
        close: newClose,
        high:  dir === 'FALL' ? Math.max(last.high, newClose) : last.high,
        low:   dir === 'RISE' ? Math.min(last.low, newClose)  : last.low,
      }
      return [...prev.slice(0, -1), updated]
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candles.length, phase])

  async function handlePick(direction: Direction) {
    if (phase !== 'idle') return
    if (!address) { router.push('/'); return }
    if (tokenAmount <= 0) { setError('Price unavailable, try again'); return }

    setError('')
    setPick(direction)
    pickRef.current = direction
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
          game_type:         'expert_option',
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
        setPick(null)
        pickRef.current = null
        return
      }

      sessionIdRef.current = data.session_id
      outcomeRef.current   = data.outcome

      // Snapshot open price at the moment the game starts
      openPriceRef.current = lastCandleCloseRef.current || livePrice
      nudgeTickRef.current = 0

      setCountdown(COUNTDOWN_SECS)
      setPhase('countdown')
      startCountdown()

    } catch (e: any) {
      setError(e?.shortMessage || 'Transaction rejected')
      setPhase('idle')
      setPick(null)
      pickRef.current = null
    }
  }

  function startCountdown() {
    let remaining = COUNTDOWN_SECS
    countdownTimer.current = setInterval(() => {
      remaining -= 1
      setCountdown(remaining)
      playSound('tick')
      if (remaining <= 0) {
        clearInterval(countdownTimer.current!)
        resolveGame()
      }
    }, 1000)
  }

  async function resolveGame() {
    // price_correct: did the last candle close on the correct side of open?
    const open  = openPriceRef.current ?? 0
    const close = lastCandleCloseRef.current
    const dir   = pickRef.current

    let priceCorrect = false
    if (open > 0 && close > 0) {
      priceCorrect = dir === 'RISE' ? close > open : close < open
    }

    const res = await fetch('/api/game/resolve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id:    sessionIdRef.current,
        price_correct: priceCorrect,
      }),
    })
    const data = await res.json()

    playSound(data.result === 'win' ? 'win' : 'loss')
    setResult(data.result)
    setPhase('result')
  }

  function reset() {
    clearInterval(countdownTimer.current!)
    setPhase('idle')
    setPick(null)
    setResult(null)
    setCountdown(COUNTDOWN_SECS)
    setError('')
    outcomeRef.current   = null
    openPriceRef.current = null
    pickRef.current      = null
    sessionIdRef.current = null
    nudgeTickRef.current = 0
  }

  const openPrice = phase !== 'idle' ? openPriceRef.current : null

  return (
    <AppLayout active="play" fullBleed>
      <div className="flex flex-col md:flex-row min-h-[calc(100vh-56px)]">

        {/* Main chart area */}
        <div className="flex-1 flex flex-col">
          {/* Header bar */}
          <div className="px-4 md:px-6 py-3 border-b border-[#2E2618] bg-[#1E1B14] flex justify-between items-center">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.back()}
                className="font-mono text-[9px] text-[#7A6E58] mr-2 md:hidden"
              >
                ←
              </button>
              <SwordIcon size={14} className="text-[#7A6E58]" />
              <p className="font-mono text-[9px] text-[#7A6E58] tracking-widest uppercase">
                War Chart
              </p>
              <span className="font-mono text-[9px] text-[#2E2618]">·</span>
              <p className="font-mono text-sm text-[#D4BF9A] price-live">
                ${livePrice > 0 ? livePrice.toFixed(6) : '—'}
              </p>
            </div>
            {phase === 'countdown' && (
              <div className="flex items-center gap-2">
                <span className="font-mono text-[9px] text-[#7A6E58] tracking-widest uppercase">
                  Resolves in
                </span>
                <span className="font-mono text-lg font-bold text-[#DC143C]">
                  {countdown}s
                </span>
              </div>
            )}
          </div>

          {/* Chart */}
          <div className="flex-1 flex flex-col bg-[#0A0806] px-4 py-4">
            <p className="font-mono text-[9px] text-[#7A6E58] tracking-[0.3em] uppercase mb-4 text-center">
              {phase === 'idle'
                ? 'Pick RISE or FALL. Sign. Watch the candle.'
                : phase === 'signing'
                ? 'Confirming transaction on-chain...'
                : phase === 'countdown'
                ? `${pick} · ${countdown}s remaining`
                : 'Round complete.'}
            </p>

            <div className="flex-1 flex flex-col justify-center">
              <CandleChart candles={candles} openPrice={openPrice} phase={phase} />
            </div>

            {/* Open price label */}
            {openPrice !== null && phase === 'countdown' && (
              <p className="font-mono text-[9px] text-[#DC143C] text-center mt-2 tracking-widest">
                OPEN ${openPrice.toFixed(6)}
              </p>
            )}
          </div>
        </div>

        {/* Controls sidebar */}
        <div className="shrink-0 md:w-72 md:border-l border-t md:border-t-0 border-[#2E2618] bg-[#1E1B14] p-4 md:p-6 flex flex-col gap-4">

          {/* Token selector */}
          <div>
            <p className="font-mono text-[9px] text-[#7A6E58] tracking-widest uppercase mb-2">
              Collateral Token
            </p>
            <div className="grid grid-cols-2 gap-px bg-[#2E2618]">
              {(['DEAD', 'UDEAD'] as Token[]).map((t) => (
                <button
                  key={t}
                  onClick={() => { if (phase === 'idle') setToken(t) }}
                  disabled={phase !== 'idle'}
                  className={`py-2 font-mono text-[10px] tracking-widest transition-colors ${
                    token === t
                      ? 'bg-[#DC143C] text-[#D4BF9A]'
                      : 'bg-[#1E1B14] text-[#7A6E58] hover:text-[#D4BF9A]'
                  }`}
                >
                  ${t}
                </button>
              ))}
            </div>
          </div>

          {/* Stake */}
          <div>
            <p className="font-mono text-[9px] text-[#7A6E58] tracking-widest uppercase mb-2">
              Stake
            </p>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  onClick={() => { if (phase === 'idle') setStakeUsd(s) }}
                  disabled={phase !== 'idle'}
                  className={`flex-1 py-2 font-mono text-[10px] border transition-colors ${
                    stakeUsd === s
                      ? 'border-[#DC143C] text-[#DC143C] bg-[#DC143C]/10'
                      : 'border-[#2E2618] text-[#7A6E58] hover:border-[#DC143C]/50'
                  }`}
                >
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

          {error && (
            <p className="font-mono text-[10px] text-[#DC143C]">{error}</p>
          )}

          {/* Action buttons */}
          {phase === 'idle' && (
            <div className="flex flex-col gap-2 mt-2">
              <button
                onClick={() => handlePick('RISE')}
                className="w-full py-4 border border-[#4ade80]/40 font-mono text-xs tracking-widest text-[#4ade80] bg-[#1E1B14] hover:bg-[#4ade80]/10 hover:border-[#4ade80] transition-colors flex items-center justify-center gap-2"
              >
                ▲ RISE
              </button>
              <button
                onClick={() => handlePick('FALL')}
                className="w-full py-4 border border-[#DC143C]/40 font-mono text-xs tracking-widest text-[#DC143C] bg-[#1E1B14] hover:bg-[#DC143C]/10 hover:border-[#DC143C] transition-colors flex items-center justify-center gap-2"
              >
                ▼ FALL
              </button>
            </div>
          )}

          {(phase === 'signing' || phase === 'countdown') && (
            <div className="flex-1 flex flex-col items-center justify-center gap-3">
              {pick && (
                <div className={`font-mono text-2xl font-bold ${
                  pick === 'RISE' ? 'text-[#4ade80]' : 'text-[#DC143C]'
                }`}>
                  {pick === 'RISE' ? '▲' : '▼'} {pick}
                </div>
              )}
              <p className="font-mono text-[10px] text-[#7A6E58] tracking-widest animate-pulse text-center">
                {phase === 'signing' ? 'CONFIRMING ON-CHAIN...' : 'WATCHING THE CANDLE...'}
              </p>
            </div>
          )}
        </div>
      </div>

      {phase === 'result' && result && (
        <ResultOverlay result={result} stakeUsd={stakeNum} onReset={reset} />
      )}
    </AppLayout>
  )
}
