'use client'

import { useAccount } from 'wagmi'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Ticker } from '@/components/Ticker'
import { ConnectButton } from '@/components/ConnectButton'
import { SkullIcon, SwordIcon, SkeletonHead } from '@/components/icons'
import { supabase } from '@/lib/supabase'

export default function LandingPage() {
  const { address, isConnected } = useAccount()
  const router = useRouter()
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    if (!isConnected || !address) return
    setChecking(true)
    async function checkUser() {
      const { data } = await supabase
        .from('users').select('username')
        .eq('wallet_address', address!.toLowerCase()).single()
      router.push(data?.username ? '/dashboard' : '/onboard')
    }
    checkUser()
  }, [isConnected, address, router])

  if (checking) {
    return (
      <main className="min-h-screen bg-[#0A0806] flex items-center justify-center">
        <div className="flex items-center gap-3">
          <SkullIcon size={16} className="text-[#DC143C] animate-pulse" />
          <p className="font-mono text-[10px] text-[#7A6E58] tracking-widest animate-pulse">ENTERING VALHALLA...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex flex-col bg-[#0A0806]">
      <Ticker />

      {/* Hero */}
      <section className="flex-1 flex flex-col justify-center px-6 md:px-16 lg:px-24 py-24 bg-[#1E1B14]">
        <div className="flex items-center gap-3 mb-6">
          <SkullIcon size={16} className="text-[#7A6E58]" />
          <p className="font-mono text-[10px] tracking-[0.3em] text-[#7A6E58] uppercase">
            POWERED BY $DEAD · $UDEAD · BASE CHAIN
          </p>
        </div>
        <h1 className="font-serif text-[clamp(56px,10vw,128px)] font-bold leading-[0.9] text-[#D4BF9A] mb-2">Bet your fate.</h1>
        <h1 className="font-serif text-[clamp(56px,10vw,128px)] font-bold leading-[0.9] italic text-[#DC143C] mb-2">Enter</h1>
        <h1 className="font-serif text-[clamp(56px,10vw,128px)] font-bold leading-[0.9] text-[#D4BF9A] mb-10">Valhalla.</h1>
        <div className="w-8 h-[2px] bg-[#DC143C] mb-8" />
        <p className="text-[#7A6E58] text-sm tracking-wide max-w-sm mb-10">
          The dead play different. Predict prices, flip coins, enter war rooms,
          and claim what is yours. Powered by $DEAD and $UDEAD.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <ConnectButton className="btn-zookr" />
          <button className="btn-blood" onClick={() => document.getElementById('games')?.scrollIntoView({ behavior: 'smooth' })}>
            The Games
          </button>
        </div>
      </section>

      {/* Stats bar */}
      <section className="grid grid-cols-4 border-t border-[#2E2618]">
        {[
          { icon: <SkullIcon size={18} />, bottom: 'War Rooms' },
          { icon: <SwordIcon size={18} />, bottom: 'Live Now' },
          { top: '2×', bottom: 'On Win' },
          { top: '$DEAD', bottom: 'Only' },
        ].map((stat, i) => (
          <div key={i} className={`py-6 text-center border-r border-[#2E2618] last:border-r-0 flex flex-col items-center gap-1 ${i === 1 ? 'bg-[#0A0806]' : 'bg-[#1E1B14]'} text-[#D4BF9A]`}>
            <div className="flex items-center justify-center h-6">
              {stat.icon ?? <span className="font-serif text-xl font-bold">{stat.top}</span>}
            </div>
            <div className="font-mono text-[9px] tracking-widest text-[#7A6E58] uppercase">{stat.bottom}</div>
          </div>
        ))}
      </section>

      {/* Games section */}
      <section id="games" className="bg-[#0A0806] px-6 md:px-16 lg:px-24 py-20">
        <p className="font-mono text-[10px] tracking-[0.3em] text-[#7A6E58] uppercase mb-12">Choose your fate</p>
        <div className="grid md:grid-cols-4 gap-px bg-[#2E2618]">
          {[
            {
              num: '01', title: 'DEAD PRICE',
              desc: 'Stop the reel on the real price. One shot.',
              cta: 'ENTER FIGHT', href: '/game/price',
              icon: <SkullIcon size={28} className="text-[#DC143C] mb-4" />,
              locked: false,
            },
            {
              num: '02', title: 'COIN FLIP',
              desc: 'Heads or tails. 50/50. Fate decides.',
              cta: 'FLIP NOW', href: '/game/coin',
              icon: <span className="text-4xl mb-4 block">🪙</span>,
              locked: false,
            },
            {
              num: '03', title: 'WAR CHART',
              desc: 'Rise or fall. Private access only.',
              cta: 'ENTER CODE', href: '/game/chart',
              icon: <SwordIcon size={28} className="text-[#7A6E58] mb-4" />,
              locked: true,
            },
            {
              num: '04', title: 'WAR ROOMS',
              desc: 'Dice and flash vs warriors. Winner takes 70%.',
              cta: 'OPEN ROOM', href: '/rooms',
              icon: <SkeletonHead size={28} className="text-[#DC143C] mb-4" />,
              locked: false,
            },
          ].map((game, i) => (
            <div key={i} className={`bg-[#1E1B14] p-8 flex flex-col justify-between min-h-[260px] ${game.locked ? 'opacity-70' : ''}`}>
              <div>
                <p className="font-mono text-[10px] text-[#7A6E58] tracking-widest mb-4">{game.num}</p>
                {game.icon}
                <h3 className="font-serif text-2xl font-bold text-[#D4BF9A] mb-2">{game.title}</h3>
                {game.locked && <span className="font-mono text-[9px] text-[#7A6E58] border border-[#2E2618] px-2 py-0.5 mb-2 inline-block">🔒 PRIVATE</span>}
                <p className="text-[#7A6E58] text-sm leading-relaxed">{game.desc}</p>
              </div>
              <a href={game.href}>
                <button className={`mt-6 w-fit ${game.locked ? 'btn-zookr' : 'btn-blood'}`}>{game.cta}</button>
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* Quote */}
      <section className="bg-[#0A0806] border-t border-[#2E2618] px-6 md:px-16 lg:px-24 py-20">
        <div className="flex flex-col md:flex-row md:items-end gap-8">
          <h2 className="font-serif text-[clamp(36px,6vw,72px)] font-bold leading-tight text-[#D4BF9A] flex-1">
            Only the worthy<br /><span className="italic text-[#DC143C]">reach Valhalla.</span>
          </h2>
          <p className="text-[#7A6E58] text-sm max-w-xs leading-relaxed">
            &ldquo;Every bet you place echoes in Valhalla. The warriors who endure are the ones who feast.&rdquo;
          </p>
        </div>
      </section>

      {/* Gambling Warning */}
      <section className="bg-[#1E1B14] border-t border-[#2E2618] px-6 md:px-16 lg:px-24 py-10">
        <div className="flex gap-4 items-start max-w-2xl">
          <SkullIcon size={18} className="text-[#DC143C] mt-0.5 shrink-0" />
          <div>
            <p className="font-mono text-[10px] tracking-[0.3em] text-[#DC143C] uppercase mb-3">Gambling Warning</p>
            <p className="text-[#7A6E58] text-xs leading-relaxed">
              ZOOKR involves real money and financial risk. Only play with what you can afford to lose entirely.
              This platform is intended for users aged 18 and over. Gambling can be addictive — seek help if needed.
              ZOOKR does not guarantee any returns. Past outcomes do not predict future results.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0A0806] border-t border-[#2E2618] px-6 md:px-16 lg:px-24 py-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <SkullIcon size={16} className="text-[#7A6E58]" />
            <span className="font-serif text-lg text-[#D4BF9A]">ZOOKR</span>
          </div>
          <span className="font-mono text-[9px] text-[#7A6E58] tracking-widest">POWERED BY $DEAD · $UDEAD · BASE CHAIN</span>
        </div>
      </footer>
    </main>
  )
}
