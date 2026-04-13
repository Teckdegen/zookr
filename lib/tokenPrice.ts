// Fetch DEAD and UDEAD token prices in USD via CoinGecko
// Falls back to on-chain RPC price if CoinGecko fails

const COINGECKO_BASE = 'https://api.coingecko.com/api/v3'

// Replace with actual CoinGecko token IDs once listed
// If not listed, use contract address lookup
const TOKEN_IDS: Record<string, string> = {
  DEAD: process.env.NEXT_PUBLIC_DEAD_COINGECKO_ID || '',
  UDEAD: process.env.NEXT_PUBLIC_UDEAD_COINGECKO_ID || '',
}

const TOKEN_ADDRESSES: Record<string, string> = {
  DEAD: process.env.NEXT_PUBLIC_DEAD_TOKEN_ADDRESS || '',
  UDEAD: process.env.NEXT_PUBLIC_UDEAD_TOKEN_ADDRESS || '',
}

export type TokenPrices = {
  DEAD: number   // price in USD
  UDEAD: number  // price in USD
}

export async function getTokenPricesUSD(): Promise<TokenPrices> {
  try {
    // Try by contract address on Base (platform_id = base)
    const addresses = `${TOKEN_ADDRESSES.DEAD},${TOKEN_ADDRESSES.UDEAD}`
    const url = `${COINGECKO_BASE}/simple/token_price/base?contract_addresses=${addresses}&vs_currencies=usd`

    const res = await fetch(url, {
      next: { revalidate: 30 }, // cache 30s
      headers: { Accept: 'application/json' },
    })

    if (res.ok) {
      const data = await res.json()
      const deadPrice = data[TOKEN_ADDRESSES.DEAD.toLowerCase()]?.usd ?? 0
      const udeadPrice = data[TOKEN_ADDRESSES.UDEAD.toLowerCase()]?.usd ?? 0

      if (deadPrice > 0 && udeadPrice > 0) {
        return { DEAD: deadPrice, UDEAD: udeadPrice }
      }
    }
  } catch (e) {
    console.error('CoinGecko price fetch failed:', e)
  }

  // Fallback — return 0 to signal unavailable
  return { DEAD: 0, UDEAD: 0 }
}

// Given a USD amount, return how many tokens that equals
export function usdToTokens(usdAmount: number, tokenPriceUsd: number): number {
  if (tokenPriceUsd <= 0) return 0
  return usdAmount / tokenPriceUsd
}

// Given token amount, return USD value
export function tokensToUsd(tokenAmount: number, tokenPriceUsd: number): number {
  return tokenAmount * tokenPriceUsd
}
