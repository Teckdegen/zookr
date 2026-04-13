// Price feed — DexScreener primary, GeckoTerminal fallback
// Polls every 1 second, auto-switches on failure

export type TokenPrice = {
  priceUsd: number
  priceNative: string
  symbol: string
  change24h: number
  volume24h: number
  liquidity: number
  source: 'dexscreener' | 'geckoterminal' | 'cached'
}

const DEAD_ADDRESS  = process.env.NEXT_PUBLIC_DEAD_TOKEN_ADDRESS  || ''
const UDEAD_ADDRESS = process.env.NEXT_PUBLIC_UDEAD_TOKEN_ADDRESS || ''

// ── DexScreener ──────────────────────────────────────────────────────────────
async function fetchDexScreener(address: string): Promise<TokenPrice | null> {
  try {
    const res = await fetch(
      `https://api.dexscreener.com/latest/dex/tokens/${address}`,
      { signal: AbortSignal.timeout(3000) }
    )
    if (!res.ok) return null
    const data = await res.json()

    const pair = data.pairs?.[0]
    if (!pair) return null

    return {
      priceUsd:    parseFloat(pair.priceUsd ?? '0'),
      priceNative: pair.priceNative ?? '0',
      symbol:      pair.baseToken?.symbol ?? '',
      change24h:   pair.priceChange?.h24 ?? 0,
      volume24h:   pair.volume?.h24 ?? 0,
      liquidity:   pair.liquidity?.usd ?? 0,
      source:      'dexscreener',
    }
  } catch {
    return null
  }
}

// ── GeckoTerminal (fallback) ─────────────────────────────────────────────────
async function fetchGeckoTerminal(address: string): Promise<TokenPrice | null> {
  try {
    const res = await fetch(
      `https://api.geckoterminal.com/api/v2/networks/base/tokens/${address}`,
      {
        headers: { Accept: 'application/json;version=20230302' },
        signal: AbortSignal.timeout(3000),
      }
    )
    if (!res.ok) return null
    const data = await res.json()

    const attrs = data.data?.attributes
    if (!attrs) return null

    return {
      priceUsd:    parseFloat(attrs.price_usd ?? '0'),
      priceNative: attrs.price_usd ?? '0',
      symbol:      attrs.symbol ?? '',
      change24h:   parseFloat(attrs.price_change_percentage?.h24 ?? '0'),
      volume24h:   parseFloat(attrs.volume_usd?.h24 ?? '0'),
      liquidity:   parseFloat(attrs.total_reserve_in_usd ?? '0'),
      source:      'geckoterminal',
    }
  } catch {
    return null
  }
}

// ── Primary fetch with fallback ──────────────────────────────────────────────
export async function fetchTokenPrice(address: string): Promise<TokenPrice | null> {
  const primary = await fetchDexScreener(address)
  if (primary && primary.priceUsd > 0) return primary

  const fallback = await fetchGeckoTerminal(address)
  if (fallback && fallback.priceUsd > 0) return fallback

  return null
}

export async function fetchBothPrices(): Promise<{ DEAD: TokenPrice | null; UDEAD: TokenPrice | null }> {
  const [dead, udead] = await Promise.all([
    DEAD_ADDRESS  ? fetchTokenPrice(DEAD_ADDRESS)  : Promise.resolve(null),
    UDEAD_ADDRESS ? fetchTokenPrice(UDEAD_ADDRESS) : Promise.resolve(null),
  ])
  return { DEAD: dead, UDEAD: udead }
}
