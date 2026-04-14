'use client'

import Link from 'next/link'
import { SkullIcon, SwordIcon, SkeletonHead } from '@/components/icons'

function HomeIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3 12L12 3l9 9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 10v9a1 1 0 001 1h4v-5h4v5h4a1 1 0 001-1v-9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

type NavItem = 'home' | 'play' | 'rooms' | 'profile'

export function BottomNav({ active }: { active: NavItem }) {
  const items: { key: NavItem; label: string; icon: React.ReactNode; href: string }[] = [
    { key: 'home',    label: 'HOME',  icon: <HomeIcon size={18} />,     href: '/dashboard' },
    { key: 'play',   label: 'GAMES', icon: <SwordIcon size={18} />,    href: '/games' },
    { key: 'rooms',  label: 'ROOMS', icon: <SkullIcon size={18} />,    href: '/rooms' },
    { key: 'profile',label: 'SOUL',  icon: <SkeletonHead size={18} />, href: '/profile' },
  ]

  return (
    // md:hidden — only visible on mobile
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#0A0806] border-t border-[#2E2618] grid grid-cols-4 z-50">
      {items.map((item) => (
        <Link key={item.key} href={item.href}>
          <div className={`flex flex-col items-center py-3 gap-1 cursor-pointer transition-colors ${
            active === item.key ? 'text-[#DC143C]' : 'text-[#7A6E58] hover:text-[#D4BF9A]'
          }`}>
            {item.icon}
            <span className="font-mono text-[8px] tracking-widest">{item.label}</span>
          </div>
        </Link>
      ))}
    </nav>
  )
}
