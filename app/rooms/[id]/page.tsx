'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useAccount } from 'wagmi'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { SkullIcon, SkeletonHead, DiceIcon, SwordIcon } from '@/components/icons'
import { getIceServers } from '@/lib/iceServers'
import { usePriceFeed } from '@/hooks/usePriceFeed'

type Member = { user_id: string; username: string }
type Message = { username: string; text: string; ts: number }
type RoundStatus = 'idle' | 'waiting' | 'playing' | 'result'
type Token = 'DEAD' | 'UDEAD'

const FLASH_REEL_COUNT = 8

export default function RoomPage() {
  const { address } = useAccount()
  const params = useParams()
  const router = useRouter()
  const roomId = params.id as string

  const [room, setRoom] = useState<{ name: string; host_user_id: string; game_mode: string; stake_amount: number; max_players: number } | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [chatInput, setChatInput] = useState('')
  const [userId, setUserId] = useState<string | null>(null)
  const [username, setUsername] = useState('')
  const [roundStatus, setRoundStatus] = useState<RoundStatus>('idle')
  const [roundId, setRoundId] = useState<string | null>(null)
  const [winnerName, setWinnerName] = useState<string | null>(null)
  const [isMuted, setIsMuted] = useState(false)
  const [inCall, setInCall] = useState(false)
  const [diceValue, setDiceValue] = useState<number | null>(null)
  const [chatOpen, setChatOpen] = useState(false)

  // Flash Price states
  const [flashToken, setFlashToken] = useState<Token>('DEAD')
  const [reelPrices, setReelPrices] = useState<string[]>([])
  const [reelOffset, setReelOffset] = useState(0)
  const [flashSpinning, setFlashSpinning] = useState(false)
  const [flashPick, setFlashPick] = useState<string | null>(null)
  const [flashSubmitted, setFlashSubmitted] = useState(false)

  const localStreamRef = useRef<MediaStream | null>(null)
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map())
  const wsRef = useRef<WebSocket | null>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const spinIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const livePriceRef = useRef<number>(0)

  // Live price feed for flash price mode
  const feed = usePriceFeed(flashToken, 1000)
  const livePrice = feed.price?.priceUsd ?? 0
  useEffect(() => { if (livePrice > 0) livePriceRef.current = livePrice }, [livePrice])

  // Must be declared before the useEffect that references it
  const loadMembers = useCallback(async () => {
    const { data } = await supabase.from('room_members').select('user_id, username').eq('room_id', roomId)
    setMembers(data ?? [])
  }, [roomId])

  useEffect(() => {
    if (!address) return
    async function load() {
      const { data: user } = await supabase.from('users').select('id, username')
        .eq('wallet_address', address!.toLowerCase()).single()
      if (!user) { router.push('/'); return }
      setUserId(user.id)
      setUsername(user.username)

      const { data: roomData } = await supabase.from('rooms').select('*').eq('id', roomId).single()
      setRoom(roomData)

      const { data: existing } = await supabase.from('room_members').select('id')
        .eq('room_id', roomId).eq('user_id', user.id).single()
      if (!existing) {
        await supabase.from('room_members').insert({ room_id: roomId, user_id: user.id, username: user.username })
      }
      loadMembers()
    }
    load()
  }, [address, roomId, router, loadMembers])

  useEffect(() => {
    const channel = supabase.channel(`room:${roomId}`)
      .on('broadcast', { event: 'chat' }, ({ payload }) => {
        setMessages((prev) => [...prev, payload])
        setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
      })
      .on('broadcast', { event: 'member_join' }, loadMembers)
      .on('broadcast', { event: 'member_leave' }, loadMembers)
      .on('broadcast', { event: 'round_start' }, ({ payload }) => {
        setRoundId(payload.round_id)
        setRoundStatus('waiting')
        setDiceValue(null)
        setWinnerName(null)
        setFlashPick(null)
        setFlashSubmitted(false)
      })
      .on('broadcast', { event: 'round_result' }, ({ payload }) => {
        clearInterval(spinIntervalRef.current!)
        setFlashSpinning(false)
        setWinnerName(payload.winner_username)
        setRoundStatus('result')
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [roomId, loadMembers])

  // Generate reel prices around current live price
  function buildReelPrices(realPrice: number): string[] {
    const decimals = realPrice < 0.01 ? 6 : realPrice < 1 ? 4 : 2
    return Array.from({ length: FLASH_REEL_COUNT }, () => {
      const offset = (Math.random() - 0.5) * realPrice * 0.004
      return Math.abs(realPrice + offset).toFixed(decimals)
    })
  }

  async function joinCall() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      localStreamRef.current = stream
      setInCall(true)
      const ws = new WebSocket(`${process.env.NEXT_PUBLIC_MEDIASOUP_URL}/room/${roomId}?userId=${userId}`)
      wsRef.current = ws
      ws.onmessage = async (e) => {
        const msg = JSON.parse(e.data)
        if (msg.type === 'peer_joined') await createOffer(msg.peerId)
        if (msg.type === 'offer') await handleOffer(msg.peerId, msg.sdp)
        if (msg.type === 'answer') { const pc = peersRef.current.get(msg.peerId); if (pc) await pc.setRemoteDescription({ type: 'answer', sdp: msg.sdp }) }
        if (msg.type === 'ice_candidate') { const pc = peersRef.current.get(msg.peerId); if (pc) await pc.addIceCandidate(msg.candidate) }
        if (msg.type === 'peer_left') { peersRef.current.get(msg.peerId)?.close(); peersRef.current.delete(msg.peerId) }
      }
    } catch (e) { console.error('Mic denied:', e) }
  }

  async function createOffer(peerId: string) {
    const pc = createPeerConnection(peerId)
    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)
    wsRef.current?.send(JSON.stringify({ type: 'offer', targetId: peerId, sdp: offer.sdp }))
  }

  async function handleOffer(peerId: string, sdp: string) {
    const pc = createPeerConnection(peerId)
    await pc.setRemoteDescription({ type: 'offer', sdp })
    const answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)
    wsRef.current?.send(JSON.stringify({ type: 'answer', targetId: peerId, sdp: answer.sdp }))
  }

  function createPeerConnection(peerId: string) {
    const pc = new RTCPeerConnection({
      iceServers: getIceServers(),
      iceTransportPolicy: 'all',
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require',
    })
    localStreamRef.current?.getTracks().forEach((t) => pc.addTrack(t, localStreamRef.current!))
    pc.ontrack = (e) => { const a = new Audio(); a.srcObject = e.streams[0]; a.play() }
    pc.onicecandidate = (e) => { if (e.candidate) wsRef.current?.send(JSON.stringify({ type: 'ice_candidate', targetId: peerId, candidate: e.candidate })) }
    peersRef.current.set(peerId, pc)
    return pc
  }

  function leaveCall() {
    localStreamRef.current?.getTracks().forEach((t) => t.stop())
    peersRef.current.forEach((pc) => pc.close()); peersRef.current.clear()
    wsRef.current?.close(); setInCall(false)
  }

  function toggleMute() {
    if (!localStreamRef.current) return
    const track = localStreamRef.current.getAudioTracks()[0]
    track.enabled = !track.enabled; setIsMuted(!track.enabled)
  }

  async function sendChat(e: React.FormEvent) {
    e.preventDefault()
    if (!chatInput.trim() || !username) return
    const msg = { username, text: chatInput.trim(), ts: Date.now() }
    await supabase.channel(`room:${roomId}`).send({ type: 'broadcast', event: 'chat', payload: msg })
    setMessages((prev) => [...prev, msg])
    setChatInput('')
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
  }

  async function startRound() {
    if (!room || !userId) return
    const { data: round } = await supabase.from('room_rounds').insert({
      room_id: roomId, game_type: room.game_mode, stake_amount: room.stake_amount,
      player_count: members.length, status: 'waiting',
      pot_total: room.stake_amount * members.length,
      winner_payout: room.stake_amount * members.length * 0.7,
    }).select().single()
    if (!round) return
    await supabase.channel(`room:${roomId}`).send({ type: 'broadcast', event: 'round_start', payload: { round_id: round.id } })
  }

  async function joinRound() {
    if (!roundId || !userId) return
    setRoundStatus('playing')

    if (room?.game_mode === 'dice') {
      const roll = Math.floor(Math.random() * 6) + 1
      setDiceValue(roll)
      await fetch('/api/rooms/submit-entry', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ round_id: roundId, user_id: userId, pick: roll.toString(), token: 'DEAD' }),
      })
    } else if (room?.game_mode === 'flash_price') {
      // Build reel and start spinning
      const prices = buildReelPrices(livePriceRef.current || 0.0001)
      setReelPrices(prices)
      setFlashSpinning(true)
      setFlashPick(null)
      setFlashSubmitted(false)
      let offset = 0
      spinIntervalRef.current = setInterval(() => {
        offset = (offset + 1) % FLASH_REEL_COUNT
        setReelOffset(offset)
      }, 80)
    }
  }

  async function handleFlashStop() {
    if (!flashSpinning || flashSubmitted || !roundId || !userId) return
    clearInterval(spinIntervalRef.current!)
    setFlashSpinning(false)

    const pick = reelPrices[reelOffset % reelPrices.length]
    setFlashPick(pick)
    setFlashSubmitted(true)

    await fetch('/api/rooms/submit-entry', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ round_id: roundId, user_id: userId, pick, token: flashToken }),
    })
  }

  const isHost = room?.host_user_id === userId
  const pot = (room?.stake_amount ?? 0) * members.length
  const isFlash = room?.game_mode === 'flash_price'

  const visiblePrices = reelPrices.length > 0
    ? Array.from({ length: 7 }, (_, i) => reelPrices[(reelOffset + i) % reelPrices.length])
    : []

  return (
    <main className="h-screen bg-[#0A0806] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="shrink-0 border-b border-[#2E2618] px-4 py-3 flex justify-between items-center bg-[#1E1B14]">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="font-mono text-[9px] text-[#7A6E58]">← Leave</button>
          <div className="w-px h-4 bg-[#2E2618]" />
          <SkullIcon size={14} className="text-[#DC143C]" />
          <div>
            <p className="font-mono text-[10px] text-[#D4BF9A] tracking-wide">{room?.name}</p>
            <p className="font-mono text-[8px] text-[#7A6E58]">{members.length}/{room?.max_players} warriors</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Token selector for flash price */}
          {isFlash && roundStatus === 'idle' && (
            <div className="flex gap-1">
              {(['DEAD', 'UDEAD'] as Token[]).map((t) => (
                <button key={t} onClick={() => setFlashToken(t)}
                  className={`font-mono text-[8px] tracking-widest px-2 py-1 border transition-colors ${
                    flashToken === t ? 'border-[#DC143C] text-[#DC143C]' : 'border-[#2E2618] text-[#7A6E58]'
                  }`}>
                  ${t}
                </button>
              ))}
            </div>
          )}
          {!inCall ? (
            <button onClick={joinCall} className="font-mono text-[9px] text-[#DC143C] border border-[#DC143C] px-3 py-1.5 hover:bg-[#DC143C]/10 transition-colors">
              Join Call
            </button>
          ) : (
            <>
              <button onClick={toggleMute} className={`font-mono text-[9px] px-3 py-1.5 border transition-colors ${isMuted ? 'border-[#DC143C] text-[#DC143C]' : 'border-[#2E2618] text-[#7A6E58]'}`}>
                {isMuted ? 'Unmute' : 'Mute'}
              </button>
              <button onClick={leaveCall} className="font-mono text-[9px] text-[#7A6E58] border border-[#2E2618] px-3 py-1.5">End</button>
            </>
          )}
          <button onClick={() => setChatOpen(!chatOpen)} className="md:hidden font-mono text-[9px] text-[#7A6E58] border border-[#2E2618] px-3 py-1.5">
            Chat
          </button>
        </div>
      </div>

      {/* Members strip */}
      <div className="shrink-0 border-b border-[#2E2618] px-4 py-2 flex gap-3 overflow-x-auto bg-[#1E1B14]">
        {members.map((m) => (
          <div key={m.user_id} className="flex flex-col items-center gap-1 shrink-0">
            <div className="w-8 h-8 border border-[#2E2618] flex items-center justify-center bg-[#0A0806]">
              <SkeletonHead size={20} className="text-[#7A6E58]" />
            </div>
            <span className="font-mono text-[8px] text-[#7A6E58] max-w-[40px] truncate">{m.username}</span>
          </div>
        ))}
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">

        {/* Game area */}
        <div className={`flex flex-col flex-1 min-w-0 ${chatOpen ? 'hidden md:flex' : 'flex'}`}>
          <div className="flex-1 flex flex-col items-center justify-center px-4 py-6">

            {/* ── IDLE ── */}
            {roundStatus === 'idle' && (
              <div className="text-center max-w-xs w-full">
                {isFlash
                  ? <SwordIcon size={48} className="text-[#DC143C] mx-auto mb-4" />
                  : <DiceIcon size={48} value={6} className="text-[#DC143C] mx-auto mb-4" />
                }
                <p className="font-serif text-2xl font-bold text-[#D4BF9A] mb-1">
                  {isFlash ? 'Flash Price' : 'Dice Roll'}
                </p>
                {isFlash && (
                  <p className="font-mono text-[9px] text-[#DC143C] mb-1 price-live">
                    ${flashToken} — ${livePrice > 0 ? livePrice.toFixed(6) : '—'}
                  </p>
                )}
                <p className="font-mono text-xs text-[#7A6E58] mb-2">Stake ${room?.stake_amount} {isFlash ? flashToken : 'DEAD'} each</p>
                <p className="font-mono text-[10px] text-[#7A6E58] mb-6">
                  {isFlash ? 'Closest pick wins' : 'Highest roll wins'} — ${(pot * 0.7).toFixed(2)} pot
                </p>
                {isHost && members.length >= 2 ? (
                  <button className="btn-filled" onClick={startRound}>Start Round</button>
                ) : (
                  <p className="font-mono text-[9px] text-[#7A6E58]">
                    {isHost ? 'Need 2+ warriors' : 'Waiting for host...'}
                  </p>
                )}
              </div>
            )}

            {/* ── WAITING (enter round) ── */}
            {roundStatus === 'waiting' && (
              <div className="text-center">
                <p className="font-mono text-[10px] text-[#DC143C] animate-pulse mb-6 tracking-widest">ROUND STARTING</p>
                <button className="btn-filled max-w-[240px]" onClick={joinRound}>
                  Enter Round — ${room?.stake_amount}
                </button>
              </div>
            )}

            {/* ── PLAYING: DICE ── */}
            {roundStatus === 'playing' && !isFlash && diceValue && (
              <div className="text-center">
                <p className="font-mono text-[10px] text-[#7A6E58] mb-4 tracking-widest uppercase">Your Roll</p>
                <DiceIcon size={80} value={diceValue} className="text-[#DC143C] mx-auto" />
                <p className="font-mono text-[9px] text-[#7A6E58] mt-4 animate-pulse">Waiting for all warriors...</p>
              </div>
            )}

            {/* ── PLAYING: FLASH PRICE ── */}
            {roundStatus === 'playing' && isFlash && (
              <div className="flex flex-col items-center w-full max-w-xs">
                <p className="font-mono text-[9px] text-[#7A6E58] tracking-[0.3em] uppercase mb-4 text-center">
                  {flashSubmitted ? 'Pick locked. Waiting for warriors...' : 'Stop on your price pick.'}
                </p>

                {/* Reel */}
                <div className="relative w-full overflow-hidden border border-[#2E2618] bg-[#1E1B14] mb-4">
                  <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[52px] border-t border-b border-[#DC143C] z-10 pointer-events-none" />
                  <div className="flex flex-col">
                    {visiblePrices.map((price, i) => (
                      <div key={i} className={`h-[52px] flex items-center justify-center border-b border-[#2E2618] transition-all ${
                        i === 3 ? (flashSpinning ? 'bg-[#DC143C]/10' : 'bg-[#DC143C]/20') : ''
                      }`}>
                        <span className={`font-mono ${i === 3 ? 'text-lg font-bold text-[#D4BF9A]' : 'text-sm text-[#7A6E58]'}`}>
                          ${price}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {flashSpinning && !flashSubmitted && (
                  <button
                    onClick={handleFlashStop}
                    className="w-full py-5 bg-[#DC143C] text-[#D4BF9A] font-mono text-sm tracking-widest uppercase hover:bg-[#8B0000] transition-colors"
                  >
                    ■ STOP
                  </button>
                )}

                {flashSubmitted && flashPick && (
                  <div className="text-center">
                    <p className="font-mono text-[10px] text-[#7A6E58]">Picked</p>
                    <p className="font-mono text-xl font-bold text-[#D4BF9A]">${flashPick}</p>
                    <p className="font-mono text-[9px] text-[#7A6E58] mt-2 animate-pulse">Waiting for all warriors...</p>
                  </div>
                )}
              </div>
            )}

            {/* ── RESULT ── */}
            {roundStatus === 'result' && (
              <div className="text-center">
                {winnerName === username ? (
                  <>
                    <SkullIcon size={48} className="text-[#DC143C] mx-auto mb-4" />
                    <p className="font-mono text-[10px] text-[#7A6E58] tracking-[0.4em] mb-1">WELCOME TO</p>
                    <p className="font-serif text-4xl font-bold text-[#D4BF9A] mb-4">VALHALLA</p>
                    <p className="font-mono text-xl text-[#DC143C]">+ ${(pot * 0.7).toFixed(2)}</p>
                  </>
                ) : (
                  <>
                    <SkullIcon size={48} className="text-[#7A6E58] mx-auto mb-4" />
                    <p className="font-serif text-3xl text-[#D4BF9A] mb-2">{winnerName} wins</p>
                    <p className="font-mono text-sm text-[#DC143C]">- ${room?.stake_amount}</p>
                  </>
                )}
                {isHost && (
                  <button className="btn-filled mt-6 max-w-[200px]" onClick={() => { setRoundStatus('idle'); setFlashPick(null); setFlashSubmitted(false) }}>
                    Next Round
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Chat panel */}
        <div className={`
          md:w-80 md:flex md:flex-col border-[#2E2618] bg-[#0A0806]
          md:border-l
          ${chatOpen ? 'flex flex-col absolute inset-0 top-[97px] z-40 bg-[#0A0806]' : 'hidden md:flex'}
        `}>
          <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2 min-h-0">
            {messages.length === 0 && (
              <p className="font-mono text-[9px] text-[#7A6E58] text-center mt-4">No messages yet. Start the battle.</p>
            )}
            {messages.map((msg, i) => (
              <div key={i} className="flex gap-2 items-baseline">
                <span className="font-mono text-[9px] text-[#DC143C] shrink-0">{msg.username}</span>
                <span className="font-mono text-[11px] text-[#D4BF9A] break-words">{msg.text}</span>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          <form onSubmit={sendChat} className="shrink-0 border-t border-[#2E2618] flex">
            <input
              className="flex-1 bg-transparent px-4 py-3 font-mono text-[11px] text-[#D4BF9A] outline-none placeholder:text-[#7A6E58]"
              placeholder="Say something..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
            />
            <button type="submit" className="px-4 font-mono text-[9px] text-[#DC143C] border-l border-[#2E2618] hover:bg-[#DC143C]/10 transition-colors">
              SEND
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}
