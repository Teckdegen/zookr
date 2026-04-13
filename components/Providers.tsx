'use client'

import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createWeb3Modal } from '@web3modal/wagmi/react'
import { wagmiConfig } from '@/lib/wagmi'
import { useState } from 'react'
import { AgeGate } from '@/components/AgeGate'

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || ''

// This module is only ever loaded client-side (ssr:false in layout.tsx),
// so createWeb3Modal can run at module level safely.
createWeb3Modal({
  wagmiConfig,
  projectId,
  enableAnalytics: false,
  themeMode: 'dark',
  themeVariables: {
    '--w3m-color-mix': '#DC143C',
    '--w3m-color-mix-strength': 20,
    '--w3m-accent': '#DC143C',
    '--w3m-border-radius-master': '0px',
  },
})

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())

  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={wagmiConfig}>
        <AgeGate />
        {children}
      </WagmiProvider>
    </QueryClientProvider>
  )
}
