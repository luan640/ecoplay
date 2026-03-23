import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { StoreProvider } from '@/lib/store-context'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Game Shop – Compre e Venda Games e Consoles Usados',
  description: 'A maior loja de games e consoles usados do Brasil. Encontre PlayStation, Xbox, Nintendo e muito mais com até 80% de desconto. Garantia, envio para todo o Brasil e parcelamento em até 10x sem juros.',
  keywords: 'games usados, consoles usados, PS5, Xbox, Nintendo Switch, comprar jogos, vender jogos',
  openGraph: {
    title: 'Game Shop – Games e Consoles com até 80% OFF',
    description: 'Compre e venda games e consoles usados com segurança. Garantia de até 9 meses.',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" className="dark">
      <body className={`${inter.variable} font-sans antialiased bg-background text-foreground`}>
        <StoreProvider>
          {children}
        </StoreProvider>
        <Analytics />
      </body>
    </html>
  )
}
