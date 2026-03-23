'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { Product } from '@/lib/mock-data'
import ProductCard from '@/components/product-card'

interface ProductCarouselProps {
  title: string
  subtitle?: string
  products: Product[]
  id?: string
  autoPlayInterval?: number // ms, default 3500
}

export default function ProductCarousel({
  title,
  subtitle,
  products,
  id,
  autoPlayInterval = 3500,
}: ProductCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)
  const [hovered, setHovered] = useState(false)
  const canScrollRightRef = useRef(true)

  const checkScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const left = el.scrollLeft > 10
    const right = el.scrollLeft < el.scrollWidth - el.clientWidth - 10
    setCanScrollLeft(left)
    setCanScrollRight(right)
    canScrollRightRef.current = right
  }, [])

  const scroll = useCallback(
    (direction: 'left' | 'right') => {
      const el = scrollRef.current
      if (!el) return
      const scrollAmount = 460
      el.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      })
      setTimeout(checkScroll, 350)
    },
    [checkScroll]
  )

  // Auto-play
  useEffect(() => {
    if (!autoPlayInterval || products.length === 0) return
    const id = setInterval(() => {
      if (hovered) return
      const el = scrollRef.current
      if (!el) return
      if (canScrollRightRef.current) {
        el.scrollBy({ left: 320, behavior: 'smooth' })
      } else {
        el.scrollTo({ left: 0, behavior: 'smooth' })
      }
      setTimeout(checkScroll, 350)
    }, autoPlayInterval)
    return () => clearInterval(id)
  }, [autoPlayInterval, hovered, products.length, checkScroll])

  return (
    <section
      id={id}
      className="max-w-screen-xl mx-auto px-4 py-10"
      aria-label={title}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Section Header */}
      <div className="flex items-end justify-between mb-6">
        <div>
          <h2 className="text-[#f5f5f5] text-2xl md:text-3xl font-black">
            {title}
          </h2>
          {subtitle && (
            <p className="text-[#e53e3e] text-sm font-semibold mt-1">
              {subtitle}
            </p>
          )}
        </div>

        {/* Navigation Arrows */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => scroll('left')}
            disabled={!canScrollLeft}
            className="w-9 h-9 rounded-xl border border-[#2e2e2e] flex items-center justify-center text-[#888888] hover:text-[#49e4e6] hover:border-[#49e4e6] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            aria-label="Rolar para a esquerda"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => scroll('right')}
            disabled={!canScrollRight}
            className="w-9 h-9 rounded-xl border border-[#2e2e2e] flex items-center justify-center text-[#888888] hover:text-[#49e4e6] hover:border-[#49e4e6] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            aria-label="Rolar para a direita"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Scroll Container */}
      <div className="relative">
        {/* Left Fade */}
        <div
          className={`absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-[#0f0f0f] to-transparent z-10 pointer-events-none transition-opacity duration-200 ${
            canScrollLeft ? 'opacity-100' : 'opacity-0'
          }`}
          aria-hidden="true"
        />

        {/* Products scroll */}
        <div
          ref={scrollRef}
          onScroll={checkScroll}
          className="flex gap-4 overflow-x-auto pb-4 scroll-smooth"
          style={{ scrollbarWidth: 'none' }}
          role="list"
          aria-label={`Produtos: ${title}`}
        >
          {products.map((product) => (
            <div key={product.id} role="listitem">
              <ProductCard product={product} />
            </div>
          ))}
        </div>

        {/* Right Fade */}
        <div
          className={`absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-[#0f0f0f] to-transparent z-10 pointer-events-none transition-opacity duration-200 ${
            canScrollRight ? 'opacity-100' : 'opacity-0'
          }`}
          aria-hidden="true"
        />
      </div>

      {/* View All Link */}
      <div className="mt-4 text-center">
        <a
          href="/busca"
          className="inline-flex items-center gap-2 text-sm text-[#49e4e6] hover:text-[#2fc8cc] font-semibold transition-colors"
          aria-label={`Ver todos os produtos em ${title}`}
        >
          Ver todos os produtos
          <ChevronRight className="w-4 h-4" />
        </a>
      </div>
    </section>
  )
}

