'use client'

import { apiFetch } from '@/lib/api'
import { Fragment, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search,
  ShoppingCart,
  User,
  MessageCircle,
  Menu,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { categories } from '@/lib/mock-data'
import { type CartItem, readCart, subscribeCart } from '@/lib/cart-storage'
import { useStore } from '@/lib/store-context'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || (typeof window !== 'undefined' ? window.location.protocol + '//' + window.location.hostname + ':8000' : 'http://localhost:8000')

export default function Header() {
  const router = useRouter()
  const { storeName, logoUrl } = useStore()
  const [namePart1, namePart2] = (() => {
    const parts = storeName.split(' ')
    return [parts[0], parts.slice(1).join(' ')]
  })()
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [searchValue, setSearchValue] = useState('')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [customerName, setCustomerName] = useState<string | null>(null)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const cartCount = useMemo(
    () => cartItems.reduce((acc, item) => acc + item.quantity, 0),
    [cartItems]
  )
  const subtotal = useMemo(
    () => cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0),
    [cartItems]
  )
  const pixTotal = useMemo(
    () => cartItems.reduce((acc, item) => acc + item.pixPrice * item.quantity, 0),
    [cartItems]
  )

  useEffect(() => {
    const sync = () => setCartItems(readCart())
    sync()
    return subscribeCart(sync)
  }, [])

  useEffect(() => {
    let mounted = true
    const loadCustomer = () => {
      apiFetch(`${BACKEND_URL}/api/clientes/me/`)
        .then(async (res) => {
          if (!res.ok) return null
          return res.json().catch(() => null)
        })
        .then((data) => {
          if (!mounted) return
          const fullName = data?.user?.full_name?.trim?.() || ''
          const email = data?.user?.email?.trim?.() || ''
          const firstName = fullName
            ? fullName.split(' ')[0]
            : (email ? email.split('@')[0] : null)
          setCustomerName(firstName || null)
        })
        .catch(() => {
          if (mounted) setCustomerName(null)
        })
    }

    loadCustomer()
    const onFocus = () => loadCustomer()
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onFocus)
    return () => {
      mounted = false
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onFocus)
    }
  }, [])

  function formatBRL(value: number) {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  function handleSearch() {
    if (searchValue.trim()) {
      router.push(`/busca?q=${encodeURIComponent(searchValue.trim())}`)
    } else {
      router.push('/busca')
    }
  }

  async function handleLogout() {
    try {
      const res = await apiFetch(`${BACKEND_URL}/api/clientes/logout/`, {
        method: 'POST',
      })
      if (!res.ok) return

      const me = await apiFetch(`${BACKEND_URL}/api/clientes/me/`)
      if (!me.ok) {
        setCustomerName(null)
      }
    } catch {
      return
    } finally {
      setUserMenuOpen(false)
      router.refresh()
    }
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#0f0f0f] border-b border-[#2e2e2e] shadow-lg">
      {/* Top Bar */}
      <div className="max-w-screen-xl mx-auto px-4 h-16 flex items-center gap-4">
        {/* Logo */}
        <a href="/" className="flex-shrink-0 flex items-center gap-2 group">
          <div className="relative w-9 h-9 rounded-lg overflow-hidden border border-[#2e2e2e] bg-[#1a1a1a] shadow-md">
            <img src={logoUrl || '/logo2.png'} alt={storeName} className="w-full h-full object-cover" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-[#f5f5f5] font-bold text-sm uppercase tracking-wider leading-none">
              {namePart1}
            </span>
            {namePart2 && (
              <span className="text-[#49e4e6] font-black text-sm uppercase tracking-wider leading-none">
                {namePart2}
              </span>
            )}
            <span className="text-[#888888] text-[9px] font-semibold bg-[#2a2a2a] px-1.5 py-0.5 rounded mt-0.5 leading-none self-start">
              11 ANOS
            </span>
          </div>
        </a>

        {/* Search Bar */}
        <div className="flex-1 max-w-2xl mx-4 hidden md:block">
          <div className="relative">
            <input
              type="text"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Faça sua pesquisa aqui..."
              className="w-full bg-[#1a1a1a] border border-[#2e2e2e] rounded-xl px-4 py-2.5 pr-12 text-sm text-[#f5f5f5] placeholder-[#555555] focus:outline-none focus:border-[#49e4e6] focus:ring-1 focus:ring-[#49e4e6] transition-all"
              aria-label="Buscar produtos"
            />
            <button
              onClick={handleSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#888888] hover:text-[#49e4e6] transition-colors"
              aria-label="Pesquisar"
            >
              <Search className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 ml-auto md:ml-0">
          {/* Support Button */}
          <a
            href="#suporte"
            className="hidden lg:flex items-center gap-2 bg-[#49e4e6] hover:bg-[#2fc8cc] text-[#0f0f0f] text-xs font-bold px-3 py-2 rounded-lg transition-colors whitespace-nowrap"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Precisa de ajuda? Fale Conosco</span>
          </a>

          {/* User */}
          <div className="relative hidden md:block">
            <button
              onClick={() => setUserMenuOpen((v) => !v)}
              className="flex items-center gap-2 text-[#888888] hover:text-[#f5f5f5] transition-colors px-2 py-1"
              aria-label="Área do usuário"
              aria-expanded={userMenuOpen}
            >
              <User className="w-5 h-5" />
              <div className="flex flex-col text-left leading-tight">
                <span className="text-[10px] text-[#666666]">Olá,</span>
                <span className="text-xs font-semibold">{customerName || 'Visitante'}</span>
              </div>
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-44 rounded-xl border border-[#2e2e2e] bg-[#141414] p-2 shadow-xl">
                {customerName ? (
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-semibold text-[#f5f5f5] hover:bg-[#1a1a1a] hover:text-[#49e4e6] transition-colors"
                  >
                    <span>Sair</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setUserMenuOpen(false)
                      router.push('/conta/login')
                    }}
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-semibold text-[#f5f5f5] hover:bg-[#1a1a1a] hover:text-[#49e4e6] transition-colors"
                  >
                    <span>Entrar</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Cart */}
          <div className="relative hidden md:block group/cart">
            <button
              onClick={() => router.push('/carrinho')}
              className="relative flex items-center justify-center w-10 h-10 rounded-xl text-[#888888] hover:text-[#f5f5f5] hover:bg-[#1a1a1a] transition-all"
              aria-label={`Carrinho de compras, ${cartCount} itens`}
            >
              <ShoppingCart className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#49e4e6] text-[#0f0f0f] text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center leading-none">
                  {cartCount}
                </span>
              )}
            </button>

            <div className="absolute right-0 top-full pt-3 z-50 opacity-0 invisible translate-y-1 transition-all duration-200 group-hover/cart:opacity-100 group-hover/cart:visible group-hover/cart:translate-y-0">
              <div className="w-[360px] rounded-2xl border border-[#2e2e2e] bg-[#f2f2f2] text-[#1a1a1a] shadow-2xl shadow-black/50 overflow-hidden">
                <div className="max-h-[260px] overflow-auto">
                  {cartItems.length === 0 ? (
                    <div className="p-4 text-sm text-[#666666]">Seu carrinho está vazio.</div>
                  ) : cartItems.map((item, index) => (
                    <div
                      key={item.productId}
                      className={`flex gap-3 p-4 ${index !== 0 ? 'border-t border-[#d9d9d9]' : ''}`}
                    >
                      <div className="w-12 h-12 rounded-md overflow-hidden bg-white border border-[#e5e5e5] shrink-0">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold leading-snug line-clamp-2">
                          {item.name}
                        </p>
                        <p className="text-xs text-[#666666] mt-1">Qtd: {item.quantity}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs text-[#999999] line-through">
                          {formatBRL(item.oldPrice)}
                        </p>
                        <p className="text-sm font-black">{formatBRL(item.price)}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-[#d9d9d9] p-4 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[#555555]">Total</span>
                    <span className="font-black text-lg">{formatBRL(subtotal)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[#555555]">via Pix</span>
                    <span className="font-black text-[#0c9ea2] text-xl">
                      {formatBRL(pixTotal)}
                    </span>
                  </div>
                  <a
                    href="/carrinho"
                    className="mt-3 inline-flex w-full items-center justify-center rounded-xl border-2 border-[#49e4e6] bg-white px-4 py-3 text-sm font-black text-[#1a1a1a] transition-colors hover:bg-[#ecffff]"
                  >
                    Ir para o carrinho
                  </a>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={() => router.push('/carrinho')}
            className="relative md:hidden flex items-center justify-center w-10 h-10 rounded-xl text-[#888888] hover:text-[#f5f5f5] hover:bg-[#1a1a1a] transition-all"
            aria-label={`Carrinho de compras, ${cartCount} itens`}
          >
            <ShoppingCart className="w-5 h-5" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-[#49e4e6] text-[#0f0f0f] text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center leading-none">
                {cartCount}
              </span>
            )}
          </button>

          {/* Mobile Menu Toggle */}
          <button
            className="md:hidden flex items-center justify-center w-10 h-10 rounded-xl text-[#888888] hover:text-[#f5f5f5] hover:bg-[#1a1a1a] transition-all"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Category Navigation */}
      <nav
        className="hidden md:block bg-[#141414] border-t border-[#2e2e2e]"
        aria-label="Categorias de produtos"
      >
        <div className="max-w-screen-xl mx-auto px-4">
          <ul className="flex items-center gap-1 overflow-x-auto py-0" role="list">
            {categories.map((cat) => (
              <Fragment key={cat.label}>
                <li role="listitem">
                  <a
                    href={cat.href}
                    className="flex items-center gap-1.5 px-4 py-3 text-xs font-bold uppercase tracking-wider text-[#aaaaaa] hover:text-[#49e4e6] hover:bg-[#1a1a1a] rounded-lg transition-all whitespace-nowrap border-b-2 border-transparent hover:border-[#49e4e6]"
                  >
                    {cat.label}
                  </a>
                </li>
                {cat.label.toLowerCase() === 'outros' && (
                  <li role="listitem" className="pl-1">
                    <a
                      href="/cotacoes"
                      className="inline-flex items-center rounded-lg bg-[#facc15] px-4 py-2 text-xs font-black uppercase tracking-wider text-[#0f0f0f] shadow-[0_0_0_1px_rgba(250,204,21,0.45),0_0_16px_rgba(250,204,21,0.35)] transition-all hover:scale-[1.02] hover:bg-[#fde047] animate-pulse whitespace-nowrap"
                    >
                      Venda seu usado!!
                    </a>
                  </li>
                )}
              </Fragment>
            ))}
          </ul>
        </div>
      </nav>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#141414] border-t border-[#2e2e2e] p-4">
          {/* Mobile Search */}
          <div className="relative mb-4">
            <input
              type="text"
              placeholder="Faça sua pesquisa aqui..."
              className="w-full bg-[#1a1a1a] border border-[#2e2e2e] rounded-xl px-4 py-2.5 pr-12 text-sm text-[#f5f5f5] placeholder-[#555555] focus:outline-none focus:border-[#49e4e6] transition-all"
              aria-label="Buscar produtos"
            />
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#888888]" />
          </div>

          {/* Mobile Categories */}
          <nav aria-label="Categorias mobile">
            <ul className="flex flex-col gap-1" role="list">
              {categories.map((cat) => (
                <li key={cat.label} role="listitem">
                  <a
                    href={cat.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 text-sm font-bold uppercase tracking-wider text-[#aaaaaa] hover:text-[#49e4e6] hover:bg-[#1a1a1a] rounded-lg transition-all"
                  >
                    {cat.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="mt-4 pt-4 border-t border-[#2e2e2e] flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setMobileMenuOpen(false)
                router.push('/conta/login')
              }}
              className="flex-1 border-[#2e2e2e] text-[#aaaaaa] hover:text-[#f5f5f5] hover:border-[#49e4e6]"
              size="sm"
            >
              <User className="w-4 h-4 mr-2" />
              Entrar
            </Button>
            <Button
              className="flex-1 bg-[#49e4e6] hover:bg-[#2fc8cc] text-[#0f0f0f] font-bold"
              size="sm"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Fale Conosco
            </Button>
          </div>
        </div>
      )}
    </header>
  )
}




