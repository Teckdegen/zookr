'use client'

import { useAccount, useDisconnect } from 'wagmi'
import { useWeb3Modal } from '@web3modal/wagmi/react'
import { useState } from 'react'

export function ConnectButton({ className }: { className?: string }) {
  const { address, isConnected } = useAccount()
  const { open } = useWeb3Modal()
  const { disconnect } = useDisconnect()
  const [showAccount, setShowAccount] = useState(false)

  if (isConnected && address) {
    return (
      <>
        <button
          className={className || 'btn-zookr'}
          onClick={() => setShowAccount(true)}
        >
          {address.slice(0, 6)}...{address.slice(-4)}
        </button>
        {showAccount && (
          <AccountModal
            address={address}
            onDisconnect={() => { disconnect(); setShowAccount(false) }}
            onClose={() => setShowAccount(false)}
          />
        )}
      </>
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

function AccountModal({ address, onDisconnect, onClose }: {
  address: string
  onDisconnect: () => void
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-[#0A0806]/80" />
      <div
        className="relative bg-[#1E1B14] border border-[#2E2618] p-6 w-full max-w-xs mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#DC143C] via-[#8B0000] to-transparent" />
        <p className="font-mono text-[9px] text-[#7A6E58] tracking-[0.3em] uppercase mb-2">Connected</p>
        <p className="font-mono text-sm text-[#D4BF9A] mb-6 break-all">{address}</p>
        <button onClick={onDisconnect} className="btn-blood w-full py-3 text-[11px]">Disconnect</button>
        <button
          onClick={onClose}
          className="mt-3 font-mono text-[9px] text-[#7A6E58] tracking-widest hover:text-[#D4BF9A] transition-colors w-full text-center"
        >
          Close
        </button>
      </div>
    </div>
  )
}
