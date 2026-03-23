'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react'

interface ProductImageGalleryProps {
  images: string[]
  title: string
}

export default function ProductImageGallery({ images, title }: ProductImageGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [zoomed, setZoomed] = useState(false)

  const prev = () => setActiveIndex((i) => (i === 0 ? images.length - 1 : i - 1))
  const next = () => setActiveIndex((i) => (i === images.length - 1 ? 0 : i + 1))

  return (
    <div className="flex flex-col gap-4">
      {/* Main Image */}
      <div
        className="relative aspect-square rounded-2xl overflow-hidden bg-[#141414] border border-[#2e2e2e] cursor-zoom-in group"
        onClick={() => setZoomed(true)}
      >
        <Image
          src={images[activeIndex]}
          alt={`${title} - imagem ${activeIndex + 1}`}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="(max-width: 768px) 100vw, 50vw"
          priority
        />

        {/* Zoom hint */}
        <div className="absolute bottom-3 right-3 bg-[#0f0f0f]/70 backdrop-blur-sm border border-[#2e2e2e] rounded-lg p-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <ZoomIn className="w-4 h-4 text-[#888888]" />
        </div>

        {/* Nav arrows - only if multiple images */}
        {images.length > 1 && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); prev() }}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-[#0f0f0f]/70 backdrop-blur-sm border border-[#2e2e2e] flex items-center justify-center hover:border-[#49e4e6] hover:text-[#49e4e6] text-[#888888] transition-all"
              aria-label="Imagem anterior"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); next() }}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-[#0f0f0f]/70 backdrop-blur-sm border border-[#2e2e2e] flex items-center justify-center hover:border-[#49e4e6] hover:text-[#49e4e6] text-[#888888] transition-all"
              aria-label="Próxima imagem"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="flex gap-3">
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => setActiveIndex(i)}
              className={`relative w-20 h-20 rounded-xl overflow-hidden border-2 flex-shrink-0 transition-all ${
                i === activeIndex
                  ? 'border-[#49e4e6] shadow-lg shadow-[#49e4e6]/20'
                  : 'border-[#2e2e2e] hover:border-[#555555]'
              }`}
              aria-label={`Ver imagem ${i + 1}`}
              aria-pressed={i === activeIndex}
            >
              <Image
                src={img}
                alt={`${title} miniatura ${i + 1}`}
                fill
                className="object-cover"
                sizes="80px"
              />
            </button>
          ))}
        </div>
      )}

      {/* Zoom Modal */}
      {zoomed && (
        <div
          className="fixed inset-0 z-50 bg-[#0f0f0f]/95 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setZoomed(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Imagem ampliada"
        >
          <div className="relative max-w-3xl w-full aspect-square">
            <Image
              src={images[activeIndex]}
              alt={`${title} ampliado`}
              fill
              className="object-contain"
              sizes="100vw"
            />
          </div>
          <button
            className="absolute top-6 right-6 text-[#888888] hover:text-[#f5f5f5] transition-colors text-2xl font-bold"
            aria-label="Fechar zoom"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  )
}

