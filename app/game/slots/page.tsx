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
type Phase = 'idle' | 'signing' | 'spinning' | 'result'

const MASTER_ADDRESS = process.env.NEXT_PUBLIC_MASTER_WALLET_ADDRESS as `0x${string}`

const SYMBOLS = ['💀', '⚔️', '🦴', '👁️', '💎'] as const
type Symbol = typeof SYMBOLS[number]

const SYMBOL_NAMES: Record<Symbol, string> = {
  '💀': 'SKULL',
  '⚔️': 'SWORD',
  '🦴': 'BONE',
  '👁️': 'EYE',
  '💎': 'GEM',
}

function getWinCombo(): [Symbol, Symbol, Symbol] {
  return ['💀', '💀', '💀']
}

function getLoseCombo(): [Symbol, Symbol, Symbol] {
  const pick = (): Symbol => {
    const idx = Math.floor(Math.random() * SYMBOLS.length)
    return SYMBOLS[idx]
  }
  let combo: [Symbol, Symbol, Symbol]
  do {
    combo = [pick(), pick(), pick()]
  } while (combo[0] === combo[1] && combo[1] === combo[2])
  return combo
}

function Reel({ symbol, spinning, delay }: { symbol: Symbol; spinning: boolean; delay: number }) {
  return (
    <div
      className="w-24 h-24 md:w-32 md:h-32 flex items-center justify-center rounded border-2 border-[#2E2618] bg-[#0A0806] text-5xl md:text-6xl relative overflow-hidden"
      style={{ transition: `border-color 0.3s ${delay}ms` }}
    >
      {spinning ? (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center"
          style={{
            animation: 'spin-reel 0.1s linear infinite',
          }}
        >
          {[...SYMBOLS, ...SYMBOLS].map((s, i) => (
            <span key={i} className="text-4xl leading-none py-1">{s}</span>
          ))}
        </div>
      ) : (
        <span
          className="relative z-10"
          style={{
            filter: symbol === '💀' ? 'drop-shadow(0 0 8px #DC143C)' : 'none',
            animation: !spinning && symbol === '💀' ? 'pulse-glow 1.5s ease-in-out infinite' : 'none',
          }}
        >
          {symbol}
        </span>
      )}
    </div>
  )
}

