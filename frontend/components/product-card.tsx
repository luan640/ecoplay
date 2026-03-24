'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Heart, ShoppingCart, Star } from 'lucide-react'
import type { Product } from '@/lib/mock-data'
import { addProductToCart } from '@/lib/cart-storage'

interface ProductCardProps {
  product: Product
}

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

export default function ProductCard({ product }: ProductCardProps) {
  const [wishlisted, setWishlisted] = useState(false)
  const [addedToCart, setAddedToCart] = useState(false)

  function handleWishlist(e: React.MouseEvent) {
    e.preventDefault()
    setWishlisted((prev) => !prev)
  }

  function handleAddToCart(e: React.MouseEvent) {
    e.preventDefault()
    addProductToCart(product, 1)
    setAddedToCart(true)
    setTimeout(() => setAddedToCart(false), 1500)
  }

  return (
    <article
      className="relative flex flex-col bg-[#1a1a1a] border border-[#2e2e2e] rounded-2xl overflow-hidden group hover:border-[#49e4e6]/40 hover:shadow-xl hover:shadow-[#49e4e6]/5 transition-all duration-300 hover:-translate-y-1 w-[220px] flex-shrink-0"
      aria-label={product.title}
    >
      <Link href={`/produto/${product.slug}`} className="absolute inset-0 z-0" aria-label={`Ver ${product.title}`} tabIndex={-1} />
      {/* Image Area */}
      <div className="relative aspect-square bg-[#141414] overflow-hidden">
        <Image
          src={product.image}
          alt={product.title}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-500"
          sizes="220px"
        />

        {/* Discount Badge */}
        <span className="absolute top-2.5 left-2.5 bg-[#49e4e6] text-[#0f0f0f] text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wide z-20">
          {product.discount}% DESCONTO
        </span>

        {/* Wishlist Button */}
        <button
          onClick={handleWishlist}
          className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-[#0f0f0f]/70 backdrop-blur-sm border border-[#2e2e2e] flex items-center justify-center hover:border-[#e53e3e] transition-all z-20"
          aria-label={wishlisted ? 'Remover da lista de desejos' : 'Adicionar à lista de desejos'}
          aria-pressed={wishlisted}
        >
          <Heart
            className={`w-4 h-4 transition-colors ${
              wishlisted ? 'fill-[#e53e3e] text-[#e53e3e]' : 'text-[#888888]'
            }`}
          />
        </button>

        {/* Condition Badge */}
        <span className="absolute bottom-2.5 left-2.5 bg-[#0f0f0f]/80 backdrop-blur-sm text-[#aaaaaa] text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border border-[#2e2e2e]">
          {product.condition}
        </span>

        {/* Add to cart hover overlay */}
        <div className="absolute inset-0 bg-[#0f0f0f]/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center z-10">
          <button
            onClick={handleAddToCart}
            className={`flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-xl transition-all relative z-20 ${
              addedToCart
                ? 'bg-[#22c55e] text-white scale-95'
                : 'bg-[#49e4e6] text-[#0f0f0f] hover:bg-[#2fc8cc] hover:scale-105'
            }`}
            aria-label={`Adicionar ${product.title} ao carrinho`}
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            {addedToCart ? 'Adicionado!' : 'Adicionar'}
          </button>
        </div>
      </div>

      {/* Info Area */}
      <div className="flex flex-col flex-1 p-3.5 gap-2">
        {/* Platform tag */}
        <span className="text-[10px] font-bold text-[#49e4e6] uppercase tracking-widest">
          {product.platform}
        </span>

        {/* Title */}
        <h3 className="text-[#f5f5f5] text-sm font-semibold leading-snug line-clamp-2 flex-1">
          {product.title}
        </h3>

        {/* Rating */}
        <div className="flex items-center gap-1" aria-label={`Avaliação: ${product.rating} de 5 estrelas`}>
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              className={`w-3 h-3 ${
                star <= Math.round(product.rating) ? 'fill-[#49e4e6] text-[#49e4e6]' : 'fill-[#2e2e2e] text-[#2e2e2e]'
              }`}
              aria-hidden="true"
            />
          ))}
          <span className="text-[#666666] text-[10px] ml-0.5">({product.reviewCount})</span>
        </div>

        {/* Pricing */}
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="text-[#555555] text-xs line-through">
              {formatCurrency(product.originalPrice)}
            </span>
            <span className="text-[#e53e3e] text-[10px] font-bold">
              -{product.discount}%
            </span>
          </div>
          <div className="text-[#f5f5f5] text-base font-black">
            {formatCurrency(product.salePrice)}
          </div>
          <div className="text-[10px] text-[#888888]">
            ou{' '}
            <span className="text-[#f5f5f5] font-semibold">
              {product.installments}x de {formatCurrency(product.installmentPrice)}
            </span>
          </div>
          <div className="flex items-center gap-1 mt-1">
            <span className="text-[9px] font-black bg-[#166534] text-[#22c55e] px-1.5 py-0.5 rounded-full uppercase tracking-wide">
              PIX
            </span>
            <span className="text-[#22c55e] text-xs font-black">
              {formatCurrency(product.pixPrice)}
            </span>
          </div>
        </div>
      </div>
    </article>
  )
}

