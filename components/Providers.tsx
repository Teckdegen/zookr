'use client'

import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ConnectKitProvider } from 'connectkit'
import { wagmiConfig } from '@/lib/wagmi'
import { useState } from 'react'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())

  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={wagmiConfig}>
        <ConnectKitProvider
          theme="midnight"
          customTheme={{
            '--ck-accent-color': '#DC143C',
            '--ck-accent-text-color': '#D4BF9A',
            '--ck-border-radius': '0px',
            '--ck-font-family': 'Inter, sans-serif',
            '--ck-body-background': '#1E1B14',
            '--ck-body-color': '#D4BF9A',
            '--ck-body-color-muted': '#7A6E58',
            '--ck-overlay-background': 'rgba(10,8,6,0.85)',
          }}
        >
          {children}
        </ConnectKitProvider>
      </WagmiProvider>
    </QueryClientProvider>
  )
}
