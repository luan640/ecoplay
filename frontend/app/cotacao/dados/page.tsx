'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useStore } from '@/lib/store-context'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || (typeof window !== 'undefined' ? window.location.protocol + '//' + window.location.hostname + ':8000' : 'http://localhost:8000')

type IbgeCityApiItem = {
  nome: string
  microrregiao?: {
    mesorregiao?: {
      UF?: {
        sigla?: string
      }
    }
  }
  'regiao-imediata'?: {
    'regiao-intermediaria'?: {
      UF?: {
        sigla?: string
      }
    }
  }
}

type CityOption = {
  label: string
}

type QuoteProductOption = {
  external_id: number
  name: string
  sku: string
  image_url: string
}

type QuoteBasketItem = {
  id: string
  mode: 'catalog' | 'manual'
  external_id?: number
  name: string
  sku?: string
  image_url?: string
  quantity: number
  qualityLevel?: string
  qualityLabel?: string
  comment?: string
  photos: File[]
}

type QuoteSubmitResponse = {
  protocol: string
  items_count: number
}

const qualityOptions = [
  { value: '16199', label: 'Produto funcionando em sua embalagem original' },
  {
    value: '16200',
    label: 'Produto funcionando sem capa ou com capa paralela, de papelão, etc',
  },
  { value: '16201', label: 'Produto funcionando, mas europeu' },
  { value: '16202', label: 'Produto funcionando, mas japonês' },
  { value: '16203', label: 'Produto novo, lacrado' },
  { value: '16204', label: 'Produto não funciona' },
  { value: '16205', label: 'Outro, especifique nos comentários' },
]

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 2) return `(${digits}`
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
}

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

