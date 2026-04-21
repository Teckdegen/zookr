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
type Phase = 'idle' | 'signing' | 'playing' | 'result'

const MASTER_ADDRESS = process.env.NEXT_PUBLIC_MASTER_WALLET_ADDRESS as `0x${string}`

const SYMBOLS = ['💀', '⚔️', '🦴', '👁️', '💎'] as const
type Sym = typeof SYMBOLS[number]

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function buildPanels(outcome: 'win' | 'loss'): Sym[] {
  if (outcome === 'win') {
    // 3 skulls + 3 random non-skulls
    const others: Sym[] = []
    while (others.length < 3) {
      const s = SYMBOLS[1 + Math.floor(Math.random() * (SYMBOLS.length - 1))]
      others.push(s)
    }
    return shuffle([...(['💀', '💀', '💀'] as Sym[]), ...others])
  } else {
    // No 3-of-a-kind — guaranteed loss
    const panels: Sym[] = []
    // max 2 skulls, fill rest randomly ensuring no 3-of-a-kind
    const counts: Record<Sym, number> = { '💀': 0, '⚔️': 0, '🦴': 0, '👁️': 0, '💎': 0 }
    while (panels.length < 6) {
      const s = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]
      if (counts[s] < 2) {
        counts[s]++
        panels.push(s)
      }
    }
    return shuffle(panels)
  }
}

