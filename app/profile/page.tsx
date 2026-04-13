'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useAccount } from 'wagmi'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { AppLayout } from '@/components/AppLayout'
import { SkullIcon, SkeletonHead, SwordIcon } from '@/components/icons'
import { ConnectButton } from '@/components/ConnectButton'
import { usePriceFeed } from '@/hooks/usePriceFeed'

type Profile = {
  username: string
  balance_dead: number
  balance_udead: number
  created_at: string
}

type Tx = {
  id: string
  type: string
  token: string
  amount: number
  tx_hash: string | null
  created_at: string
}

export default function ProfilePage() {
  const { address, isConnected } = useAccount()
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [txs, setTxs] = useState<Tx[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isConnected || !address) { router.push('/'); return }

    async function load() {
      const { data: user } = await supabase
        .from('users').select('username, created_at')
        .eq('wallet_address', address!.toLowerCase()).single()

      if (!user) { router.push('/onboard'); return }

      const balRes = await fetch(`/api/wallet/balance?wallet_address=${address}`)
      const balData = balRes.ok ? await balRes.json() : { dead: 0, udead: 0 }

      const { data: transactions } = await supabase
        .from('transactions').select('*')
        .eq('user_id', (await supabase.from('users').select('id').eq('wallet_address', address!.toLowerCase()).single()).data?.id)
        .order('created_at', { ascending: false })
        .limit(30)

      setProfile({
        username:      user.username,
        balance_dead:  balData.dead  ?? 0,
        balance_udead: balData.udead ?? 0,
        created_at:    user.created_at,
      })
      setTxs(transactions ?? [])
      setLoading(false)
    }

    load()
  }, [isConnected, address, router])

  const deadFeed  = usePriceFeed('DEAD',  15000)
  const udeadFeed = usePriceFeed('UDEAD', 15000)
  const deadPrice  = deadFeed.price?.priceUsd  ?? 0
  const udeadPrice = udeadFeed.price?.priceUsd ?? 0
  const deadUsd    = (profile?.balance_dead  ?? 0) * deadPrice
  const udeadUsd   = (profile?.balance_udead ?? 0) * udeadPrice
  const totalUsd   = deadUsd + udeadUsd

  const joinDate = profile
    ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : ''

  function txLabel(type: string) {
    const map: Record<string, string> = {
      bet:       '⚔ Bet',
      win:       '🏆 Win',
      room_win:  '⚔ Room Win',
      room_loss: '☠ Room Loss',
    }
    return map[type] || type
  }

  function txColor(type: string) {
    if (['win', 'room_win'].includes(type)) return 'text-green-400'
    if (['bet', 'room_loss'].includes(type)) return 'text-[#DC143C]'
    return 'text-[#7A6E58]'
  }

  if (loading) {
    return (
      <AppLayout active="profile">
        <div className="flex items-center justify-center min-h-[60vh]">
          <SkullIcon size={24} className="text-[#DC143C] animate-pulse" />
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout active="profile">
      <div className="max-w-2xl mx-auto px-4 md:px-8 py-6 md:py-10">

        {/* Profile header */}
        <div className="border border-[#2E2618] bg-[#1E1B14] p-6 mb-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <SkeletonHead size={56} variant="crown" className="text-[#DC143C] shrink-0" />
              <div>
                <p className="font-mono text-[9px] text-[#7A6E58] tracking-widest uppercase mb-1">Warrior</p>
                <h1 className="font-serif text-3xl font-bold text-[#D4BF9A]">@{profile?.username}</h1>
                <p className="font-mono text-[9px] text-[#7A6E58] mt-1">Joined {joinDate}</p>
              </div>
            </div>
            <ConnectButton className="font-mono text-[9px] border border-[#2E2618] text-[#7A6E58] px-3 py-2 hover:border-[#DC143C] hover:text-[#DC143C] transition-colors bg-transparent cursor-pointer" />
          </div>

          {/* Wallet balance */}
          <div className="mt-6 pt-6 border-t border-[#2E2618]">
            <p className="font-mono text-[9px] text-[#7A6E58] tracking-widest uppercase mb-1">Wallet Balance</p>
            <p className="font-mono text-[9px] text-[#7A6E58] mb-3">
              {address?.slice(0, 6)}...{address?.slice(-4)}
            </p>
            <p className="font-serif text-3xl font-bold text-[#D4BF9A] mb-4">
              ${totalUsd > 0 ? totalUsd.toFixed(2) : '—'}
              <span className="font-mono text-xs text-[#7A6E58] ml-2">USD</span>
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="font-mono text-[9px] text-[#7A6E58] uppercase mb-1">$DEAD</p>
                <p className="font-mono text-base font-bold text-[#D4BF9A]">
                  {Number(profile?.balance_dead ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </p>
                {deadPrice > 0 && (
                  <p className="font-mono text-[9px] text-[#7A6E58]">≈ ${deadUsd.toFixed(2)}</p>
                )}
              </div>
              <div>
                <p className="font-mono text-[9px] text-[#7A6E58] uppercase mb-1">$UDEAD</p>
                <p className="font-mono text-base font-bold text-[#D4BF9A]">
                  {Number(profile?.balance_udead ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </p>
                {udeadPrice > 0 && (
                  <p className="font-mono text-[9px] text-[#7A6E58]">≈ ${udeadUsd.toFixed(2)}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Play buttons */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          <a href="/game/price"><button className="btn-blood w-full py-3 text-[10px]">☠ Dead Price</button></a>
          <a href="/game/chart"><button className="btn-blood w-full py-3 text-[10px]">⚔ War Chart</button></a>
        </div>

        {/* Transaction history */}
        <p className="font-mono text-[9px] tracking-[0.3em] text-[#7A6E58] uppercase mb-4">Recent Activity</p>

        {txs.length === 0 ? (
          <div className="border border-[#2E2618] bg-[#1E1B14] px-6 py-10 text-center">
            <SwordIcon size={32} className="text-[#2E2618] mx-auto mb-3" />
            <p className="font-mono text-[10px] text-[#7A6E58]">No activity yet. Enter the fight.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-px bg-[#2E2618]">
            {txs.map((tx) => (
              <div key={tx.id} className="bg-[#1E1B14] px-5 py-3 flex justify-between items-center">
                <div>
                  <p className={`font-mono text-[11px] ${txColor(tx.type)}`}>{txLabel(tx.type)}</p>
                  <p className="font-mono text-[9px] text-[#7A6E58] mt-0.5">
                    {new Date(tx.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <div className="text-right">
                  <p className={`font-mono text-sm font-bold ${txColor(tx.type)}`}>
                    {['win', 'room_win'].includes(tx.type) ? '+' : '-'}
                    {Number(tx.amount).toLocaleString(undefined, { maximumFractionDigits: 0 })} ${tx.token}
                  </p>
                  {tx.tx_hash && (
                    <a
                      href={`https://basescan.org/tx/${tx.tx_hash}`}
                      target="_blank" rel="noopener noreferrer"
                      className="font-mono text-[8px] text-[#7A6E58] hover:text-[#DC143C] transition-colors"
                    >
                      {tx.tx_hash.slice(0, 8)}...
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
