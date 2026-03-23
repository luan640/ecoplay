'use client'

import { apiFetch, getCsrfToken } from '@/lib/api'
import { getBackendUrl } from '@/lib/backend-url'
import { useEffect, useState, useCallback, useRef } from 'react'
import { Search, ChevronDown, Check, ToggleLeft, ToggleRight, Plus, Pencil, ImageIcon, Upload, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'

const BACKEND_URL = getBackendUrl()

interface Product {
  id: number
  name: string
  slug: string
  sku: string
  platform: string
  subplatform: string
  category: string
  condition: string
  price: string
  old_price: string | null
  pix_price: string | null
  installments: number | null
  stock: number
  in_stock: boolean
  is_active: boolean
  image_url: string | null
  gallery_images: string[]
  description: string
  details: { label: string; value: string }[]
  created_at: string
}

const EMPTY_FORM = {
  name: '',
  sku: '',
  price: '',
  old_price: '',
  pix_price: '',
  installments: '10',
  stock: '0',
  platform: '',
  subplatform: '',
  category: '',
  condition: 'Novo',
  description: '',
  is_active: true,
}

const perPage = 20

// ---------------------------------------------------------------------------
// Async combobox — fetches from API, supports search + infinite scroll
// ---------------------------------------------------------------------------
function AsyncCombobox({
  url,
  value,
  onChange,
  placeholder = '— Todos —',
}: {
  url: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const [inputSearch, setInputSearch] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [items, setItems] = useState<{ name: string }[]>([])
  const [fetchPage, setFetchPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [fetching, setFetching] = useState(false)

  // debounce search → reset list
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedQ(inputSearch)
      setFetchPage(1)
      setItems([])
    }, 350)
    return () => clearTimeout(t)
  }, [inputSearch])

  // fetch on open / search / page change
  useEffect(() => {
    if (!open) return
    setFetching(true)
    const params = new URLSearchParams({ q: debouncedQ, page: String(fetchPage), page_size: '20' })
    apiFetch(`${url}?${params}`)
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((data) => {
        const newItems: { name: string }[] = data.results ?? []
        setItems((prev) => fetchPage === 1 ? newItems : [...prev, ...newItems])
        setHasMore(data.page < data.pages)
      })
      .catch(() => {})
      .finally(() => setFetching(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, url, debouncedQ, fetchPage])

  function handleOpen(o: boolean) {
    setOpen(o)
    if (o) { setInputSearch(''); setDebouncedQ(''); setFetchPage(1); setItems([]) }
  }

  function handleScroll(e: React.UIEvent<HTMLDivElement>) {
    const el = e.currentTarget
    if (!fetching && hasMore && el.scrollHeight - el.scrollTop <= el.clientHeight + 60) {
      setFetchPage((p) => p + 1)
    }
  }

  return (
    <Popover open={open} onOpenChange={handleOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex items-center w-full h-10 bg-zinc-900 border border-zinc-800 text-sm px-3 rounded-md hover:border-zinc-700 transition-colors min-w-[160px]"
        >
          <span className={`truncate flex-1 text-left ${value ? 'text-white' : 'text-zinc-500'}`}>
            {value || placeholder}
          </span>
          <ChevronDown className="w-4 h-4 ml-1 text-zinc-500 shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="p-0 bg-zinc-900 border-zinc-700 w-56"
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {/* Search input */}
        <div className="border-b border-zinc-800 px-3 py-2 flex items-center gap-2">
          <Search className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
          <input
            autoFocus
            value={inputSearch}
            onChange={(e) => setInputSearch(e.target.value)}
            placeholder="Buscar..."
            className="flex-1 bg-transparent text-sm text-white placeholder:text-zinc-600 outline-none"
          />
        </div>

        {/* List */}
        <div
          onScroll={handleScroll}
          className="max-h-56 overflow-y-auto overscroll-contain"
        >
          {/* Clear option */}
          <button
            type="button"
            onClick={() => { onChange(''); setOpen(false) }}
            className={`w-full text-left px-3 py-2 text-sm transition-colors ${
              value === '' ? 'text-violet-400 font-semibold' : 'text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200'
            }`}
          >
            {placeholder}
          </button>

          {items.map((item) => (
            <button
              key={item.name}
              type="button"
              onClick={() => { onChange(item.name); setOpen(false) }}
              className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors ${
                item.name === value
                  ? 'text-violet-400 font-semibold bg-violet-900/20'
                  : 'text-zinc-200 hover:bg-zinc-800'
              }`}
            >
              {item.name === value && <Check className="w-3.5 h-3.5 shrink-0" />}
              {item.name !== value && <span className="w-3.5 shrink-0" />}
              {item.name}
            </button>
          ))}

          {fetching && (
            <div className="flex justify-center py-3">
              <div className="w-4 h-4 border-2 border-zinc-700 border-t-violet-400 rounded-full animate-spin" />
            </div>
          )}

          {!fetching && items.length === 0 && (
            <p className="text-center text-xs text-zinc-600 py-4">Nenhum resultado.</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

// ---------------------------------------------------------------------------
// Searchable combobox — uses Popover + Command (cmdk) so it works inside Dialog
// ---------------------------------------------------------------------------
function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = '— Selecione —',
}: {
  value: string
  onChange: (v: string) => void
  options: { label: string; value: string }[]
  placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const selectedLabel = options.find((o) => o.value === value)?.label ?? value

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          className="flex items-center w-full bg-zinc-900 border border-zinc-700 text-white rounded-md h-8 text-sm px-2 hover:border-zinc-600 transition-colors"
        >
          <span className={`truncate flex-1 text-left ${value ? 'text-white' : 'text-zinc-500'}`}>
            {value ? selectedLabel : placeholder}
          </span>
          <ChevronDown className="w-4 h-4 ml-1 text-zinc-500 shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="p-0 bg-zinc-900 border-zinc-700"
        style={{ width: 'var(--radix-popover-trigger-width)' }}
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <Command className="bg-zinc-900">
          <CommandInput
            placeholder="Buscar..."
            className="text-white text-sm h-8"
          />
          <CommandList className="max-h-48 overflow-y-auto">
            <CommandEmpty className="py-3 text-center text-xs text-zinc-500">
              Nenhum resultado.
            </CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="__clear__"
                onSelect={() => { onChange(''); setOpen(false) }}
                className="text-zinc-500 text-sm cursor-pointer"
              >
                {placeholder}
              </CommandItem>
              {options.map((o) => (
                <CommandItem
                  key={o.value}
                  value={o.label}
                  onSelect={() => { onChange(o.value); setOpen(false) }}
                  className="text-white text-sm cursor-pointer"
                >
                  {o.value === value
                    ? <Check className="w-3.5 h-3.5 text-violet-400 mr-1 shrink-0" />
                    : <span className="w-3.5 mr-1 shrink-0" />}
                  {o.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

export default function ProdutosPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [filterSku, setFilterSku] = useState('')
  const [debouncedSku, setDebouncedSku] = useState('')
  const [filterPlatform, setFilterPlatform] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [activeFilter, setActiveFilter] = useState<'' | '1' | '0'>('')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<number | null>(null)

  // modal
  const [modalOpen, setModalOpen] = useState(false)
  const [editMode, setEditMode] = useState<'create' | 'edit'>('create')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState<'cadastro' | 'ficha' | 'imagens'>('cadastro')
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [techSpecs, setTechSpecs] = useState<Array<{ label: string; value: string }>>([
    { label: '', value: '' },
  ])

  // imagens
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [galleryFiles, setGalleryFiles] = useState<(File | null)[]>([null, null, null])
  const [galleryPreviews, setGalleryPreviews] = useState<(string | null)[]>([null, null, null])
  const [gallerySlot, setGallerySlot] = useState(0)
  const coverInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)

  // listas dinâmicas
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([])
  const [platforms, setPlatforms] = useState<{ id: number; name: string }[]>([])
  const [subplatformOptions, setSubplatformOptions] = useState<string[]>([])

  useEffect(() => {
    apiFetch(`${BACKEND_URL}/api/admin/categorias/?page_size=20`)
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((d) => setCategories(d.results.filter((c: { is_active: boolean }) => c.is_active)))
      .catch(() => {})
    apiFetch(`${BACKEND_URL}/api/admin/plataformas/?page_size=200`)
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((d) => setPlatforms(d.results.filter((p: { is_active: boolean }) => p.is_active)))
      .catch(() => {})
  }, [])

  // Load subplatforms when form.platform changes (inside modal)
  useEffect(() => {
    if (!modalOpen) return
    const plat = form.platform.trim()
    if (!plat) { setSubplatformOptions([]); return }
    apiFetch(`${BACKEND_URL}/api/admin/subplataformas/?platform=${encodeURIComponent(plat)}&page_size=200`)
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((d) => setSubplatformOptions((d.results ?? []).map((s: { name: string }) => s.name)))
      .catch(() => setSubplatformOptions([]))
  }, [form.platform, modalOpen])

  const totalPages = Math.ceil(total / perPage)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSku(filterSku), 400)
    return () => clearTimeout(t)
  }, [filterSku])

  const loadProducts = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams({
      page: String(page),
      ...(debouncedSearch ? { q: debouncedSearch } : {}),
      ...(debouncedSku ? { sku: debouncedSku } : {}),
      ...(filterPlatform ? { platform: filterPlatform } : {}),
      ...(filterCategory ? { category: filterCategory } : {}),
      ...(activeFilter ? { active: activeFilter } : {}),
    })
    setLoadError(null)
    apiFetch(`${BACKEND_URL}/api/admin/produtos/?${params}`)
      .then((r) => {
        if (!r.ok) throw new Error(`Erro ao carregar produtos (${r.status}).`)
        return r.json()
      })
      .then((data) => {
        setProducts(data.results)
        setTotal(data.total)
      })
      .catch((err: unknown) => {
        setLoadError(err instanceof Error ? err.message : 'Erro ao carregar produtos.')
      })
      .finally(() => setLoading(false))
  }, [page, debouncedSearch, debouncedSku, filterPlatform, filterCategory, activeFilter])

  useEffect(() => {
    loadProducts()
  }, [loadProducts])

  async function toggleActive(product: Product) {
    setTogglingId(product.id)
    try {
      const res = await apiFetch(`${BACKEND_URL}/api/admin/produtos/${product.id}/`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: !product.is_active }),
      })
      if (res.ok) {
        setProducts((prev) =>
          prev.map((p) => (p.id === product.id ? { ...p, is_active: !p.is_active } : p))
        )
      }
    } finally {
      setTogglingId(null)
    }
  }

  function openCreate() {
    setEditMode('create')
    setEditingId(null)
    setActiveTab('cadastro')
    setForm(EMPTY_FORM)
    setFormError(null)
    setTechSpecs([{ label: '', value: '' }])
    setCoverFile(null)
    setCoverPreview(null)
    setGalleryFiles([null, null, null])
    setGalleryPreviews([null, null, null])
    setModalOpen(true)
  }

  function openEdit(p: Product) {
    setEditMode('edit')
    setEditingId(p.id)
    setActiveTab('cadastro')
    setForm({
      name: p.name,
      sku: p.sku,
      price: p.price ?? '',
      old_price: p.old_price ?? '',
      pix_price: p.pix_price ?? '',
      installments: String(p.installments ?? 10),
      stock: String(p.stock ?? 0),
      platform: p.platform ?? '',
      subplatform: p.subplatform ?? '',
      category: p.category ?? '',
      condition: p.condition ?? 'Novo',
      description: p.description ?? '',
      is_active: p.is_active,
    })
    setFormError(null)
    const parsedDetails = Array.isArray(p.details)
      ? p.details
          .filter((item) => item && typeof item.label === 'string' && typeof item.value === 'string')
          .map((item) => ({ label: item.label, value: item.value }))
      : []
    setTechSpecs(parsedDetails.length ? parsedDetails : [{ label: '', value: '' }])
    // imagens existentes
    setCoverFile(null)
    setCoverPreview(p.image_url ?? null)
    const gl = Array.isArray(p.gallery_images) ? p.gallery_images : []
    setGalleryFiles([null, null, null])
    setGalleryPreviews([gl[0] ?? null, gl[1] ?? null, gl[2] ?? null])
    setModalOpen(true)
  }

  async function handleSave() {
    setFormError(null)
    if (!form.name.trim()) { setFormError('Nome é obrigatório.'); return }
    if (!form.sku.trim()) { setFormError('SKU é obrigatório.'); return }
    if (!form.price || isNaN(Number(form.price))) { setFormError('Preço inválido.'); return }

    setSaving(true)
    try {
      const body: Record<string, unknown> = {
        name: form.name.trim(),
        sku: form.sku.trim(),
        price: form.price,
        installments: Number(form.installments) || 10,
        stock: Number(form.stock) || 0,
        is_active: form.is_active,
        old_price: form.old_price || null,
        pix_price: form.pix_price || null,
        platform: form.platform.trim() || '',
        subplatform: form.subplatform?.trim() || '',
        category: form.category.trim() || '',
        condition: form.condition.trim() || 'Novo',
        description: form.description.trim() || '',
        details: techSpecs
          .map((item) => ({ label: item.label.trim(), value: item.value.trim() }))
          .filter((item) => item.label && item.value),
      }

      const url = editMode === 'edit' && editingId
        ? `${BACKEND_URL}/api/admin/produtos/${editingId}/`
        : `${BACKEND_URL}/api/admin/produtos/`
      const method = editMode === 'edit' ? 'PATCH' : 'POST'

      const res = await apiFetch(url, { method, body: JSON.stringify(body) })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        const msg = Object.values(data).flat().join(' ') || 'Erro ao salvar produto.'
        setFormError(msg)
        return
      }

      const saved: Product = await res.json()

      // Upload de imagens (multipart, separado)
      const hasImages = coverFile || galleryFiles.some(Boolean)
      let finalProduct = saved
      if (hasImages) {
        const fd = new FormData()
        if (coverFile) fd.append('image', coverFile)
        galleryFiles.forEach((f, i) => { if (f) fd.append(`gallery_${i + 1}`, f) })
        const imgRes = await fetch(`${BACKEND_URL}/api/admin/produtos/${saved.id}/imagens/`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'X-CSRFToken': getCsrfToken() },
          body: fd,
        })
        if (imgRes.ok) {
          finalProduct = await imgRes.json()
        } else {
          const errData = await imgRes.json().catch(() => ({}))
          const msg =
            Object.values(errData).flat().join(' ') ||
            `Erro no upload das imagens (${imgRes.status}).`
          // Produto já foi criado; mantém modal aberto na aba Imagens para o usuário ver o erro
          setFormError(`Produto salvo! Mas o upload das imagens falhou: ${msg}`)
          setActiveTab('imagens')
          // Atualiza o produto na lista sem fechar o modal
          if (editMode === 'edit') {
            setProducts((prev) => prev.map((p) => (p.id === saved.id ? saved : p)))
          } else {
            setPage(1)
            loadProducts()
          }
          return
        }
      }

      setModalOpen(false)
      setForm(EMPTY_FORM)
      setTechSpecs([{ label: '', value: '' }])

      if (editMode === 'edit') {
        setProducts((prev) => prev.map((p) => (p.id === finalProduct.id ? finalProduct : p)))
      } else {
        setPage(1)
        loadProducts()
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro de conexão. Tente novamente.'
      setFormError(message)
    } finally {
      setSaving(false)
    }
  }

  function handleCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setCoverFile(file)
    const reader = new FileReader()
    reader.onload = (ev) => setCoverPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  function handleGalleryChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const i = gallerySlot
    const newFiles = [...galleryFiles]
    newFiles[i] = file
    setGalleryFiles(newFiles)
    const reader = new FileReader()
    reader.onload = (ev) => {
      setGalleryPreviews((prev) => {
        const n = [...prev]
        n[i] = ev.target?.result as string
        return n
      })
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  function removeGallerySlot(i: number) {
    setGalleryFiles((prev) => { const n = [...prev]; n[i] = null; return n })
    setGalleryPreviews((prev) => { const n = [...prev]; n[i] = null; return n })
  }

  function formatPrice(value: string) {
    return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  function field(
    label: string,
    key: keyof typeof EMPTY_FORM,
    opts?: { type?: string; required?: boolean; placeholder?: string }
  ) {
    const { type = 'text', required = false, placeholder } = opts || {}
    return (
      <div>
        <label className="block text-xs text-zinc-400 mb-1">
          {label}{required && <span className="text-violet-400 ml-0.5">*</span>}
        </label>
        <Input
          type={type}
          placeholder={placeholder}
          value={form[key] as string}
          onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
          className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-600 h-8 text-sm"
        />
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Produtos</h1>
          <p className="text-sm text-zinc-500 mt-1">
            {total} {total === 1 ? 'produto cadastrado' : 'produtos cadastrados'}
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Novo Produto
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        {/* Nome */}
        <div className="relative min-w-[180px] flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
          <Input
            placeholder="Buscar por nome..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="pl-9 bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600"
          />
        </div>

        {/* SKU */}
        <div className="relative min-w-[140px]">
          <Input
            placeholder="SKU"
            value={filterSku}
            onChange={(e) => { setFilterSku(e.target.value); setPage(1) }}
            className="bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 font-mono text-sm"
          />
        </div>

        {/* Plataforma */}
        <AsyncCombobox
          url={`${BACKEND_URL}/api/admin/plataformas/`}
          value={filterPlatform}
          onChange={(v) => { setFilterPlatform(v); setPage(1) }}
          placeholder="Todas as plataformas"
        />

        {/* Categoria */}
        <AsyncCombobox
          url={`${BACKEND_URL}/api/admin/categorias/`}
          value={filterCategory}
          onChange={(v) => { setFilterCategory(v); setPage(1) }}
          placeholder="Todas as categorias"
        />

        {/* Ativo/Inativo */}
        <div className="flex gap-2">
          {(['', '1', '0'] as const).map((v) => (
            <button
              key={v}
              onClick={() => { setActiveFilter(v); setPage(1) }}
              className={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                activeFilter === v
                  ? 'bg-violet-600/20 border-violet-600/40 text-violet-300'
                  : 'border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700'
              }`}
            >
              {v === '' ? 'Todos' : v === '1' ? 'Ativos' : 'Inativos'}
            </button>
          ))}
        </div>
      </div>

      {/* Load error */}
      {loadError && (
        <div className="bg-red-900/20 border border-red-800/40 rounded-xl px-4 py-3 text-sm text-red-400">
          {loadError}
        </div>
      )}

      {/* Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider w-10" />
                <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                  Produto
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider hidden md:table-cell">
                  Plataforma
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider hidden lg:table-cell">
                  Preço
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider hidden lg:table-cell">
                  Estoque
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {loading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-4 py-3">
                        <div className="w-8 h-8 rounded bg-zinc-800" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="h-4 w-48 bg-zinc-800 rounded mb-1.5" />
                        <div className="h-3 w-24 bg-zinc-800 rounded" />
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <div className="h-3 w-20 bg-zinc-800 rounded" />
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <div className="h-3 w-16 bg-zinc-800 rounded" />
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <div className="h-3 w-8 bg-zinc-800 rounded" />
                      </td>
                      <td className="px-4 py-3" />
                    </tr>
                  ))
                : products.length === 0
                ? null
                : products.map((p) => (
                    <tr key={p.id} className="hover:bg-zinc-800/40 transition-colors">
                      <td className="px-4 py-3">
                        {p.image_url ? (
                          <img
                            src={p.image_url}
                            alt={p.name}
                            className="w-8 h-8 rounded object-cover bg-zinc-800"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded bg-zinc-800 flex items-center justify-center text-zinc-600 text-xs">
                            ?
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-white font-medium leading-snug line-clamp-1 max-w-[220px]">
                          {p.name}
                        </p>
                        <p className="text-xs text-zinc-600 font-mono">{p.sku}</p>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        {p.platform && (
                          <span className="text-xs text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded-full">
                            {p.platform}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className="text-sm text-white">{formatPrice(p.price)}</span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span
                          className={`text-xs font-medium ${
                            p.in_stock ? 'text-green-400' : 'text-red-400'
                          }`}
                        >
                          {p.stock}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEdit(p)}
                            className="p-1 rounded text-zinc-500 hover:text-violet-400 hover:bg-zinc-800 transition-colors"
                            title="Editar produto"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => toggleActive(p)}
                            disabled={togglingId === p.id}
                            className="disabled:opacity-50"
                          >
                            {p.is_active ? (
                              <ToggleRight className="w-5 h-5 text-green-400" />
                            ) : (
                              <ToggleLeft className="w-5 h-5 text-zinc-600" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
          {!loading && products.length === 0 && (
            <p className="px-6 py-12 text-center text-sm text-zinc-500">
              Nenhum produto encontrado.
            </p>
          )}
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4">
        <p className="text-xs text-zinc-500">
          Página {page} de {totalPages} &mdash; {total} produtos
        </p>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setPage(1)}
            disabled={page === 1}
            className="px-2 py-1 rounded text-xs text-zinc-400 hover:text-white disabled:opacity-30 border border-zinc-800 hover:border-zinc-600 transition-colors"
          >
            «
          </button>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-2 py-1 rounded text-xs text-zinc-400 hover:text-white disabled:opacity-30 border border-zinc-800 hover:border-zinc-600 transition-colors"
          >
            ‹
          </button>
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            const start = Math.max(1, Math.min(page - 2, totalPages - 4))
            return start + i
          }).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`px-2.5 py-1 rounded text-xs border transition-colors ${
                p === page
                  ? 'bg-violet-600 border-violet-600 text-white'
                  : 'text-zinc-400 hover:text-white border-zinc-800 hover:border-zinc-600'
              }`}
            >
              {p}
            </button>
          ))}
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-2 py-1 rounded text-xs text-zinc-400 hover:text-white disabled:opacity-30 border border-zinc-800 hover:border-zinc-600 transition-colors"
          >
            ›
          </button>
          <button
            onClick={() => setPage(totalPages)}
            disabled={page === totalPages}
            className="px-2 py-1 rounded text-xs text-zinc-400 hover:text-white disabled:opacity-30 border border-zinc-800 hover:border-zinc-600 transition-colors"
          >
            »
          </button>
        </div>
      </div>

      {/* Modal: Novo / Editar Produto */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="bg-zinc-950 border border-zinc-800 text-white max-w-5xl w-[95vw] min-h-[70vh] max-h-[90vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="px-6 pt-5 pb-4 border-b border-zinc-800 shrink-0">
            <DialogTitle className="text-lg font-semibold text-white">
              {editMode === 'edit' ? 'Editar Produto' : 'Novo Produto'}
            </DialogTitle>
          </DialogHeader>

          {/* Tabs + Content */}
          <div className="flex flex-1 min-h-0">

            {/* Left tabs */}
            <div className="flex flex-col gap-1 w-44 shrink-0 border-r border-zinc-800 p-4">
              {(['cadastro', 'ficha', 'imagens'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === tab
                      ? 'bg-violet-600/20 text-violet-300 border border-violet-600/30'
                      : 'text-zinc-500 hover:text-white hover:bg-zinc-800 border border-transparent'
                  }`}
                >
                  {tab === 'cadastro' ? 'Cadastro' : tab === 'ficha' ? 'Ficha técnica' : 'Imagens'}
                </button>
              ))}
            </div>

            {/* Scrollable content area */}
            <div className="flex-1 overflow-y-auto p-6">

              {/* -- TAB: CADASTRO -- */}
              {activeTab === 'cadastro' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    {field('Nome', 'name', { required: true, placeholder: 'Ex: PlayStation 5 Slim' })}
                  </div>
                  {field('SKU', 'sku', { required: true, placeholder: 'Ex: PS5-SLIM-001' })}
                  {field('Preço (R$)', 'price', { type: 'number', required: true, placeholder: '0.00' })}
                  {field('Preço Antigo (R$)', 'old_price', { type: 'number', placeholder: '0.00' })}
                  {field('Preço PIX (R$)', 'pix_price', { type: 'number', placeholder: '0.00' })}
                  {field('Parcelas', 'installments', { type: 'number', placeholder: '10' })}
                  {field('Estoque', 'stock', { type: 'number', placeholder: '0' })}

                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Plataforma</label>
                    <SearchableSelect
                      value={form.platform}
                      onChange={(v) => setForm((f) => ({ ...f, platform: v, subplatform: '' }))}
                      options={platforms.map((p) => ({ label: p.name, value: p.name }))}
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Subplataforma</label>
                    <select
                      value={form.subplatform}
                      onChange={(e) => setForm((f) => ({ ...f, subplatform: e.target.value }))}
                      disabled={subplatformOptions.length === 0}
                      className="w-full bg-zinc-900 border border-zinc-700 text-white rounded-md h-8 text-sm px-2 disabled:opacity-40"
                    >
                      <option value="">{subplatformOptions.length === 0 ? (form.platform ? '— Sem subplataformas —' : '— Selecione a plataforma —') : '— Nenhuma —'}</option>
                      {subplatformOptions.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Categoria</label>
                    <SearchableSelect
                      value={form.category}
                      onChange={(v) => setForm((f) => ({ ...f, category: v }))}
                      options={categories.map((c) => ({ label: c.name, value: c.name }))}
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Condição</label>
                    <select
                      value={form.condition}
                      onChange={(e) => setForm((f) => ({ ...f, condition: e.target.value }))}
                      className="w-full bg-zinc-900 border border-zinc-700 text-white rounded-md h-8 text-sm px-2"
                    >
                      <option value="Novo">Novo</option>
                      <option value="Seminovo">Seminovo</option>
                      <option value="Usado">Usado</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-3 pt-5">
                    <button type="button" onClick={() => setForm((f) => ({ ...f, is_active: !f.is_active }))}>
                      {form.is_active
                        ? <ToggleRight className="w-7 h-7 text-green-400" />
                        : <ToggleLeft className="w-7 h-7 text-zinc-600" />}
                    </button>
                    <span className="text-sm text-zinc-400">
                      {form.is_active ? 'Produto ativo' : 'Produto inativo'}
                    </span>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs text-zinc-400 mb-1">Descrição</label>
                    <textarea
                      rows={3}
                      placeholder="Descrição do produto..."
                      value={form.description}
                      onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                      className="w-full bg-zinc-900 border border-zinc-700 text-white rounded-md text-sm px-3 py-2 placeholder:text-zinc-600 resize-none focus:outline-none focus:ring-1 focus:ring-violet-600"
                    />
                  </div>
                </div>
              )}

              {/* -- TAB: FICHA TÉCNICA -- */}
              {activeTab === 'ficha' && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm text-zinc-400">
                      Adicione pares de atributo e valor do produto.
                    </p>
                    <button
                      type="button"
                      onClick={() => setTechSpecs((prev) => [...prev, { label: '', value: '' }])}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-zinc-700 text-xs text-zinc-300 hover:text-white hover:border-zinc-500 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Adicionar campo
                    </button>
                  </div>

                  <div className="space-y-3">
                    {techSpecs.map((item, index) => (
                      <div key={index} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3 items-end">
                        <div>
                          <label className="block text-xs text-zinc-400 mb-1">Atributo</label>
                          <Input
                            placeholder="Ex: Armazenamento"
                            value={item.label}
                            onChange={(e) =>
                              setTechSpecs((prev) =>
                                prev.map((row, i) => (i === index ? { ...row, label: e.target.value } : row))
                              )
                            }
                            className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-600 h-8 text-sm"
                          />
                        </div>

                        <div>
                          <label className="block text-xs text-zinc-400 mb-1">Valor</label>
                          <Input
                            placeholder="Ex: 1 TB SSD"
                            value={item.value}
                            onChange={(e) =>
                              setTechSpecs((prev) =>
                                prev.map((row, i) => (i === index ? { ...row, value: e.target.value } : row))
                              )
                            }
                            className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-600 h-8 text-sm"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            setTechSpecs((prev) =>
                              prev.length === 1 ? [{ label: '', value: '' }] : prev.filter((_, i) => i !== index)
                            )
                          }
                          className="h-8 px-3 rounded-lg border border-red-800/50 text-xs text-red-400 hover:border-red-700 hover:text-red-300 transition-colors"
                        >
                          Remover
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* -- TAB: IMAGENS -- */}
              {activeTab === 'imagens' && (
                <div className="space-y-8">

                  {/* Imagem de capa */}
                  <div>
                    <p className="text-sm font-semibold text-zinc-300 mb-3">
                      Imagem de Capa
                      <span className="ml-2 text-xs font-normal text-zinc-600">(apenas 1)</span>
                    </p>
                    <div className="flex items-start gap-5">
                      <div
                        onClick={() => coverInputRef.current?.click()}
                        className="relative w-48 h-48 rounded-xl border-2 border-dashed border-zinc-700 hover:border-violet-600 bg-zinc-900 overflow-hidden flex items-center justify-center cursor-pointer transition-colors group shrink-0"
                      >
                        {coverPreview ? (
                          <>
                            <img src={coverPreview} alt="capa" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <Upload className="w-6 h-6 text-white" />
                            </div>
                          </>
                        ) : (
                          <div className="flex flex-col items-center gap-2 text-zinc-600 group-hover:text-zinc-400 transition-colors">
                            <ImageIcon className="w-8 h-8" />
                            <span className="text-xs text-center">Clique para escolher</span>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-2 justify-center h-48">
                        <p className="text-xs text-zinc-500">JPG, PNG ou WebP · máx. 5 MB</p>
                        <button
                          type="button"
                          onClick={() => coverInputRef.current?.click()}
                          className="px-3 py-1.5 rounded-lg border border-zinc-700 text-xs text-zinc-300 hover:text-white hover:border-zinc-500 transition-colors"
                        >
                          {coverPreview ? 'Trocar imagem' : 'Escolher imagem'}
                        </button>
                        {coverFile && (
                          <button
                            type="button"
                            onClick={() => {
                              setCoverFile(null)
                              setCoverPreview(null)
                              if (coverInputRef.current) coverInputRef.current.value = ''
                            }}
                            className="px-3 py-1.5 rounded-lg border border-red-800/50 text-xs text-red-400 hover:border-red-700 hover:text-red-300 transition-colors"
                          >
                            Remover
                          </button>
                        )}
                      </div>
                    </div>
                    <input
                      ref={coverInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleCoverChange}
                    />
                  </div>

                  {/* Galeria */}
                  <div>
                    <p className="text-sm font-semibold text-zinc-300 mb-3">
                      Imagens do Produto
                      <span className="ml-2 text-xs font-normal text-zinc-600">(máx. 3)</span>
                    </p>
                    <div className="flex gap-4">
                      {[0, 1, 2].map((i) => (
                        <div key={i} className="relative group">
                          <div
                            onClick={() => { setGallerySlot(i); galleryInputRef.current?.click() }}
                            className="w-40 h-40 rounded-xl border-2 border-dashed border-zinc-700 hover:border-violet-600 bg-zinc-900 overflow-hidden flex items-center justify-center cursor-pointer transition-colors"
                          >
                            {galleryPreviews[i] ? (
                              <>
                                <img src={galleryPreviews[i]!} alt={`galeria ${i + 1}`} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 rounded-xl bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <Upload className="w-5 h-5 text-white" />
                                </div>
                              </>
                            ) : (
                              <div className="flex flex-col items-center gap-1 text-zinc-700 hover:text-zinc-500 transition-colors">
                                <Plus className="w-6 h-6" />
                                <span className="text-[10px]">Foto {i + 1}</span>
                              </div>
                            )}
                          </div>
                          {galleryPreviews[i] && (
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); removeGallerySlot(i) }}
                              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-zinc-900 border border-zinc-600 flex items-center justify-center text-zinc-400 hover:text-red-400 hover:border-red-600 transition-colors z-10"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    <input
                      ref={galleryInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleGalleryChange}
                    />
                    <p className="text-xs text-zinc-600 mt-3">
                      Clique em cada slot para escolher ou trocar a imagem.
                    </p>
                  </div>

                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          {formError && (
            <p className="text-xs text-red-400 mx-6 mb-0 mt-2 bg-red-900/20 border border-red-800/30 rounded-lg px-3 py-2 shrink-0">
              {formError}
            </p>
          )}
          <div className="flex justify-end gap-3 px-6 py-4 border-t border-zinc-800 shrink-0">
            <button
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 rounded-lg text-sm text-zinc-400 hover:text-white border border-zinc-800 hover:border-zinc-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium disabled:opacity-50 transition-colors"
            >
              {saving ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : editMode === 'edit' ? (
                <Pencil className="w-4 h-4" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              {editMode === 'edit' ? 'Salvar Alterações' : 'Cadastrar'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}




