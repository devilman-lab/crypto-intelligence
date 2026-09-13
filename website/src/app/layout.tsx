import type { Metadata } from 'next'
import './globals.css'
import { SiteHeader } from '@/components/SiteHeader'
import { SiteFooter } from '@/components/SiteFooter'

export const metadata: Metadata = {
  title: { default: 'Crypto Intelligence — Crypto Market Analytics for Traders & Investors', template: '%s · Crypto Intelligence' },
  description: 'Understand the crypto market before you trade. A local-first desktop analytics platform for Windows: markets, volatility, technical analysis, screener, portfolio, paper trading, journal and alerts.',
  icons: { icon: '/favicon.png' }
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <SiteHeader />
        <main>{children}</main>
        <SiteFooter />
      </body>
    </html>
  )
}