export default function ScratchPage() {
  const { address } = useAccount()
  const router = useRouter()
  const { writeContractAsync } = useWriteContract()

  const [token, setToken] = useState<Token>('DEAD')
  const [stakeUsd, setStakeUsd] = useState(1)
  const [tokenPrices, setTokenPrices] = useState<{ DEAD: number; UDEAD: number }>({ DEAD: 0, UDEAD: 0 })
  const [phase, setPhase] = useState<Phase>('idle')
  const [result, setResult] = useState<'win' | 'loss' | null>(null)
  const [error, setError] = useState('')

  const [panels, setPanels] = useState<Sym[]>(Array(6).fill('💀'))
  const [revealed, setRevealed] = useState<boolean[]>(Array(6).fill(false))
  const [resolvedResult, setResolvedResult] = useState<'win' | 'loss' | null>(null)

  const sessionIdRef = useRef<string | null>(null)

  const tokenAmount = tokenPrices[token] > 0 ? usdToTokens(stakeUsd, tokenPrices[token]) : 0

  useEffect(() => { getTokenPricesUSD().then(setTokenPrices) }, [])

  const allRevealed = revealed.every(Boolean)
  const skullCount = revealed.reduce((acc, r, i) => r && panels[i] === '💀' ? acc + 1 : acc, 0)

  async function handleBuy() {
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
          wallet_address: address, game_type: 'skull_scratch', token,
          bet_amount_usd: stakeUsd, bet_amount_tokens: tokenAmount, bet_tx_hash: betTxHash,
        }),
      })
      const data = await res.json()
      if (!res.ok || data.error) { setError(data.error ?? 'Failed to start game'); setPhase('idle'); return }

      sessionIdRef.current = data.session_id
      const builtPanels = buildPanels(data.outcome)
      setPanels(builtPanels)
      setRevealed(Array(6).fill(false))
      setPhase('playing')

    } catch (e: unknown) {
      setError((e as { shortMessage?: string })?.shortMessage || 'Transaction rejected')
      setPhase('idle')
    }
  }

  function revealPanel(i: number) {
    if (phase !== 'playing' || revealed[i]) return
    const next = [...revealed]
    next[i] = true
    setRevealed(next)
  }

  async function revealAll() {
    setRevealed(Array(6).fill(true))
    await resolveGame()
  }

  async function resolveGame() {
    const res = await fetch('/api/game/resolve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionIdRef.current, price_correct: true }),
    })
    const data = await res.json()
    setResult(data.result)
    setResolvedResult(data.result)
    setPhase('result')
  }

  useEffect(() => {
    if (phase === 'playing' && allRevealed && !resolvedResult) {
      resolveGame()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allRevealed, phase])

  function reset() {
    setPhase('idle'); setResult(null); setResolvedResult(null); setError('')
    setPanels(Array(6).fill('💀')); setRevealed(Array(6).fill(false))
    sessionIdRef.current = null
  }

  return (
    <AppLayout active="play" fullBleed>
      <div className="flex flex-col md:flex-row min-h-[calc(100vh-56px)]">
        {/* Main area */}
        <div className="flex-1 flex flex-col">
          <div className="px-4 md:px-6 py-3 border-b border-[#2E2618] bg-[#1E1B14] flex items-center gap-3">
            <button onClick={() => router.back()} className="font-mono text-[9px] text-[#7A6E58] mr-2 md:hidden">←</button>
            <SkullIcon size={14} className="text-[#7A6E58]" />
            <p className="font-mono text-[9px] text-[#7A6E58] tracking-widest uppercase">Skull Scratch</p>
            <span className="font-mono text-[9px] text-[#2E2618]">·</span>
            <p className="font-mono text-[9px] text-[#7A6E58]">Scratch your fate</p>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center bg-[#0A0806] px-6 py-12 gap-8">
            <p className="font-mono text-[9px] text-[#7A6E58] tracking-[0.3em] uppercase text-center">
              {phase === 'idle' ? 'Buy a card. Scratch 6 panels. Match 3 skulls to win.'
                : phase === 'signing' ? 'Confirming on-chain...'
                : phase === 'playing' ? `${6 - revealed.filter(Boolean).length} panels remaining — tap to reveal`
                : result === 'win' ? '3 SKULLS — VALHALLA!' : 'No three of a kind. Better luck next time.'}
            </p>

            {/* Skull count indicator when playing */}
            {phase === 'playing' && (
              <p className="font-mono text-[10px] text-[#7A6E58]">
                Skulls found: <span className={`${skullCount >= 3 ? 'text-[#DC143C]' : 'text-[#D4BF9A]'}`}>{skullCount}</span> / 3
              </p>
            )}

            {/* 2x3 grid */}
            <div className="grid grid-cols-3 gap-3">
              {Array(6).fill(null).map((_, i) => (
                <button
                  key={i}
                  onClick={() => revealPanel(i)}
                  disabled={phase !== 'playing' || revealed[i]}
                  className={`w-24 h-24 md:w-28 md:h-28 flex items-center justify-center rounded border-2 text-4xl transition-all relative overflow-hidden ${
                    revealed[i]
                      ? panels[i] === '💀'
                        ? 'border-[#DC143C] bg-[#DC143C]/10'
                        : 'border-[#2E2618] bg-[#1E1B14]'
                      : phase === 'playing'
                        ? 'border-[#7A6E58] bg-[#2E2618] hover:border-[#D4BF9A] cursor-pointer'
                        : 'border-[#2E2618] bg-[#1E1B14]'
                  }`}
                >
                  {revealed[i] ? (
                    <span style={{ filter: panels[i] === '💀' ? 'drop-shadow(0 0 8px #DC143C)' : 'none' }}>
                      {panels[i]}
                    </span>
                  ) : (
                    <span className="text-[#7A6E58] font-mono text-lg">?</span>
                  )}
                </button>
              ))}
            </div>

            {phase === 'playing' && !allRevealed && (
              <button
                onClick={revealAll}
                className="font-mono text-[10px] text-[#7A6E58] border border-[#2E2618] px-4 py-2 hover:border-[#7A6E58] transition-colors"
              >
                REVEAL ALL
              </button>
            )}

            <div className="text-center">
              <p className="font-mono text-[9px] text-[#7A6E58] mb-1">Win condition: 3x 💀 SKULL</p>
              <p className="font-mono text-[9px] text-[#DC143C]">Pays 2x stake</p>
            </div>
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
            <button onClick={handleBuy}
              className="w-full py-3 bg-[#DC143C] text-[#D4BF9A] font-mono text-xs tracking-widest hover:bg-[#DC143C]/80 transition-colors">
              BUY CARD
            </button>
          )}

          {phase === 'signing' && (
            <p className="font-mono text-[10px] text-[#7A6E58] tracking-widest animate-pulse text-center">
              CONFIRMING ON-CHAIN...
            </p>
          )}

          {phase === 'result' && (
            <>
              <div className={`p-4 border ${result === 'win' ? 'border-[#D4BF9A] bg-[#D4BF9A]/5' : 'border-[#DC143C] bg-[#DC143C]/5'}`}>
                <p className={`font-serif text-lg font-bold mb-1 ${result === 'win' ? 'text-[#D4BF9A]' : 'text-[#DC143C]'}`}>
                  {result === 'win' ? 'WINNER!' : 'NO MATCH'}
                </p>
                <p className={`font-mono text-xl ${result === 'win' ? 'text-[#D4BF9A]' : 'text-[#7A6E58]'}`}>
                  {result === 'win' ? `+$${(stakeUsd * 2).toFixed(2)}` : `-$${stakeUsd.toFixed(2)}`}
                </p>
              </div>
              <button onClick={reset}
                className="w-full py-3 border border-[#2E2618] font-mono text-xs tracking-widest text-[#D4BF9A] hover:border-[#D4BF9A] transition-colors">
                BUY AGAIN
              </button>
            </>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
