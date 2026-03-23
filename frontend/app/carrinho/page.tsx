'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Minus, Plus, ShoppingCart, Tag, Trash2 } from 'lucide-react'

import Header from '@/components/header'
import Footer from '@/components/footer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  readCart,
  removeCartItem,
  subscribeCart,
  type CartItem,
  updateCartItemQuantity,
} from '@/lib/cart-storage'

const COUPON_CODE = 'PRIMEIRACOMPRA'
const COUPON_DISCOUNT = 0.1
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || (typeof window !== 'undefined' ? window.location.protocol + '//' + window.location.hostname + ':8000' : 'http://localhost:8000')

function formatBRL(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function CarrinhoPage() {
  const router = useRouter()
  const [items, setItems] = useState<CartItem[]>([])
  const [couponInput, setCouponInput] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null)
  const [couponMessage, setCouponMessage] = useState('')
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [authStep, setAuthStep] = useState<'menu' | 'login' | 'register' | 'forgot'>('menu')
  const [authNotice, setAuthNotice] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [loginData, setLoginData] = useState({ email: 'meu@email.com.br', password: '' })
  const [registerData, setRegisterData] = useState({ email: '', fullName: '', password: '' })
  const [forgotEmail, setForgotEmail] = useState('')

  useEffect(() => {
    const sync = () => setItems(readCart())
    sync()
    return subscribeCart(sync)
  }, [])

  const subtotal = useMemo(
    () => items.reduce((acc, item) => acc + item.price * item.quantity, 0),
    [items]
  )
  const discount = appliedCoupon === COUPON_CODE ? subtotal * COUPON_DISCOUNT : 0
  const total = Math.max(subtotal - discount, 0)

  function updateQty(id: string, nextQty: number) {
    setItems((prev) =>
      prev.map((item) =>
        String(item.productId) === id
          ? { ...item, quantity: Math.max(1, nextQty) }
          : item
      )
    )
    updateCartItemQuantity(Number(id), nextQty)
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((item) => String(item.productId) !== id))
    removeCartItem(Number(id))
  }

  function applyCoupon() {
    if (couponInput.trim().toUpperCase() === COUPON_CODE) {
      setAppliedCoupon(COUPON_CODE)
      setCouponInput(COUPON_CODE)
      setCouponMessage('Cupom aplicado: 10% de desconto.')
      return
    }
    setAppliedCoupon(null)
    setCouponMessage('Cupom invÃ¡lido. Tente PRIMEIRACOMPRA.')
  }

  function openAuthWizard() {
    setAuthNotice('')
    setAuthStep('menu')
    setAuthModalOpen(true)
  }

  async function openCheckout() {
    try {
      const res = await fetch(`${BACKEND_URL}/api/clientes/me/`, {
        method: 'GET',
        credentials: 'include',
      })
      if (res.ok) {
        router.push('/checkout')
        return
      }
    } catch {}
    router.push('/conta/login?next=%2Fcheckout')
  }

  function handleGoogleAuth() {
    const url = `${BACKEND_URL}/auth/login/google-oauth2/`
    window.location.href = url
  }

  async function handleLoginSubmit(e?: FormEvent) {
    e?.preventDefault()
    if (!loginData.email.trim() || !loginData.password.trim()) {
      setAuthNotice('Preencha e-mail e senha.')
      return
    }
    setAuthLoading(true)
    setAuthNotice('')
    try {
      const res = await fetch(`${BACKEND_URL}/api/clientes/login/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: loginData.email.trim(), password: loginData.password }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setAuthNotice(data?.non_field_errors?.[0] || data?.detail || 'Falha no login.')
        return
      }
      setAuthModalOpen(false)
      router.push('/checkout')
    } catch {
      setAuthNotice('Erro de conexÃ£o com o servidor.')
    } finally {
      setAuthLoading(false)
    }
  }

  async function handleRegisterSubmit(e?: FormEvent) {
    e?.preventDefault()
    if (!registerData.email.trim() || !registerData.fullName.trim() || !registerData.password.trim()) {
      setAuthNotice('Preencha e-mail, nome e senha.')
      return
    }
    setAuthLoading(true)
    setAuthNotice('')
    try {
      const res = await fetch(`${BACKEND_URL}/api/clientes/registro/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: registerData.email.trim(),
          full_name: registerData.fullName.trim(),
          password: registerData.password,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setAuthNotice(data?.email?.[0] || data?.detail || 'Falha ao criar conta.')
        return
      }
      setAuthModalOpen(false)
      router.push('/checkout')
    } catch {
      setAuthNotice('Erro de conexÃ£o com o servidor.')
    } finally {
      setAuthLoading(false)
    }
  }

  async function handleForgotSubmit(e?: FormEvent) {
    e?.preventDefault()
    if (!forgotEmail.trim()) {
      setAuthNotice('Informe o e-mail.')
      return
    }
    setAuthLoading(true)
    setAuthNotice('')
    try {
      const res = await fetch(`${BACKEND_URL}/api/clientes/forgot-password/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail.trim() }),
      })
      const data = await res.json().catch(() => ({}))
      setAuthNotice(data?.message || 'SolicitaÃ§Ã£o enviada.')
      if (res.ok) setAuthStep('menu')
    } catch {
      setAuthNotice('Erro de conexÃ£o com o servidor.')
    } finally {
      setAuthLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f]">
      <Header />

      <main className="pt-[108px]">
        <section className="max-w-screen-xl mx-auto px-4 py-10">
          <div className="mb-6">
            <h1 className="text-3xl font-black text-[#f5f5f5]">Carrinho</h1>
            <p className="text-sm text-[#888888] mt-1">
              Revise seus itens, aplique cupom e finalize sua compra.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
            <section className="rounded-2xl border border-[#2e2e2e] bg-[#141414] overflow-hidden">
              <div className="border-b border-[#2e2e2e] px-5 py-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#49e4e6]/10 border border-[#49e4e6]/20 flex items-center justify-center">
                  <ShoppingCart className="w-4 h-4 text-[#49e4e6]" />
                </div>
                <div>
                  <p className="text-[#f5f5f5] font-bold">Itens selecionados</p>
                  <p className="text-xs text-[#666666]">
                    {items.length} {items.length === 1 ? 'produto' : 'produtos'}
                  </p>
                </div>
              </div>

              {items.length === 0 ? (
                <div className="px-5 py-10 text-center">
                  <p className="text-[#f5f5f5] font-semibold">Seu carrinho está vazio.</p>
                  <Link
                    href="/"
                    className="mt-4 inline-flex items-center justify-center rounded-xl bg-[#49e4e6] px-5 py-3 text-sm font-black text-[#0f0f0f] hover:bg-[#2fc8cc] transition-colors"
                  >
                    Continuar comprando
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-[#2e2e2e]">
                  {items.map((item) => (
                    <article
                      key={item.productId}
                      className="grid gap-4 px-5 py-4 sm:grid-cols-[84px_1fr_auto]"
                    >
                      <div className="w-[84px] h-[84px] rounded-xl overflow-hidden border border-[#2e2e2e] bg-[#1a1a1a]">
                        <img
                          src={item.image}
                          alt={`${item.name} ${item.platform}`}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <div className="min-w-0">
                        <p className="text-[#f5f5f5] font-bold leading-tight">
                          {item.name} - {item.platform}
                        </p>
                        <p className="text-xs text-[#666666] mt-1">Produto usado com garantia</p>

                        <div className="mt-4 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => updateQty(String(item.productId), item.quantity - 1)}
                            className="w-9 h-9 rounded-lg border border-[#2e2e2e] bg-[#1a1a1a] text-[#aaaaaa] hover:text-[#49e4e6] hover:border-[#49e4e6] flex items-center justify-center transition-all"
                            aria-label={`Diminuir quantidade de ${item.name}`}
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="w-10 text-center text-sm font-bold text-[#f5f5f5]">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQty(String(item.productId), item.quantity + 1)}
                            className="w-9 h-9 rounded-lg border border-[#2e2e2e] bg-[#1a1a1a] text-[#aaaaaa] hover:text-[#49e4e6] hover:border-[#49e4e6] flex items-center justify-center transition-all"
                            aria-label={`Aumentar quantidade de ${item.name}`}
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeItem(String(item.productId))}
                            className="ml-2 inline-flex items-center gap-2 rounded-lg border border-[#2e2e2e] bg-[#1a1a1a] px-3 h-9 text-xs font-bold text-[#aaaaaa] hover:text-[#f87171] hover:border-[#f87171]/50 transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                            Excluir
                          </button>
                        </div>
                      </div>

                      <div className="text-left sm:text-right">
                        <p className="text-sm text-[#666666] line-through">
                          {formatBRL(item.oldPrice)}
                        </p>
                        <p className="text-xl font-black text-[#f5f5f5]">
                          {formatBRL(item.price)}
                        </p>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <aside className="space-y-4">
              <section className="rounded-2xl border border-[#2e2e2e] bg-[#141414] p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Tag className="w-4 h-4 text-[#49e4e6]" />
                  <h2 className="text-sm font-bold uppercase tracking-wider text-[#f5f5f5]">
                    Cupom de desconto
                  </h2>
                </div>
                <div className="flex gap-2">
                  <Input
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value)}
                    placeholder="Ex: PRIMEIRACOMPRA"
                    className="h-10 rounded-xl border-[#2e2e2e] bg-[#1a1a1a] text-[#f5f5f5] placeholder:text-[#555555] focus-visible:border-[#49e4e6] focus-visible:ring-[#49e4e6]/30"
                  />
                  <Button
                    type="button"
                    onClick={applyCoupon}
                    className="h-10 rounded-xl bg-[#49e4e6] text-[#0f0f0f] font-black hover:bg-[#2fc8cc]"
                  >
                    Aplicar
                  </Button>
                </div>
                {couponMessage && (
                  <p
                    className={`mt-3 text-xs ${
                      appliedCoupon ? 'text-[#49e4e6]' : 'text-[#f87171]'
                    }`}
                  >
                    {couponMessage}
                  </p>
                )}
                <p className="mt-2 text-xs text-[#666666]">
                  Cupom mock disponÃ­vel: <span className="text-[#f5f5f5]">{COUPON_CODE}</span>
                </p>
              </section>

              <section className="rounded-2xl border border-[#2e2e2e] bg-[#141414] p-5">
                <h2 className="text-sm font-bold uppercase tracking-wider text-[#f5f5f5] mb-4">
                  Resumo do pedido
                </h2>

                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between text-[#aaaaaa]">
                    <span>Subtotal</span>
                    <span>{formatBRL(subtotal)}</span>
                  </div>
                  <div className="flex items-center justify-between text-[#aaaaaa]">
                    <span>Desconto</span>
                    <span className={discount > 0 ? 'text-[#49e4e6] font-semibold' : ''}>
                      - {formatBRL(discount)}
                    </span>
                  </div>
                  <div className="border-t border-[#2e2e2e] pt-3 flex items-center justify-between">
                    <span className="text-[#f5f5f5] font-bold">Total</span>
                    <span className="text-2xl font-black text-[#f5f5f5]">
                      {formatBRL(total)}
                    </span>
                  </div>
                </div>

                <div className="mt-5 grid gap-3">
                  <Link
                    href="/"
                    className="inline-flex items-center justify-center rounded-xl border border-[#2e2e2e] bg-[#1a1a1a] px-4 py-3 text-sm font-bold text-[#f5f5f5] hover:border-[#49e4e6] hover:text-[#49e4e6] transition-all"
                  >
                    Continuar comprando
                  </Link>
                  <button
                    type="button"
                    onClick={openCheckout}
                    disabled={items.length === 0}
                    className="inline-flex items-center justify-center rounded-xl bg-[#49e4e6] px-4 py-3 text-sm font-black text-[#0f0f0f] hover:bg-[#2fc8cc] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    Finalizar compra
                  </button>
                </div>
              </section>
            </aside>
          </div>
        </section>
      </main>

      <Footer />

      <Dialog open={authModalOpen} onOpenChange={setAuthModalOpen}>
        <DialogContent className="max-w-md border-[#2e2e2e] bg-[#141414] text-[#f5f5f5]">
          <DialogHeader>
            <DialogTitle className="text-[#f5f5f5] font-black">
              Identifique-se para continuar
            </DialogTitle>
            <DialogDescription className="text-[#888888]">
              Entre com sua conta para continuar o checkout.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {authNotice ? (
              <div className="rounded-xl border border-[#49e4e6]/30 bg-[#49e4e6]/10 px-4 py-3 text-sm text-[#c6ffff]">
                {authNotice}
              </div>
            ) : null}

            {authStep === 'menu' ? (
              <div className="space-y-3">
                <button type="button" onClick={() => setAuthStep('login')} className="w-full h-11 rounded-xl bg-[#49e4e6] text-[#0f0f0f] font-black hover:bg-[#2fc8cc] transition-colors">Entrar com e-mail e senha</button>
                <button type="button" onClick={() => setAuthStep('register')} className="w-full h-11 rounded-xl border border-[#2e2e2e] bg-[#1a1a1a] text-[#f5f5f5] font-bold hover:border-[#49e4e6] hover:text-[#49e4e6] transition-all">Novo cadastro</button>
                <button type="button" onClick={() => setAuthStep('forgot')} className="w-full h-11 rounded-xl border border-[#2e2e2e] bg-[#1a1a1a] text-[#f5f5f5] font-bold hover:border-[#49e4e6] hover:text-[#49e4e6] transition-all">Esqueci minha senha</button>
                <button type="button" onClick={handleGoogleAuth} className="w-full h-11 rounded-xl border border-[#2e2e2e] bg-[#1a1a1a] text-[#f5f5f5] font-bold hover:border-[#49e4e6] hover:text-[#49e4e6] transition-all">continuar com o google</button>
              </div>
            ) : null}

            {authStep === 'login' ? (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div><label className="text-sm text-[#dddddd]">E-mail</label><Input type="email" value={loginData.email} onChange={(e) => setLoginData((p) => ({ ...p, email: e.target.value }))} className="mt-2 h-11 rounded-xl border-[#2e2e2e] bg-[#1a1a1a] text-[#f5f5f5]" /></div>
                <div><label className="text-sm text-[#dddddd]">Senha</label><Input type="password" value={loginData.password} onChange={(e) => setLoginData((p) => ({ ...p, password: e.target.value }))} className="mt-2 h-11 rounded-xl border-[#2e2e2e] bg-[#1a1a1a] text-[#f5f5f5]" /></div>
                <div className="grid grid-cols-2 gap-2">
                  <Button type="button" variant="outline" onClick={() => setAuthStep('menu')} className="border-[#2e2e2e] bg-[#1a1a1a] text-[#f5f5f5] hover:border-[#49e4e6] hover:text-[#49e4e6]">Voltar</Button>
                  <Button type="submit" disabled={authLoading} className="bg-[#49e4e6] text-[#0f0f0f] font-black hover:bg-[#2fc8cc]">{authLoading ? 'Entrando...' : 'OK'}</Button>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <button type="button" onClick={() => setAuthStep('forgot')} className="text-[#49e4e6] hover:text-[#7af2f3]">Esqueci minha senha</button>
                  <button type="button" onClick={() => setAuthStep('register')} className="text-[#49e4e6] hover:text-[#7af2f3]">Novo cadastro</button>
                </div>
                <button type="button" onClick={handleGoogleAuth} className="w-full h-11 rounded-xl border border-[#2e2e2e] bg-[#1a1a1a] text-[#f5f5f5] font-bold hover:border-[#49e4e6] hover:text-[#49e4e6] transition-all">continuar com o google</button>
              </form>
            ) : null}

            {authStep === 'register' ? (
              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                <div><label className="text-sm text-[#dddddd]">E-mail</label><Input type="email" value={registerData.email} onChange={(e) => setRegisterData((p) => ({ ...p, email: e.target.value }))} className="mt-2 h-11 rounded-xl border-[#2e2e2e] bg-[#1a1a1a] text-[#f5f5f5]" /></div>
                <div><label className="text-sm text-[#dddddd]">Nome completo</label><Input value={registerData.fullName} onChange={(e) => setRegisterData((p) => ({ ...p, fullName: e.target.value }))} className="mt-2 h-11 rounded-xl border-[#2e2e2e] bg-[#1a1a1a] text-[#f5f5f5]" /></div>
                <div><label className="text-sm text-[#dddddd]">Senha</label><Input type="password" value={registerData.password} onChange={(e) => setRegisterData((p) => ({ ...p, password: e.target.value }))} className="mt-2 h-11 rounded-xl border-[#2e2e2e] bg-[#1a1a1a] text-[#f5f5f5]" /></div>
                <div className="grid grid-cols-2 gap-2">
                  <Button type="button" variant="outline" onClick={() => setAuthStep('menu')} className="border-[#2e2e2e] bg-[#1a1a1a] text-[#f5f5f5] hover:border-[#49e4e6] hover:text-[#49e4e6]">Voltar</Button>
                  <Button type="submit" disabled={authLoading} className="bg-[#49e4e6] text-[#0f0f0f] font-black hover:bg-[#2fc8cc]">{authLoading ? 'Criando...' : 'Criar conta'}</Button>
                </div>
                <button type="button" onClick={handleGoogleAuth} className="w-full h-11 rounded-xl border border-[#2e2e2e] bg-[#1a1a1a] text-[#f5f5f5] font-bold hover:border-[#49e4e6] hover:text-[#49e4e6] transition-all">continuar com o google</button>
              </form>
            ) : null}

            {authStep === 'forgot' ? (
              <form onSubmit={handleForgotSubmit} className="space-y-4">
                <div><label className="text-sm text-[#dddddd]">E-mail</label><Input type="email" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} className="mt-2 h-11 rounded-xl border-[#2e2e2e] bg-[#1a1a1a] text-[#f5f5f5]" /></div>
                <div className="grid grid-cols-2 gap-2">
                  <Button type="button" variant="outline" onClick={() => setAuthStep('menu')} className="border-[#2e2e2e] bg-[#1a1a1a] text-[#f5f5f5] hover:border-[#49e4e6] hover:text-[#49e4e6]">Voltar</Button>
                  <Button type="submit" disabled={authLoading} className="bg-[#49e4e6] text-[#0f0f0f] font-black hover:bg-[#2fc8cc]">{authLoading ? 'Enviando...' : 'Enviar'}</Button>
                </div>
                <button type="button" onClick={handleGoogleAuth} className="w-full h-11 rounded-xl border border-[#2e2e2e] bg-[#1a1a1a] text-[#f5f5f5] font-bold hover:border-[#49e4e6] hover:text-[#49e4e6] transition-all">continuar com o google</button>
              </form>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}




