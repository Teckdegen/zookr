'use client'

import { useEffect } from 'react'
import { useAccount } from 'wagmi'
import { useRouter } from 'next/navigation'
import { TopNav } from '@/components/TopNav'
import { BottomNav } from '@/components/BottomNav'
import { SkullIcon } from '@/components/icons'

type NavItem = 'home' | 'play' | 'rooms' | 'profile'

interface AppLayoutProps {
  children: React.ReactNode
  active: NavItem
  /** Remove default padding + hide bottom nav — use for full-bleed game screens */
  fullBleed?: boolean
}

export function AppLayout({ children, active, fullBleed = false }: AppLayoutProps) {
  const { isConnected, isConnecting } = useAccount()
  const router = useRouter()

  useEffect(() => {
    if (!isConnecting && !isConnected) {
      router.replace('/')
    }
  }, [isConnected, isConnecting, router])

  // Still connecting — show loader
  if (isConnecting) {
    return (
      <main className="min-h-screen bg-[#0A0806] flex items-center justify-center">
        <div className="flex items-center gap-3">
          <SkullIcon size={16} className="text-[#DC143C] animate-pulse" />
          <p className="font-mono text-[10px] text-[#7A6E58] tracking-widest animate-pulse">
            ENTERING VALHALLA...
          </p>
        </div>
      </main>
    )
  }

  // Not connected — show redirect message (router.replace fires in useEffect)
  if (!isConnected) {
    return (
      <main className="min-h-screen bg-[#0A0806] flex items-center justify-center">
        <div className="flex items-center gap-3">
          <SkullIcon size={16} className="text-[#DC143C] animate-pulse" />
          <p className="font-mono text-[10px] text-[#7A6E58] tracking-widest animate-pulse">
            CONNECT WALLET TO ENTER
          </p>
        </div>
      </main>
    )
  }

  return (
    <>
      <TopNav />
      <div className={`md:pt-14 min-h-screen ${fullBleed ? '' : 'pb-16 md:pb-0'}`}>
        {children}
      </div>
      {!fullBleed && <BottomNav active={active} />}
    </>
  )
}
