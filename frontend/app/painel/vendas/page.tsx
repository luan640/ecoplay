'use client'

import { apiFetch } from '@/lib/api'
import { getBackendUrl } from '@/lib/backend-url'
import { useEffect, useState, useCallback, useRef } from 'react'
import { Search, X, Pencil, Trash2, Plus, Check, ChevronRight, ChevronLeft, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'

const BACKEND_URL = getBackendUrl()

type SaleStatus = 'pendente' | 'em_andamento' | 'finalizada' | 'cancelada'
type PaymentMethod =
  | 'nao_definido'
  | 'pix'
  | 'cartao'
  | 'boleto'
  | 'dinheiro'
  | 'transferencia'

interface Sale {
  id: number
  protocol: string
  customer_name: string
  customer_email: string
  customer_phone: string
  status: SaleStatus
  payment_method: PaymentMethod
  items_count: number
  total_amount: string
  coupon_code: string
  discount_amount: string
  created_at: string
  finalized_at: string | null
}

interface SaleItem {
  id: number
  product_id: number | null
  product_name: string
  platform: string
  quantity: number
  unit_price: string
  total_price: string
}

interface SaleDetail extends Sale {
  customer_city: string
  customer_state: string
  admin_notes: string
  items: SaleItem[]
}

const PAYMENT_OPTIONS: Array<{ value: PaymentMethod; label: string }> = [
  { value: 'nao_definido', label: 'Não definido' },
  { value: 'pix', label: 'Pix' },
  { value: 'cartao', label: 'Cartão' },
  { value: 'boleto', label: 'Boleto' },
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'transferencia', label: 'Transferência' },
]

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function formatCurrency(value: string) {
  const num = parseFloat(value || '0')
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

// ---------------------------------------------------------------------------
// Product search picker
// ---------------------------------------------------------------------------

interface ProductSearchResult {
  id: number
  name: string
  sku: string
  price: string
  image_url: string | null
}

function ProductSearchPicker({
  selectedName,
  onSelect,
  onClear,
}: {
  selectedName: string
  onSelect: (p: ProductSearchResult) => void
  onClear: () => void
}) {
  const [query, setQuery] = useState(selectedName)
  const [results, setResults] = useState<ProductSearchResult[]>([])
  const [open, setOpen] = useState(false)
  const [confirmed, setConfirmed] = useState(!!selectedName)
  const [loading, setLoading] = useState(false)
  const confirmedNameRef = useRef(selectedName)

  useEffect(() => {
    setQuery(selectedName)
    setConfirmed(!!selectedName)
    confirmedNameRef.current = selectedName
  }, [selectedName])

  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      setLoading(false)
      return
    }
    setLoading(true)
    const t = setTimeout(() => {
      apiFetch(`${BACKEND_URL}/api/admin/produtos/search/?q=${encodeURIComponent(query)}`)
        .then((r) => (r.ok ? r.json() : []))
        .then((data) => {
          setResults(data)
          setLoading(false)
        })
        .catch(() => {
          setResults([])
          setLoading(false)
        })
    }, 250)
    return () => clearTimeout(t)
  }, [query])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setQuery(e.target.value)
    setConfirmed(false)
    setOpen(true)
    onClear()
  }

  function handleSelect(p: ProductSearchResult) {
    setQuery(p.name)
    confirmedNameRef.current = p.name
    setConfirmed(true)
    setOpen(false)
    setResults([])
    onSelect(p)
  }

  function handleBlur() {
    setTimeout(() => {
      setOpen(false)
      if (!confirmed) {
        setQuery(confirmedNameRef.current)
        if (!confirmedNameRef.current) onClear()
      }
    }, 150)
  }

  const borderClass = confirmed
    ? 'border-violet-500 focus:ring-violet-500'
    : 'border-zinc-700 focus:ring-violet-600'

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 pointer-events-none" />
        <input
          value={query}
          onChange={handleChange}
          onFocus={() => {
            if (!confirmed && query.trim()) setOpen(true)
          }}
          onBlur={handleBlur}
          placeholder="Buscar produto..."
          className={`w-full bg-zinc-900 border text-white rounded-md text-sm pl-7 ${
            confirmed ? 'pr-7' : 'pr-2'
          } py-1.5 focus:outline-none focus:ring-1 ${borderClass}`}
        />
        {confirmed && (
          <Check className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-violet-400 pointer-events-none" />
        )}
      </div>
      {open && (
        <div className="absolute z-50 top-full mt-1 w-full bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl max-h-52 overflow-y-auto">
          {loading ? (
            <p className="px-3 py-2 text-xs text-zinc-500">Buscando...</p>
          ) : results.length === 0 ? (
            <p className="px-3 py-2 text-xs text-zinc-500">Nenhum produto encontrado.</p>
          ) : (
            results.map((p) => (
              <button
                key={p.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelect(p)}
                className="w-full text-left px-3 py-2 hover:bg-zinc-800 flex items-center gap-2"
              >
                {p.image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.image_url} alt="" className="w-8 h-8 object-contain rounded shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="text-sm text-white truncate">{p.name}</p>
                  <p className="text-[10px] text-zinc-500">
                    {p.sku} · R$ {parseFloat(p.price).toFixed(2)}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Kanban config
// ---------------------------------------------------------------------------

const KANBAN_COLUMNS: Array<{
  status: SaleStatus
  label: string
  color: string
  dot: string
}> = [
  { status: 'pendente', label: 'Pendente', color: 'border-amber-500/40 bg-amber-500/5', dot: 'bg-amber-400' },
  { status: 'em_andamento', label: 'Em andamento', color: 'border-blue-500/40 bg-blue-500/5', dot: 'bg-blue-400' },
  { status: 'finalizada', label: 'Finalizada', color: 'border-green-500/40 bg-green-500/5', dot: 'bg-green-400' },
  { status: 'cancelada', label: 'Cancelada', color: 'border-red-500/40 bg-red-500/5', dot: 'bg-red-400' },
]

function nextStatus(s: SaleStatus): SaleStatus | null {
  if (s === 'pendente') return 'em_andamento'
  if (s === 'em_andamento') return 'finalizada'
  return null
}

function prevStatus(s: SaleStatus): SaleStatus | null {
  if (s === 'em_andamento') return 'pendente'
  if (s === 'finalizada') return 'em_andamento'
  return null
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function VendasPage() {
  const [columns, setColumns] = useState<Record<SaleStatus, Sale[]>>({
    pendente: [],
    em_andamento: [],
    finalizada: [],
    cancelada: [],
  })
  const [loadingCols, setLoadingCols] = useState<Record<SaleStatus, boolean>>({
    pendente: true,
    em_andamento: true,
    finalizada: true,
    cancelada: true,
  })
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  // Detail panel
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [detail, setDetail] = useState<SaleDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [adminNotes, setAdminNotes] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('nao_definido')
  const [saleStatus, setSaleStatus] = useState<SaleStatus>('pendente')
  const [saveError, setSaveError] = useState('')

  // Item editing
  const [editingItemId, setEditingItemId] = useState<number | null>(null)
  const [editItemData, setEditItemData] = useState<{
    product_id: number | null
    product_name: string
    quantity: string
    unit_price: string
  }>({ product_id: null, product_name: '', quantity: '1', unit_price: '0' })
  const [addingItem, setAddingItem] = useState(false)
  const [newItemData, setNewItemData] = useState<{
    product_id: number | null
    product_name: string
    quantity: string
    unit_price: string
  }>({ product_id: null, product_name: '', quantity: '1', unit_price: '0' })
  const [itemSaving, setItemSaving] = useState(false)
  const [itemError, setItemError] = useState('')
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<{ id: number; name: string } | null>(null)

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350)
    return () => clearTimeout(t)
  }, [search])

  const loadColumn = useCallback((status: SaleStatus, q: string) => {
    setLoadingCols((prev) => ({ ...prev, [status]: true }))
    const params = new URLSearchParams({ status, per_page: '100' })
    if (q) params.set('q', q)
    apiFetch(`${BACKEND_URL}/api/admin/vendas/?${params}`)
      .then((r) => (r.ok ? r.json() : { results: [] }))
      .then((data) => setColumns((prev) => ({ ...prev, [status]: data.results ?? [] })))
      .catch(() => setColumns((prev) => ({ ...prev, [status]: [] })))
      .finally(() => setLoadingCols((prev) => ({ ...prev, [status]: false })))
  }, [])

  // Load all columns when search changes
  useEffect(() => {
    const statuses: SaleStatus[] = ['pendente', 'em_andamento', 'finalizada', 'cancelada']
    statuses.forEach((s) => loadColumn(s, debouncedSearch))
  }, [debouncedSearch, loadColumn])

  // Load detail when card clicked
  useEffect(() => {
    if (selectedId == null) {
      setDetail(null)
      return
    }
    setDetailLoading(true)
    apiFetch(`${BACKEND_URL}/api/admin/vendas/${selectedId}/`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        setDetail(data)
        setAdminNotes(data.admin_notes || '')
        setPaymentMethod(data.payment_method || 'nao_definido')
        setSaleStatus(data.status || 'pendente')
        setEditingItemId(null)
        setAddingItem(false)
        setItemError('')
      })
      .catch(() => setDetail(null))
      .finally(() => setDetailLoading(false))
  }, [selectedId])

  async function moveCard(sale: Sale, toStatus: SaleStatus) {
    // Optimistic update: move card immediately in local state
    const updatedSale: Sale = { ...sale, status: toStatus }
    setColumns((prev) => ({
      ...prev,
      [sale.status]: prev[sale.status].filter((s) => s.id !== sale.id),
      [toStatus]: [updatedSale, ...prev[toStatus]],
    }))
    if (selectedId === sale.id) setSaleStatus(toStatus)

    try {
      const res = await apiFetch(`${BACKEND_URL}/api/admin/vendas/${sale.id}/`, {
        method: 'PATCH',
        body: JSON.stringify({ status: toStatus }),
      })
      if (!res.ok) {
        // Revert on failure
        setColumns((prev) => ({
          ...prev,
          [toStatus]: prev[toStatus].filter((s) => s.id !== sale.id),
          [sale.status]: [sale, ...prev[sale.status]],
        }))
        if (selectedId === sale.id) setSaleStatus(sale.status)
      } else if (selectedId === sale.id) {
        const data = await res.json().catch(() => null)
        if (data) setDetail(data)
      }
    } catch {
      // Revert on network error
      setColumns((prev) => ({
        ...prev,
        [toStatus]: prev[toStatus].filter((s) => s.id !== sale.id),
        [sale.status]: [sale, ...prev[sale.status]],
      }))
      if (selectedId === sale.id) setSaleStatus(sale.status)
    }
  }

  async function handleSaveItem(itemId: number) {
    if (!detail) return
    setItemSaving(true)
    setItemError('')
    try {
      const res = await apiFetch(`${BACKEND_URL}/api/admin/vendas/${detail.id}/items/${itemId}/`, {
        method: 'PATCH',
        body: JSON.stringify({
          product_id: editItemData.product_id,
          product_name: editItemData.product_name,
          quantity: parseInt(editItemData.quantity) || 1,
          unit_price: editItemData.unit_price,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setItemError(data?.detail || 'Erro ao salvar item.')
        return
      }
      setDetail(data)
      setEditingItemId(null)
    } finally {
      setItemSaving(false)
    }
  }

  async function handleDeleteItem(itemId: number) {
    if (!detail) return
    setItemSaving(true)
    setItemError('')
    try {
      const res = await apiFetch(`${BACKEND_URL}/api/admin/vendas/${detail.id}/items/${itemId}/`, {
        method: 'DELETE',
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setItemError(data?.detail || 'Erro ao remover item.')
        return
      }
      setDetail(data)
    } finally {
      setItemSaving(false)
    }
  }

  async function handleAddItem() {
    if (!detail) return
    setItemSaving(true)
    setItemError('')
    try {
      const res = await apiFetch(`${BACKEND_URL}/api/admin/vendas/${detail.id}/items/`, {
        method: 'POST',
        body: JSON.stringify({
          product_id: newItemData.product_id,
          product_name: newItemData.product_name,
          quantity: parseInt(newItemData.quantity) || 1,
          unit_price: newItemData.unit_price,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setItemError(data?.detail || 'Erro ao adicionar item.')
        return
      }
      setDetail(data)
      setAddingItem(false)
      setNewItemData({ product_id: null, product_name: '', quantity: '1', unit_price: '0' })
    } finally {
      setItemSaving(false)
    }
  }

  async function handleSave() {
    if (!detail) return
    setSaving(true)
    setSaveError('')
    try {
      const res = await apiFetch(`${BACKEND_URL}/api/admin/vendas/${detail.id}/`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: saleStatus,
          payment_method: paymentMethod,
          admin_notes: adminNotes,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setSaveError(data?.detail || 'Não foi possível salvar.')
        return
      }
      setDetail(data)
      loadColumn(data.status, debouncedSearch)
      if (data.status !== detail.status) loadColumn(detail.status, debouncedSearch)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap shrink-0">
        <h1 className="text-2xl font-bold text-white">Vendas</h1>
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
          <input
            placeholder="Buscar por nome ou e-mail..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-zinc-900 border border-zinc-800 text-white text-sm rounded-xl placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-600"
          />
        </div>
      </div>

      {/* Kanban board */}
      <div className="flex gap-4 flex-1 overflow-x-auto min-h-0 pb-2">
        {KANBAN_COLUMNS.map((col) => {
          const cards = columns[col.status]
          const isLoading = loadingCols[col.status]
          return (
            <div
              key={col.status}
              className={`flex flex-col rounded-2xl border ${col.color} min-w-[260px] w-[260px] shrink-0`}
            >
              {/* Column header */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5">
                <span className={`w-2 h-2 rounded-full shrink-0 ${col.dot}`} />
                <span className="text-sm font-semibold text-white">{col.label}</span>
                <span className="ml-auto text-xs text-zinc-500 font-mono">
                  {isLoading ? '…' : cards.length}
                </span>
              </div>

              {/* Cards */}
              <div className="flex flex-col gap-2 p-3 overflow-y-auto flex-1">
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="rounded-xl bg-zinc-800/60 p-3 animate-pulse h-20" />
                  ))
                ) : cards.length === 0 ? (
                  <p className="text-xs text-zinc-600 text-center py-6">Nenhuma venda</p>
                ) : (
                  cards.map((card) => {
                    const next = nextStatus(card.status)
                    const prev = prevStatus(card.status)
                    const isCancelada = card.status === 'cancelada'
                    return (
                      <div
                        key={card.id}
                        onClick={() => setSelectedId(selectedId === card.id ? null : card.id)}
                        className={`rounded-xl border bg-zinc-900 p-3 cursor-pointer transition-all hover:border-zinc-600 select-none ${
                          selectedId === card.id
                            ? 'border-violet-500 ring-1 ring-violet-500/40'
                            : 'border-zinc-800'
                        }`}
                      >
                        <p className="text-sm font-medium text-white truncate">
                          {card.customer_name || 'Cliente'}
                        </p>
                        <p className="text-xs text-zinc-500 mt-0.5">{formatDate(card.created_at)}</p>
                        <p className="text-sm font-semibold text-violet-300 mt-2">
                          {formatCurrency(card.total_amount)}
                        </p>

                        {/* Move buttons */}
                        <div
                          className="flex gap-1.5 mt-3"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {prev && (
                            <button
                              onClick={() => moveCard(card, prev)}
                              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] text-zinc-400 bg-zinc-800 hover:bg-zinc-700 hover:text-white transition-colors"
                            >
                              <ChevronLeft className="w-3 h-3" />
                              Voltar
                            </button>
                          )}
                          {next && (
                            <button
                              onClick={() => moveCard(card, next)}
                              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] text-zinc-900 bg-violet-400 hover:bg-violet-300 transition-colors ml-auto"
                            >
                              Avançar
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          )}
                          {isCancelada && (
                            <button
                              onClick={() => moveCard(card, 'pendente')}
                              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] text-zinc-400 bg-zinc-800 hover:bg-zinc-700 hover:text-white transition-colors"
                            >
                              <RotateCcw className="w-3 h-3" />
                              Restaurar
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Detail slide-over */}
      {selectedId !== null && (
        <div className="fixed inset-y-0 right-0 z-40 flex">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setSelectedId(null)}
          />
          <div className="relative ml-auto w-full max-w-[480px] bg-zinc-950 border-l border-zinc-800 flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 shrink-0">
              <h2 className="text-base font-semibold text-white">Detalhes da venda</h2>
              <button
                onClick={() => setSelectedId(null)}
                className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {detailLoading ? (
              <div className="flex-1 p-6 space-y-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-4 bg-zinc-800 rounded animate-pulse" />
                ))}
              </div>
            ) : !detail ? (
              <p className="flex-1 flex items-center justify-center text-sm text-zinc-500">
                Erro ao carregar detalhes.
              </p>
            ) : (
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {/* Info */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-2">
                  <p className="text-xs text-zinc-500">Protocolo</p>
                  <p className="text-sm font-mono text-zinc-200">{detail.protocol}</p>
                  <p className="text-xs text-zinc-500">Cliente</p>
                  <p className="text-sm text-white">{detail.customer_name || 'Não informado'}</p>
                  <p className="text-xs text-zinc-500">E-mail</p>
                  <p className="text-sm text-zinc-300">{detail.customer_email || 'Não informado'}</p>
                  <p className="text-xs text-zinc-500">Telefone</p>
                  <p className="text-sm text-zinc-300">{detail.customer_phone || 'Não informado'}</p>
                </div>

                {/* Items */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-zinc-500">Itens</p>
                    <button
                      onClick={() => {
                        setAddingItem(true)
                        setNewItemData({ product_id: null, product_name: '', quantity: '1', unit_price: '0' })
                      }}
                      className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 transition-colors"
                    >
                      <Plus className="w-3 h-3" /> Adicionar item
                    </button>
                  </div>

                  {detail.items.map((it) =>
                    editingItemId === it.id ? (
                      <div key={it.id} className="rounded-lg border border-violet-500/50 bg-zinc-800/60 p-3 space-y-2">
                        <ProductSearchPicker
                          selectedName={editItemData.product_name}
                          onSelect={(p) =>
                            setEditItemData((d) => ({
                              ...d,
                              product_id: p.id,
                              product_name: p.name,
                              unit_price: p.price,
                            }))
                          }
                          onClear={() => setEditItemData((d) => ({ ...d, product_id: null, product_name: '' }))}
                        />
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <label className="block text-[10px] text-zinc-500 mb-0.5">Qtd</label>
                            <input
                              type="number"
                              min="1"
                              value={editItemData.quantity}
                              onChange={(e) => setEditItemData((d) => ({ ...d, quantity: e.target.value }))}
                              className="w-full bg-zinc-900 border border-zinc-700 text-white rounded-md text-sm px-2 py-1 focus:outline-none focus:ring-1 focus:ring-violet-600"
                            />
                          </div>
                          <div className="flex-1">
                            <label className="block text-[10px] text-zinc-500 mb-0.5">Preço unit. (R$)</label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={editItemData.unit_price}
                              onChange={(e) => setEditItemData((d) => ({ ...d, unit_price: e.target.value }))}
                              className="w-full bg-zinc-900 border border-zinc-700 text-white rounded-md text-sm px-2 py-1 focus:outline-none focus:ring-1 focus:ring-violet-600"
                            />
                          </div>
                        </div>
                        <div className="flex gap-2 pt-1">
                          <Button
                            size="sm"
                            onClick={() => handleSaveItem(it.id)}
                            disabled={itemSaving}
                            className="flex-1 h-7 text-xs bg-violet-600 hover:bg-violet-500 text-white"
                          >
                            <Check className="w-3 h-3 mr-1" />
                            {itemSaving ? 'Salvando...' : 'Confirmar'}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingItemId(null)}
                            disabled={itemSaving}
                            className="h-7 text-xs text-zinc-400 hover:text-white"
                          >
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div
                        key={it.id}
                        className="group rounded-lg border border-zinc-800 p-3 flex items-start justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <p className="text-sm text-white">{it.product_name}</p>
                          <p className="text-xs text-zinc-500">
                            Qtd: {it.quantity} · {formatCurrency(it.unit_price)}/un · Total:{' '}
                            {formatCurrency(it.total_price)}
                          </p>
                        </div>
                        <div className="flex shrink-0 gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => {
                              setEditingItemId(it.id)
                              setEditItemData({
                                product_id: it.product_id,
                                product_name: it.product_name,
                                quantity: String(it.quantity),
                                unit_price: it.unit_price,
                              })
                            }}
                            className="p-1 rounded text-zinc-500 hover:text-violet-400 hover:bg-zinc-700 transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmItem({ id: it.id, name: it.product_name })}
                            disabled={itemSaving}
                            className="p-1 rounded text-zinc-500 hover:text-red-400 hover:bg-zinc-700 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )
                  )}

                  {addingItem && (
                    <div className="rounded-lg border border-violet-500/50 bg-zinc-800/60 p-3 space-y-2">
                      <p className="text-xs text-violet-400 font-medium">Novo item</p>
                      <ProductSearchPicker
                        selectedName={newItemData.product_name}
                        onSelect={(p) =>
                          setNewItemData((d) => ({
                            ...d,
                            product_id: p.id,
                            product_name: p.name,
                            unit_price: p.price,
                          }))
                        }
                        onClear={() => setNewItemData((d) => ({ ...d, product_id: null, product_name: '' }))}
                      />
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <label className="block text-[10px] text-zinc-500 mb-0.5">Qtd</label>
                          <input
                            type="number"
                            min="1"
                            value={newItemData.quantity}
                            onChange={(e) => setNewItemData((d) => ({ ...d, quantity: e.target.value }))}
                            className="w-full bg-zinc-900 border border-zinc-700 text-white rounded-md text-sm px-2 py-1 focus:outline-none focus:ring-1 focus:ring-violet-600"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="block text-[10px] text-zinc-500 mb-0.5">Preço unit. (R$)</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={newItemData.unit_price}
                            onChange={(e) => setNewItemData((d) => ({ ...d, unit_price: e.target.value }))}
                            className="w-full bg-zinc-900 border border-zinc-700 text-white rounded-md text-sm px-2 py-1 focus:outline-none focus:ring-1 focus:ring-violet-600"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2 pt-1">
                        <Button
                          size="sm"
                          onClick={handleAddItem}
                          disabled={itemSaving || !newItemData.product_name.trim()}
                          className="flex-1 h-7 text-xs bg-violet-600 hover:bg-violet-500 text-white"
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          {itemSaving ? 'Adicionando...' : 'Adicionar'}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setAddingItem(false)}
                          disabled={itemSaving}
                          className="h-7 text-xs text-zinc-400 hover:text-white"
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  )}

                  {itemError && <p className="text-xs text-red-400">{itemError}</p>}

                  <div className="border-t border-zinc-800 pt-3 text-sm text-zinc-300">
                    Desconto: <span className="text-violet-400">- {formatCurrency(detail.discount_amount)}</span>
                  </div>
                  <div className="text-base text-white font-semibold">
                    Total: {formatCurrency(detail.total_amount)}
                  </div>
                </div>

                {/* Edit sale meta */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Status</label>
                    <select
                      value={saleStatus}
                      onChange={(e) => setSaleStatus(e.target.value as SaleStatus)}
                      className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-md h-9 text-sm px-2"
                    >
                      <option value="pendente">Pendente</option>
                      <option value="em_andamento">Em andamento</option>
                      <option value="finalizada">Finalizada</option>
                      <option value="cancelada">Cancelada</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Meio de pagamento</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                      className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-md h-9 text-sm px-2"
                    >
                      {PAYMENT_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Observações internas</label>
                    <textarea
                      rows={3}
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-md text-sm px-3 py-2 placeholder:text-zinc-600 resize-none focus:outline-none focus:ring-1 focus:ring-violet-600"
                    />
                  </div>
                  {saveError && <p className="text-xs text-red-400">{saveError}</p>}
                  <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full bg-violet-600 hover:bg-violet-500 text-white"
                  >
                    {saving ? 'Salvando...' : 'Salvar venda'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete confirm modal */}
      {deleteConfirmItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-base font-semibold text-white mb-2">Remover item</h3>
            <p className="text-sm text-zinc-400 mb-6">
              Tem certeza que deseja remover{' '}
              <span className="text-white font-medium">{deleteConfirmItem.name}</span> desta venda?
              Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-3">
              <Button
                variant="ghost"
                className="flex-1 border border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800"
                onClick={() => setDeleteConfirmItem(null)}
                disabled={itemSaving}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1 bg-red-600 hover:bg-red-500 text-white"
                disabled={itemSaving}
                onClick={async () => {
                  await handleDeleteItem(deleteConfirmItem.id)
                  setDeleteConfirmItem(null)
                }}
              >
                {itemSaving ? 'Removendo...' : 'Remover'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
