'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import {
  SlidersHorizontal,
  X,
  ChevronDown,
  ChevronUp,
  Heart,
  ShoppingCart,
  Search,
  ArrowUpDown,
  LayoutGrid,
  LayoutList,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import type { Product } from '@/lib/mock-data'
import { fetchProducts } from '@/lib/api'
import { addProductToCart } from '@/lib/cart-storage'
import { getBackendUrl } from '@/lib/backend-url'

const BACKEND_URL = getBackendUrl()

// ── helpers ──────────────────────────────────────────────────────────────────
function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

// price range buckets
const PRICE_RANGES = [
  { label: 'Até R$ 100', min: 0, max: 100 },
  { label: 'R$ 100 – R$ 200', min: 100, max: 200 },
  { label: 'R$ 200 – R$ 500', min: 200, max: 500 },
  { label: 'R$ 500 – R$ 1.000', min: 500, max: 1000 },
  { label: 'R$ 1.000 – R$ 2.000', min: 1000, max: 2000 },
  { label: 'Acima de R$ 2.000', min: 2000, max: Infinity },
]

const SORT_OPTIONS = [
  { value: 'relevancia', label: 'Relevância' },
  { value: 'maior-desconto', label: 'Maior desconto' },
  { value: 'menor-preco', label: 'Menor preço' },
  { value: 'maior-preco', label: 'Maior preço' },
  { value: 'alfabetico', label: 'Ordem alfabética' },
]

const CONDITIONS = ['Usado', 'Seminovo'] as const

const ITEMS_PER_PAGE = 24

