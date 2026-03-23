'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Suspense, useEffect, useMemo, useState } from 'react'
import { Check, ChevronDown, ChevronUp, MapPin, Package, QrCode, Truck } from 'lucide-react'
import { useSearchParams } from 'next/navigation'

import Footer from '@/components/footer'
import { apiFetch } from '@/lib/api'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { readCart, subscribeCart, type CartItem, writeCart } from '@/lib/cart-storage'
import { useStore } from '@/lib/store-context'

type ViaCepResponse = {
  cep?: string
  logradouro?: string
  complemento?: string
  bairro?: string
  localidade?: string
  uf?: string
  estado?: string
  ibge?: string
  erro?: boolean
}

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || (typeof window !== 'undefined' ? window.location.protocol + '//' + window.location.hostname + ':8000' : 'http://localhost:8000')
function formatBRL(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatCPF(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  return digits
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1-$2')
}

function isValidCPF(value: string) {
  const cpf = value.replace(/\D/g, '')
  if (cpf.length !== 11) return false
  if (/^(\d)\1{10}$/.test(cpf)) return false

  let sum = 0
  for (let i = 0; i < 9; i++) sum += Number(cpf[i]) * (10 - i)
  let check = (sum * 10) % 11
  if (check === 10) check = 0
  if (check !== Number(cpf[9])) return false

  sum = 0
  for (let i = 0; i < 10; i++) sum += Number(cpf[i]) * (11 - i)
  check = (sum * 10) % 11
  if (check === 10) check = 0
  return check === Number(cpf[10])
}

function formatCardNumber(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 16)
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim()
}

function formatCardExpiry(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 4)
  if (digits.length <= 2) return digits
  return `${digits.slice(0, 2)}/${digits.slice(2)}`
}

function formatCardCvv(value: string) {
  return value.replace(/\D/g, '').slice(0, 4)
}

function maskCardPreview(value: string) {
  const formatted = formatCardNumber(value)
  if (!formatted) return '���� ���� ���� ����'
  const masked = formatted.replace(/\d/g, '�')
  return (masked + ' ���� ���� ���� ����').slice(0, 19)
}

function CollapseSection({ title, icon, open, onToggle, children }: { title: string; icon: React.ReactNode; open: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <section className="border-b border-[#2e2e2e] last:border-b-0 py-4 first:pt-0 last:pb-0">
      <button type="button" onClick={onToggle} className="w-full flex items-center justify-between gap-3 text-left">
        <div className="flex items-center gap-2">{icon}<h2 className="text-[#f5f5f5] font-black text-lg">{title}</h2></div>
        {open ? <ChevronUp className="w-4 h-4 text-[#888888]" /> : <ChevronDown className="w-4 h-4 text-[#888888]" />}
      </button>
      <div className={`grid transition-all duration-300 ease-out ${open ? 'grid-rows-[1fr] opacity-100 mt-4' : 'grid-rows-[0fr] opacity-0 mt-0'}`}>
        <div className="overflow-hidden">
          {children}
        </div>
      </div>
    </section>
  )
}