export default function CotacaoDadosPage() {
  const { storeName } = useStore()
  const router = useRouter()
  const [phase, setPhase] = useState<1 | 2 | 3>(1)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [city, setCity] = useState('')
  const [source, setSource] = useState('')
  const [productToSell, setProductToSell] = useState('')
  const [selectedProduct, setSelectedProduct] = useState<QuoteProductOption | null>(null)
  const [phase2Step, setPhase2Step] = useState<'search' | 'details'>('search')
  const [qualityLevel, setQualityLevel] = useState('')
  const [selectedProductComment, setSelectedProductComment] = useState('')
  const [selectedProductPhotos, setSelectedProductPhotos] = useState<File[]>([])
  const [manualProductMode, setManualProductMode] = useState(false)
  const [manualProductName, setManualProductName] = useState('')
  const [manualQuantity, setManualQuantity] = useState('1')
  const [manualComment, setManualComment] = useState('')
  const [manualPhotos, setManualPhotos] = useState<File[]>([])
  const [productOptions, setProductOptions] = useState<QuoteProductOption[]>([])
  const [productLoading, setProductLoading] = useState(false)
  const [productError, setProductError] = useState('')
  const [showProductOptions, setShowProductOptions] = useState(false)
  const [allCities, setAllCities] = useState<CityOption[] | null>(null)
  const [cityOptions, setCityOptions] = useState<CityOption[]>([])
  const [cityLoading, setCityLoading] = useState(false)
  const [cityError, setCityError] = useState('')
  const [showCityOptions, setShowCityOptions] = useState(false)
  const photoInputRef = useRef<HTMLInputElement | null>(null)
  const [quoteBasket, setQuoteBasket] = useState<QuoteBasketItem[]>([])
  const [finalizeLoading, setFinalizeLoading] = useState(false)
  const [finalizeError, setFinalizeError] = useState('')
  const [quoteSubmitted, setQuoteSubmitted] = useState<QuoteSubmitResponse | null>(null)

  function appendFiles(current: File[], incoming: File[]) {
    const next = [...current]
    for (const file of incoming) {
      const exists = next.some(
        (item) =>
          item.name === file.name &&
          item.size === file.size &&
          item.lastModified === file.lastModified
      )
      if (!exists) next.push(file)
    }
    return next
  }

  function removeFileAtIndex(files: File[], index: number) {
    return files.filter((_, idx) => idx !== index)
  }

  function updateBasketItemQuantity(itemId: string, quantity: number) {
    const safeQty = Number.isFinite(quantity) ? Math.max(1, Math.floor(quantity)) : 1
    setQuoteBasket((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, quantity: safeQty } : item))
    )
  }

  function resetPhase2Draft() {
    setManualProductMode(false)
    setPhase2Step('search')
    setSelectedProduct(null)
    setProductToSell('')
    setQualityLevel('')
    setSelectedProductComment('')
    setSelectedProductPhotos([])
    setManualProductName('')
    setManualQuantity('1')
    setManualComment('')
    setManualPhotos([])
  }

  function addCurrentProductToBasket() {
    if (manualProductMode) {
      const qty = Number(manualQuantity)
      if (
        manualProductName.trim() === '' ||
        Number.isNaN(qty) ||
        !Number.isFinite(qty) ||
        qty < 1
      ) {
        return false
      }

      const item: QuoteBasketItem = {
        id: `manual-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        mode: 'manual',
        name: manualProductName.trim(),
        quantity: qty,
        comment: manualComment.trim(),
        photos: manualPhotos,
      }
      setQuoteBasket((prev) => [...prev, item])
      return true
    }

    if (phase2Step !== 'details' || !selectedProduct || !qualityLevel.trim()) {
      return false
    }

    const qualityLabel =
      qualityOptions.find((option) => option.value === qualityLevel)?.label || ''

    const item: QuoteBasketItem = {
      id: `catalog-${selectedProduct.external_id}-${Date.now()}`,
      mode: 'catalog',
      external_id: selectedProduct.external_id,
      name: selectedProduct.name,
      sku: selectedProduct.sku,
      image_url: selectedProduct.image_url,
      quantity: 1,
      qualityLevel,
      qualityLabel,
      comment: selectedProductComment.trim(),
      photos: selectedProductPhotos,
    }
    setQuoteBasket((prev) => [...prev, item])
    return true
  }

  async function submitQuoteRequest() {
    if (quoteBasket.length === 0) return
    setFinalizeLoading(true)
    setFinalizeError('')
    try {
      const formData = new FormData()
      formData.append('full_name', fullName.trim())
      formData.append('email', email.trim())
      formData.append('phone', phone.trim())
      formData.append('city', city.trim())
      formData.append('source', source.trim())

      const basketPayload = quoteBasket.map((item) => ({
        id: item.id,
        mode: item.mode,
        external_id: item.external_id ?? null,
        name: item.name,
        sku: item.sku || '',
        quantity: item.quantity,
        qualityLevel: item.qualityLevel || '',
        qualityLabel: item.qualityLabel || '',
        comment: item.comment || '',
      }))
      formData.append('basket', JSON.stringify(basketPayload))

      for (const item of quoteBasket) {
        for (const file of item.photos) {
          formData.append(`photos__${item.id}`, file)
        }
      }

      const res = await fetch(`${BACKEND_URL}/api/cotacoes/submit/`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setFinalizeError(data?.detail || 'Falha ao enviar cotacao.')
        return
      }

      setQuoteSubmitted({
        protocol: String(data?.protocol || ''),
        items_count: Number(data?.items_count || quoteBasket.length),
      })
    } catch {
      setFinalizeError('Erro de conexao ao finalizar cotacao.')
    } finally {
      setFinalizeLoading(false)
    }
  }

  const canContinue = useMemo(
    () =>
      fullName.trim() !== '' &&
      email.trim() !== '' &&
      phone.replace(/\D/g, '').length >= 10 &&
      city.trim() !== '' &&
      source.trim() !== '',
    [fullName, email, phone, city, source]
  )

  async function loadIbgeCities() {
    if (allCities) return allCities
    setCityLoading(true)
    setCityError('')
    try {
      const res = await fetch(
        'https://servicodados.ibge.gov.br/api/v1/localidades/municipios'
      )
      if (!res.ok) {
        setCityError('Nao foi possivel carregar cidades agora.')
        return null
      }
      const data = (await res.json()) as IbgeCityApiItem[]
      const mapped = data
        .map((item) => {
          const uf =
            item['regiao-imediata']?.['regiao-intermediaria']?.UF?.sigla ||
            item.microrregiao?.mesorregiao?.UF?.sigla ||
            ''
          return {
            label: uf ? `${item.nome} - ${uf}` : item.nome,
          }
        })
        .filter((item) => item.label.trim() !== '')
      setAllCities(mapped)
      return mapped
    } catch {
      setCityError('Erro ao buscar cidades do IBGE.')
      return null
    } finally {
      setCityLoading(false)
    }
  }

  async function handleCityChange(value: string) {
    setCity(value)
    setCityError('')
    const query = value.trim()
    if (query.length < 3) {
      setCityOptions([])
      setShowCityOptions(false)
      return
    }

    const sourceCities = (await loadIbgeCities()) ?? []
    const normalizedQuery = normalizeText(query)
    const filtered = sourceCities
      .filter((item) => normalizeText(item.label).includes(normalizedQuery))
      .slice(0, 8)
    setCityOptions(filtered)
    setShowCityOptions(true)
  }

  function handleSelectCity(option: CityOption) {
    setCity(option.label)
    setShowCityOptions(false)
  }

  useEffect(() => {
    if (phase !== 2) return
    if (manualProductMode) return
    const query = productToSell.trim()
    if (query.length < 2) {
      setProductOptions([])
      setShowProductOptions(false)
      setProductError('')
      setProductLoading(false)
      return
    }

    const controller = new AbortController()
    const timeout = window.setTimeout(async () => {
      setProductLoading(true)
      setProductError('')
      try {
        const res = await fetch(
          `${BACKEND_URL}/api/cotacao/produtos/?q=${encodeURIComponent(query)}&limit=50`,
          { signal: controller.signal, credentials: 'include' }
        )
        if (!res.ok) {
          setProductError('Falha ao buscar produtos.')
          return
        }
        const data = await res.json().catch(() => ({ results: [] }))
        const results = Array.isArray(data?.results) ? data.results : []
        setProductOptions(results)
        setShowProductOptions(true)
      } catch (error) {
        if ((error as Error).name === 'AbortError') return
        setProductError('Erro ao buscar produtos.')
      } finally {
        setProductLoading(false)
      }
    }, 250)

    return () => {
      controller.abort()
      window.clearTimeout(timeout)
    }
  }, [productToSell, phase, manualProductMode, phase2Step])

  function handleSelectProduct(option: QuoteProductOption) {
    setProductToSell(option.name)
    setSelectedProduct(option)
    setShowProductOptions(false)
  }

  function openManualProductForm() {
    setManualProductMode(true)
    setPhase2Step('search')
    setShowProductOptions(false)
    setProductError('')
  }

  if (quoteSubmitted) {
    return (
      <main className="min-h-screen bg-[#0f0f0f] px-4 py-12">
        <section className="mx-auto max-w-4xl overflow-hidden rounded-3xl border border-[#2e2e2e] bg-[radial-gradient(circle_at_top_left,_#1f2450_0%,_#141414_45%,_#101010_100%)] p-6 sm:p-10">
          <div className="text-center">
            <p className="inline-flex rounded-full border border-[#49e4e6]/35 bg-[#49e4e6]/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-[#7af2f3]">
              Cotação recebida
            </p>
            <h1 className="mt-4 text-3xl font-black text-[#f5f5f5] sm:text-4xl">
              Sua cotação foi enviada com sucesso!
            </h1>
            <p className="mx-auto mt-3 max-w-2xl text-sm text-[#c7c7c7] sm:text-base">
              Recebemos {quoteSubmitted.items_count} produto(s). Nossa equipe vai avaliar e
              retornar por e-mail com os proximos passos.
            </p>
            <p className="mt-3 text-xs font-semibold text-[#9ca3af]">
              Protocolo: {quoteSubmitted.protocol}
            </p>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-[#2e2e2e] bg-[#111111]/85 p-2 shadow-xl">
              <img
                src="/images/god-of-war.jpg"
                alt="Kratos"
                className="h-44 w-full animate-bounce rounded-lg object-cover [animation-duration:4.8s]"
              />
              {/* <p className="mt-2 text-center text-xs font-bold uppercase tracking-wider text-[#f5f5f5]">
                Kratos
              </p> */}
            </div>
            <div className="rounded-xl border border-[#2e2e2e] bg-[#111111]/85 p-2 shadow-xl">
              <img
                src="/images/fifa.jpg"
                alt="Jogador Fifa"
                className="h-44 w-full animate-bounce rounded-lg object-cover [animation-duration:5.6s]"
              />
              {/* <p className="mt-2 text-center text-xs font-bold uppercase tracking-wider text-[#f5f5f5]">
                Jogador FIFA
              </p> */}
            </div>
            <div className="rounded-xl border border-[#2e2e2e] bg-[#111111]/85 p-2 shadow-xl">
              <img
                src="https://upload.wikimedia.org/wikipedia/en/a/a9/MarioNSMBUDeluxe.png"
                alt="Mario"
                className="h-44 w-full animate-bounce rounded-lg object-contain [animation-duration:4.2s]"
                loading="lazy"
              />
              {/* <p className="mt-2 text-center text-xs font-bold uppercase tracking-wider text-[#f5f5f5]">
                Mario
              </p> */}
            </div>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#0f0f0f] px-4 py-10 sm:py-14">
      <section className="mx-auto max-w-3xl rounded-2xl border border-[#2e2e2e] bg-[#141414] p-5 sm:p-8">
        <div className="mb-6">
          <p className="inline-flex rounded-full border border-[#49e4e6]/35 bg-[#49e4e6]/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-[#7af2f3]">
            Fase {phase} de 4
          </p>
          {phase === 1 ? (
            <>
              <h1 className="mt-3 text-2xl font-black text-[#f5f5f5] sm:text-3xl">
                Fase 1: dados do jogador
              </h1>
              <p className="mt-2 text-sm text-[#b7b7b7] sm:text-base">
                Precisamos de algumas informacoes para avaliar seus itens. Complete os
                campos abaixo.
              </p>
            </>
          ) : phase === 2 ? (
            <>
              <h1 className="mt-3 text-2xl font-black text-[#f5f5f5] sm:text-3xl">
                Fase 2: item usado
              </h1>
              <p className="mt-2 text-sm text-[#b7b7b7] sm:text-base">
                Qual item usado voce gostaria de nos vender?
              </p>
            </>
          ) : (
            <>
              <h1 className="mt-3 text-2xl font-black text-[#f5f5f5] sm:text-3xl">
                Fase 3: revisar cotacao
              </h1>
              <p className="mt-2 text-sm text-[#b7b7b7] sm:text-base">
                Confira os produtos adicionados na cesta e finalize sua cotação.
              </p>
            </>
          )}
        </div>

        <div className="mb-6 grid grid-cols-4 gap-2">
          <div className="h-2 rounded-full bg-[#49e4e6]" />
          <div className={`h-2 rounded-full ${phase >= 2 ? 'bg-[#49e4e6]' : 'bg-[#2e2e2e]'}`} />
          <div className={`h-2 rounded-full ${phase >= 3 ? 'bg-[#49e4e6]' : 'bg-[#2e2e2e]'}`} />
          <div className="h-2 rounded-full bg-[#2e2e2e]" />
        </div>

        {phase === 1 ? (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold text-[#e5e5e5]">Nome completo</label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Seu nome aqui"
                className="mt-2 h-11 rounded-xl border-[#2e2e2e] bg-[#1a1a1a] text-[#f5f5f5] placeholder:text-[#6f6f6f]"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-[#e5e5e5]">E-mail</label>
              <p className="mt-1 text-xs text-[#9ca3af]">
                Sua cotação sera enviada por e-mail. Por favor, insira-o abaixo para
                continuar.
              </p>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@exemplo.com"
                className="mt-2 h-11 rounded-xl border-[#2e2e2e] bg-[#1a1a1a] text-[#f5f5f5] placeholder:text-[#6f6f6f]"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-[#e5e5e5]">Numero de celular</label>
              <Input
                value={phone}
                onChange={(e) => setPhone(formatPhone(e.target.value))}
                placeholder="(__) _____-____"
                className="mt-2 h-11 rounded-xl border-[#2e2e2e] bg-[#1a1a1a] text-[#f5f5f5] placeholder:text-[#6f6f6f]"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-[#e5e5e5]">Cidade</label>
              <div className="relative mt-2">
                <Input
                  value={city}
                  onChange={(e) => handleCityChange(e.target.value)}
                  onFocus={() => {
                    if (cityOptions.length > 0) setShowCityOptions(true)
                  }}
                  onBlur={() => {
                    setTimeout(() => setShowCityOptions(false), 120)
                  }}
                  placeholder="Comece a digitar para pesquisar"
                  className="h-11 rounded-xl border-[#2e2e2e] bg-[#1a1a1a] text-[#f5f5f5] placeholder:text-[#6f6f6f]"
                />
                {cityLoading ? (
                  <p className="mt-1 text-xs text-[#9ca3af]">Buscando cidades...</p>
                ) : null}
                {cityError ? (
                  <p className="mt-1 text-xs text-[#fca5a5]">{cityError}</p>
                ) : null}
                {showCityOptions && cityOptions.length > 0 ? (
                  <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-[#2e2e2e] bg-[#111111] p-1 shadow-xl">
                    {cityOptions.map((option) => (
                      <button
                        key={option.label}
                        type="button"
                        onMouseDown={() => handleSelectCity(option)}
                        className="block w-full rounded-lg px-3 py-2 text-left text-sm text-[#d4d4d4] hover:bg-[#1a1a1a] hover:text-[#49e4e6]"
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-[#e5e5e5]">
                Como voce conheceu a {storeName}?
              </label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="mt-2 h-11 w-full rounded-xl border border-[#2e2e2e] bg-[#1a1a1a] px-3 text-sm text-[#f5f5f5] outline-none focus:border-[#49e4e6]"
              >
                <option value="">Selecione uma opcao</option>
                <option value="instagram">Instagram</option>
                <option value="google">Google</option>
                <option value="youtube">YouTube</option>
                <option value="indicacao">Indicacao de amigo</option>
                <option value="loja">Ja sou cliente da loja</option>
              </select>
            </div>
          </div>
        ) : phase === 2 ? (
          <div className="space-y-4">
            {!manualProductMode && phase2Step === 'search' ? (
              <>
                <div>
                  <label className="text-sm font-semibold text-[#e5e5e5]">
                    Qual produto voce deseja vender?
                  </label>
                  <div className="relative mt-2">
                    <Input
                      value={productToSell}
                      onChange={(e) => {
                        setProductToSell(e.target.value)
                        setSelectedProduct(null)
                      }}
                      onFocus={() => {
                        if (productOptions.length > 0) setShowProductOptions(true)
                      }}
                      onBlur={() => {
                        setTimeout(() => setShowProductOptions(false), 120)
                      }}
                      placeholder="Digite o nome do produto"
                      className="h-11 rounded-xl border-[#2e2e2e] bg-[#1a1a1a] text-[#f5f5f5] placeholder:text-[#6f6f6f]"
                    />
                    {productLoading ? (
                      <p className="mt-1 text-xs text-[#9ca3af]">Buscando produtos...</p>
                    ) : null}
                    {productError ? (
                      <p className="mt-1 text-xs text-[#fca5a5]">{productError}</p>
                    ) : null}
                    {showProductOptions && !productLoading && productOptions.length > 0 ? (
                      <div className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-xl border border-[#2e2e2e] bg-[#111111] p-1 shadow-xl">
                        {productOptions.map((option) => (
                          <button
                            key={`${option.external_id}-${option.sku}`}
                            type="button"
                            onMouseDown={() => handleSelectProduct(option)}
                            className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-[#1a1a1a]"
                          >
                            <div className="h-11 w-11 shrink-0 overflow-hidden rounded-md border border-[#2e2e2e] bg-[#0f0f0f]">
                              {option.image_url ? (
                                <img
                                  src={option.image_url}
                                  alt={option.name}
                                  className="h-full w-full object-cover"
                                  loading="lazy"
                                />
                              ) : null}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-[#f5f5f5]">
                                {option.name}
                              </p>
                              <p className="text-xs text-[#9ca3af]">{option.sku}</p>
                            </div>
                          </button>
                        ))}
                        <button
                          type="button"
                          onMouseDown={openManualProductForm}
                          className="mt-1 block w-full rounded-lg border border-[#2e2e2e] bg-[#141414] px-3 py-2 text-left text-xs font-semibold text-[#cfd8dc] hover:border-[#49e4e6] hover:text-[#49e4e6]"
                        >
                          Nao encontrou o produto na lista? Clique aqui
                        </button>
                      </div>
                    ) : null}
                    {showProductOptions &&
                    !productLoading &&
                    productToSell.trim().length >= 2 &&
                    productOptions.length === 0 ? (
                      <div className="absolute z-20 mt-1 w-full rounded-xl border border-[#2e2e2e] bg-[#111111] p-2 shadow-xl">
                        <button
                          type="button"
                          onMouseDown={openManualProductForm}
                          className="block w-full rounded-lg border border-[#2e2e2e] bg-[#141414] px-3 py-2 text-left text-xs font-semibold text-[#cfd8dc] hover:border-[#49e4e6] hover:text-[#49e4e6]"
                        >
                          Nao encontrou o produto na lista? Clique aqui
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="rounded-xl border border-[#2e2e2e] bg-[#111111] p-4">
                  <h2 className="text-sm font-black uppercase tracking-wider text-[#49e4e6]">
                    Dicas para encontrar melhores resultados
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-[#cfcfcf]">
                    Compramos diversos produtos usados, jogos, acessorios, smartphones e mais! Se voce tem
                    algum produto que acredita que faz sentido para o universo GameStore, como action
                    figures, fique a vontade para inclui-los em sua cotação.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-[#166534]/40 bg-[#166534]/10 p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-[#86efac]">
                      Exemplo de busca bem formatada para jogos
                    </p>
                    <p className="mt-2 text-sm font-semibold text-[#f5f5f5]">
                      Jogo LEGO City Undercover - Xbox One
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#7f1d1d]/40 bg-[#7f1d1d]/10 p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-[#fda4af]">
                      Exemplo de busca mal formatada para jogos
                    </p>
                    <p className="mt-2 text-sm font-semibold text-[#f5f5f5]">LEGO Xbox</p>
                  </div>
                  <div className="rounded-xl border border-[#166534]/40 bg-[#166534]/10 p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-[#86efac]">
                      Exemplo de busca bem formatada para consoles
                    </p>
                    <p className="mt-2 text-sm font-semibold text-[#f5f5f5]">
                      Console Playstation 4 Slim 500GB - Sony
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#7f1d1d]/40 bg-[#7f1d1d]/10 p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-[#fda4af]">
                      Exemplo de busca mal formatada para consoles
                    </p>
                    <p className="mt-2 text-sm font-semibold text-[#f5f5f5]">Videogame</p>
                  </div>
                </div>
              </>
            ) : null}

            {!manualProductMode && phase2Step === 'details' ? (
              <div className="space-y-4">
                <div className="rounded-xl border border-[#2e2e2e] bg-[#111111] p-4">
                  <p className="text-sm font-semibold text-[#f5f5f5]">Produto selecionado</p>
                  <div className="mt-3 flex items-center gap-3">
                    <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-[#2e2e2e] bg-[#0f0f0f]">
                      {selectedProduct?.image_url ? (
                        <img
                          src={selectedProduct.image_url}
                          alt={selectedProduct.name}
                          className="h-full w-full object-cover"
                        />
                      ) : null}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#f5f5f5]">
                        {selectedProduct?.name || productToSell}
                      </p>
                      {selectedProduct?.sku ? (
                        <p className="text-xs text-[#9ca3af]">{selectedProduct.sku}</p>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-[#2e2e2e] bg-[#111111] p-4">
                  <label className="text-sm font-semibold text-[#e5e5e5]">
                    Condições do produto
                  </label>
                  <div className="mt-3 space-y-2">
                    {qualityOptions.map((option) => (
                      <label
                        key={option.value}
                        className="flex cursor-pointer items-start gap-2 rounded-lg border border-[#2e2e2e] bg-[#141414] px-3 py-2"
                      >
                        <input
                          type="radio"
                          name="qualityLevel"
                          value={option.value}
                          checked={qualityLevel === option.value}
                          onChange={(e) => setQualityLevel(e.target.value)}
                          className="mt-0.5 accent-[#49e4e6]"
                        />
                        <span className="text-sm text-[#d4d4d4]">{option.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-semibold text-[#e5e5e5]">
                    Deseja inserir um comentário? (opcional)
                  </label>
                  <textarea
                    value={selectedProductComment}
                    onChange={(e) => setSelectedProductComment(e.target.value)}
                    className="mt-2 min-h-24 w-full rounded-xl border border-[#2e2e2e] bg-[#1a1a1a] px-3 py-2 text-sm text-[#f5f5f5] outline-none focus:border-[#49e4e6]"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-[#e5e5e5]">
                    Deseja enviar uma foto? (opcional)
                  </label>
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      const incoming = Array.from(e.currentTarget.files || [])
                      setSelectedProductPhotos((prev) => appendFiles(prev, incoming))
                      e.currentTarget.value = ''
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    className="mt-2 flex h-40 w-full items-center justify-center rounded-xl border border-dashed border-[#2e2e2e] bg-[#111111] text-sm font-semibold text-[#cfd8dc] hover:border-[#49e4e6] hover:text-[#49e4e6]"
                  >
                    Clique na imagem para adicionar
                  </button>
                  {selectedProductPhotos.length > 0 ? (
                    <div className="mt-2 text-xs text-[#9ca3af]">
                      <p>{selectedProductPhotos.length} arquivo(s) selecionado(s).</p>
                      <div className="mt-2 space-y-1">
                        {selectedProductPhotos.map((file, index) => (
                          <div
                            key={`${file.name}-${file.lastModified}-${index}`}
                            className="flex items-center justify-between gap-2 rounded-md border border-[#2e2e2e] bg-[#141414] px-2 py-1"
                          >
                            <p className="truncate text-[#cfd8dc]">{file.name}</p>
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedProductPhotos((prev) =>
                                  removeFileAtIndex(prev, index)
                                )
                              }
                              className="shrink-0 text-[#fca5a5] hover:text-[#f87171]"
                            >
                              remover
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}

            {manualProductMode ? (
              <div className="space-y-4">
                <div className="rounded-xl border border-[#2e2e2e] bg-[#111111] p-4 text-sm text-[#cfcfcf]">
                  Nao temos o produto que voce esta procurando em nosso banco de dados. Mas sem problemas, voce pode cadastra-lo manualmente:
                </div>

                <div>
                  <label className="text-sm font-semibold text-[#e5e5e5]">Nome do produto</label>
                  <Input
                    value={manualProductName}
                    onChange={(e) => setManualProductName(e.target.value)}
                    placeholder="Nome do produto aqui"
                    className="mt-2 h-11 rounded-xl border-[#2e2e2e] bg-[#1a1a1a] text-[#f5f5f5] placeholder:text-[#6f6f6f]"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-[#e5e5e5]">Quantidade</label>
                  <Input
                    type="number"
                    min={1}
                    value={manualQuantity}
                    onChange={(e) => setManualQuantity(e.target.value)}
                    className="mt-2 h-11 rounded-xl border-[#2e2e2e] bg-[#1a1a1a] text-[#f5f5f5]"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-[#e5e5e5]">
                    Deseja inserir um comentario? (opcional)
                  </label>
                  <textarea
                    value={manualComment}
                    onChange={(e) => setManualComment(e.target.value)}
                    className="mt-2 min-h-24 w-full rounded-xl border border-[#2e2e2e] bg-[#1a1a1a] px-3 py-2 text-sm text-[#f5f5f5] outline-none focus:border-[#49e4e6]"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-[#e5e5e5]">
                    Deseja enviar uma foto? (opcional)
                  </label>
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      const incoming = Array.from(e.currentTarget.files || [])
                      setManualPhotos((prev) => appendFiles(prev, incoming))
                      e.currentTarget.value = ''
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    className="mt-2 flex h-40 w-full items-center justify-center rounded-xl border border-dashed border-[#2e2e2e] bg-[#111111] text-sm font-semibold text-[#cfd8dc] hover:border-[#49e4e6] hover:text-[#49e4e6]"
                  >
                    Clique na imagem para adicionar
                  </button>
                  {manualPhotos.length > 0 ? (
                    <div className="mt-2 text-xs text-[#9ca3af]">
                      <p>{manualPhotos.length} arquivo(s) selecionado(s).</p>
                      <div className="mt-2 space-y-1">
                        {manualPhotos.map((file, index) => (
                          <div
                            key={`${file.name}-${file.lastModified}-${index}`}
                            className="flex items-center justify-between gap-2 rounded-md border border-[#2e2e2e] bg-[#141414] px-2 py-1"
                          >
                            <p className="truncate text-[#cfd8dc]">{file.name}</p>
                            <button
                              type="button"
                              onClick={() =>
                                setManualPhotos((prev) => removeFileAtIndex(prev, index))
                              }
                              className="shrink-0 text-[#fca5a5] hover:text-[#f87171]"
                            >
                              remover
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="space-y-4">
            {quoteBasket.length === 0 ? (
              <div className="rounded-xl border border-[#2e2e2e] bg-[#111111] p-4 text-sm text-[#cfcfcf]">
                Nenhum produto foi adicionado ainda.
              </div>
            ) : (
              quoteBasket.map((item, index) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-[#2e2e2e] bg-[#111111] p-4"
                >
                  <p className="text-xs font-bold uppercase tracking-wider text-[#49e4e6]">
                    Produto {index + 1}
                  </p>
                  <div className="mt-2 flex items-start gap-3">
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-[#2e2e2e] bg-[#0f0f0f]">
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="h-full w-full object-cover"
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[#f5f5f5]">
                        {item.name}
                      </p>
                      {item.sku ? <p className="text-xs text-[#9ca3af]">SKU: {item.sku}</p> : null}
                      <div className="mt-1 flex items-center gap-2">
                        <span className="text-xs text-[#9ca3af]">Quantidade:</span>
                        <button
                          type="button"
                          onClick={() => updateBasketItemQuantity(item.id, item.quantity - 1)}
                          className="h-6 w-6 rounded border border-[#2e2e2e] bg-[#1a1a1a] text-[#f5f5f5] hover:border-[#49e4e6] hover:text-[#49e4e6]"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) =>
                            updateBasketItemQuantity(item.id, Number(e.target.value))
                          }
                          className="h-6 w-14 rounded border border-[#2e2e2e] bg-[#1a1a1a] px-1 text-center text-xs text-[#f5f5f5] outline-none focus:border-[#49e4e6]"
                        />
                        <button
                          type="button"
                          onClick={() => updateBasketItemQuantity(item.id, item.quantity + 1)}
                          className="h-6 w-6 rounded border border-[#2e2e2e] bg-[#1a1a1a] text-[#f5f5f5] hover:border-[#49e4e6] hover:text-[#49e4e6]"
                        >
                          +
                        </button>
                      </div>
                      {item.qualityLabel ? (
                        <p className="text-xs text-[#9ca3af]">Condição: {item.qualityLabel}</p>
                      ) : null}
                      {item.comment ? (
                        <p className="text-xs text-[#9ca3af]">Comentário: {item.comment}</p>
                      ) : null}
                      {item.photos.length > 0 ? (
                        <p className="text-xs text-[#9ca3af]">
                          Fotos: {item.photos.length} arquivo(s)
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        <div className="mt-8 flex items-center justify-between gap-2">
          <Button
            type="button"
            onClick={() => {
              if (phase === 3) {
                setPhase(2)
                return
              }
              if (phase === 2) {
                if (manualProductMode) {
                  setManualProductMode(false)
                  return
                }
                if (phase2Step === 'details') {
                  setPhase2Step('search')
                  return
                }
                setPhase(1)
                return
              }
              router.back()
            }}
            className="h-11 rounded-xl border border-[#2e2e2e] bg-[#1a1a1a] px-6 font-black text-[#f5f5f5] hover:border-[#49e4e6] hover:text-[#49e4e6]"
          >
            Voltar
          </Button>
          <div className="flex items-center gap-2">
            {phase === 2 && phase2Step === 'details' ? (
              <Button
                type="button"
                onClick={() => {
                  const added = addCurrentProductToBasket()
                  if (!added) return
                  resetPhase2Draft()
                }}
                className="h-11 rounded-xl border border-[#2e2e2e] bg-[#1a1a1a] px-5 font-black text-[#f5f5f5] hover:border-[#49e4e6] hover:text-[#49e4e6]"
              >
                + adicionar outro produto
              </Button>
            ) : null}
            <Button
              type="button"
              disabled={
                phase === 1
                  ? !canContinue
                  : phase === 2
                    ? manualProductMode
                      ? manualProductName.trim() === '' ||
                        Number.isNaN(Number(manualQuantity)) ||
                        Number(manualQuantity) < 1
                      : phase2Step === 'search'
                        ? selectedProduct === null
                        : qualityLevel.trim() === ''
                    : quoteBasket.length === 0 || finalizeLoading
              }
              onClick={async () => {
                if (phase === 1) {
                  resetPhase2Draft()
                  setPhase(2)
                  return
                }
                if (phase === 2) {
                  if (!manualProductMode && phase2Step === 'search') {
                    setPhase2Step('details')
                    return
                  }

                  const added = addCurrentProductToBasket()
                  if (!added) return
                  resetPhase2Draft()
                  setPhase(3)
                  return
                }
                if (phase === 3) {
                  await submitQuoteRequest()
                }
              }}
              className="h-11 rounded-xl bg-[#49e4e6] px-6 font-black text-[#0f0f0f] hover:bg-[#2fc8cc]"
            >
              {phase === 1
                ? 'Avançar para Fase 2'
                : phase === 2
                  ? phase2Step === 'search'
                    ? 'Avançar'
                    : 'Avançar para Fase 3'
                  : finalizeLoading
                    ? 'Finalizando...'
                    : 'Finalizar cotação'}
            </Button>
          </div>
        </div>
        {phase === 3 && finalizeError ? (
          <div className="mt-3 rounded-xl border border-[#f87171]/30 bg-[#f87171]/10 px-4 py-3 text-sm text-[#fecaca]">
            {finalizeError}
          </div>
        ) : null}
      </section>
    </main>
  )
}




