'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { fetchTokenPrice, type TokenPrice } from '@/lib/priceFeed'

const DEAD_ADDRESS  = process.env.NEXT_PUBLIC_DEAD_TOKEN_ADDRESS  || ''
const UDEAD_ADDRESS = process.env.NEXT_PUBLIC_UDEAD_TOKEN_ADDRESS || ''

const ADDRESS_MAP: Record<string, string> = {
  DEAD:  DEAD_ADDRESS,
  UDEAD: UDEAD_ADDRESS,
}

interface PriceFeedState {
  price: TokenPrice | null
  history: number[]   // last 60 price points for mini-chart
  loading: boolean
  error: boolean
  source: 'dexscreener' | 'geckoterminal' | 'cached' | null
}

export function usePriceFeed(token: 'DEAD' | 'UDEAD', intervalMs = 1000) {
  const [state, setState] = useState<PriceFeedState>({
    price: null,
    history: [],
    loading: true,
    error: false,
    source: null,
  })

  const failCount = useRef(0)
  const lastPrice = useRef<number>(0)
  const timerRef  = useRef<ReturnType<typeof setInterval> | null>(null)

  const poll = useCallback(async () => {
    const address = ADDRESS_MAP[token]
    if (!address) return

    const result = await fetchTokenPrice(address)

    if (!result || result.priceUsd <= 0) {
      failCount.current += 1
      setState((prev) => ({ ...prev, error: failCount.current > 3, loading: false }))
      return
    }

    failCount.current = 0
    lastPrice.current = result.priceUsd

    setState((prev) => ({
      price:   result,
      history: [...prev.history.slice(-59), result.priceUsd],
      loading: false,
      error:   false,
      source:  result.source,
    }))
  }, [token])

  useEffect(() => {
    setState({ price: null, history: [], loading: true, error: false, source: null })
    failCount.current = 0

    poll()
    timerRef.current = setInterval(poll, intervalMs)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [token, intervalMs, poll])

  return state
}

// Simpler hook — just the live USD price as a number
export function useLivePrice(token: 'DEAD' | 'UDEAD'): number {
  const { price } = usePriceFeed(token)
  return price?.priceUsd ?? 0
}
