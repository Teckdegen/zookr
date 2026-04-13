'use client'

import { useEffect, useRef, useState } from 'react'
import { useAccount, useWriteContract } from 'wagmi'
import { parseUnits } from 'viem'
import { useRouter } from 'next/navigation'
import { AppLayout } from '@/components/AppLayout'
import { SkullIcon } from '@/components/icons'
import { usePriceFeed } from '@/hooks/usePriceFeed'
import { TOKENS, ERC20_ABI } from '@/lib/wagmi'
import { getTokenPricesUSD, usdToTokens } from '@/lib/tokenPrice'

type Token = 'DEAD' | 'UDEAD'
type Phase = 'idle' | 'signing' | 'spinning' | 'result'

const REEL_ITEM_COUNT = 8
const MASTER_ADDRESS  = process.env.NEXT_PUBLIC_MASTER_WALLET_ADDRESS as `0x${string}`

// ── Sounds ────────────────────────────────────────────────────────────────────
function playSound(type: 'win' | 'loss' | 'spin' | 'stop') {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const osc = ctx.createOscillator()
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
      osc.frequency.setValueAtTime(200, ctx.currentTime + 0.15)
      gain.gain.setValueAtTime(0.3, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
      osc.start(); osc.stop(ctx.currentTime + 0.4)
    } else if (type === 'spin') {
      osc.type = 'square'
      osc.frequency.setValueAtTime(80, ctx.currentTime)
      gain.gain.setValueAtTime(0.04, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04)
      osc.start(); osc.stop(ctx.currentTime + 0.04)
    } else {
      osc.frequency.setValueAtTime(220, ctx.currentTime)
      gain.gain.setValueAtTime(0.2, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15)
      osc.start(); osc.stop(ctx.currentTime + 0.15)
    }
  } catch {}
}