export default function SlotsPage() {
  const { address } = useAccount()
  const router = useRouter()
  const { writeContractAsync } = useWriteContract()

  const [token, setToken] = useState<Token>('DEAD')
  const [stakeUsd, setStakeUsd] = useState(1)
  const [tokenPrices, setTokenPrices] = useState<{ DEAD: number; UDEAD: number }>({ DEAD: 0, UDEAD: 0 })
  const [phase, setPhase] = useState<Phase>('idle')
  const [result, setResult] = useState<'win' | 'loss' | null>(null)
  const [error, setError] = useState('')

  const [reels, setReels] = useState<[Symbol, Symbol, Symbol]>(['💀', '💀', '💀'])
  const [spinning, setSpinning] = useState<[boolean, boolean, boolean]>([false, false, false])

  const sessionIdRef = useRef<string | null>(null)
  const outcomeRef = useRef<'win' | 'loss' | null>(null)

  const tokenAmount = tokenPrices[token] > 0 ? usdToTokens(stakeUsd, tokenPrices[token]) : 0

  useEffect(() => { getTokenPricesUSD().then(setTokenPrices) }, [])

  async function handleSpin() {
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
          wallet_address: address, game_type: 'skull_slots', token,
          bet_amount_usd: stakeUsd, bet_amount_tokens: tokenAmount, bet_tx_hash: betTxHash,
        }),
      })
      const data = await res.json()
      if (!res.ok || data.error) { setError(data.error ?? 'Failed to start game'); setPhase('idle'); return }

      sessionIdRef.current = data.session_id
      outcomeRef.current = data.outcome

      const finalCombo = data.outcome === 'win' ? getWinCombo() : getLoseCombo()

      // Start all reels spinning
      setPhase('spinning')
      setSpinning([true, true, true])

      // Stop reel 1 after 1.2s
      setTimeout(() => {
        setSpinning([false, true, true])
        setReels(prev => [finalCombo[0], prev[1], prev[2]])
      }, 1200)

      // Stop reel 2 after 2.0s
      setTimeout(() => {
        setSpinning(prev => [prev[0], false, true])
        setReels(prev => [prev[0], finalCombo[1], prev[2]])
      }, 2000)

      // Stop reel 3 after 2.8s
      setTimeout(() => {
        setSpinning([false, false, false])
        setReels(finalCombo)
        setTimeout(() => resolveGame(), 400)
      }, 2800)

    } catch (e: unknown) {
      setError((e as { shortMessage?: string })?.shortMessage || 'Transaction rejected')
      setPhase('idle')
    }
  }

  async function resolveGame() {
    const res = await fetch('/api/game/resolve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionIdRef.current, price_correct: true }),
    })
    const data = await res.json()
    setResult(data.result)
    setPhase('result')
  }

  function reset() {
    setPhase('idle'); setResult(null); setError('')
    setReels(['💀', '💀', '💀']); setSpinning([false, false, false])
    sessionIdRef.current = null; outcomeRef.current = null
  }

  return (
    <AppLayout active="play" fullBleed>
      <style>{`
        @keyframes spin-reel {
          0%   { transform: translateY(0); }
          100% { transform: translateY(-50%); }
        }
        @keyframes pulse-glow {
          0%, 100% { filter: drop-shadow(0 0 8px #DC143C); }
          50%       { filter: drop-shadow(0 0 20px #DC143C); }
        }
      `}</style>

      <div className="flex flex-col md:flex-row min-h-[calc(100vh-56px)]">
        {/* Main area */}
        <div className="flex-1 flex flex-col">
          <div className="px-4 md:px-6 py-3 border-b border-[#2E2618] bg-[#1E1B14] flex items-center gap-3">
            <button onClick={() => router.back()} className="font-mono text-[9px] text-[#7A6E58] mr-2 md:hidden">←</button>
            <SkullIcon size={14} className="text-[#7A6E58]" />
            <p className="font-mono text-[9px] text-[#7A6E58] tracking-widest uppercase">Skull Slots</p>
            <span className="font-mono text-[9px] text-[#2E2618]">·</span>
            <p className="font-mono text-[9px] text-[#7A6E58]">3-reel fortune</p>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center bg-[#0A0806] px-6 py-12 gap-8">
            <p className="font-mono text-[9px] text-[#7A6E58] tracking-[0.3em] uppercase text-center">
              {phase === 'idle' ? 'Line up three skulls and claim the jackpot.'
                : phase === 'signing' ? 'Confirming on-chain...'
                : phase === 'spinning' ? 'Fate is spinning...'
                : result === 'win' ? 'THREE SKULLS — VALHALLA AWAITS.' : 'The reels betray you.'}
            </p>

            {/* Reels */}
            <div className="flex gap-3 md:gap-4">
              {reels.map((sym, i) => (
                <Reel key={i} symbol={sym} spinning={spinning[i]} delay={i * 80} />
              ))}
            </div>

            {/* Symbol legend */}
            <div className="flex gap-4 flex-wrap justify-center">
              {SYMBOLS.map((s) => (
                <div key={s} className="flex items-center gap-1">
                  <span className="text-lg">{s}</span>
                  <span className="font-mono text-[8px] text-[#7A6E58]">{SYMBOL_NAMES[s]}</span>
                </div>
              ))}
            </div>

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
            <button onClick={handleSpin}
              className="w-full py-3 bg-[#DC143C] text-[#D4BF9A] font-mono text-xs tracking-widest hover:bg-[#DC143C]/80 transition-colors">
              SPIN
            </button>
          )}

          {phase === 'result' && (
            <button onClick={reset}
              className="w-full py-3 border border-[#2E2618] font-mono text-xs tracking-widest text-[#D4BF9A] hover:border-[#D4BF9A] transition-colors">
              SPIN AGAIN
            </button>
          )}

          {(phase === 'signing' || phase === 'spinning') && (
            <div className="flex-1 flex items-center justify-center">
              <p className="font-mono text-[10px] text-[#7A6E58] tracking-widest animate-pulse text-center">
                {phase === 'signing' ? 'CONFIRMING ON-CHAIN...' : 'SPINNING...'}
              </p>
            </div>
          )}

          {phase === 'result' && result && (
            <div className={`p-4 border ${result === 'win' ? 'border-[#D4BF9A] bg-[#D4BF9A]/5' : 'border-[#DC143C] bg-[#DC143C]/5'}`}>
              <p className={`font-serif text-lg font-bold mb-1 ${result === 'win' ? 'text-[#D4BF9A]' : 'text-[#DC143C]'}`}>
                {result === 'win' ? 'JACKPOT!' : 'NO MATCH'}
              </p>
              <p className={`font-mono text-xl ${result === 'win' ? 'text-[#D4BF9A]' : 'text-[#7A6E58]'}`}>
                {result === 'win' ? `+$${(stakeUsd * 2).toFixed(2)}` : `-$${stakeUsd.toFixed(2)}`}
              </p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
