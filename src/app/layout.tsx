import type { Metadata } from 'next'
import { Mona_Sans, Hanken_Grotesk, JetBrains_Mono } from 'next/font/google'
import { Providers } from '@/components/providers'
import { Ticker } from '@/components/header/ticker'
import { Header } from '@/components/header/header'
import { Footer } from '@/components/footer'
import { CookieBanner } from '@/components/cookie-banner'
import './globals.css'

const monaSans = Mona_Sans({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-mona',
  display: 'swap',
  weight: ['300', '400', '500', '600', '700', '800'],
})

const hanken = Hanken_Grotesk({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-hanken',
  display: 'swap',
})

const jetbrains = JetBrains_Mono({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-jetbrains',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'Yí — Мебель оптом из Китая, в белую, с доставкой',
    template: '%s · Yí',
  },
  description:
    'B2B-маркетплейс мебели из Китая. Прозрачная цена сразу с доставкой, ВЭД и документами. Более 2000 SKU, доставка 14–45 дней.',
  metadataBase: new URL(
    process.env.AUTH_URL ??
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
  ),
  openGraph: {
    title: 'Yí — Мебель оптом из Китая',
    description: 'B2B-маркетплейс с прозрачной ценой и белой ВЭД',
    type: 'website',
    locale: 'ru_RU',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ru" className={`${monaSans.variable} ${hanken.variable} ${jetbrains.variable}`}>
      <body>
        <Providers>
          <Ticker />
          <Header />
          <main className="min-h-[calc(100vh-160px)]">{children}</main>
          <Footer />
          <CookieBanner />
        </Providers>
      </body>
    </html>
  )
}
