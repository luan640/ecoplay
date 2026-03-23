'use client'

import { apiFetch } from '@/lib/api'
import { getBackendUrl } from '@/lib/backend-url'
import { useEffect, useState, useCallback, useRef } from 'react'
import {
  Search,
  Plus,
  X,
  Check,
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

const BACKEND_URL = getBackendUrl()

type MovementType = 'entrada' | 'saida'

interface StockMovement {
  id: number
  movement_type: MovementType
  product_id: number
  product_name: string
  product_sku: string
  quantity: number
  reason: string
  reference: string
  notes: string
  stock_before: number
  stock_after: number
  created_at: string
}

interface ApiResponse {
  count: number
  page: number
  per_page: number
  results: StockMovement[]
}

const REASON_OPTIONS = [
  { value: 'reposicao', label: 'Reposição' },
  { value: 'venda', label: 'Venda' },
  { value: 'devolucao', label: 'Devolução' },
  { value: 'cotacao', label: 'Cotação' },
  { value: 'ajuste_manual', label: 'Ajuste manual' },
  { value: 'perda', label: 'Perda / Avaria' },
  { value: 'outro', label: 'Outro' },
]

function reasonLabel(value: string) {
  return REASON_OPTIONS.find((r) => r.value === value)?.label ?? value
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ---------------------------------------------------------------------------
// Product search picker (inline)
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
  const confirmedRef = useRef(selectedName)

  useEffect(() => {
    setQuery(selectedName)
    setConfirmed(!!selectedName)
    confirmedRef.current = selectedName
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
        .then((data) => { setResults(data); setLoading(false) })
        .catch(() => { setResults([]); setLoading(false) })
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
    confirmedRef.current = p.name
    setConfirmed(true)
    setOpen(false)
    setResults([])
    onSelect(p)
  }

  function handleBlur() {
    setTimeout(() => {
      setOpen(false)
      if (!confirmed) {
        setQuery(confirmedRef.current)
        if (!confirmedRef.current) onClear()
      }
    }, 150)
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
        <input
          value={query}
          onChange={handleChange}
          onFocus={() => { if (!confirmed && query.trim()) setOpen(true) }}
          onBlur={handleBlur}
          placeholder="Buscar produto..."
          className={`w-full bg-zinc-900 border text-white rounded-lg text-sm pl-9 ${confirmed ? 'pr-9' : 'pr-3'} py-2 focus:outline-none focus:ring-1 ${
            confirmed ? 'border-violet-500 focus:ring-violet-500' : 'border-zinc-700 focus:ring-violet-600'
          }`}
        />
        {confirmed && (
          <Check className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-violet-400 pointer-events-none" />
        )}
      </div>
      {open && (
        <div className="absolute z-50 top-full mt-1 w-full bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl max-h-52 overflow-y-auto">
          {loading ? (
            <p className="px-3 py-2 text-xs text-zinc-500">Buscando...</p>
          ) : results.length === 0 ? (
            <p className="px-3 py-2 text-xs text-zinc-500">Nenhum produto encontrado.</p>
          ) : results.map((p) => (
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
                <p className="text-[10px] text-zinc-500">{p.sku}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

const EMPTY_FORM = {
  product_id: null as number | null,
  product_name: '',
  movement_type: 'entrada' as MovementType,
  quantity: '1',
  reason: 'reposicao',
  reference: '',
  notes: '',
}

export default function ExtratoPage() {
  const [movements, setMovements] = useState<StockMovement[]>([])
  const [loading, setLoading] = useState(true)
  const [count, setCount] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<'' | 'entrada' | 'saida'>('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const PER_PAGE = 50
  const totalPages = Math.max(1, Math.ceil(count / PER_PAGE))

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1) }, 350)
    return () => clearTimeout(t)
  }, [search])

  const loadMovements = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page) })
    if (debouncedSearch) params.set('q', debouncedSearch)
    if (typeFilter) params.set('type', typeFilter)
    if (dateFrom) params.set('date_from', dateFrom)
    if (dateTo) params.set('date_to', dateTo)

    apiFetch(`${BACKEND_URL}/api/admin/extrato/?${params}`)
      .then((r) => (r.ok ? r.json() : { count: 0, results: [] }))
      .then((data: ApiResponse) => {
        setMovements(data.results ?? [])
        setCount(data.count ?? 0)
      })
      .catch(() => setMovements([]))
      .finally(() => setLoading(false))
  }, [page, debouncedSearch, typeFilter, dateFrom, dateTo])

  useEffect(() => { loadMovements() }, [loadMovements])

  function openModal() {
    setForm({ ...EMPTY_FORM })
    setFormError('')
    setModalOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.product_id) { setFormError('Selecione um produto.'); return }
    const qty = parseInt(form.quantity)
    if (!qty || qty <= 0) { setFormError('Quantidade deve ser maior que zero.'); return }

    setSaving(true)
    setFormError('')
    try {
      const res = await apiFetch(`${BACKEND_URL}/api/admin/extrato/`, {
        method: 'POST',
        body: JSON.stringify({
          product_id: form.product_id,
          movement_type: form.movement_type,
          quantity: qty,
          reason: form.reason,
          reference: form.reference.trim(),
          notes: form.notes.trim(),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setFormError(data?.detail || 'Erro ao registrar movimentação.'); return }
      setModalOpen(false)
      setPage(1)
      loadMovements()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white">Extrato de Estoque</h1>
          <p className="text-sm text-zinc-500 mt-1">Histórico de entradas e saídas de produtos.</p>
        </div>
        <Button
          onClick={openModal}
          className="bg-violet-600 hover:bg-violet-500 text-white flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Registrar movimentação
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap items-center">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
          <input
            placeholder="Buscar por produto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-zinc-900 border border-zinc-800 text-white text-sm rounded-xl placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-600"
          />
        </div>
        {/* Type filter pills */}
        <div className="flex gap-2">
          {[
            { value: '', label: 'Todos' },
            { value: 'entrada', label: 'Entradas' },
            { value: 'saida', label: 'Saídas' },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => { setTypeFilter(opt.value as '' | 'entrada' | 'saida'); setPage(1) }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                typeFilter === opt.value
                  ? 'bg-violet-600 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Date range */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-zinc-500 whitespace-nowrap">De</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPage(1) }}
              className="bg-zinc-900 border border-zinc-800 text-white text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-violet-600 [color-scheme:dark]"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-zinc-500 whitespace-nowrap">Até</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPage(1) }}
              className="bg-zinc-900 border border-zinc-800 text-white text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-violet-600 [color-scheme:dark]"
            />
          </div>
          {(dateFrom || dateTo) && (
            <button
              onClick={() => { setDateFrom(''); setDateTo(''); setPage(1) }}
              className="p-1 rounded text-zinc-500 hover:text-white transition-colors"
              title="Limpar datas"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Summary badges */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800">
          <span className="w-2 h-2 rounded-full bg-zinc-500" />
          <span className="text-xs text-zinc-400">Total</span>
          <span className="text-sm font-semibold text-white ml-1">{count}</span>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-500/10 border border-green-500/20">
          <ArrowDown className="w-3.5 h-3.5 text-green-400" />
          <span className="text-xs text-green-400">Entradas</span>
          <span className="text-sm font-semibold text-green-300 ml-1">
            {movements.filter((m) => m.movement_type === 'entrada').length}
            {typeFilter === '' ? ' (pág.)' : ''}
          </span>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20">
          <ArrowUp className="w-3.5 h-3.5 text-red-400" />
          <span className="text-xs text-red-400">Saídas</span>
          <span className="text-sm font-semibold text-red-300 ml-1">
            {movements.filter((m) => m.movement_type === 'saida').length}
            {typeFilter === '' ? ' (pág.)' : ''}
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-xs text-zinc-500 uppercase tracking-wider">
                <th className="px-5 py-3 text-left">Tipo</th>
                <th className="px-5 py-3 text-left">Produto</th>
                <th className="px-5 py-3 text-left">Motivo</th>
                <th className="px-5 py-3 text-right">Qtd</th>
                <th className="px-5 py-3 text-center hidden md:table-cell">Estoque</th>
                <th className="px-5 py-3 text-left hidden lg:table-cell">Referência</th>
                <th className="px-5 py-3 text-left">Data</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-zinc-800/60">
                    {Array.from({ length: 7 }).map((__, j) => (
                      <td key={j} className="px-5 py-3">
                        <div className="h-3 bg-zinc-800 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : movements.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-zinc-600 text-sm">
                    Nenhuma movimentação registrada.
                  </td>
                </tr>
              ) : (
                movements.map((m) => (
                  <tr
                    key={m.id}
                    className="border-b border-zinc-800/60 hover:bg-zinc-800/30 transition-colors"
                  >
                    {/* Type badge */}
                    <td className="px-5 py-3">
                      {m.movement_type === 'entrada' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-500/15 text-green-400 border border-green-500/25">
                          <ArrowDown className="w-3 h-3" />
                          Entrada
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/15 text-red-400 border border-red-500/25">
                          <ArrowUp className="w-3 h-3" />
                          Saída
                        </span>
                      )}
                    </td>

                    {/* Product */}
                    <td className="px-5 py-3">
                      <p className="text-white font-medium truncate max-w-[180px]">{m.product_name}</p>
                      <p className="text-[11px] text-zinc-500 font-mono">{m.product_sku}</p>
                    </td>

                    {/* Reason */}
                    <td className="px-5 py-3">
                      {m.reason ? (
                        <span className="inline-block px-2 py-0.5 rounded-md text-xs bg-zinc-800 text-zinc-300 border border-zinc-700">
                          {reasonLabel(m.reason)}
                        </span>
                      ) : (
                        <span className="text-zinc-700">—</span>
                      )}
                    </td>

                    {/* Quantity */}
                    <td className="px-5 py-3 text-right">
                      <span
                        className={`font-semibold text-sm ${
                          m.movement_type === 'entrada' ? 'text-green-400' : 'text-red-400'
                        }`}
                      >
                        {m.movement_type === 'entrada' ? '+' : '−'}
                        {m.quantity}
                      </span>
                    </td>

                    {/* Stock before → after */}
                    <td className="px-5 py-3 text-center hidden md:table-cell">
                      <span className="text-zinc-500 text-xs">{m.stock_before}</span>
                      <span className="text-zinc-700 mx-1.5 text-xs">→</span>
                      <span className="text-white text-xs font-medium">{m.stock_after}</span>
                    </td>

                    {/* Reference */}
                    <td className="px-5 py-3 hidden lg:table-cell">
                      <span className="text-zinc-500 text-xs truncate max-w-[140px] block">
                        {m.reference || '—'}
                      </span>
                    </td>

                    {/* Date */}
                    <td className="px-5 py-3 text-zinc-400 text-xs whitespace-nowrap">
                      {formatDate(m.created_at)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-zinc-800">
            <p className="text-xs text-zinc-500">
              Página {page} de {totalPages} · {count} registros
            </p>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="p-1.5 rounded-lg border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="p-1.5 rounded-lg border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 disabled:opacity-30 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-white">Registrar movimentação</h2>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Product */}
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Produto *</label>
                <ProductSearchPicker
                  selectedName={form.product_name}
                  onSelect={(p) => setForm((f) => ({ ...f, product_id: p.id, product_name: p.name }))}
                  onClear={() => setForm((f) => ({ ...f, product_id: null, product_name: '' }))}
                />
              </div>

              {/* Type */}
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Tipo *</label>
                <div className="flex gap-2">
                  {([
                    { value: 'entrada', label: 'Entrada', color: 'green' },
                    { value: 'saida', label: 'Saída', color: 'red' },
                  ] as const).map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, movement_type: opt.value }))}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                        form.movement_type === opt.value
                          ? opt.color === 'green'
                            ? 'bg-green-500/20 border-green-500/50 text-green-300'
                            : 'bg-red-500/20 border-red-500/50 text-red-300'
                          : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:text-white'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quantity + Reason */}
              <div className="flex gap-3">
                <div className="w-28 shrink-0">
                  <label className="block text-xs text-zinc-400 mb-1.5">Quantidade *</label>
                  <input
                    type="number"
                    min="1"
                    value={form.quantity}
                    onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
                    className="w-full bg-zinc-900 border border-zinc-700 text-white rounded-lg text-sm px-3 py-2 focus:outline-none focus:ring-1 focus:ring-violet-600"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-zinc-400 mb-1.5">Motivo</label>
                  <select
                    value={form.reason}
                    onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                    className="w-full bg-zinc-900 border border-zinc-700 text-white rounded-lg text-sm px-3 py-2 h-[38px] focus:outline-none focus:ring-1 focus:ring-violet-600"
                  >
                    {REASON_OPTIONS.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Reference */}
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Referência</label>
                <input
                  type="text"
                  placeholder="Ex: Venda #42, NF 1234..."
                  value={form.reference}
                  onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))}
                  className="w-full bg-zinc-900 border border-zinc-700 text-white rounded-lg text-sm px-3 py-2 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-600"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Observações</label>
                <textarea
                  rows={2}
                  placeholder="Informações adicionais..."
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  className="w-full bg-zinc-900 border border-zinc-700 text-white rounded-lg text-sm px-3 py-2 placeholder:text-zinc-600 resize-none focus:outline-none focus:ring-1 focus:ring-violet-600"
                />
              </div>

              {formError && <p className="text-xs text-red-400">{formError}</p>}

              <div className="flex gap-3 pt-1">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setModalOpen(false)}
                  disabled={saving}
                  className="flex-1 border border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-violet-600 hover:bg-violet-500 text-white"
                >
                  {saving ? 'Salvando...' : 'Registrar'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
