'use client'

import { useEffect, useState } from 'react'
import { fetchBothPrices } from '@/lib/priceFeed'

export function Ticker() {
  const [prices, setPrices] = useState<{ DEAD: string; UDEAD: string }>({
    DEAD: '---', UDEAD: '---',
  })

  useEffect(() => {
    async function load() {
      const data = await fetchBothPrices()
      setPrices({
        DEAD:  data.DEAD?.priceUsd  ? `$${data.DEAD.priceUsd.toFixed(8)}`  : '---',
        UDEAD: data.UDEAD?.priceUsd ? `$${data.UDEAD.priceUsd.toFixed(8)}` : '---',
      })
    }
    load()
    const t = setInterval(load, 15_000)
    return () => clearInterval(t)
  }, [])

  const items = [
    `☠ $DEAD  ${prices.DEAD}`,
    'ONLY THE WORTHY ENTER',
    '⚔ WAR ROOMS OPEN',
    'BET YOUR FATE',
    `☠ $UDEAD  ${prices.UDEAD}`,
    'WELCOME TO VALHALLA',
    'THE DEAD PLAY DIFFERENT',
    '2× PAYOUT ON WIN',
    '⚔ ENTER THE FIGHT',
  ]

  const doubled = [...items, ...items]

  return (
    <div className="overflow-hidden bg-[#0A0806] border-b border-[#2E2618] py-2 shrink-0">
      <div className="ticker-track">
        {doubled.map((item, i) => (
          <span key={i} className="font-mono text-[10px] text-[#7A6E58] tracking-widest uppercase mx-8">
            {item}
          </span>
        ))}
      </div>
    </div>
  )
}
