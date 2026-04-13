'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { SkullIcon, SwordIcon, SkeletonHead } from '@/components/icons'
import { ConnectButton } from '@/components/ConnectButton'

function HomeIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3 12L12 3l9 9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 10v9a1 1 0 001 1h4v-5h4v5h4a1 1 0 001-1v-9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

const NAV_ITEMS = [
  { href: '/dashboard', label: 'HOME',  icon: <HomeIcon size={15} /> },
  { href: '/game/price', label: 'FIGHT', icon: <SwordIcon size={15} /> },
  { href: '/rooms',     label: 'ROOMS', icon: <SkullIcon size={15} /> },
  { href: '/profile',   label: 'SOUL',  icon: <SkeletonHead size={15} /> },
]

export function TopNav() {
  const pathname = usePathname()

  return (
    <nav className="hidden md:flex fixed top-0 left-0 right-0 z-50 bg-[#0A0806] border-b border-[#2E2618] items-center justify-between px-8 h-14">
      {/* Logo */}
      <Link href="/dashboard">
        <div className="flex items-center gap-2">
          <SkullIcon size={18} className="text-[#DC143C]" />
          <span className="font-serif text-lg text-[#D4BF9A] tracking-wide">ZOOKR</span>
        </div>
      </Link>

      {/* Nav links */}
      <div className="flex items-center gap-1">
        {NAV_ITEMS.map((item) => {
          const active = pathname.startsWith(item.href)
          return (
            <Link key={item.href} href={item.href}>
              <div className={`flex items-center gap-2 px-4 py-2 font-mono text-[10px] tracking-widest transition-colors ${
                active
                  ? 'text-[#DC143C] border-b border-[#DC143C]'
                  : 'text-[#7A6E58] hover:text-[#D4BF9A]'
              }`}>
                {item.icon}
                {item.label}
              </div>
            </Link>
          )
        })}
      </div>

      {/* Wallet */}
      <ConnectButton className="font-mono text-[10px] tracking-widest border border-[#2E2618] text-[#7A6E58] px-4 py-2 hover:border-[#DC143C] hover:text-[#DC143C] transition-colors bg-transparent cursor-pointer" />
    </nav>
  )
}
