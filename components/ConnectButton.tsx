'use client'

import { useConnectKit } from 'connectkit'
import { useAccount } from 'wagmi'

export function ConnectButton({ className }: { className?: string }) {
  const { openConnectModal } = useConnectKit()
  const { address, isConnected } = useAccount()

  if (isConnected && address) {
    return (
      <button
        className={className || 'btn-zookr'}
        onClick={() => openConnectModal?.()}
      >
        {address.slice(0, 6)}...{address.slice(-4)}
      </button>
    )
  }

  return (
    <button
      className={className || 'btn-zookr'}
      onClick={() => openConnectModal?.()}
    >
      Connect Wallet
    </button>
  )
}
