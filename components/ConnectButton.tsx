'use client'

import { useState } from 'react'
import { useAccount, useConnect, useDisconnect } from 'wagmi'

export function ConnectButton({ className }: { className?: string }) {
  const { address, isConnected } = useAccount()
  const { connect, connectors, isPending } = useConnect()
  const { disconnect } = useDisconnect()
  const [open, setOpen] = useState(false)

  if (isConnected && address) {
    return (
      <>
        <button className={className || 'btn-zookr'} onClick={() => setOpen(true)}>
          {address.slice(0, 6)}...{address.slice(-4)}
        </button>
        {open && (
          <AccountModal
            address={address}
            onDisconnect={() => { disconnect(); setOpen(false) }}
            onClose={() => setOpen(false)}
          />
        )}
      </>
    )
  }

  return (
    <>
      <button
        className={className || 'btn-zookr'}
        onClick={() => setOpen(true)}
        disabled={isPending}
      >
        {isPending ? 'Connecting...' : 'Connect Wallet'}
      </button>
      {open && (
        <WalletModal
          connectors={connectors as any[]}
          onConnect={(c) => { connect({ connector: c }); setOpen(false) }}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}

function WalletModal({ connectors, onConnect, onClose }: {
  connectors: any[]
  onConnect: (c: any) => void
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-[#0A0806]/80" />
      <div className="relative bg-[#1E1B14] border border-[#2E2618] p-6 w-full max-w-xs mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#DC143C] via-[#8B0000] to-transparent" />
        <p className="font-mono text-[9px] text-[#7A6E58] tracking-[0.3em] uppercase mb-6">Connect Wallet</p>
        <div className="flex flex-col gap-2">
          {connectors.map((connector) => (
            <button
              key={connector.uid}
              onClick={() => onConnect(connector)}
              className="w-full py-3 px-4 border border-[#2E2618] font-mono text-[11px] text-[#D4BF9A] bg-[#0A0806] hover:border-[#DC143C] hover:text-[#DC143C] transition-colors text-left"
            >
              {connector.name}
            </button>
          ))}
        </div>
        <button onClick={onClose} className="mt-4 font-mono text-[9px] text-[#7A6E58] tracking-widest hover:text-[#D4BF9A] transition-colors">
          Cancel
        </button>
      </div>
    </div>
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
      <div className="relative bg-[#1E1B14] border border-[#2E2618] p-6 w-full max-w-xs mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#DC143C] via-[#8B0000] to-transparent" />
        <p className="font-mono text-[9px] text-[#7A6E58] tracking-[0.3em] uppercase mb-2">Connected</p>
        <p className="font-mono text-sm text-[#D4BF9A] mb-6 break-all">{address}</p>
        <button onClick={onDisconnect} className="btn-blood w-full py-3 text-[11px]">Disconnect</button>
        <button onClick={onClose} className="mt-3 font-mono text-[9px] text-[#7A6E58] tracking-widest hover:text-[#D4BF9A] transition-colors w-full text-center">Close</button>
      </div>
    </div>
  )
}