export default function DeadPricePage() {
  const { address } = useAccount()
  const router = useRouter()
  const { writeContractAsync } = useWriteContract()

  // Bet config
  const [token, setToken]       = useState<Token>('DEAD')
  const [stakeUsd, setStakeUsd] = useState(1)   // $1–$5 only
  const [tokenPrices, setTokenPrices] = useState<{ DEAD: number; UDEAD: number }>({ DEAD: 0, UDEAD: 0 })

  // Game state
  const [phase, setPhase]             = useState<Phase>('idle')
  const [reelPrices, setReelPrices]   = useState<string[]>([])
  const [spinning, setSpinning]       = useState(false)
  const [result, setResult]           = useState<'win' | 'loss' | null>(null)
  const [displayPrice, setDisplayPrice] = useState<string | null>(null)
  const [reelOffset, setReelOffset]   = useState(0)
  const [sessionId, setSessionId]     = useState<string | null>(null)
  const [error, setError]             = useState('')

  const spinRef         = useRef<ReturnType<typeof setInterval> | null>(null)
  const livePriceRef    = useRef<number>(0)
  const outcomeRef      = useRef<'win' | 'loss' | null>(null)
  const realPriceIdxRef = useRef<number>(-1)  // which reel slot has the real price

  const feed      = usePriceFeed(token, 1000)
  const livePrice = feed.price?.priceUsd ?? 0

  const stakeNum    = stakeUsd
  const tokenAmount = tokenPrices[token] > 0 ? usdToTokens(stakeNum, tokenPrices[token]) : 0

  useEffect(() => { getTokenPricesUSD().then(setTokenPrices) }, [])
  useEffect(() => { if (livePrice > 0) livePriceRef.current = livePrice }, [livePrice])

  // Always place the real price in the reel.
  // Returns { prices, realIdx } so we know exactly where it sits.
  function generateReelPrices(realPrice: number): { prices: string[]; realIdx: number } {
    const decimals = realPrice < 0.01 ? 6 : realPrice < 1 ? 4 : 2
    const realStr  = realPrice.toFixed(decimals)
    const prices: string[] = []
    for (let i = 0; i < REEL_ITEM_COUNT; i++) {
      const offset = (Math.random() - 0.5) * realPrice * 0.002
      let p = Math.abs(realPrice + offset).toFixed(decimals)
      // Make sure no fake price accidentally equals the real one
      if (p === realStr) p = (realPrice * 1.0003).toFixed(decimals)
      prices.push(p)
    }
    // Place real price at a random slot
    const realIdx = Math.floor(Math.random() * REEL_ITEM_COUNT)
    prices[realIdx] = realStr
    return { prices, realIdx }
  }

  async function startGame() {
    if (!address) { router.push('/'); return }
    if (phase !== 'idle') return
    if (stakeNum <= 0) { setError('Select a stake amount first'); return }
    if (tokenAmount <= 0) { setError('Price unavailable, try again'); return }

    setError('')
    setPhase('signing')   // "sign in wallet" shown
    setResult(null)
    setSessionId(null)

    try {
      const rawAmount = parseUnits(tokenAmount.toFixed(18), TOKENS[token].decimals)

      // Step 1: user signs
      const betTxHash = await writeContractAsync({
        address: TOKENS[token].address,
        abi: ERC20_ABI,
        functionName: 'transfer',
        args: [MASTER_ADDRESS, rawAmount],
      })

      // Step 2: server confirms tx on-chain — reel only opens after this
      const res = await fetch('/api/game/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet_address:    address,
          game_type:         'dead_price',
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

      setSessionId(data.session_id)
      outcomeRef.current = data.outcome

      const { prices, realIdx } = generateReelPrices(livePriceRef.current)
      realPriceIdxRef.current = realIdx
      setReelPrices(prices)
      setPhase('spinning')
      setSpinning(true)

      let offset = 0
      spinRef.current = setInterval(() => {
        offset = (offset + 1) % REEL_ITEM_COUNT
        setReelOffset(offset)
        playSound('spin')
      }, 80)

    } catch (e: any) {
      setError(e?.shortMessage || 'Transaction rejected')
      setPhase('idle')
    }
  }

  async function handleStop() {
    if (phase !== 'spinning') return
    clearInterval(spinRef.current!)
    setSpinning(false)
    playSound('stop')

    // The center slot is index 3 of visiblePrices, which maps to reelOffset + 3
    let finalOffset = reelOffset

    if (outcomeRef.current === 'loss') {
      // Check if the real price would land in the center (slot 3)
      const centerIdx = (finalOffset + 3) % REEL_ITEM_COUNT
      if (centerIdx === realPriceIdxRef.current) {
        // They stopped exactly on the real price — snap 1 forward so they just miss
        finalOffset = (finalOffset + 1) % REEL_ITEM_COUNT
        setReelOffset(finalOffset)
      }
    }

    const currentPrice = reelPrices[(finalOffset + 3) % REEL_ITEM_COUNT]

    const res = await fetch('/api/game/resolve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId, pick: currentPrice }),
    })
    const data = await res.json()

    // On a loss, always show the real price so user sees what they "missed"
    const realPriceStr = reelPrices[realPriceIdxRef.current] ?? null
    setDisplayPrice(outcomeRef.current === 'loss' ? (data.display_price ?? realPriceStr) : null)

    setTimeout(() => {
      playSound(data.result === 'win' ? 'win' : 'loss')
      setResult(data.result)
      setPhase('result')
    }, 400)
  }

  function reset() {
    setPhase('idle'); setResult(null); setSpinning(false)
    setDisplayPrice(null); setSessionId(null); setError('')
    outcomeRef.current      = null
    realPriceIdxRef.current = -1
    clearInterval(spinRef.current!)
  }

  // Center of the 7-slot window is index 3 (0-indexed), mapped from reelOffset
  const visiblePrices = reelPrices.length > 0
    ? Array.from({ length: 7 }, (_, i) => reelPrices[(reelOffset + i) % REEL_ITEM_COUNT])
    : []

  return (
    <AppLayout active="play" fullBleed>
      <div className="flex flex-col md:flex-row min-h-[calc(100vh-56px)]">

        {/* Main area */}
        <div className="flex-1 flex flex-col">
          <div className="px-4 md:px-6 py-3 border-b border-[#2E2618] bg-[#1E1B14] flex justify-between items-center">
            <div className="flex items-center gap-3">
              <button onClick={() => router.back()} className="font-mono text-[9px] text-[#7A6E58] mr-2 md:hidden">←</button>
              <SkullIcon size={14} className="text-[#7A6E58]" />
              <p className="font-mono text-[9px] text-[#7A6E58] tracking-widest uppercase">Dead Price</p>
              <p className="font-mono text-sm text-[#D4BF9A] price-live">${livePrice.toFixed(6)}</p>
            </div>
          </div>

          {/* Reel */}
          <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 bg-[#0A0806]">
            <p className="font-mono text-[9px] text-[#7A6E58] tracking-[0.3em] uppercase mb-6 text-center">
              {phase === 'idle'     ? 'Set your stake. Start the reel. Stop on the real price.'
               : phase === 'signing'  ? 'Confirming transaction on-chain...'
               : phase === 'spinning' ? 'Hit stop. Now.'
               : 'Reel stopped.'}
            </p>

            <div className="relative w-full max-w-xs overflow-hidden border border-[#2E2618] bg-[#1E1B14]">
              <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[52px] border-t border-b border-[#DC143C] z-10 pointer-events-none" />
              <div className="flex flex-col">
                {phase === 'idle' || phase === 'signing'
                  ? Array.from({ length: 7 }).map((_, i) => (
                      <div key={i} className="h-[52px] flex items-center justify-center border-b border-[#2E2618]">
                        <span className="font-mono text-lg text-[#2E2618]">─ ─ ─ ─ ─ ─</span>
                      </div>
                    ))
                  : visiblePrices.map((price, i) => (
                      <div key={i} className={`h-[52px] flex items-center justify-center border-b border-[#2E2618] transition-all ${
                        i === 3 ? (spinning ? 'bg-[#DC143C]/10' : 'bg-[#DC143C]/20') : ''
                      }`}>
                        <span className={`font-mono ${i === 3 ? 'text-lg font-bold text-[#D4BF9A]' : 'text-sm text-[#7A6E58]'}`}>
                          ${price}
                        </span>
                      </div>
                    ))
                }
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="shrink-0 md:w-72 md:border-l border-t md:border-t-0 border-[#2E2618] bg-[#1E1B14] p-4 md:p-6 flex flex-col gap-4">

          {/* Collateral token */}
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

          {/* Stake tier buttons */}
          <div>
            <p className="font-mono text-[9px] text-[#7A6E58] tracking-widest uppercase mb-2">Stake</p>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <button key={s} onClick={() => { if (phase === 'idle') setStakeUsd(s) }}
                  disabled={phase !== 'idle'}
                  className={`flex-1 py-2 font-mono text-[10px] border transition-colors ${
                    stakeUsd === s
                      ? 'border-[#DC143C] text-[#DC143C] bg-[#DC143C]/10'
                      : 'border-[#2E2618] text-[#7A6E58] hover:border-[#DC143C]/50'
                  }`}>
                  ${s}
                </button>
              ))}
            </div>
            {/* Token equivalent */}
            {tokenPrices[token] > 0 && (
              <p className="font-mono text-[9px] text-[#7A6E58] mt-2">
                = {tokenAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })} ${token}
              </p>
            )}
          </div>

          {error && <p className="font-mono text-[10px] text-[#DC143C]">{error}</p>}

          {phase === 'idle' && (
            <button className="btn-filled" onClick={startGame}>▶ Start Reel</button>
          )}
          {phase === 'signing' && (
            <button className="btn-filled opacity-50 cursor-not-allowed" disabled>Waiting for signature...</button>
          )}
          {phase === 'spinning' && (
            <button
              className="w-full py-5 bg-[#DC143C] text-[#D4BF9A] font-mono text-sm tracking-widest uppercase hover:bg-[#8B0000] transition-colors"
              onClick={handleStop}>
              ■ STOP
            </button>
          )}
        </div>
      </div>

      {phase === 'result' && result && (
        <ResultOverlay result={result} stakeUsd={stakeNum} displayPrice={displayPrice} onReset={reset} />
      )}
    </AppLayout>
  )
}

