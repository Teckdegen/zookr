'use client'

import dynamic from 'next/dynamic'

// dynamic ssr:false must live in a Client Component — layout.tsx is a Server Component
// so we wrap it here and import this file from layout instead.
const Providers = dynamic(
  () => import('@/components/Providers').then((m) => ({ default: m.Providers })),
  { ssr: false }
)

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return <Providers>{children}</Providers>
}
