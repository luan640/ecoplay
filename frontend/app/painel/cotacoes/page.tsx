'use client'

import { apiFetch } from '@/lib/api'
import { getBackendUrl } from '@/lib/backend-url'
import { useEffect, useState, useCallback } from 'react'
import {
  Search,
  ChevronLeft,
  ChevronRight,
  X,
  Image as ImageIcon,
  CheckCircle2,
  Clock,
  DollarSign,
  Gift,
  MessageSquare,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

const BACKEND_URL = getBackendUrl()

// ── Types ──────────────────────────────────────────────────────────────────────

type QuoteStatus = 'recebida' | 'respondida' | 'finalizada'

interface Quote {
  id: number
  full_name: string
  email: string
  city: string | null
  state: string | null
  items_count: number
  created_at: string
  status: QuoteStatus
}

interface QuoteItem {
  id: number
  product_name: string
  sku: string
  quantity: number
  quality_level: string
  quality_label: string
  mode: string
  comment: string
  photos: Array<{ id: number; url: string | null; original_name: string }>
  admin_price_offer: string | null
  admin_store_credit: string | null
  admin_conditions: string
}

interface QuoteDetail extends Quote {
  phone: string | null
  cpf: string | null
  address: string | null
  zip_code: string | null
  message: string | null
  admin_notes: string
  items: QuoteItem[]
  admin_responded_at: string | null
}

// ── StatusBadge ────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: QuoteStatus }) {
  const map: Record<QuoteStatus, { label: string; className: string }> = {
    recebida: {
      label: 'Recebida',
      className: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
    },
    respondida: {
      label: 'Respondida',
      className: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    },
    finalizada: {
      label: 'Finalizada',
      className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    },
  }
  const { label, className } = map[status] ?? map.recebida
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${className}`}
    >
      {label}
    </span>
  )
}

// ── RespondModal ───────────────────────────────────────────────────────────────

interface ItemDraft {
  id: number
  product_name: string
  quantity: number
  priceOffer: string
  storeCredit: string
  conditions: string
}

interface RespondModalProps {
  detail: QuoteDetail
  onClose: () => void
  onSaved: (patch: { status: QuoteStatus; admin_responded_at: string | null; admin_notes: string; items: QuoteItem[] }) => void
}

function RespondModal({ detail, onClose, onSaved }: RespondModalProps) {
  const [drafts, setDrafts] = useState<ItemDraft[]>(() =>
    detail.items.map((item) => ({
      id: item.id,
      product_name: item.product_name,
      quantity: item.quantity,
      priceOffer: item.admin_price_offer ?? '',
      storeCredit: item.admin_store_credit ?? '',
      conditions: item.admin_conditions ?? '',
    })),
  )
  const [adminNotes, setAdminNotes] = useState(detail.admin_notes ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function updateDraft(idx: number, field: keyof Omit<ItemDraft, 'id' | 'product_name' | 'quantity'>, value: string) {
    setDrafts((prev) => prev.map((d, i) => (i === idx ? { ...d, [field]: value } : d)))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const res = await apiFetch(`${BACKEND_URL}/api/admin/cotacoes/${detail.id}/`, {
        method: 'PATCH',
        body: JSON.stringify({
          admin_notes: adminNotes,
          items: drafts.map((d) => ({
            id: d.id,
            admin_price_offer: d.priceOffer || null,
            admin_store_credit: d.storeCredit || null,
            admin_conditions: d.conditions || '',
          })),
        }),
      })
      if (!res.ok) throw new Error('Erro ao salvar')
      const data = await res.json()
      onSaved(data)
      onClose()
    } catch {
      setError('Não foi possível salvar. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 shrink-0">
          <div>
            <h2 className="text-base font-semibold text-white">Responder cotação</h2>
            <p className="text-xs text-zinc-500 mt-0.5">{detail.full_name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable items */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">

            {/* Observação geral */}
            <div className="bg-zinc-800/30 border border-zinc-700/40 rounded-xl p-4">
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                <MessageSquare className="w-3 h-3 inline-block mr-1 opacity-70" />
                Observação geral da cotação
              </label>
              <textarea
                rows={3}
                placeholder="Mensagem geral para o cliente sobre esta cotação..."
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm placeholder:text-zinc-600 resize-none focus:outline-none focus:ring-1 focus:ring-violet-500"
              />
            </div>

            {/* Divider */}
            <div className="flex items-center gap-2">
              <div className="flex-1 h-px bg-zinc-800" />
              <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider">Itens</span>
              <div className="flex-1 h-px bg-zinc-800" />
            </div>

            {drafts.map((draft, idx) => (
              <div key={draft.id} className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-4 space-y-3">
                {/* Item header */}
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-white leading-tight">{draft.product_name}</p>
                  <span className="text-xs text-zinc-500 shrink-0">Qtd: {draft.quantity}</span>
                </div>

                {/* Price offer */}
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                    <DollarSign className="w-3 h-3 inline-block mr-1 opacity-70" />
                    Valor ofertado (R$)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="ex: 150.00"
                    value={draft.priceOffer}
                    onChange={(e) => updateDraft(idx, 'priceOffer', e.target.value)}
                    className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-600 h-8 text-sm"
                  />
                </div>

                {/* Store credit */}
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                    <Gift className="w-3 h-3 inline-block mr-1 opacity-70" />
                    Crédito na loja (R$)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="ex: 50.00"
                    value={draft.storeCredit}
                    onChange={(e) => updateDraft(idx, 'storeCredit', e.target.value)}
                    className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-600 h-8 text-sm"
                  />
                </div>

                {/* Conditions */}
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                    <MessageSquare className="w-3 h-3 inline-block mr-1 opacity-70" />
                    Condições / Observações
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Condições, prazo, estado do item, etc."
                    value={draft.conditions}
                    onChange={(e) => updateDraft(idx, 'conditions', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm placeholder:text-zinc-600 resize-none focus:outline-none focus:ring-1 focus:ring-violet-500"
                  />
                </div>
              </div>
            ))}

            {error && <p className="text-xs text-red-400">{error}</p>}
          </div>

          {/* Footer */}
          <div className="flex gap-3 px-6 py-4 border-t border-zinc-800 shrink-0">
            <Button
              type="button"
              variant="outline"
              className="flex-1 border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-800"
              onClick={onClose}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="flex-1 bg-violet-600 hover:bg-violet-500 text-white"
            >
              {saving ? 'Salvando…' : 'Salvar respostas'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function formatCurrency(value: string | null) {
  if (!value) return '—'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
    parseFloat(value),
  )
}

// ── Status filter config ───────────────────────────────────────────────────────

const STATUS_FILTERS: Array<{ key: QuoteStatus | 'todas'; label: string }> = [
  { key: 'todas', label: 'Todas' },
  { key: 'recebida', label: 'Recebidas' },
  { key: 'respondida', label: 'Respondidas' },
  { key: 'finalizada', label: 'Finalizadas' },
]

// ── Main page ──────────────────────────────────────────────────────────────────

export default function CotacoesPage() {
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<QuoteStatus | 'todas'>('todas')
  const [loading, setLoading] = useState(true)

  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [detail, setDetail] = useState<QuoteDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const [respondModalOpen, setRespondModalOpen] = useState(false)

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350)
    return () => clearTimeout(t)
  }, [search])

  // Load list
  const loadQuotes = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), page_size: '20' })
    if (debouncedSearch) params.set('search', debouncedSearch)
    if (statusFilter !== 'todas') params.set('status', statusFilter)
    apiFetch(`${BACKEND_URL}/api/admin/cotacoes/?${params}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        setQuotes(data.results ?? [])
        setTotal(data.count ?? 0)
        setTotalPages(data.total_pages ?? 1)
      })
      .catch(() => setQuotes([]))
      .finally(() => setLoading(false))
  }, [page, debouncedSearch, statusFilter])

  useEffect(() => {
    loadQuotes()
  }, [loadQuotes])

  // Load detail
  useEffect(() => {
    if (selectedId === null) {
      setDetail(null)
      return
    }
    setDetailLoading(true)
    apiFetch(`${BACKEND_URL}/api/admin/cotacoes/${selectedId}/`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setDetail)
      .catch(() => setDetail(null))
      .finally(() => setDetailLoading(false))
  }, [selectedId])

  function handleRespondSaved(patch: {
    status: QuoteStatus
    admin_responded_at: string | null
    admin_notes: string
    items: QuoteItem[]
  }) {
    setDetail((prev) =>
      prev
        ? {
            ...prev,
            status: patch.status,
            admin_responded_at: patch.admin_responded_at,
            admin_notes: patch.admin_notes,
            items: prev.items.map((item) => {
              const updated = patch.items.find((i) => i.id === item.id)
              return updated ? { ...item, ...updated } : item
            }),
          }
        : prev,
    )
    setQuotes((prev) =>
      prev.map((q) => (q.id === selectedId ? { ...q, status: patch.status } : q)),
    )
  }

  async function handleFinalize() {
    if (!detail) return
    if (!confirm('Confirmar finalização desta cotação?')) return
    try {
      const res = await apiFetch(`${BACKEND_URL}/api/admin/cotacoes/${detail.id}/`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'finalizada' }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      handleRespondSaved(data)
    } catch {
      alert('Não foi possível finalizar a cotação.')
    }
  }

  return (
    <>
      {respondModalOpen && detail && (
        <RespondModal
          detail={detail}
          onClose={() => setRespondModalOpen(false)}
          onSaved={handleRespondSaved}
        />
      )}

      <div className="flex gap-6 h-full">
        {/* ── List panel ── */}
        <div
          className={`flex flex-col min-w-0 flex-1 ${
            selectedId !== null ? 'hidden lg:flex' : 'flex'
          }`}
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-white">Cotações</h1>
              <p className="text-sm text-zinc-500 mt-1">
                {total} {total === 1 ? 'cotação' : 'cotações'}
              </p>
            </div>
          </div>

          {/* Status filter */}
          <div className="flex gap-2 mb-4 flex-wrap">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => {
                  setStatusFilter(f.key)
                  setPage(1)
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  statusFilter === f.key
                    ? 'bg-violet-600 border-violet-500 text-white'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
            <Input
              placeholder="Buscar por nome ou e-mail…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              className="pl-9 bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600"
            />
          </div>

          {/* Table */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden flex-1">
            {loading ? (
              <div className="divide-y divide-zinc-800">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="px-6 py-4 animate-pulse">
                    <div className="h-4 w-40 bg-zinc-800 rounded mb-2" />
                    <div className="h-3 w-56 bg-zinc-800 rounded" />
                  </div>
                ))}
              </div>
            ) : quotes.length === 0 ? (
              <p className="px-6 py-12 text-center text-sm text-zinc-500">
                Nenhuma cotação encontrada.
              </p>
            ) : (
              <div className="divide-y divide-zinc-800">
                {quotes.map((q) => (
                  <button
                    key={q.id}
                    onClick={() => setSelectedId(q.id)}
                    className={`w-full text-left px-6 py-4 hover:bg-zinc-800/50 transition-colors flex items-center justify-between gap-4 ${
                      selectedId === q.id ? 'bg-violet-600/10 border-l-2 border-violet-500' : ''
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">{q.full_name}</p>
                      <p className="text-xs text-zinc-500 truncate">
                        {q.email}
                        {q.city ? ` · ${q.city}` : ''}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <StatusBadge status={q.status} />
                      <p className="text-xs text-zinc-400">{formatDate(q.created_at)}</p>
                      <p className="text-xs text-zinc-600">
                        {q.items_count} {q.items_count === 1 ? 'item' : 'itens'}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-xs text-zinc-500">
                Página {page} de {totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="p-1.5 rounded-lg border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="p-1.5 rounded-lg border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Detail panel ── */}
        {selectedId !== null && (
          <div className="flex flex-col w-full lg:w-[460px] shrink-0">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white">Detalhes</h2>
              <button
                onClick={() => setSelectedId(null)}
                className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {detailLoading ? (
              <div className="flex-1 space-y-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-4 bg-zinc-800 rounded animate-pulse" />
                ))}
              </div>
            ) : !detail ? (
              <p className="text-sm text-zinc-500">Erro ao carregar detalhes.</p>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                {/* Contact card */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                      Contato
                    </p>
                    <StatusBadge status={detail.status} />
                  </div>
                  <DetailRow label="Nome" value={detail.full_name} />
                  <DetailRow label="E-mail" value={detail.email} />
                  {detail.phone && <DetailRow label="Telefone" value={detail.phone} />}
                  {(detail.city || detail.state) && (
                    <DetailRow
                      label="Cidade"
                      value={[detail.city, detail.state].filter(Boolean).join(' / ')}
                    />
                  )}
                  <DetailRow label="Data" value={formatDate(detail.created_at)} />
                  {detail.admin_responded_at && (
                    <div className="flex items-center gap-1 pt-1">
                      <Clock className="w-3 h-3 text-zinc-600" />
                      <p className="text-xs text-zinc-600">
                        Respondido em {formatDate(detail.admin_responded_at)}
                      </p>
                    </div>
                  )}
                </div>

                {/* Message */}
                {detail.message && (
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                    <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                      Mensagem
                    </p>
                    <p className="text-sm text-zinc-300 whitespace-pre-wrap">{detail.message}</p>
                  </div>
                )}

                {/* Admin notes */}
                {detail.admin_notes && (
                  <div className="bg-violet-950/20 border border-violet-800/30 rounded-xl p-4">
                    <p className="text-xs font-semibold text-violet-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <MessageSquare className="w-3 h-3" />
                      Observação da loja
                    </p>
                    <p className="text-sm text-zinc-300 whitespace-pre-wrap">{detail.admin_notes}</p>
                  </div>
                )}

                {/* Items */}
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    Itens ({detail.items.length})
                  </p>
                  {detail.items.map((item) => {
                    const hasResponse =
                      item.admin_price_offer !== null ||
                      item.admin_store_credit !== null ||
                      (item.admin_conditions && item.admin_conditions.length > 0)
                    return (
                      <div
                        key={item.id}
                        className="bg-zinc-900 border border-zinc-800 rounded-xl p-4"
                      >
                        {/* Item info */}
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0 overflow-hidden">
                            {item.photos[0]?.url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={item.photos[0].url}
                                alt={item.product_name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <ImageIcon className="w-4 h-4 text-zinc-600" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm text-white font-medium truncate">
                              {item.product_name}
                            </p>
                            <p className="text-xs text-zinc-500">
                              Qtd: {item.quantity}
                              {item.quality_label ? ` · ${item.quality_label}` : ''}
                            </p>
                          </div>
                        </div>

                        {/* Customer comment */}
                        {item.comment && (
                          <p className="text-xs text-zinc-500 italic mb-3 pb-3 border-b border-zinc-800">
                            "{item.comment}"
                          </p>
                        )}

                        {/* Admin response */}
                        {hasResponse ? (
                          <div className="space-y-1.5 pt-1">
                            <p className="text-[11px] font-semibold text-violet-400 uppercase tracking-wider flex items-center gap-1 mb-2">
                              <CheckCircle2 className="w-3 h-3" />
                              Resposta
                            </p>
                            {item.admin_price_offer !== null && (
                              <DetailRow
                                label="Valor ofertado"
                                value={formatCurrency(item.admin_price_offer)}
                                highlight
                              />
                            )}
                            {item.admin_store_credit !== null && (
                              <DetailRow
                                label="Crédito na loja"
                                value={formatCurrency(item.admin_store_credit)}
                              />
                            )}
                            {item.admin_conditions && (
                              <div className="mt-1">
                                <p className="text-xs text-zinc-500 mb-0.5">Condições</p>
                                <p className="text-xs text-zinc-300 whitespace-pre-wrap">
                                  {item.admin_conditions}
                                </p>
                              </div>
                            )}
                          </div>
                        ) : (
                          detail.status !== 'finalizada' && (
                            <p className="text-xs text-zinc-600 italic">Sem resposta ainda</p>
                          )
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Action buttons */}
                <div className="flex gap-2 pb-4">
                  {detail.status !== 'finalizada' && (
                    <Button
                      onClick={() => setRespondModalOpen(true)}
                      className="flex-1 bg-violet-600 hover:bg-violet-500 text-white text-sm"
                    >
                      {detail.status === 'recebida' ? 'Responder itens' : 'Editar respostas'}
                    </Button>
                  )}
                  {detail.status === 'respondida' && (
                    <Button
                      onClick={handleFinalize}
                      variant="outline"
                      className="flex-1 border-emerald-600/40 text-emerald-400 hover:bg-emerald-600/10 text-sm"
                    >
                      Finalizar
                    </Button>
                  )}
                  {detail.status === 'finalizada' && (
                    <div className="flex-1 flex items-center justify-center gap-2 py-2 text-sm text-emerald-400">
                      <CheckCircle2 className="w-4 h-4" />
                      Cotação finalizada
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}

function DetailRow({
  label,
  value,
  mono,
  highlight,
}: {
  label: string
  value: string
  mono?: boolean
  highlight?: boolean
}) {
  return (
    <div className="flex items-start justify-between gap-2">
      <span className="text-xs text-zinc-500 shrink-0">{label}</span>
      <span
        className={`text-xs text-right ${mono ? 'font-mono' : ''} ${
          highlight ? 'text-white font-semibold' : 'text-zinc-300'
        }`}
      >
        {value}
      </span>
    </div>
  )
}
