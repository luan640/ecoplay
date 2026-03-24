'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { useStore } from '@/lib/store-context'

export default function CotacoesPage() {
  const { storeName } = useStore()
  return (
    <div className="min-h-screen bg-[#0f0f0f]">
      <main className="px-4 py-16 sm:py-20">
        <section className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl border border-[#2e2e2e] bg-[radial-gradient(circle_at_top_left,_#1f2450_0%,_#141414_42%,_#101010_100%)] px-6 py-12 sm:px-10 sm:py-16">
          <div className="pointer-events-none absolute -left-16 -top-16 h-48 w-48 rounded-full bg-[#49e4e6]/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-12 right-8 h-44 w-44 rounded-full bg-[#f97316]/15 blur-3xl" />

          <div className="relative z-10 grid items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="text-center lg:text-left">
              <p className="inline-flex rounded-full border border-[#49e4e6]/35 bg-[#49e4e6]/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-[#7af2f3]">
                Venda agora
              </p>
              <h1 className="mt-4 text-3xl font-black leading-tight text-[#f5f5f5] sm:text-5xl">
                Transforme seu usado em dinheiro
              </h1>
              <p className="mt-4 max-w-xl text-base leading-relaxed text-[#cbd5e1] sm:text-lg">
                Venda seus jogos, consoles, notebooks, celulares e hardwares para a{' '}
                {storeName} e receba dinheiro via PIX ou credito para usar em nossas
                lojas.
              </p>
              <Button
                asChild
                className="mt-8 h-12 rounded-xl bg-[#49e4e6] px-8 text-sm font-black uppercase tracking-wide text-[#0f0f0f] shadow-[0_0_22px_rgba(73,228,230,0.4)] transition-all hover:scale-[1.03] hover:bg-[#2fc8cc]"
              >
                <Link href="/cotacao/dados/">Iniciar cotação</Link>
              </Button>
            </div>

            <div className="relative mx-auto w-full max-w-md">
              <div className="absolute -right-3 -top-5 w-36 animate-bounce rounded-xl border border-[#2e2e2e] bg-[#111111]/85 p-2 shadow-xl [animation-duration:4.7s] backdrop-blur">
                <Image
                  src="/images/spider-man.jpg"
                  alt="Spider-Man"
                  width={300}
                  height={180}
                  className="h-20 w-full rounded-lg object-cover"
                />
                {/* <p className="mt-1 text-center text-[10px] font-bold uppercase tracking-wide text-[#f5f5f5]">
                  Spider-Man
                </p> */}
              </div>

              <div className="absolute -left-3 bottom-0 w-40 animate-bounce rounded-xl border border-[#2e2e2e] bg-[#111111]/85 p-2 shadow-xl [animation-duration:6.2s] backdrop-blur">
                <Image
                  src="/images/god-of-war.jpg"
                  alt="God of War"
                  width={300}
                  height={180}
                  className="h-24 w-full rounded-lg object-cover"
                />
                {/* <p className="mt-1 text-center text-[10px] font-bold uppercase tracking-wide text-[#f5f5f5]">
                  Kratos
                </p> */}
              </div>

              <div className="rounded-2xl border border-[#2e2e2e] bg-[#0f0f0f]/70 p-3 shadow-2xl">
                <Image
                  src="/images/hero-bg.jpg"
                  alt="Universo gamer"
                  width={640}
                  height={360}
                  className="h-[240px] w-full rounded-xl object-cover sm:h-[280px]"
                />
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
