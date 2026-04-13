'use client'

import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createWeb3Modal } from '@web3modal/wagmi/react'
import { wagmiConfig } from '@/lib/wagmi'
import { base } from 'wagmi/chains'
import { useState, useEffect } from 'react'

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || ''

// Init Web3Modal once
let web3ModalInitialized = false

function initWeb3Modal() {
  if (web3ModalInitialized || typeof window === 'undefined') return
  web3ModalInitialized = true
  createWeb3Modal({
    wagmiConfig,
    projectId,
    chains: [base],
    defaultChain: base,
    themeMode: 'dark',
    themeVariables: {
      '--w3m-color-mix': '#DC143C',
      '--w3m-color-mix-strength': 20,
      '--w3m-accent': '#DC143C',
      '--w3m-border-radius-master': '0px',
      '--w3m-font-family': 'Inter, sans-serif',
    },
    featuredWalletIds: [
      'c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96', // MetaMask
      'fd20dc426fb37566d803205b19bbc1d4096b248ac04548e3cfb6b3a38bd033aa', // Coinbase
    ],
  })
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())

  useEffect(() => {
    initWeb3Modal()
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={wagmiConfig}>
        {children}
      </WagmiProvider>
    </QueryClientProvider>
  )
}
