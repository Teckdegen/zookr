'use client'

import { useState, useEffect, useRef } from 'react'
import { useAccount, useWriteContract } from 'wagmi'
import { parseUnits } from 'viem'
import { createClient } from '@supabase/supabase-js'
import { TOKENS, ERC20_ABI } from '@/lib/wagmi'
import { getTokenPricesUSD, usdToTokens } from '@/lib/tokenPrice'
import { SkullIcon } from '@/components/icons'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'
)

const MASTER_ADDRESS = process.env.NEXT_PUBLIC_MASTER_WALLET_ADDRESS as `0x${string}`

type Token = 'DEAD' | 'UDEAD'

interface PvPLobbyProps {
  gameType: string
  gameTitle: string
  onGameStart: (lobbyId: string, gameData: Record<string, unknown>, isP1: boolean) => void
}

export function PvPLobby({ gameType, gameTitle, onGameStart }: PvPLobbyProps) {
  const { address } = useAccount()
  const { writeContractAsync } = useWriteContract()

  const [tab, setTab] = useState<'create' | 'join'>('create')
  const [token, setToken] = useState<Token>('DEAD')
  const [stakeUsd, setStakeUsd] = useState(1)
  const [tokenPrices, setTokenPrices] = useState<{ DEAD: number; UDEAD: number }>({ DEAD: 0, UDEAD: 0 })
  const [username, setUsername] = useState('')
  const [lobbyId, setLobbyId] = useState<string | null>(null)
  const [joinLobbyId, setJoinLobbyId] = useState('')
  const [phase, setPhase] = useState<'idle' | 'signing' | 'waiting' | 'joining'>('idle')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const pollRef = useRef<NodeJS.Timeout | null>(null)

  const tokenAmount = tokenPrices[token] > 0 ? usdToTokens(stakeUsd, tokenPrices[token]) : 0

  useEffect(() => {
    getTokenPricesUSD().then(setTokenPrices)
  }, [])

  // Poll for p2 after creating lobby
  useEffect(() => {
    if (phase !== 'waiting' || !lobbyId) return

    pollRef.current = setInterval(async () => {
      const { data } = await supabase
        .from('pvp_lobbies')
        .select('*')
        .eq('id', lobbyId)
        .single()

      if (data?.status === 'playing') {
        clearInterval(pollRef.current!)
        onGameStart(lobbyId, data.game_data as Record<string, unknown>, true)
      }
    }, 2000)

    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [phase, lobbyId, onGameStart])

  async function handleCreate() {
    if (!address) { setError('Connect wallet first'); return }
    if (tokenAmount <= 0) { setError('Price unavailable'); return }
    setError(''); setPhase('signing')

    try {
      const rawAmount = parseUnits(tokenAmount.toFixed(18), TOKENS[token].decimals)
      const betTxHash = await writeContractAsync({
        address: TOKENS[token].address,
        abi: ERC20_ABI,
        functionName: 'transfer',
        args: [MASTER_ADDRESS, rawAmount],
      })

      const res = await fetch('/api/pvp/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          game_type: gameType,
          wallet_address: address,
          username: username || address.slice(0, 8),
          stake_usd: stakeUsd,
          token,
          bet_tx_hash: betTxHash,
        }),
      })
      const data = await res.json()
      if (!res.ok || data.error) { setError(data.error ?? 'Failed to create'); setPhase('idle'); return }

      setLobbyId(data.lobby_id)
      setPhase('waiting')
    } catch (e: unknown) {
      setError((e as { shortMessage?: string })?.shortMessage || 'Transaction rejected')
      setPhase('idle')
    }
  }

  async function handleJoin() {
    if (!address) { setError('Connect wallet first'); return }
    if (!joinLobbyId.trim()) { setError('Enter a lobby ID'); return }
    if (tokenAmount <= 0) { setError('Price unavailable'); return }
    setError(''); setPhase('joining')

    try {
      // First get lobby details to match stake
      const { data: lobby } = await supabase
        .from('pvp_lobbies')
        .select('*')
        .eq('id', joinLobbyId.trim())
        .single()

      if (!lobby) { setError('Lobby not found'); setPhase('idle'); return }
      if (lobby.status !== 'waiting') { setError('Lobby is not open'); setPhase('idle'); return }

      const lobbyStakeUsd = lobby.stake_usd
      const lobbyToken = lobby.token as Token
      const lobbyTokenPrice = tokenPrices[lobbyToken]
      if (lobbyTokenPrice <= 0) { setError('Price unavailable'); setPhase('idle'); return }

      const joinAmount = usdToTokens(lobbyStakeUsd, lobbyTokenPrice)
      const rawAmount = parseUnits(joinAmount.toFixed(18), TOKENS[lobbyToken].decimals)

      const betTxHash = await writeContractAsync({
        address: TOKENS[lobbyToken].address,
        abi: ERC20_ABI,
        functionName: 'transfer',
        args: [MASTER_ADDRESS, rawAmount],
      })

      const res = await fetch('/api/pvp/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lobby_id: joinLobbyId.trim(),
          wallet_address: address,
          username: username || address.slice(0, 8),
          bet_tx_hash: betTxHash,
        }),
      })
      const data = await res.json()
      if (!res.ok || data.error) { setError(data.error ?? 'Failed to join'); setPhase('idle'); return }

      onGameStart(data.lobby_id, data.game_data as Record<string, unknown>, false)
    } catch (e: unknown) {
      setError((e as { shortMessage?: string })?.shortMessage || 'Transaction rejected')
      setPhase('idle')
    }
  }

  function copyLobbyId() {
    if (!lobbyId) return
    navigator.clipboard.writeText(lobbyId).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  if (phase === 'waiting' && lobbyId) {
    return (
      <div className="flex flex-col items-center justify-center gap-8 py-12 px-6 text-center">
        <SkullIcon size={40} className="text-[#DC143C] animate-pulse" />
        <div>
          <p className="font-mono text-[9px] text-[#7A6E58] tracking-[0.35em] uppercase mb-2">Waiting for opponent</p>
          <h2 className="font-serif text-2xl text-[#D4BF9A] mb-4">{gameTitle}</h2>
          <p className="font-mono text-[9px] text-[#7A6E58] mb-4">Share this lobby ID with your opponent:</p>
          <div className="bg-[#0A0806] border border-[#2E2618] p-3 rounded font-mono text-xs text-[#D4BF9A] break-all mb-2">
            {lobbyId}
          </div>
          <button
            onClick={copyLobbyId}
            className="font-mono text-[9px] tracking-widest text-[#DC143C] border border-[#DC143C]/40 px-4 py-2 hover:bg-[#DC143C]/10 transition-colors"
          >
            {copied ? 'COPIED!' : 'COPY ID'}
          </button>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#DC143C] animate-pulse" />
          <p className="font-mono text-[9px] text-[#7A6E58] tracking-widest animate-pulse">WAITING FOR WARRIOR...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5 p-6 max-w-sm w-full mx-auto">
      <div>
        <p className="font-mono text-[9px] text-[#7A6E58] tracking-[0.35em] uppercase mb-1">PvP</p>
        <h2 className="font-serif text-2xl text-[#D4BF9A]">{gameTitle}</h2>
        <p className="font-mono text-[9px] text-[#7A6E58] mt-1">Loser pays winner. House takes 20%.</p>
      </div>

      {/* Tab toggle */}
      <div className="grid grid-cols-2 gap-px bg-[#2E2618]">
        {(['create', 'join'] as const).map((t) => (
          <button key={t} onClick={() => { setTab(t); setError('') }}
            className={`py-2 font-mono text-[10px] tracking-widest uppercase transition-colors ${
              tab === t ? 'bg-[#DC143C] text-[#D4BF9A]' : 'bg-[#1E1B14] text-[#7A6E58] hover:text-[#D4BF9A]'
            }`}>
            {t === 'create' ? 'Create Room' : 'Join Room'}
          </button>
        ))}
      </div>

      {/* Username */}
      <div>
        <p className="font-mono text-[9px] text-[#7A6E58] tracking-widest uppercase mb-2">Warrior Name</p>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Anonymous"
          maxLength={20}
          className="w-full bg-[#0A0806] border border-[#2E2618] px-3 py-2 font-mono text-xs text-[#D4BF9A] placeholder-[#3A3228] focus:outline-none focus:border-[#DC143C]"
        />
      </div>

      {tab === 'create' ? (
        <>
          {/* Token selector */}
          <div>
            <p className="font-mono text-[9px] text-[#7A6E58] tracking-widest uppercase mb-2">Token</p>
            <div className="grid grid-cols-2 gap-px bg-[#2E2618]">
              {(['DEAD', 'UDEAD'] as Token[]).map((t) => (
                <button key={t} onClick={() => setToken(t)} disabled={phase !== 'idle'}
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
              {[1,2,3,5,10].map((s) => (
                <button key={s} onClick={() => setStakeUsd(s)} disabled={phase !== 'idle'}
                  className={`flex-1 py-2 font-mono text-[10px] border transition-colors ${
                    stakeUsd === s ? 'border-[#DC143C] text-[#DC143C] bg-[#DC143C]/10' : 'border-[#2E2618] text-[#7A6E58]'
                  }`}>
                  ${s}
                </button>
              ))}
            </div>
            {tokenPrices[token] > 0 && (
              <p className="font-mono text-[9px] text-[#7A6E58] mt-1">
                = {tokenAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })} ${token}
              </p>
            )}
          </div>

          {error && <p className="font-mono text-[10px] text-[#DC143C]">{error}</p>}

          <button
            onClick={handleCreate}
            disabled={phase !== 'idle'}
            className="w-full py-3 bg-[#DC143C] font-mono text-[10px] tracking-widest text-[#D4BF9A] hover:bg-[#B01030] transition-colors disabled:opacity-50"
          >
            {phase === 'signing' ? 'SIGNING...' : 'CREATE ROOM & STAKE'}
          </button>
        </>
      ) : (
        <>
          <div>
            <p className="font-mono text-[9px] text-[#7A6E58] tracking-widest uppercase mb-2">Lobby ID</p>
            <input
              type="text"
              value={joinLobbyId}
              onChange={(e) => setJoinLobbyId(e.target.value)}
              placeholder="Paste lobby ID here"
              className="w-full bg-[#0A0806] border border-[#2E2618] px-3 py-2 font-mono text-xs text-[#D4BF9A] placeholder-[#3A3228] focus:outline-none focus:border-[#DC143C]"
            />
          </div>

          {error && <p className="font-mono text-[10px] text-[#DC143C]">{error}</p>}

          <button
            onClick={handleJoin}
            disabled={phase !== 'idle'}
            className="w-full py-3 bg-[#DC143C] font-mono text-[10px] tracking-widest text-[#D4BF9A] hover:bg-[#B01030] transition-colors disabled:opacity-50"
          >
            {phase === 'joining' ? 'JOINING...' : 'JOIN & STAKE'}
          </button>

          <p className="font-mono text-[9px] text-[#7A6E58] text-center">
            Stake will match the room creator&apos;s bet.
          </p>
        </>
      )}
    </div>
  )
}
