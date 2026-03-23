'use client'

import { useState } from 'react'
import {
  ShoppingCart,
  Heart,
  Share2,
  Shield,
  Truck,
  RotateCcw,
  Check,
  Copy,
} from 'lucide-react'
import type { Product } from '@/lib/mock-data'
import { addProductToCart } from '@/lib/cart-storage'
import { useStore } from '@/lib/store-context'

interface ProductBuyBoxProps {
  product: Product
}

function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function ProductBuyBox({ product }: ProductBuyBoxProps) {
  const { storeName } = useStore()
  const [wishlisted, setWishlisted] = useState(false)
  const [addedToCart, setAddedToCart] = useState(false)
  const [copied, setCopied] = useState(false)

  function handleAddToCart() {
    addProductToCart(product, 1)
    setAddedToCart(true)
    setTimeout(() => setAddedToCart(false), 2000)
  }

  function handleShare() {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Platform + Condition badges */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] font-black bg-[#49e4e6]/10 text-[#49e4e6] border border-[#49e4e6]/30 px-3 py-1 rounded-full uppercase tracking-widest">
          {product.platform}
        </span>
        <span className="text-[10px] font-bold bg-[#2a2a2a] text-[#aaaaaa] border border-[#2e2e2e] px-3 py-1 rounded-full uppercase tracking-wider">
          {product.condition}
        </span>
        {product.inStock ? (
          <span className="text-[10px] font-bold bg-[#166534]/30 text-[#22c55e] border border-[#22c55e]/20 px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] inline-block" />
            Em estoque
          </span>
        ) : (
          <span className="text-[10px] font-bold bg-[#7f1d1d]/30 text-[#e53e3e] border border-[#e53e3e]/20 px-3 py-1 rounded-full uppercase tracking-wider">
            Esgotado
          </span>
        )}
      </div>

      {/* Title */}
      <h1 className="text-[#f5f5f5] text-2xl md:text-3xl font-black leading-tight text-balance">
        {product.title}
      </h1>

      {/* SKU */}
      <p className="text-[#555555] text-xs">
        SKU: <span className="text-[#777777]">{product.sku}</span>
      </p>

      {/* Pricing block */}
      <div className="bg-[#141414] border border-[#2e2e2e] rounded-2xl p-5 space-y-3">
        {/* Original + discount */}
        <div className="flex items-center gap-3">
          <span className="text-[#555555] text-sm line-through">
            {formatCurrency(product.originalPrice)}
          </span>
          <span className="text-[10px] font-black bg-[#e53e3e] text-white px-2 py-0.5 rounded-full">
            -{product.discount}% OFF
          </span>
        </div>

        {/* Sale price */}
        <div className="text-[#f5f5f5] text-3xl font-black tracking-tight">
          {formatCurrency(product.salePrice)}
        </div>

        {/* Installments */}
        <div className="text-[#888888] text-sm">
          ou{' '}
          <span className="text-[#f5f5f5] font-bold">
            {product.installments}x de {formatCurrency(product.installmentPrice)}
          </span>{' '}
          sem juros
        </div>

        {/* PIX price */}
        <div className="flex items-center gap-2.5 pt-1 border-t border-[#2e2e2e]">
          <span className="text-[10px] font-black bg-[#166534] text-[#22c55e] px-2 py-0.5 rounded-full uppercase tracking-wide">
            PIX
          </span>
          <span className="text-[#22c55e] text-xl font-black">
            {formatCurrency(product.pixPrice)}
          </span>
          <span className="text-[#22c55e] text-xs font-semibold">
            (5% de desconto)
          </span>
        </div>
      </div>

      {/* CTA Buttons */}
      <div className="flex flex-col gap-3">
        <button
          onClick={handleAddToCart}
          disabled={!product.inStock}
          className={`w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl font-black text-base transition-all ${
            addedToCart
              ? 'bg-[#22c55e] text-white scale-[0.99]'
              : product.inStock
              ? 'bg-[#49e4e6] text-[#0f0f0f] hover:bg-[#2fc8cc] hover:scale-[1.01] active:scale-[0.99]'
              : 'bg-[#2a2a2a] text-[#555555] cursor-not-allowed'
          }`}
        >
          {addedToCart ? (
            <>
              <Check className="w-5 h-5" />
              Adicionado ao carrinho!
            </>
          ) : (
            <>
              <ShoppingCart className="w-5 h-5" />
              {product.inStock ? 'Adicionar ao carrinho' : 'Produto esgotado'}
            </>
          )}
        </button>

      </div>

      {/* Wishlist + Share */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setWishlisted((p) => !p)}
          className={`flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl border transition-all ${
            wishlisted
              ? 'border-[#e53e3e] text-[#e53e3e] bg-[#e53e3e]/10'
              : 'border-[#2e2e2e] text-[#888888] hover:border-[#e53e3e] hover:text-[#e53e3e]'
          }`}
          aria-pressed={wishlisted}
        >
          <Heart className={`w-4 h-4 ${wishlisted ? 'fill-[#e53e3e]' : ''}`} />
          {wishlisted ? 'Na lista de desejos' : 'Lista de desejos'}
        </button>

        <button
          onClick={handleShare}
          className="flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl border border-[#2e2e2e] text-[#888888] hover:border-[#555555] hover:text-[#f5f5f5] transition-all"
        >
          {copied ? <Copy className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
          {copied ? 'Link copiado!' : 'Compartilhar'}
        </button>
      </div>

      {/* Trust micro-badges */}
      <div className="grid grid-cols-3 gap-3 pt-1">
        {[
          { icon: Shield, text: `Garantia ${storeName}`, sub: 'Até 9 meses' },
          { icon: Truck, text: 'Frete rápido', sub: 'Todo o Brasil' },
          { icon: RotateCcw, text: 'Devolução', sub: 'Em até 7 dias' },
        ].map(({ icon: Icon, text, sub }) => (
          <div
            key={text}
            className="flex flex-col items-center gap-1 bg-[#141414] border border-[#2e2e2e] rounded-xl p-3 text-center"
          >
            <Icon className="w-5 h-5 text-[#49e4e6]" />
            <span className="text-[#f5f5f5] text-[11px] font-bold leading-tight">{text}</span>
            <span className="text-[#666666] text-[10px] leading-tight">{sub}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
