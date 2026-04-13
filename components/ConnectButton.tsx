'use client'

import { useAccount, useDisconnect } from 'wagmi'
import { useWeb3Modal } from '@web3modal/wagmi/react'

export function ConnectButton({ className }: { className?: string }) {
  const { address, isConnected } = useAccount()
  const { disconnect } = useDisconnect()
  const { open } = useWeb3Modal()

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
