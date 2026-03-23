'use client'

import { ArrowRight } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { promoCards } from '@/lib/mock-data'
import { useStore } from '@/lib/store-context'

const gradients: Record<string, string> = {
  'from-yellow-900 to-yellow-600':
    'linear-gradient(135deg, #4a3500 0%, #8a6500 100%)',
  'from-purple-900 to-purple-600':
    'linear-gradient(135deg, #2d1b69 0%, #6d28d9 100%)',
  'from-red-900 to-red-600':
    'linear-gradient(135deg, #7f1d1d 0%, #dc2626 100%)',
}

export default function PromoCards() {
  const { storeName } = useStore()
  return (
    <section
      className="max-w-screen-xl mx-auto px-4 py-10"
      aria-label="Promoções em destaque"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {promoCards.map((card) => (
          <article
            key={card.id}
            className="relative rounded-2xl overflow-hidden group cursor-pointer"
            style={{ background: gradients[card.gradient] || '#1a1a1a' }}
          >
            {/* Background image */}
            <div className="absolute inset-0">
              <Image
                src={card.image}
                alt={card.title}
                fill
                className="object-cover opacity-30 group-hover:opacity-40 transition-opacity duration-500 group-hover:scale-105"
                sizes="(max-width: 768px) 100vw, 33vw"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent" />
            </div>

            {/* Content */}
            <div className="relative p-6 min-h-[160px] flex flex-col justify-between">
              <div>
                {/* Badge */}
                <span className="inline-block bg-[#49e4e6] text-[#0f0f0f] text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider mb-3">
                  {card.badge}
                </span>

                <h3 className="text-[#f5f5f5] font-black text-lg leading-tight text-balance">
                  {card.title.replace('Game Shop', storeName)}
                </h3>
                <p className="text-white/70 text-sm mt-1 leading-relaxed">
                  {card.description}
                </p>
              </div>

              <Link
                href={card.href ?? '#'}
                className="inline-flex items-center gap-1.5 bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/40 text-[#f5f5f5] text-xs font-bold px-4 py-2 rounded-lg transition-all mt-4 self-start backdrop-blur-sm group/btn"
                aria-label={`${card.cta} - ${card.title}`}
              >
                {card.cta}
                <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 transition-transform" />
              </Link>
            </div>

            {/* Hover elevation overlay */}
            <div className="absolute inset-0 rounded-2xl ring-2 ring-inset ring-white/0 group-hover:ring-white/10 transition-all duration-300 pointer-events-none" />
          </article>
        ))}
      </div>
    </section>
  )
}

