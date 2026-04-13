import type { Metadata } from 'next'
import { Cormorant_Garamond, JetBrains_Mono, Inter } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/Providers'

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

export const metadata: Metadata = {
  title: 'ZOOKR — Bet Your Fate. Enter Valhalla.',
  description: 'The dead play different. Powered by $DEAD',
  icons: {
    icon: 'https://www.image2url.com/r2/default/images/1776089766135-1029fb0f-e966-44f2-a542-1ece70cc5aa1.png',
    apple: 'https://www.image2url.com/r2/default/images/1776089766135-1029fb0f-e966-44f2-a542-1ece70cc5aa1.png',
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
