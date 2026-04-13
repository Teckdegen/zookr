// Returns the user's real on-chain token balances + USD values.
// Reads directly from the user's connected wallet — no custodial wallet.

import { NextRequest, NextResponse } from 'next/server'
import { readTokenBalance } from '@/lib/onchain'
import { fetchBothPrices } from '@/lib/priceFeed'

export async function GET(req: NextRequest) {
  const walletAddress = req.nextUrl.searchParams.get('wallet_address')

  if (!walletAddress) {
    return NextResponse.json({ error: 'Missing wallet_address' }, { status: 400 })
  }

  const [deadBal, udeadBal, prices] = await Promise.all([
    readTokenBalance(walletAddress, 'DEAD'),
    readTokenBalance(walletAddress, 'UDEAD'),
    fetchBothPrices(),
  ])

  const deadPrice  = prices.DEAD?.priceUsd  ?? 0
  const udeadPrice = prices.UDEAD?.priceUsd ?? 0

  return NextResponse.json({
    dead:        deadBal,
    udead:       udeadBal,
    dead_usd:    deadBal  * deadPrice,
    udead_usd:   udeadBal * udeadPrice,
    total_usd:   deadBal  * deadPrice + udeadBal * udeadPrice,
    dead_price:  deadPrice,
    udead_price: udeadPrice,
  })
}