function ResultOverlay({ result, stakeUsd, displayPrice, onReset }: {
  result: 'win' | 'loss'; stakeUsd: number; displayPrice: string | null; onReset: () => void
}) {
  const isWin = result === 'win'
  return (
    <div className={`fixed inset-0 flex flex-col items-center justify-center z-50 valhalla-enter ${isWin ? 'bg-[#1E1B14]' : 'bg-[#0A0806]'}`}>
      {isWin ? (
        <>
          <SkullIcon size={48} className="text-[#DC143C] mb-6" />
          <p className="font-mono text-[10px] text-[#7A6E58] tracking-[0.4em] uppercase mb-2">Welcome to</p>
          <h1 className="font-serif text-5xl md:text-7xl font-bold text-[#D4BF9A]">VALHALLA</h1>
          <p className="font-mono text-2xl text-[#DC143C] mt-6 mb-2">+ ${(stakeUsd * 2).toFixed(2)}</p>
          <p className="font-mono text-xs text-[#7A6E58]">The warriors feast tonight.</p>
        </>
      ) : (
        <>
          <SkullIcon size={48} className="text-[#7A6E58] mb-6" />
          <h1 className="font-serif text-3xl md:text-5xl font-bold text-[#D4BF9A] mb-2">The market took you.</h1>
          <p className="font-mono text-xl text-[#DC143C] mt-4 mb-2">- ${stakeUsd.toFixed(2)}</p>
          {displayPrice && <p className="font-mono text-[10px] text-[#7A6E58] mt-1">Real price was ${displayPrice}</p>}
          <p className="font-mono text-xs text-[#7A6E58] mt-1">Rise again, warrior.</p>
        </>
      )}
      <button className="btn-filled mt-10 max-w-[200px]" onClick={onReset}>Fight Again</button>
    </div>
  )
}