function CheckoutContent() {
  const searchParams = useSearchParams()
  const { storeName, logoUrl } = useStore()
  const metodo = searchParams.get('metodo') || 'email'

  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [cep, setCep] = useState('')
  const [cepError, setCepError] = useState('')
  const [cepLoading, setCepLoading] = useState(false)
  const [shippingLoaded, setShippingLoaded] = useState(false)
  const [checkoutSubmitting, setCheckoutSubmitting] = useState(false)
  const [checkoutSubmitError, setCheckoutSubmitError] = useState('')
  const [checkoutProtocol, setCheckoutProtocol] = useState('')
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [activeCheckoutStep, setActiveCheckoutStep] = useState<'identity' | 'shipping' | 'payment'>('identity')
  const [stepCompleted, setStepCompleted] = useState({ identity: false, shipping: false })
  const [authStep, setAuthStep] = useState<'menu' | 'login' | 'register' | 'forgot'>('menu')

  const [loginData, setLoginData] = useState({ email: metodo === 'google' ? 'luan640@gmail.com' : 'meu@email.com.br', password: '' })
  const [registerData, setRegisterData] = useState({ email: '', fullName: '', password: '' })
  const [forgotEmail, setForgotEmail] = useState('')
  const [authNotice, setAuthNotice] = useState('')
  const [formData, setFormData] = useState({
    email: metodo === 'google' ? 'luan640@gmail.com' : '',
    fullName: metodo === 'google' ? 'Luan Araujo' : '',
    cpf: '', birthDate: '', mobilePhone: '', landlinePhone: ''
  })
  const [addressData, setAddressData] = useState({
    street: 'Rua Adilson Rosa de Oliveira', number: '', complement: '', reference: '', district: 'Jardim São Januário', city: 'São Paulo', state: 'São Paulo', country: 'BRA'
  })
  const [cardData, setCardData] = useState({ number: '', expiry: '', holderName: '', cvv: '', installments: '10' })

  useEffect(() => {
    const sync = () => setCartItems(readCart())
    sync()
    return subscribeCart(sync)
  }, [])

  useEffect(() => {
    let mounted = true
    const loadCustomerAddress = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/clientes/me/`, {
          method: 'GET',
          credentials: 'include',
        })
        if (!res.ok) {
          return
        }
        const data = await res.json().catch(() => null)
        if (!mounted || !data?.authenticated || !data?.user) return

        const user = data.user
        const postal = String(user.address_postal_code || '').trim()
        const street = String(user.address_street || '').trim()
        const district = String(user.address_district || '').trim()
        const city = String(user.address_city || '').trim()
        const state = String(user.address_state || '').trim()
        const number = String(user.address_number || '').trim()

        // Pré-preenche dados de identidade com os dados do usuário autenticado
        setFormData((prev) => ({
          ...prev,
          email: String(user.email || prev.email || '').trim(),
          fullName: String(user.full_name || prev.fullName || '').trim(),
          mobilePhone: String(user.phone || prev.mobilePhone || '').trim(),
          cpf: String(user.cpf || prev.cpf || '').trim(),
          birthDate: String(user.birth_date || prev.birthDate || '').trim(),
        }))

        if (postal) setCep(postal)
        setAddressData((prev) => ({
          ...prev,
          street: street || prev.street,
          number: number || prev.number,
          complement: String(user.address_complement || ''),
          reference: String(user.address_reference || ''),
          district: district || prev.district,
          city: city || prev.city,
          state: state || prev.state,
          country: String(user.address_country || prev.country || 'BRA'),
        }))
        if (postal && street && district && city && state) {
          setShippingLoaded(true)
        }
      } catch {}
    }

    loadCustomerAddress()
    return () => {
      mounted = false
    }
  }, [])

  const subtotal = useMemo(() => cartItems.reduce((a, i) => a + i.price * i.quantity, 0), [cartItems])
  const pixSubtotal = useMemo(() => cartItems.reduce((a, i) => a + i.pixPrice * i.quantity, 0), [cartItems])
  const couponCode = 'PRIMEIRACOMPRA'
  const couponDiscount = subtotal * 0.1
  const total = Math.max(subtotal - couponDiscount, 0)
  const pixTotal = Math.max(pixSubtotal - pixSubtotal * 0.1, 0)
  const cardInstallments = useMemo(
    () =>
      Array.from({ length: 10 }, (_, index) => {
        const installments = index + 1
        const feeRate = installments === 1 ? 0.0199 : 0.0299
        const feeFixed = 0.49
        const cardTotal = total * (1 + feeRate) + feeFixed
        return {
          installments,
          installmentAmount: cardTotal / installments,
        }
      }),
    [total]
  )

  const cpfFilled = formData.cpf.replace(/\D/g, '').length > 0
  const cpfValid = isValidCPF(formData.cpf)
  const identificationComplete = [formData.email, formData.fullName, formData.birthDate, formData.mobilePhone].every((v) => v.trim() !== '') && cpfValid
  const shippingComplete = cep.replace(/\D/g, '').length >= 8 && shippingLoaded && [addressData.street, addressData.number, addressData.district, addressData.city, addressData.state, addressData.country].every((v) => v.trim() !== '')
  const canFinalizePurchase = cartItems.length > 0 && shippingComplete

  useEffect(() => {
    setStepCompleted((prev) => ({
      identity: identificationComplete ? prev.identity : false,
      shipping: shippingComplete ? prev.shipping : false,
    }))
  }, [identificationComplete, shippingComplete])

  const finalizeMissingMessages = useMemo(() => {
    if (canFinalizePurchase) return []
    const missing: string[] = []
    if (cartItems.length === 0) missing.push('Adicione ao menos um item no carrinho')
    if (!shippingComplete) missing.push('Preencha CEP e confirme o endereço')
    return missing
  }, [canFinalizePurchase, cartItems.length, shippingComplete])

  function canOpenStep(step: 'identity' | 'shipping' | 'payment') {
    if (step === 'identity') return true
    if (step === 'shipping') return stepCompleted.identity || identificationComplete
    return (stepCompleted.identity || identificationComplete) && (stepCompleted.shipping || shippingComplete)
  }
  function toggleSection(key: 'identity' | 'shipping' | 'payment') {
    if (!canOpenStep(key)) return
    setActiveCheckoutStep(key)
  }
  function goToCheckoutStep(step: 'identity' | 'shipping' | 'payment') { setActiveCheckoutStep(step) }
  function handleIdentityContinue() {
    if (!identificationComplete) return
    setStepCompleted((p) => ({ ...p, identity: true }))
    goToCheckoutStep('shipping')
  }
  function handleShippingContinue() {
    if (!shippingComplete) return
    setStepCompleted((p) => ({ ...p, shipping: true }))
    goToCheckoutStep('payment')
  }
  async function handleCepSearch() {
    const cepDigits = cep.replace(/\D/g, '')
    setCepError('')
    setShippingLoaded(false)

    if (cepDigits.length !== 8) {
      setCepError('CEP invalido')
      return
    }

    setCepLoading(true)
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cepDigits}/json/`)
      const data: ViaCepResponse = await res.json()

      if (!res.ok || data?.erro) {
        setCepError('CEP invalido')
        return
      }

      setAddressData((p) => ({
        ...p,
        street: data.logradouro || p.street,
        complement: '',
        district: data.bairro || p.district,
        city: data.localidade || p.city,
        state: data.estado || data.uf || p.state,
        country: 'BRA',
      }))
      if (data.cep) setCep(data.cep)
      setShippingLoaded(true)
    } catch {
      setCepError('Nao foi possivel buscar o CEP')
    } finally {
      setCepLoading(false)
    }
  }
  function handleGoogleAuth() {
    const url = `${BACKEND_URL}/auth/login/google-oauth2/`
    window.location.href = url
  }
  function openAuthWizard() { setAuthNotice(''); setAuthStep('menu'); setAuthModalOpen(true) }
  async function handleLoginSubmit() {
    if (!loginData.email.trim() || !loginData.password.trim()) {
      setAuthNotice('Preencha e-mail e senha.')
      return
    }
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
      setFormData((p) => ({
        ...p,
        email: data?.user?.email || loginData.email.trim(),
        fullName: data?.user?.full_name || p.fullName,
      }))
      setAuthModalOpen(false)
      setAuthStep('menu')
      setAuthNotice('Login realizado. Continue o checkout.')
    } catch {
      setAuthNotice('Erro de conexão com o servidor.')
    }
  }
  async function handleRegisterSubmit() {
    if (!registerData.email.trim() || !registerData.fullName.trim() || !registerData.password.trim()) {
      setAuthNotice('Preencha e-mail, nome e senha.')
      return
    }
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
        setAuthNotice(data?.email?.[0] || data?.full_name?.[0] || data?.password?.[0] || data?.detail || 'Falha ao criar conta.')
        return
      }
      setFormData((p) => ({
        ...p,
        email: data?.user?.email || registerData.email.trim(),
        fullName: data?.user?.full_name || registerData.fullName.trim(),
      }))
      setLoginData((p) => ({ ...p, email: registerData.email.trim(), password: registerData.password }))
      setAuthModalOpen(false)
      setAuthStep('menu')
      setAuthNotice('Conta criada com sucesso. Continue o checkout.')
    } catch {
      setAuthNotice('Erro de conexão com o servidor.')
    }
  }
  async function handleForgotSubmit() {
    if (!forgotEmail.trim()) {
      setAuthNotice('Informe o e-mail.')
      return
    }
    setAuthNotice('')
    try {
      const res = await fetch(`${BACKEND_URL}/api/clientes/forgot-password/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: forgotEmail.trim() }),
      })
      const data = await res.json().catch(() => ({}))
      setAuthNotice(data?.message || 'Solicitação enviada.')
      if (res.ok) setAuthStep('menu')
    } catch {
      setAuthNotice('Erro de conexão com o servidor.')
    }
  }
  async function handleFinalizeCheckout() {
    if (!canFinalizePurchase || checkoutSubmitting) return

    setCheckoutSubmitError('')
    setCheckoutProtocol('')
    setCheckoutSubmitting(true)
    try {
      const saleRes = await apiFetch(`${BACKEND_URL}/api/checkout/create-sale/`, {
        method: 'POST',
        body: JSON.stringify({
          coupon_code: couponCode,
          discount_amount: couponDiscount.toFixed(2),
          total_amount: total.toFixed(2),
          customer: {
            name: formData.fullName || '',
            email: formData.email || '',
            phone: formData.mobilePhone || formData.landlinePhone || '',
            city: addressData.city || '',
            state: addressData.state || '',
          },
          items: cartItems.map((item) => ({
            product_id: item.productId,
            name: item.name,
            platform: item.platform,
            quantity: item.quantity,
            unit_price: item.price.toFixed(2),
            total_price: (item.price * item.quantity).toFixed(2),
          })),
        }),
      })
      const saleData = await saleRes.json().catch(() => ({}))
      if (!saleRes.ok) {
        setCheckoutSubmitError(saleData?.detail || 'Nao foi possivel registrar a venda.')
        return
      }

      writeCart([])
      setCartItems([])
      setCheckoutProtocol(String(saleData?.protocol || ''))
    } catch {
      setCheckoutSubmitError('Nao foi possivel concluir o pedido.')
    } finally {
      setCheckoutSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f]">
      <main>
        <section className="relative overflow-hidden border-b border-[#2e2e2e] bg-gradient-to-b from-[#131a3a] to-[#0f0f0f]">
          <div className="mx-auto flex max-w-screen-xl flex-col items-center justify-center px-4 py-10 text-center">
            <Image src={logoUrl || '/logo2.png'} alt={storeName} width={120} height={120} className="h-24 w-24 rounded-full border border-[#49e4e6]/30 object-cover shadow-[0_0_30px_rgba(73,228,230,0.15)]" />
            <h1 className="mt-4 text-3xl font-black text-[#f5f5f5] sm:text-4xl">{storeName}</h1>
            <p className="mt-2 text-sm text-[#b8c0d4]">Checkout seguro</p>
          </div>
        </section>
        <section className="max-w-screen-xl mx-auto px-4 py-10">
          <div className="mb-6">
            <h1 className="text-3xl font-black text-[#f5f5f5]">Checkout</h1>
            <p className="text-sm text-[#888888] mt-1">Finalize seu pedido {metodo === 'google' ? 'com Google' : ''}.</p>
          </div>

          <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <aside>
              <section className="rounded-2xl border border-[#2e2e2e] bg-[#141414] p-5">
                <div className="flex items-center gap-2 mb-4"><Package className="w-4 h-4 text-[#49e4e6]" /><h2 className="text-[#f5f5f5] font-black">Resumo do pedido</h2></div>
                <div className="space-y-3 max-h-[260px] overflow-auto pr-1">
                  {cartItems.length === 0 ? <p className="text-sm text-[#888888]">Seu carrinho está vazio.</p> : cartItems.map((item) => (
                    <div key={item.productId} className="rounded-xl border border-[#2e2e2e] bg-[#1a1a1a] p-3">
                      <p className="text-sm font-bold text-[#f5f5f5] leading-snug">{item.name}</p>
                      <p className="text-xs text-[#666666] mt-0.5">{item.platform} - Quantidade: {item.quantity}</p>
                      <p className="text-sm text-[#49e4e6] font-bold mt-2">{formatBRL(item.price * item.quantity)}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-5 space-y-2.5 text-sm">
                  <div className="flex justify-between text-[#aaaaaa]"><span>Subtotal</span><span>{formatBRL(subtotal)}</span></div>
                  <div className="flex justify-between text-[#aaaaaa]"><span>Cupom ativo</span><span className="text-[#49e4e6] font-semibold">{couponCode}</span></div>
                  <div className="flex justify-between text-[#aaaaaa]"><span>Total de desconto</span><span className="text-[#49e4e6]">- {formatBRL(couponDiscount)}</span></div>
                  <div className="border-t border-[#2e2e2e] pt-3 flex justify-between items-center"><span className="text-[#f5f5f5] font-bold">Total</span><span className="text-[#f5f5f5] text-2xl font-black">{formatBRL(total)}</span></div>
                  <div className="rounded-xl border border-[#166534]/40 bg-[#166534]/10 p-3">
                    <div className="flex items-center gap-2 text-[#22c55e] font-bold">
                      <QrCode className="w-4 h-4" />
                      Valor no Pix: {formatBRL(pixTotal)}
                    </div>
                    <div className="mt-2 overflow-hidden rounded-lg border border-[#2e2e2e]">
                      <table className="w-full text-xs">
                        <thead className="bg-[#1a1a1a] text-[#d4d4d4]">
                          <tr>
                            <th className="px-2 py-1.5 text-left font-semibold">Parcela</th>
                            <th className="px-2 py-1.5 text-right font-semibold">Valor</th>
                          </tr>
                        </thead>
                        <tbody>
                          {cardInstallments.map((row) => (
                            <tr key={row.installments} className="border-t border-[#2e2e2e] text-[#aaaaaa]">
                              <td className="px-2 py-1.5">{row.installments}x</td>
                              <td className="px-2 py-1.5 text-right">{formatBRL(row.installmentAmount)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
                <div className="mt-5"><Link href="/carrinho" className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-[#2e2e2e] bg-[#1a1a1a] text-sm font-bold text-[#f5f5f5] hover:border-[#49e4e6] hover:text-[#49e4e6] transition-all">Voltar ao carrinho</Link></div>
              </section>
            </aside>

            <div>
              <section className="rounded-2xl border border-[#2e2e2e] bg-[#141414] p-5">
                <div className="space-y-4">
                  <div className="rounded-xl border border-[#2e2e2e] bg-[#1a1a1a] p-4 space-y-4">
                    <div className="flex items-center gap-2">
                      <Truck className="w-4 h-4 text-[#49e4e6]" />
                      <h2 className="text-[#f5f5f5] font-black text-lg">Entrega</h2>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                      <div>
                        <label className="text-sm text-[#dddddd]">CEP</label>
                        <Input
                          value={cep}
                          onChange={(e) => setCep(e.target.value)}
                          placeholder="00000-000"
                          className="mt-2 h-11 rounded-xl border-[#2e2e2e] bg-[#141414] text-[#f5f5f5]"
                        />
                      </div>
                      <Button
                        type="button"
                        onClick={handleCepSearch}
                        disabled={cepLoading}
                        className="h-11 rounded-xl bg-[#49e4e6] px-5 text-[#0f0f0f] font-black hover:bg-[#2fc8cc] disabled:opacity-50"
                      >
                        {cepLoading ? 'Buscando...' : 'Buscar CEP'}
                      </Button>
                    </div>

                    {cepError ? <p className="text-xs text-[#fca5a5]">{cepError}</p> : null}

                    <div className="space-y-3 border-t border-[#2e2e2e] pt-4">
                      <p className="text-sm font-bold text-[#f5f5f5]">Confirmação dos dados residenciais</p>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="sm:col-span-2">
                          <label className="text-xs text-[#bdbdbd]">Endereço</label>
                          <Input value={addressData.street} disabled className="mt-1 h-10 rounded-xl border-[#2e2e2e] bg-[#202020] text-[#f5f5f5]" />
                        </div>
                        <div>
                          <label className="text-xs text-[#bdbdbd]">Número <span className="text-[#f87171]">*</span></label>
                          <Input value={addressData.number} onChange={(e) => setAddressData((p) => ({ ...p, number: e.target.value }))} className="mt-1 h-10 rounded-xl border-[#2e2e2e] bg-[#141414] text-[#f5f5f5]" />
                        </div>
                        <div>
                          <label className="text-xs text-[#bdbdbd]">Complemento</label>
                          <Input value={addressData.complement} onChange={(e) => setAddressData((p) => ({ ...p, complement: e.target.value }))} className="mt-1 h-10 rounded-xl border-[#2e2e2e] bg-[#141414] text-[#f5f5f5]" />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="text-xs text-[#bdbdbd]">Referência</label>
                          <Input value={addressData.reference} onChange={(e) => setAddressData((p) => ({ ...p, reference: e.target.value }))} className="mt-1 h-10 rounded-xl border-[#2e2e2e] bg-[#141414] text-[#f5f5f5]" />
                        </div>
                        <div>
                          <label className="text-xs text-[#bdbdbd]">Bairro</label>
                          <Input value={addressData.district} disabled className="mt-1 h-10 rounded-xl border-[#2e2e2e] bg-[#202020] text-[#f5f5f5]" />
                        </div>
                        <div>
                          <label className="text-xs text-[#bdbdbd]">Cidade</label>
                          <Input value={addressData.city} disabled className="mt-1 h-10 rounded-xl border-[#2e2e2e] bg-[#202020] text-[#f5f5f5]" />
                        </div>
                        <div>
                          <label className="text-xs text-[#bdbdbd]">Estado</label>
                          <Input value={addressData.state} disabled className="mt-1 h-10 rounded-xl border-[#2e2e2e] bg-[#202020] text-[#f5f5f5]" />
                        </div>
                        <div>
                          <label className="text-xs text-[#bdbdbd]">País</label>
                          <Input value={addressData.country} disabled className="mt-1 h-10 rounded-xl border-[#2e2e2e] bg-[#202020] text-[#f5f5f5]" />
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-[#2e2e2e] pt-4">
                      {checkoutProtocol ? (
                        <div className="mb-3 rounded-xl border border-[#22c55e]/30 bg-[#22c55e]/10 px-3 py-3 text-sm text-[#bbf7d0]">
                          Pedido registrado com sucesso. {`Protocolo: ${checkoutProtocol}`}
                        </div>
                      ) : null}
                      <Button
                        onClick={handleFinalizeCheckout}
                        disabled={!canFinalizePurchase || checkoutSubmitting}
                        className="w-full h-11 rounded-xl bg-[#49e4e6] text-[#0f0f0f] font-black hover:bg-[#2fc8cc] disabled:opacity-50"
                      >
                        {checkoutSubmitting ? 'Finalizando pedido...' : 'Finalizar pedido'}
                      </Button>
                      {checkoutSubmitError ? (
                        <div className="mt-3 rounded-xl border border-[#f87171]/30 bg-[#f87171]/10 px-3 py-2 text-xs text-[#fecaca]">
                          {checkoutSubmitError}
                        </div>
                      ) : null}
                      {!canFinalizePurchase && finalizeMissingMessages.length > 0 ? (
                        <div className="mt-3 rounded-xl border border-[#f87171]/30 bg-[#f87171]/10 px-3 py-2 text-xs text-[#fecaca]">
                          {finalizeMissingMessages.join(' | ')} 
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </section>
      </main>
      <Footer />

      <Dialog open={authModalOpen} onOpenChange={setAuthModalOpen}>
        <DialogContent className="max-w-md border-[#2e2e2e] bg-[#141414] text-[#f5f5f5]">
          <DialogHeader>
            <DialogTitle className="font-black text-[#f5f5f5]">Identifique-se para continuar</DialogTitle>
            <DialogDescription className="text-[#888888]">Entre com sua conta para continuar o checkout.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {authNotice ? <div className="rounded-xl border border-[#49e4e6]/30 bg-[#49e4e6]/10 px-4 py-3 text-sm text-[#c6ffff]">{authNotice}</div> : null}

            {authStep === 'menu' ? (
              <div className="space-y-3">
                <button type="button" onClick={() => setAuthStep('login')} className="w-full h-11 rounded-xl bg-[#49e4e6] text-[#0f0f0f] font-black hover:bg-[#2fc8cc] transition-colors">
                  Entrar com e-mail e senha
                </button>
                <button type="button" onClick={() => setAuthStep('register')} className="w-full h-11 rounded-xl border border-[#2e2e2e] bg-[#1a1a1a] text-[#f5f5f5] font-bold hover:border-[#49e4e6] hover:text-[#49e4e6] transition-all">
                  Novo cadastro
                </button>
                <button type="button" onClick={() => setAuthStep('forgot')} className="w-full h-11 rounded-xl border border-[#2e2e2e] bg-[#1a1a1a] text-[#f5f5f5] font-bold hover:border-[#49e4e6] hover:text-[#49e4e6] transition-all">
                  Esqueci minha senha
                </button>
                <button type="button" onClick={handleGoogleAuth} className="w-full h-11 rounded-xl border border-[#2e2e2e] bg-[#1a1a1a] text-[#f5f5f5] font-bold hover:border-[#49e4e6] hover:text-[#49e4e6] transition-all">
                  continuar com o google
                </button>
              </div>
            ) : null}

            {authStep === 'login' ? (
              <div className="space-y-4">
                <div><label className="text-sm text-[#dddddd]">E-mail</label><Input type="email" value={loginData.email} onChange={(e) => setLoginData((p) => ({ ...p, email: e.target.value }))} className="mt-2 h-11 rounded-xl border-[#2e2e2e] bg-[#1a1a1a] text-[#f5f5f5]" /></div>
                <div><label className="text-sm text-[#dddddd]">Senha</label><Input type="password" value={loginData.password} onChange={(e) => setLoginData((p) => ({ ...p, password: e.target.value }))} className="mt-2 h-11 rounded-xl border-[#2e2e2e] bg-[#1a1a1a] text-[#f5f5f5]" /></div>
                <div className="grid grid-cols-2 gap-2">
                  <Button type="button" variant="outline" onClick={() => setAuthStep('menu')} className="border-[#2e2e2e] bg-[#1a1a1a] text-[#f5f5f5] hover:border-[#49e4e6] hover:text-[#49e4e6]">Voltar</Button>
                  <Button type="button" onClick={handleLoginSubmit} className="bg-[#49e4e6] text-[#0f0f0f] font-black hover:bg-[#2fc8cc]">OK</Button>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <button type="button" onClick={() => setAuthStep('forgot')} className="text-[#49e4e6] hover:text-[#7af2f3]">Esqueci minha senha</button>
                  <button type="button" onClick={() => setAuthStep('register')} className="text-[#49e4e6] hover:text-[#7af2f3]">Novo cadastro</button>
                </div>
                <button type="button" onClick={handleGoogleAuth} className="w-full h-11 rounded-xl border border-[#2e2e2e] bg-[#1a1a1a] text-[#f5f5f5] font-bold hover:border-[#49e4e6] hover:text-[#49e4e6] transition-all">continuar com o google</button>
              </div>
            ) : null}

            {authStep === 'register' ? (
              <div className="space-y-4">
                <div><label className="text-sm text-[#dddddd]">E-mail</label><Input type="email" value={registerData.email} onChange={(e) => setRegisterData((p) => ({ ...p, email: e.target.value }))} className="mt-2 h-11 rounded-xl border-[#2e2e2e] bg-[#1a1a1a] text-[#f5f5f5]" /></div>
                <div><label className="text-sm text-[#dddddd]">Nome completo</label><Input value={registerData.fullName} onChange={(e) => setRegisterData((p) => ({ ...p, fullName: e.target.value }))} className="mt-2 h-11 rounded-xl border-[#2e2e2e] bg-[#1a1a1a] text-[#f5f5f5]" /></div>
                <div><label className="text-sm text-[#dddddd]">Senha</label><Input type="password" value={registerData.password} onChange={(e) => setRegisterData((p) => ({ ...p, password: e.target.value }))} className="mt-2 h-11 rounded-xl border-[#2e2e2e] bg-[#1a1a1a] text-[#f5f5f5]" /></div>
                <div className="grid grid-cols-2 gap-2">
                  <Button type="button" variant="outline" onClick={() => setAuthStep('menu')} className="border-[#2e2e2e] bg-[#1a1a1a] text-[#f5f5f5] hover:border-[#49e4e6] hover:text-[#49e4e6]">Voltar</Button>
                  <Button type="button" onClick={handleRegisterSubmit} className="bg-[#49e4e6] text-[#0f0f0f] font-black hover:bg-[#2fc8cc]">Criar conta</Button>
                </div>
                <button type="button" onClick={handleGoogleAuth} className="w-full h-11 rounded-xl border border-[#2e2e2e] bg-[#1a1a1a] text-[#f5f5f5] font-bold hover:border-[#49e4e6] hover:text-[#49e4e6] transition-all">continuar com o google</button>
              </div>
            ) : null}

            {authStep === 'forgot' ? (
              <div className="space-y-4">
                <div><label className="text-sm text-[#dddddd]">E-mail</label><Input type="email" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} className="mt-2 h-11 rounded-xl border-[#2e2e2e] bg-[#1a1a1a] text-[#f5f5f5]" /></div>
                <div className="grid grid-cols-2 gap-2">
                  <Button type="button" variant="outline" onClick={() => setAuthStep('menu')} className="border-[#2e2e2e] bg-[#1a1a1a] text-[#f5f5f5] hover:border-[#49e4e6] hover:text-[#49e4e6]">Voltar</Button>
                  <Button type="button" onClick={handleForgotSubmit} className="bg-[#49e4e6] text-[#0f0f0f] font-black hover:bg-[#2fc8cc]">Enviar</Button>
                </div>
                <button type="button" onClick={handleGoogleAuth} className="w-full h-11 rounded-xl border border-[#2e2e2e] bg-[#1a1a1a] text-[#f5f5f5] font-bold hover:border-[#49e4e6] hover:text-[#49e4e6] transition-all">continuar com o google</button>
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense>
      <CheckoutContent />
    </Suspense>
  )
}
