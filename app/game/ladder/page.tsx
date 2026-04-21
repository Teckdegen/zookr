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
type Phase = 'idle' | 'signing' | 'climbing' | 'busted' | 'cashedout'

const MASTER_ADDRESS = process.env.NEXT_PUBLIC_MASTER_WALLET_ADDRESS as `0x${string}`

const RUNGS = [
  { label: '1', mult: 1.2 },
  { label: '2', mult: 1.5 },
  { label: '3', mult: 2.0 },
  { label: '4', mult: 2.5 },
  { label: '5', mult: 3.0 },
  { label: '6', mult: 4.0 },
  { label: '7', mult: 5.0 },
  { label: '8', mult: 7.0 },
  { label: '9', mult: 10.0 },
  { label: '10', mult: 20.0 },
]

export default function LadderPage() {
  const { address } = useAccount()
  const router = useRouter()
  const { writeContractAsync } = useWriteContract()

  const [token, setToken] = useState<Token>('DEAD')
  const [stakeUsd, setStakeUsd] = useState(1)
  const [tokenPrices, setTokenPrices] = useState<{ DEAD: number; UDEAD: number }>({ DEAD: 0, UDEAD: 0 })
  const [phase, setPhase] = useState<Phase>('idle')
  const [error, setError] = useState('')

  const [currentRung, setCurrentRung] = useState(-1) // -1 = not started
  const [bustRung, setBustRung] = useState<number | null>(null)
  const [outcome, setOutcome] = useState<'win' | 'loss' | null>(null)
  const [climbing, setClimbing] = useState(false)

  const sessionIdRef = useRef<string | null>(null)
  const outcomeRef = useRef<'win' | 'loss' | null>(null)
  const bustRungRef = useRef<number | null>(null)

  const tokenAmount = tokenPrices[token] > 0 ? usdToTokens(stakeUsd, tokenPrices[token]) : 0

  useEffect(() => { getTokenPricesUSD().then(setTokenPrices) }, [])

  const currentMult = currentRung >= 0 ? RUNGS[currentRung].mult : 1
  const potentialWin = stakeUsd * currentMult

  async function handleStart() {
    if (phase !== 'idle') return
    if (!address) { router.push('/'); return }
    if (tokenAmount <= 0) { setError('Price unavailable, try again'); return }

    setError(''); setPhase('signing')

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
          wallet_address: address, game_type: 'war_ladder', token,
          bet_amount_usd: stakeUsd, bet_amount_tokens: tokenAmount, bet_tx_hash: betTxHash,
        }),
      })
      const data = await res.json()
      if (!res.ok || data.error) { setError(data.error ?? 'Failed to start game'); setPhase('idle'); return }

      sessionIdRef.current = data.session_id
      outcomeRef.current = data.outcome

      // Determine bust rung
      // If win: bust rung is 6-9 (won't bust before cashout is reached)
      // If loss: bust rung is 0-3 (busts early)
      const br = data.outcome === 'win'
        ? 5 + Math.floor(Math.random() * 5)  // rung 5-9 (can climb through 5+)
        : Math.floor(Math.random() * 4)       // rung 0-3
      bustRungRef.current = br
      setBustRung(br)

      setCurrentRung(-1)
      setOutcome(null)
      setPhase('climbing')

    } catch (e: unknown) {
      setError((e as { shortMessage?: string })?.shortMessage || 'Transaction rejected')
      setPhase('idle')
    }
  }

  async function handleClimb() {
    if (phase !== 'climbing' || climbing) return
    setClimbing(true)

    const nextRung = currentRung + 1

    // Brief animation delay
    await new Promise(r => setTimeout(r, 400))

    // Check if we bust at this rung
    if (bustRungRef.current !== null && nextRung >= bustRungRef.current && outcomeRef.current === 'loss') {
      setCurrentRung(nextRung)
      setPhase('busted')
      setOutcome('loss')

      // Resolve as loss
      await fetch('/api/game/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionIdRef.current, price_correct: false }),
      })
    } else {
      setCurrentRung(nextRung)
      if (nextRung >= RUNGS.length - 1) {
        // Reached top
        setPhase('cashedout')
        setOutcome('win')
        await resolveWin()
      }
    }

    setClimbing(false)
  }

  async function handleCashOut() {
    if (phase !== 'climbing' || currentRung < 0) return
    setPhase('cashedout')
    setOutcome(outcomeRef.current === 'win' ? 'win' : 'loss')
    await resolveWin()
  }

  async function resolveWin() {
    await fetch('/api/game/resolve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionIdRef.current, price_correct: true }),
    })
  }

  function reset() {
    setPhase('idle'); setOutcome(null); setError('')
    setCurrentRung(-1); setBustRung(null); setClimbing(false)
    sessionIdRef.current = null; outcomeRef.current = null; bustRungRef.current = null
  }

  return (
    <AppLayout active="play" fullBleed>
      <div className="flex flex-col md:flex-row min-h-[calc(100vh-56px)]">
        {/* Main area */}
        <div className="flex-1 flex flex-col">
          <div className="px-4 md:px-6 py-3 border-b border-[#2E2618] bg-[#1E1B14] flex items-center gap-3">
            <button onClick={() => router.back()} className="font-mono text-[9px] text-[#7A6E58] mr-2 md:hidden">←</button>
            <SkullIcon size={14} className="text-[#7A6E58]" />
            <p className="font-mono text-[9px] text-[#7A6E58] tracking-widest uppercase">War Ladder</p>
            <span className="font-mono text-[9px] text-[#2E2618]">·</span>
            <p className="font-mono text-[9px] text-[#7A6E58]">Climb or die</p>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center bg-[#0A0806] px-6 py-8 gap-6">
            <p className="font-mono text-[9px] text-[#7A6E58] tracking-[0.3em] uppercase text-center">
              {phase === 'idle' ? 'Climb the ladder. Cash out before you bust.'
                : phase === 'signing' ? 'Confirming on-chain...'
                : phase === 'climbing' ? currentRung < 0 ? 'Start climbing!' : `Rung ${currentRung + 1} — ${RUNGS[currentRung].mult}x`
                : phase === 'busted' ? 'YOU BUSTED. Nothing.'
                : outcomeRef.current === 'win' ? 'CASHED OUT — PAID OUT 2x' : 'Cashed out early — small win'}
            </p>

            {/* Ladder display */}
            <div className="flex flex-col-reverse gap-1 w-full max-w-xs">
              {RUNGS.map((rung, i) => {
                const isActive = currentRung === i
                const isPassed = currentRung > i
                const isBusted = phase === 'busted' && currentRung === i

                return (
                  <div
                    key={i}
                    className={`flex items-center justify-between px-4 py-2.5 border transition-all ${
                      isBusted
                        ? 'border-[#DC143C] bg-[#DC143C]/20'
                        : isActive
                          ? 'border-[#DC143C] bg-[#DC143C]/10'
                          : isPassed
                            ? 'border-[#D4BF9A]/40 bg-[#D4BF9A]/5'
                            : 'border-[#2E2618] bg-[#1E1B14]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`font-mono text-[9px] ${isActive || isBusted ? 'text-[#DC143C]' : isPassed ? 'text-[#D4BF9A]' : 'text-[#7A6E58]'}`}>
                        {isBusted ? '💥' : isActive ? '▶' : isPassed ? '✓' : `${i + 1}`}
                      </span>
                      <span className={`font-mono text-[10px] ${isActive || isBusted ? 'text-[#DC143C]' : isPassed ? 'text-[#D4BF9A]' : 'text-[#7A6E58]'}`}>
                        Rung {i + 1}
                      </span>
                    </div>
                    <span className={`font-serif text-sm font-bold ${isActive ? 'text-[#DC143C]' : isPassed ? 'text-[#D4BF9A]' : 'text-[#7A6E58]'}`}>
                      {rung.mult}x
                    </span>
                    <span className={`font-mono text-[9px] ${isActive ? 'text-[#D4BF9A]' : 'text-[#7A6E58]'}`}>
                      ${(stakeUsd * rung.mult).toFixed(2)}
                    </span>
                  </div>
                )
              })}
            </div>

            {phase === 'climbing' && currentRung >= 0 && (
              <p className="font-mono text-[10px] text-[#D4BF9A]">
                Current: {RUNGS[currentRung].mult}x = ${potentialWin.toFixed(2)}
              </p>
            )}
          </div>
        </div>

        {/* Sidebar */}
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
            <button onClick={handleStart}
              className="w-full py-3 bg-[#DC143C] text-[#D4BF9A] font-mono text-xs tracking-widest hover:bg-[#DC143C]/80 transition-colors">
              START CLIMBING
            </button>
          )}

          {phase === 'signing' && (
            <p className="font-mono text-[10px] text-[#7A6E58] tracking-widest animate-pulse text-center">
              CONFIRMING ON-CHAIN...
            </p>
          )}

          {phase === 'climbing' && (
            <div className="flex flex-col gap-2">
              <button
                onClick={handleClimb}
                disabled={climbing}
                className="w-full py-3 bg-[#DC143C] text-[#D4BF9A] font-mono text-xs tracking-widest hover:bg-[#DC143C]/80 disabled:opacity-50 transition-colors"
              >
                {climbing ? 'CLIMBING...' : 'CLIMB'}
              </button>
              {currentRung >= 0 && (
                <button
                  onClick={handleCashOut}
                  disabled={climbing}
                  className="w-full py-3 border border-[#D4BF9A] text-[#D4BF9A] font-mono text-xs tracking-widest hover:bg-[#D4BF9A]/10 disabled:opacity-50 transition-colors"
                >
                  CASH OUT ({RUNGS[currentRung].mult}x)
                </button>
              )}
            </div>
          )}

          {(phase === 'busted' || phase === 'cashedout') && (
            <>
              <div className={`p-4 border ${outcome === 'win' ? 'border-[#D4BF9A] bg-[#D4BF9A]/5' : 'border-[#DC143C] bg-[#DC143C]/5'}`}>
                <p className={`font-serif text-lg font-bold mb-1 ${outcome === 'win' ? 'text-[#D4BF9A]' : 'text-[#DC143C]'}`}>
                  {phase === 'busted' ? 'BUSTED' : 'CASHED OUT'}
                </p>
                <p className={`font-mono text-xl ${outcome === 'win' ? 'text-[#D4BF9A]' : 'text-[#7A6E58]'}`}>
                  {phase === 'busted' ? `-$${stakeUsd.toFixed(2)}` : `+$${(stakeUsd * 2).toFixed(2)}`}
                </p>
              </div>
              <button onClick={reset}
                className="w-full py-3 border border-[#2E2618] font-mono text-xs tracking-widest text-[#D4BF9A] hover:border-[#D4BF9A] transition-colors">
                CLIMB AGAIN
              </button>
            </>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
