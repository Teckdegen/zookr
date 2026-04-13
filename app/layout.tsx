import type { Metadata } from 'next'
import { Cormorant_Garamond, JetBrains_Mono, Inter } from 'next/font/google'
import dynamic from 'next/dynamic'
import './globals.css'

// Load all wallet/web3 providers client-side only — they use IndexedDB and
// browser-only APIs that crash Node.js SSR prerendering.
const Providers = dynamic(
  () => import('@/components/Providers').then((m) => ({ default: m.Providers })),
  { ssr: false }
)

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-serif',
  display: 'swap',
})

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-mono',
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-sans',
  display: 'swap',
})

const ICON = 'https://www.image2url.com/r2/default/images/1776122004235-7b55981b-e92b-4619-b49e-143bb1183ab0.png'

export const metadata: Metadata = {
  title: 'ZOOKR — Bet Your Fate. Enter Valhalla.',
  description: 'The dead play different. Powered by $DEAD',
  icons: {
    icon: ICON,
    apple: ICON,
    shortcut: ICON,
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`h-full ${cormorant.variable} ${jetbrains.variable} ${inter.variable}`}>
      <body className="min-h-full flex flex-col bg-[#0A0806] text-[#D4BF9A] font-sans antialiased">
        <Providers>
          <div className="page-transition">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  )
}
