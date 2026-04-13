'use client'

import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createAppKit } from '@reown/appkit/react'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { base } from '@reown/appkit/networks'
import { useState, useEffect } from 'react'
import { wagmiConfig } from '@/lib/wagmi'

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || ''

const wagmiAdapter = new WagmiAdapter({
  networks: [base],
  projectId,
})

let appKitInitialized = false

function initAppKit() {
  if (appKitInitialized || typeof window === 'undefined') return
  appKitInitialized = true
  createAppKit({
    adapters: [wagmiAdapter],
    networks: [base],
    projectId,
    defaultNetwork: base,
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
    ],
  })
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())

  useEffect(() => {
    initAppKit()
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={wagmiConfig}>
        {children}
      </WagmiProvider>
    </QueryClientProvider>
  )
}
