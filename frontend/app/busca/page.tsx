import { Suspense } from 'react'
import Header from '@/components/header'
import Footer from '@/components/footer'
import SearchResults from '@/components/search-results'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Buscar Produtos – Game Shop',
  description: 'Busque games e consoles usados. Filtre por plataforma, categoria, condição e faixa de preço.',
}

export default function BuscaPage() {
  return (
    <div className="min-h-screen bg-[#0f0f0f] flex flex-col">
      <Header />
      <main className="pt-[108px] flex-1">
        <Suspense fallback={
          <div className="max-w-screen-xl mx-auto px-4 py-12 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-[#49e4e6] border-t-transparent rounded-full animate-spin" />
          </div>
        }>
          <SearchResults />
        </Suspense>
      </main>
      <Footer />
    </div>
  )
}

