// Server-side on-chain helpers — viem interactions only
// Uses https://mainnet.base.org (free, no API key needed)

import { createPublicClient, createWalletClient, http, parseUnits } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { base } from 'viem/chains'

const BASE_RPC       = 'https://mainnet.base.org'
const DEAD_ADDRESS   = process.env.NEXT_PUBLIC_DEAD_TOKEN_ADDRESS  as `0x${string}`
const UDEAD_ADDRESS  = process.env.NEXT_PUBLIC_UDEAD_TOKEN_ADDRESS as `0x${string}`
const MASTER_ADDRESS = process.env.MASTER_WALLET_ADDRESS           as `0x${string}`
const MASTER_PK      = process.env.MASTER_WALLET_PRIVATE_KEY       as `0x${string}`
const TOKEN_DECIMALS = 18

export const publicClient = createPublicClient({
  chain: base,
  transport: http(BASE_RPC),
})

const ERC20_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs:  [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'transfer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs:  [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }],
    outputs: [{ type: 'bool' }],
  },
] as const

function contractAddress(token: 'DEAD' | 'UDEAD'): `0x${string}` {
  return token === 'DEAD' ? DEAD_ADDRESS : UDEAD_ADDRESS
}

function toWei(amount: number): bigint {
  return parseUnits(amount.toFixed(8), TOKEN_DECIMALS)
}

// ── Read any address's on-chain token balance (human units) ──────────────────
export async function readTokenBalance(
  address: string,
  token: 'DEAD' | 'UDEAD'
): Promise<number> {
  try {
    const raw = await publicClient.readContract({
      address: contractAddress(token),
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [address as `0x${string}`],
    })
    return Number(raw) / 10 ** TOKEN_DECIMALS
  } catch {
    return 0
  }
}

// ── Read master wallet balance (house pool) ───────────────────────────────────
export async function readMasterBalance(token: 'DEAD' | 'UDEAD'): Promise<number> {
  return readTokenBalance(MASTER_ADDRESS, token)
}

// ── Payout: master → user's wallet (fires async, does NOT block) ──────────────
export async function payoutFromMaster(
  toAddress: string,
  token: 'DEAD' | 'UDEAD',
  tokenAmount: number
): Promise<`0x${string}`> {
  const masterAccount = privateKeyToAccount(MASTER_PK)
  const client = createWalletClient({
    account: masterAccount,
    chain: base,
    transport: http(BASE_RPC),
  })

  const hash = await client.writeContract({
    address: contractAddress(token),
    abi: ERC20_ABI,
    functionName: 'transfer',
    args: [toAddress as `0x${string}`, toWei(tokenAmount)],
  })

  publicClient.waitForTransactionReceipt({ hash, confirmations: 1 })
    .then(() => console.log(`[onchain] payout confirmed: ${hash}`))
    .catch((e) => console.error(`[onchain] payout failed: ${hash}`, e))

  return hash
}
