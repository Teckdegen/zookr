'use client'

import { TopNav } from '@/components/TopNav'
import { BottomNav } from '@/components/BottomNav'

type NavItem = 'home' | 'play' | 'rooms' | 'profile'

interface AppLayoutProps {
  children: React.ReactNode
  active: NavItem
  /** Remove default padding + hide bottom nav — use for full-bleed game screens */
  fullBleed?: boolean
}

export function AppLayout({ children, active, fullBleed = false }: AppLayoutProps) {
  return (
    <>
      <TopNav />
      <div className={`md:pt-14 min-h-screen ${fullBleed ? '' : 'pb-16 md:pb-0'}`}>
        {children}
      </div>
      {/* Hide bottom nav on full-bleed game screens — controls live there instead */}
      {!fullBleed && <BottomNav active={active} />}
    </>
  )
}