// ── filter accordion ─────────────────────────────────────────────────────────
function FilterSection({
  title,
  children,
  defaultOpen = true,
}: {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-b border-[#2e2e2e] last:border-b-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-between w-full py-3.5 text-sm font-bold text-[#f5f5f5] uppercase tracking-wider hover:text-[#49e4e6] transition-colors"
        aria-expanded={open}
      >
        {title}
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {open && <div className="pb-4">{children}</div>}
    </div>
  )
}

// ── product card (list + grid variants) ──────────────────────────────────────
function SearchProductCard({
  product,
  view,
}: {
  product: Product
  view: 'grid' | 'list'
}) {
  const [wishlisted, setWishlisted] = useState(false)
  const [addedToCart, setAddedToCart] = useState(false)

  function handleAdd(e: React.MouseEvent) {
    e.preventDefault()
    addProductToCart(product, 1)
    setAddedToCart(true)
    setTimeout(() => setAddedToCart(false), 1500)
  }

  if (view === 'list') {
    return (
      <article className="relative flex gap-4 bg-[#1a1a1a] border border-[#2e2e2e] rounded-2xl overflow-hidden hover:border-[#49e4e6]/40 hover:shadow-lg hover:shadow-[#49e4e6]/5 transition-all duration-300 group">
        <Link href={`/produto/${product.slug}`} className="absolute inset-0 z-0" tabIndex={-1} aria-hidden />
        {/* Image */}
        <div className="relative w-[140px] md:w-[180px] flex-shrink-0 bg-[#141414]">
          <Image
            src={product.image}
            alt={product.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            sizes="180px"
          />
          <span className="absolute top-2 left-2 bg-[#49e4e6] text-[#0f0f0f] text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wide z-10">
            -{product.discount}%
          </span>
        </div>
        {/* Info */}
        <div className="flex flex-col flex-1 py-4 pr-4 gap-2">
          <span className="text-[10px] font-bold text-[#49e4e6] uppercase tracking-widest">
            {product.platform} · {product.condition}
          </span>
          <h3 className="text-[#f5f5f5] font-bold text-sm md:text-base leading-snug line-clamp-2">
            {product.title}
          </h3>
          <div className="mt-auto flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[#555555] text-xs line-through">{formatCurrency(product.originalPrice)}</span>
                <span className="text-[#e53e3e] text-[10px] font-bold">-{product.discount}%</span>
              </div>
              <div className="text-[#f5f5f5] text-lg font-black leading-none">{formatCurrency(product.salePrice)}</div>
              <div className="text-[10px] text-[#888888] mt-0.5">
                {product.installments}x de {formatCurrency(product.installmentPrice)} sem juros
              </div>
              <div className="flex items-center gap-1 mt-1">
                <span className="text-[9px] font-black bg-[#166534] text-[#22c55e] px-1.5 py-0.5 rounded-full uppercase">PIX</span>
                <span className="text-[#22c55e] text-sm font-black">{formatCurrency(product.pixPrice)}</span>
              </div>
            </div>
            <div className="flex gap-2 relative z-10">
              <button
                onClick={(e) => { e.preventDefault(); setWishlisted(v => !v) }}
                className="w-9 h-9 rounded-xl border border-[#2e2e2e] bg-[#0f0f0f] flex items-center justify-center hover:border-[#e53e3e] transition-all"
                aria-label={wishlisted ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
              >
                <Heart className={`w-4 h-4 ${wishlisted ? 'fill-[#e53e3e] text-[#e53e3e]' : 'text-[#666666]'}`} />
              </button>
              <button
                onClick={handleAdd}
                className={`flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-xl transition-all ${addedToCart ? 'bg-[#22c55e] text-white' : 'bg-[#49e4e6] text-[#0f0f0f] hover:bg-[#2fc8cc]'}`}
                aria-label={`Adicionar ${product.title} ao carrinho`}
              >
                <ShoppingCart className="w-3.5 h-3.5" />
                {addedToCart ? 'Adicionado!' : 'Adicionar'}
              </button>
            </div>
          </div>
        </div>
      </article>
    )
  }

  return (
    <article className="relative flex flex-col bg-[#1a1a1a] border border-[#2e2e2e] rounded-2xl overflow-hidden group hover:border-[#49e4e6]/40 hover:shadow-xl hover:shadow-[#49e4e6]/5 transition-all duration-300 hover:-translate-y-1">
      <Link href={`/produto/${product.slug}`} className="absolute inset-0 z-0" tabIndex={-1} aria-hidden />
      <div className="relative aspect-square bg-[#141414] overflow-hidden">
        <Image src={product.image} alt={product.title} fill className="object-cover group-hover:scale-105 transition-transform duration-500" sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw" />
        <span className="absolute top-2.5 left-2.5 bg-[#49e4e6] text-[#0f0f0f] text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wide z-20">{product.discount}% OFF</span>
        <button onClick={(e) => { e.preventDefault(); setWishlisted(v => !v) }} className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-[#0f0f0f]/70 backdrop-blur-sm border border-[#2e2e2e] flex items-center justify-center hover:border-[#e53e3e] transition-all z-20" aria-label={wishlisted ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}>
          <Heart className={`w-4 h-4 ${wishlisted ? 'fill-[#e53e3e] text-[#e53e3e]' : 'text-[#888888]'}`} />
        </button>
        <span className="absolute bottom-2.5 left-2.5 bg-[#0f0f0f]/80 backdrop-blur-sm text-[#aaaaaa] text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border border-[#2e2e2e]">{product.condition}</span>
        <div className="absolute inset-0 bg-[#0f0f0f]/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center z-10">
          <button
            onClick={handleAdd}
            className={`flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-xl transition-all relative z-20 ${addedToCart ? 'bg-[#22c55e] text-white scale-95' : 'bg-[#49e4e6] text-[#0f0f0f] hover:bg-[#2fc8cc] hover:scale-105'}`}
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            {addedToCart ? 'Adicionado!' : 'Adicionar'}
          </button>
        </div>
      </div>
      <div className="flex flex-col flex-1 p-3.5 gap-2">
        <span className="text-[10px] font-bold text-[#49e4e6] uppercase tracking-widest">{product.platform}</span>
        <h3 className="text-[#f5f5f5] text-sm font-semibold leading-snug line-clamp-2 flex-1">{product.title}</h3>
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="text-[#555555] text-xs line-through">{formatCurrency(product.originalPrice)}</span>
            <span className="text-[#e53e3e] text-[10px] font-bold">-{product.discount}%</span>
          </div>
          <div className="text-[#f5f5f5] text-base font-black">{formatCurrency(product.salePrice)}</div>
          <div className="text-[10px] text-[#888888]">{product.installments}x de {formatCurrency(product.installmentPrice)}</div>
          <div className="flex items-center gap-1 mt-1">
            <span className="text-[9px] font-black bg-[#166534] text-[#22c55e] px-1.5 py-0.5 rounded-full uppercase">PIX</span>
            <span className="text-[#22c55e] text-xs font-black">{formatCurrency(product.pixPrice)}</span>
          </div>
        </div>
      </div>
    </article>
  )
}

// ── main component ────────────────────────────────────────────────────────────
export default function SearchResults() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const query = searchParams.get('q') ?? ''
  const [localQuery, setLocalQuery] = useState(query)

  // API-backed product list
  const [products, setProducts] = useState<Product[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)

  // filter state
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([])
  const [selectedConditions, setSelectedConditions] = useState<string[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>(
    searchParams.get('categoria') ?? ''
  )
  const [selectedPriceRange, setSelectedPriceRange] = useState<number | null>(null)
  const [sortBy, setSortBy] = useState('relevancia')
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [page, setPage] = useState(1)
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)

  // dynamic platforms
  const [platSearch, setPlatSearch] = useState('')
  const [platDebouncedQ, setPlatDebouncedQ] = useState('')
  const [platforms, setPlatforms] = useState<string[]>([])
  const [platTotal, setPlatTotal] = useState(0)
  const [platPage, setPlatPage] = useState(1)
  const [platLoading, setPlatLoading] = useState(false)
  const [platExpanded, setPlatExpanded] = useState(false)
  const PLATS_VISIBLE = 5

  // dynamic categories
  const [catSearch, setCatSearch] = useState('')
  const [catDebouncedQ, setCatDebouncedQ] = useState('')
  const [categories, setCategories] = useState<string[]>([])
  const [catTotal, setCatTotal] = useState(0)
  const [catPage, setCatPage] = useState(1)
  const [catLoading, setCatLoading] = useState(false)
  const [catExpanded, setCatExpanded] = useState(false)
  const CATS_VISIBLE = 5

  useEffect(() => {
    const t = setTimeout(() => { setPlatDebouncedQ(platSearch); setPlatPage(1); setPlatforms([]) }, 350)
    return () => clearTimeout(t)
  }, [platSearch])

  useEffect(() => {
    setPlatLoading(true)
    const params = new URLSearchParams({ q: platDebouncedQ, page: String(platPage), page_size: '20' })
    fetch(`${BACKEND_URL}/api/plataformas/?${params}`)
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((data) => {
        setPlatforms((prev) => platPage === 1 ? (data.results ?? []) : [...prev, ...(data.results ?? [])])
        setPlatTotal(data.total ?? 0)
      })
      .catch(() => {})
      .finally(() => setPlatLoading(false))
  }, [platDebouncedQ, platPage])

  useEffect(() => {
    const t = setTimeout(() => { setCatDebouncedQ(catSearch); setCatPage(1); setCategories([]) }, 350)
    return () => clearTimeout(t)
  }, [catSearch])

  useEffect(() => {
    setCatLoading(true)
    const params = new URLSearchParams({ q: catDebouncedQ, page: String(catPage), page_size: '20' })
    fetch(`${BACKEND_URL}/api/categorias/?${params}`)
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((data) => {
        setCategories((prev) => catPage === 1 ? (data.results ?? []) : [...prev, ...(data.results ?? [])])
        setCatTotal(data.total ?? 0)
      })
      .catch(() => {})
      .finally(() => setCatLoading(false))
  }, [catDebouncedQ, catPage])

  const orderingMap: Record<string, string> = {
    relevancia: '-id',
    'maior-desconto': 'old_price_desc',
    'menor-preco': 'price_asc',
    'maior-preco': 'price_desc',
    alfabetico: 'name',
  }

  const loadResults = useCallback(() => {
    setLoading(true)
    const priceRange = selectedPriceRange !== null ? PRICE_RANGES[selectedPriceRange] : null
    fetchProducts({
      q: query || undefined,
      platform: selectedPlatforms.length > 0 ? selectedPlatforms.join(',') : undefined,
      condition: selectedConditions.length > 0 ? selectedConditions.join(',') : undefined,
      category: selectedCategory || undefined,
      price_min: priceRange && priceRange.min > 0 ? priceRange.min : undefined,
      price_max: priceRange && priceRange.max !== Infinity ? priceRange.max : undefined,
      ordering: orderingMap[sortBy] ?? '-id',
      page,
      page_size: ITEMS_PER_PAGE,
    }).then((result) => {
      setProducts(result.results)
      setTotal(result.total)
      setTotalPages(result.pages)
      setLoading(false)
    })
  }, [query, selectedPlatforms, selectedConditions, selectedCategory, selectedPriceRange, sortBy, page]) // eslint-disable-line

  useEffect(() => {
    loadResults()
  }, [loadResults])

  const togglePlatform = useCallback((p: string) => {
    setPage(1)
    setSelectedPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    )
  }, [])

  const toggleCondition = useCallback((c: string) => {
    setPage(1)
    setSelectedConditions((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
    )
  }, [])

  const handleSearch = useCallback(() => {
    setPage(1)
    const params = new URLSearchParams()
    if (localQuery) params.set('q', localQuery)
    router.push(`/busca?${params.toString()}`)
  }, [localQuery, router])

  const clearAllFilters = useCallback(() => {
    setSelectedPlatforms([])
    setSelectedConditions([])
    setSelectedCategory('')
    setSelectedPriceRange(null)
    setSortBy('relevancia')
    setPage(1)
    setPlatSearch('')
    setPlatExpanded(false)
    setCatSearch('')
    setCatExpanded(false)
  }, [])

  const activeFilterCount =
    selectedPlatforms.length +
    selectedConditions.length +
    (selectedCategory ? 1 : 0) +
    (selectedPriceRange !== null ? 1 : 0)

  // sidebar content (shared between desktop and mobile drawer)
  const sidebarContent = (
    <div className="flex flex-col gap-0">
      {/* header */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-black text-[#f5f5f5] uppercase tracking-wider">Filtrar</span>
        {activeFilterCount > 0 && (
          <button onClick={clearAllFilters} className="flex items-center gap-1 text-[10px] font-bold text-[#49e4e6] hover:text-[#2fc8cc] transition-colors uppercase tracking-wider">
            <X className="w-3 h-3" /> Limpar ({activeFilterCount})
          </button>
        )}
      </div>

      <FilterSection title="Plataforma">
        {/* search */}
        <div className="relative mb-2">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#555555] pointer-events-none" />
          <input
            value={platSearch}
            onChange={(e) => setPlatSearch(e.target.value)}
            placeholder="Buscar plataforma..."
            className="w-full pl-7 pr-2 py-1.5 text-xs bg-[#1a1a1a] border border-[#2e2e2e] rounded-lg text-[#f5f5f5] placeholder:text-[#555555] outline-none focus:border-[#49e4e6]/50 transition-colors"
          />
        </div>

        <div className="flex flex-col gap-2">
          {(platExpanded ? platforms : platforms.slice(0, PLATS_VISIBLE)).map((p) => (
            <label key={p} className="flex items-center gap-2 cursor-pointer group">
              <div
                onClick={() => { togglePlatform(p) }}
                className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all cursor-pointer ${
                  selectedPlatforms.includes(p) ? 'bg-[#49e4e6] border-[#49e4e6]' : 'border-[#444444] group-hover:border-[#49e4e6]'
                }`}
              >
                {selectedPlatforms.includes(p) && <div className="w-2 h-2 bg-[#0f0f0f] rounded-sm" />}
              </div>
              <span
                onClick={() => { togglePlatform(p) }}
                className={`text-sm transition-colors cursor-pointer ${
                  selectedPlatforms.includes(p) ? 'text-[#49e4e6] font-semibold' : 'text-[#aaaaaa] group-hover:text-[#f5f5f5]'
                }`}
              >
                {p}
              </span>
            </label>
          ))}

          {platLoading && (
            <div className="flex justify-center py-1">
              <div className="w-4 h-4 border-2 border-[#2e2e2e] border-t-[#49e4e6] rounded-full animate-spin" />
            </div>
          )}

          {!platLoading && platforms.length === 0 && (
            <p className="text-xs text-[#555555] text-center py-2">Nenhuma plataforma.</p>
          )}
        </div>

        {!platLoading && platforms.length > PLATS_VISIBLE && !platExpanded && (
          <button
            onClick={() => setPlatExpanded(true)}
            className="mt-2 text-[11px] font-bold text-[#49e4e6] hover:text-[#2fc8cc] transition-colors"
          >
            Ver mais ({platTotal - PLATS_VISIBLE} restantes)
          </button>
        )}
        {platExpanded && platTotal > platforms.length && (
          <button
            onClick={() => setPlatPage((p) => p + 1)}
            className="mt-2 text-[11px] font-bold text-[#49e4e6] hover:text-[#2fc8cc] transition-colors"
          >
            Carregar mais
          </button>
        )}
        {platExpanded && (
          <button
            onClick={() => setPlatExpanded(false)}
            className="mt-1 text-[11px] text-[#555555] hover:text-[#888888] transition-colors"
          >
            Ver menos
          </button>
        )}
      </FilterSection>

      <FilterSection title="Categoria">
        {/* search */}
        <div className="relative mb-2">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#555555] pointer-events-none" />
          <input
            value={catSearch}
            onChange={(e) => setCatSearch(e.target.value)}
            placeholder="Buscar categoria..."
            className="w-full pl-7 pr-2 py-1.5 text-xs bg-[#1a1a1a] border border-[#2e2e2e] rounded-lg text-[#f5f5f5] placeholder:text-[#555555] outline-none focus:border-[#49e4e6]/50 transition-colors"
          />
        </div>

        <div className="flex flex-col gap-2">
          {(catExpanded ? categories : categories.slice(0, CATS_VISIBLE)).map((name) => (
            <label key={name} className="flex items-center gap-2 cursor-pointer group">
              <div
                onClick={() => { setSelectedCategory(selectedCategory === name ? '' : name); setPage(1) }}
                className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all cursor-pointer ${
                  selectedCategory === name ? 'border-[#49e4e6]' : 'border-[#444444] group-hover:border-[#49e4e6]'
                }`}
              >
                {selectedCategory === name && <div className="w-2 h-2 bg-[#49e4e6] rounded-full" />}
              </div>
              <span
                onClick={() => { setSelectedCategory(selectedCategory === name ? '' : name); setPage(1) }}
                className={`text-sm transition-colors cursor-pointer ${
                  selectedCategory === name ? 'text-[#49e4e6] font-semibold' : 'text-[#aaaaaa] group-hover:text-[#f5f5f5]'
                }`}
              >
                {name}
              </span>
            </label>
          ))}

          {catLoading && (
            <div className="flex justify-center py-1">
              <div className="w-4 h-4 border-2 border-[#2e2e2e] border-t-[#49e4e6] rounded-full animate-spin" />
            </div>
          )}

          {!catLoading && categories.length === 0 && (
            <p className="text-xs text-[#555555] text-center py-2">Nenhuma categoria.</p>
          )}
        </div>

        {/* ver mais / ver menos */}
        {!catLoading && categories.length > CATS_VISIBLE && !catExpanded && (
          <button
            onClick={() => setCatExpanded(true)}
            className="mt-2 text-[11px] font-bold text-[#49e4e6] hover:text-[#2fc8cc] transition-colors"
          >
            Ver mais ({catTotal - CATS_VISIBLE} restantes)
          </button>
        )}
        {catExpanded && catTotal > categories.length && (
          <button
            onClick={() => setCatPage((p) => p + 1)}
            className="mt-2 text-[11px] font-bold text-[#49e4e6] hover:text-[#2fc8cc] transition-colors"
          >
            Carregar mais
          </button>
        )}
        {catExpanded && (
          <button
            onClick={() => setCatExpanded(false)}
            className="mt-1 text-[11px] text-[#555555] hover:text-[#888888] transition-colors"
          >
            Ver menos
          </button>
        )}
      </FilterSection>

      <FilterSection title="Condição">
        <div className="flex flex-col gap-2">
          {CONDITIONS.map((c) => (
            <label key={c} className="flex items-center gap-2 cursor-pointer group">
              <div
                onClick={() => toggleCondition(c)}
                className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all cursor-pointer ${selectedConditions.includes(c) ? 'bg-[#49e4e6] border-[#49e4e6]' : 'border-[#444444] group-hover:border-[#49e4e6]'}`}
              >
                {selectedConditions.includes(c) && <div className="w-2 h-2 bg-[#0f0f0f] rounded-sm" />}
              </div>
              <span onClick={() => toggleCondition(c)} className={`text-sm transition-colors cursor-pointer ${selectedConditions.includes(c) ? 'text-[#49e4e6] font-semibold' : 'text-[#aaaaaa] group-hover:text-[#f5f5f5]'}`}>{c}</span>
            </label>
          ))}
        </div>
      </FilterSection>

      <FilterSection title="Faixa de Preço">
        <div className="flex flex-col gap-2">
          {PRICE_RANGES.map((range, idx) => (
            <label key={idx} className="flex items-center gap-2 cursor-pointer group">
              <div
                onClick={() => { setSelectedPriceRange(selectedPriceRange === idx ? null : idx); setPage(1) }}
                className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all cursor-pointer ${selectedPriceRange === idx ? 'border-[#49e4e6]' : 'border-[#444444] group-hover:border-[#49e4e6]'}`}
              >
                {selectedPriceRange === idx && <div className="w-2 h-2 bg-[#49e4e6] rounded-full" />}
              </div>
              <span onClick={() => { setSelectedPriceRange(selectedPriceRange === idx ? null : idx); setPage(1) }} className={`text-sm transition-colors cursor-pointer ${selectedPriceRange === idx ? 'text-[#49e4e6] font-semibold' : 'text-[#aaaaaa] group-hover:text-[#f5f5f5]'}`}>{range.label}</span>
            </label>
          ))}
        </div>
      </FilterSection>
    </div>
  )

  return (
    <div className="max-w-screen-xl mx-auto px-4 py-8">

      {/* Search bar */}
      <div className="mb-6">
        <div className="relative max-w-2xl">
          <input
            type="text"
            value={localQuery}
            onChange={(e) => setLocalQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Buscar games, consoles, plataformas..."
            className="w-full bg-[#1a1a1a] border border-[#2e2e2e] rounded-xl px-5 py-3.5 pr-14 text-sm text-[#f5f5f5] placeholder-[#555555] focus:outline-none focus:border-[#49e4e6] focus:ring-1 focus:ring-[#49e4e6] transition-all"
            aria-label="Buscar produtos"
          />
          <button
            onClick={handleSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-[#49e4e6] hover:bg-[#2fc8cc] text-[#0f0f0f] rounded-lg flex items-center justify-center transition-colors"
            aria-label="Pesquisar"
          >
            <Search className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-[#666666] mb-6" aria-label="Navegação estrutural">
        <Link href="/" className="hover:text-[#49e4e6] transition-colors">Início</Link>
        <span>/</span>
        <span className="text-[#aaaaaa]">
          {query ? `Busca: "${query}"` : 'Todos os produtos'}
        </span>
      </nav>

      <div className="flex gap-6">

        {/* ── Sidebar desktop ── */}
        <aside className="hidden lg:block w-64 flex-shrink-0">
          <div className="bg-[#1a1a1a] border border-[#2e2e2e] rounded-2xl p-5 sticky top-[120px] max-h-[calc(100vh-140px)] overflow-y-auto">
            {sidebarContent}
          </div>
        </aside>

        {/* ── Main content ── */}
        <div className="flex-1 min-w-0">

          {/* Toolbar */}
          <div className="flex items-center gap-3 mb-6 flex-wrap">
            {/* Mobile filter toggle */}
            <button
              onClick={() => setMobileFiltersOpen(true)}
              className="lg:hidden flex items-center gap-2 bg-[#1a1a1a] border border-[#2e2e2e] hover:border-[#49e4e6] text-[#aaaaaa] hover:text-[#49e4e6] text-sm font-bold px-3 py-2 rounded-xl transition-all"
              aria-label="Abrir filtros"
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filtros
              {activeFilterCount > 0 && (
                <span className="bg-[#49e4e6] text-[#0f0f0f] text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center">{activeFilterCount}</span>
              )}
            </button>

            {/* Result count */}
            <p className="text-sm text-[#888888] mr-auto">
              <span className="text-[#f5f5f5] font-bold">{total}</span> produto{total !== 1 ? 's' : ''} encontrado{total !== 1 ? 's' : ''}
              {query && <span className="text-[#49e4e6]"> para &quot;{query}&quot;</span>}
            </p>

            {/* Sort */}
            <div className="flex items-center gap-2">
              <ArrowUpDown className="w-4 h-4 text-[#666666]" aria-hidden />
              <select
                value={sortBy}
                onChange={(e) => { setSortBy(e.target.value); setPage(1) }}
                className="bg-[#1a1a1a] border border-[#2e2e2e] text-[#aaaaaa] text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-[#49e4e6] cursor-pointer transition-all hover:border-[#444444]"
                aria-label="Ordenar por"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            {/* View toggle */}
            <div className="flex items-center bg-[#1a1a1a] border border-[#2e2e2e] rounded-xl overflow-hidden">
              <button
                onClick={() => setView('grid')}
                className={`p-2 transition-colors ${view === 'grid' ? 'bg-[#49e4e6] text-[#0f0f0f]' : 'text-[#666666] hover:text-[#f5f5f5]'}`}
                aria-label="Visualização em grade"
                aria-pressed={view === 'grid'}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setView('list')}
                className={`p-2 transition-colors ${view === 'list' ? 'bg-[#49e4e6] text-[#0f0f0f]' : 'text-[#666666] hover:text-[#f5f5f5]'}`}
                aria-label="Visualização em lista"
                aria-pressed={view === 'list'}
              >
                <LayoutList className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Active filter chips */}
          {activeFilterCount > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {selectedPlatforms.map((p) => (
                <button key={p} onClick={() => togglePlatform(p)} className="flex items-center gap-1.5 bg-[#49e4e6]/10 border border-[#49e4e6]/30 text-[#49e4e6] text-xs font-bold px-3 py-1.5 rounded-full hover:bg-[#49e4e6]/20 transition-all">
                  {p} <X className="w-3 h-3" />
                </button>
              ))}
              {selectedConditions.map((c) => (
                <button key={c} onClick={() => toggleCondition(c)} className="flex items-center gap-1.5 bg-[#49e4e6]/10 border border-[#49e4e6]/30 text-[#49e4e6] text-xs font-bold px-3 py-1.5 rounded-full hover:bg-[#49e4e6]/20 transition-all">
                  {c} <X className="w-3 h-3" />
                </button>
              ))}
              {selectedCategory && (
                <button onClick={() => setSelectedCategory('')} className="flex items-center gap-1.5 bg-[#49e4e6]/10 border border-[#49e4e6]/30 text-[#49e4e6] text-xs font-bold px-3 py-1.5 rounded-full hover:bg-[#49e4e6]/20 transition-all">
                  {selectedCategory} <X className="w-3 h-3" />
                </button>
              )}
              {selectedPriceRange !== null && (
                <button onClick={() => setSelectedPriceRange(null)} className="flex items-center gap-1.5 bg-[#49e4e6]/10 border border-[#49e4e6]/30 text-[#49e4e6] text-xs font-bold px-3 py-1.5 rounded-full hover:bg-[#49e4e6]/20 transition-all">
                  {PRICE_RANGES[selectedPriceRange].label} <X className="w-3 h-3" />
                </button>
              )}
            </div>
          )}

          {/* Results grid / list OR loading */}
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <div className="w-10 h-10 border-4 border-[#49e4e6]/30 border-t-[#49e4e6] rounded-full animate-spin" aria-label="Carregando" />
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <Search className="w-16 h-16 text-[#2e2e2e] mb-4" aria-hidden />
              <h2 className="text-[#f5f5f5] text-xl font-black mb-2">Nenhum produto encontrado</h2>
              <p className="text-[#666666] text-sm max-w-xs mb-6">
                Tente ajustar os filtros ou buscar por outros termos.
              </p>
              <button onClick={clearAllFilters} className="bg-[#49e4e6] hover:bg-[#2fc8cc] text-[#0f0f0f] font-bold text-sm px-6 py-3 rounded-xl transition-all hover:scale-105">
                Limpar filtros
              </button>
            </div>
          ) : (
            <div className={view === 'grid' ? 'grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4' : 'flex flex-col gap-3'}>
              {products.map((product) => (
                <SearchProductCard key={product.id} product={product} view={view} />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-1.5 mt-10 flex-wrap">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="w-9 h-9 flex items-center justify-center rounded-xl border border-[#2e2e2e] text-[#888888] hover:border-[#49e4e6] hover:text-[#49e4e6] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                aria-label="Página anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {(() => {
                const delta = 2
                const pages: (number | '...')[] = []
                for (let i = 1; i <= totalPages; i++) {
                  if (i === 1 || i === totalPages || (i >= page - delta && i <= page + delta)) {
                    pages.push(i)
                  } else if (pages[pages.length - 1] !== '...') {
                    pages.push('...')
                  }
                }
                return pages.map((p, idx) =>
                  p === '...' ? (
                    <span key={`ellipsis-${idx}`} className="w-9 h-9 flex items-center justify-center text-[#555555] text-sm">…</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setPage(p as number)}
                      className={`w-9 h-9 flex items-center justify-center rounded-xl text-sm font-bold transition-all ${p === page ? 'bg-[#49e4e6] text-[#0f0f0f]' : 'border border-[#2e2e2e] text-[#888888] hover:border-[#49e4e6] hover:text-[#49e4e6]'}`}
                      aria-label={`Ir para página ${p}`}
                      aria-current={p === page ? 'page' : undefined}
                    >
                      {p}
                    </button>
                  )
                )
              })()}

              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="w-9 h-9 flex items-center justify-center rounded-xl border border-[#2e2e2e] text-[#888888] hover:border-[#49e4e6] hover:text-[#49e4e6] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                aria-label="Próxima página"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Mobile filter drawer ── */}
      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setMobileFiltersOpen(false)} aria-hidden />
          <aside className="absolute left-0 top-0 bottom-0 w-80 max-w-[90vw] bg-[#1a1a1a] border-r border-[#2e2e2e] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#2e2e2e] sticky top-0 bg-[#1a1a1a] z-10">
              <span className="text-sm font-black text-[#f5f5f5] uppercase tracking-wider">Filtros</span>
              <button onClick={() => setMobileFiltersOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-lg text-[#888888] hover:text-[#f5f5f5] hover:bg-[#2a2a2a] transition-all" aria-label="Fechar filtros">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5">{sidebarContent}</div>
            <div className="sticky bottom-0 p-4 bg-[#1a1a1a] border-t border-[#2e2e2e]">
              <button
                onClick={() => setMobileFiltersOpen(false)}
                className="w-full bg-[#49e4e6] hover:bg-[#2fc8cc] text-[#0f0f0f] font-black text-sm py-3 rounded-xl transition-all"
              >
                Ver {total} resultado{total !== 1 ? 's' : ''}
              </button>
            </div>
          </aside>
        </div>
      )}
    </div>
  )
}
