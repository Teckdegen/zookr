'use client'

import { useAppKit } from '@reown/appkit/react'
import { useAccount, useDisconnect } from 'wagmi'

export function ConnectButton({ className }: { className?: string }) {
  const { open } = useAppKit()
  const { address, isConnected } = useAccount()
  const { disconnect } = useDisconnect()

  if (isConnected && address) {
    return (
      <button
        className={className || 'btn-zookr'}
        onClick={() => open({ view: 'Account' })}
      >
        {address.slice(0, 6)}...{address.slice(-4)}
      </button>
    )
  }

  return (
    <button
      className={className || 'btn-zookr'}
      onClick={() => open()}
    >
      Connect Wallet
    </button>
  )
}
