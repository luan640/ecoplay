'use client'

import { apiFetch } from '@/lib/api'
import { getBackendUrl } from '@/lib/backend-url'
import { useEffect, useState, useCallback, useRef } from 'react'
import { Search, X, ChevronUp, ChevronDown, Tv2, Plus, Pencil, Trash2, Check } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

const BACKEND_URL = getBackendUrl()
const MAX_ITEMS = 10

interface ProductSummary {
  id: number
  name: string
  slug: string
  sku: string
  price: string
  image_url: string | null
  is_active: boolean
}

interface ShowcaseItem {
  id: number
  product: ProductSummary
  order: number
  added_at: string
}

interface Showcase {
  id: number
  name: string
  slug: string
  title: string
  subtitle: string
  order: number
  is_active: boolean
  items_count: number
  items: ShowcaseItem[]
}

const EMPTY_FORM = { name: '', title: '', subtitle: '', order: '0' }

export default function VitrinePage() {
  const [showcases, setShowcases] = useState<Showcase[]>([])
  const [loading, setLoading] = useState(true)
  const [activeId, setActiveId] = useState<number | null>(null)

  // modal vitrine
  const [modalOpen, setModalOpen] = useState(false)
  const [editingShowcase, setEditingShowcase] = useState<Showcase | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // delete showcase
  const [deleteTarget, setDeleteTarget] = useState<Showcase | null>(null)
  const [deleting, setDeleting] = useState(false)

  // inline title/subtitle edit
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState('')
  const [subtitleDraft, setSubtitleDraft] = useState('')
  const [savingTitle, setSavingTitle] = useState(false)

  // search products
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<ProductSummary[]>([])
  const [searching, setSearching] = useState(false)
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [busy, setBusy] = useState(false)

  const loadShowcases = useCallback(async () => {
    setLoading(true)
    try {
      const listRes = await apiFetch(`${BACKEND_URL}/api/admin/vitrines/`)
      if (!listRes.ok) return
      const list: Showcase[] = await listRes.json()
      const details = await Promise.all(
        list.map((s) =>
          apiFetch(`${BACKEND_URL}/api/admin/vitrines/${s.id}/`)
            .then((r) => r.ok ? r.json() : s)
        )
      )
      setShowcases(details)
      if (activeId === null && details.length > 0) setActiveId(details[0].id)
    } finally {
      setLoading(false)
    }
  }, []) // eslint-disable-line

  useEffect(() => { loadShowcases() }, [loadShowcases])

  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    if (!searchQuery.trim()) { setSearchResults([]); return }
    searchTimeout.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await apiFetch(`${BACKEND_URL}/api/admin/produtos/search/?q=${encodeURIComponent(searchQuery)}`)
        if (res.ok) setSearchResults(await res.json())
      } finally {
        setSearching(false)
      }
    }, 350)
  }, [searchQuery])

  const active = showcases.find((s) => s.id === activeId) ?? null
  const sorted = showcases.slice().sort((a, b) => a.order - b.order || a.id - b.id)

  function openCreate() {
    setEditingShowcase(null)
    setForm(EMPTY_FORM)
    setFormError(null)
    setModalOpen(true)
  }

  function openEditShowcase(s: Showcase, e: React.MouseEvent) {
    e.stopPropagation()
    setEditingShowcase(s)
    setForm({ name: s.name, title: s.title, subtitle: s.subtitle, order: String(s.order) })
    setFormError(null)
    setModalOpen(true)
  }

  async function handleSaveShowcase() {
    setFormError(null)
    if (!form.name.trim()) { setFormError('Nome é obrigatório.'); return }
    setSaving(true)
    try {
      const body = { name: form.name.trim(), title: form.title.trim(), subtitle: form.subtitle.trim(), order: Number(form.order) || 0 }
      const url = editingShowcase ? `${BACKEND_URL}/api/admin/vitrines/${editingShowcase.id}/` : `${BACKEND_URL}/api/admin/vitrines/`
      const method = editingShowcase ? 'PATCH' : 'POST'
      const res = await apiFetch(url, { method, body: JSON.stringify(body) })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setFormError(Object.values(data).flat().join(' ') || 'Erro ao salvar.')
        return
      }
      const saved: Showcase = await res.json()
      setModalOpen(false)
      await loadShowcases()
      setActiveId(saved.id)
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteShowcase() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await apiFetch(`${BACKEND_URL}/api/admin/vitrines/${deleteTarget.id}/`, { method: 'DELETE' })
      setDeleteTarget(null)
      const remaining = showcases.filter((s) => s.id !== deleteTarget.id)
      setActiveId(remaining[0]?.id ?? null)
      await loadShowcases()
    } finally {
      setDeleting(false)
    }
  }

  function startEditTitle() {
    if (!active) return
    setTitleDraft(active.title)
    setSubtitleDraft(active.subtitle)
    setEditingTitle(true)
  }

  async function saveTitle() {
    if (!active) return
    setSavingTitle(true)
    try {
      const res = await apiFetch(`${BACKEND_URL}/api/admin/vitrines/${active.id}/`, {
        method: 'PATCH',
        body: JSON.stringify({ title: titleDraft.trim(), subtitle: subtitleDraft.trim() }),
      })
      if (res.ok) { await loadShowcases(); setEditingTitle(false) }
    } finally {
      setSavingTitle(false)
    }
  }

  async function addProduct(product: ProductSummary) {
    if (!active || active.items.some((i) => i.product.id === product.id) || active.items.length >= MAX_ITEMS) return
    setBusy(true)
    try {
      const res = await apiFetch(`${BACKEND_URL}/api/admin/vitrines/${active.id}/items/`, {
        method: 'POST',
        body: JSON.stringify({ product_id: product.id, order: active.items.length }),
      })
      if (res.ok) {
        const updated: Showcase = await res.json()
        setShowcases((prev) => prev.map((s) => s.id === updated.id ? updated : s))
        setSearchQuery(''); setSearchResults([])
      }
    } finally { setBusy(false) }
  }

  async function removeItem(item: ShowcaseItem) {
    if (!active) return
    setBusy(true)
    try {
      const res = await apiFetch(`${BACKEND_URL}/api/admin/vitrines/${active.id}/items/${item.id}/`, { method: 'DELETE' })
      if (res.ok) {
        const updated: Showcase = await res.json()
        setShowcases((prev) => prev.map((s) => s.id === updated.id ? updated : s))
      }
    } finally { setBusy(false) }
  }

  async function moveItem(item: ShowcaseItem, direction: 'up' | 'down') {
    if (!active) return
    const s = [...active.items].sort((a, b) => a.order - b.order)
    const idx = s.findIndex((i) => i.id === item.id)
    const newIdx = direction === 'up' ? idx - 1 : idx + 1
    if (newIdx < 0 || newIdx >= s.length) return
    setBusy(true)
    try {
      await apiFetch(`${BACKEND_URL}/api/admin/vitrines/${active.id}/items/${item.id}/`, { method: 'PATCH', body: JSON.stringify({ order: newIdx }) })
      await apiFetch(`${BACKEND_URL}/api/admin/vitrines/${active.id}/items/${s[newIdx].id}/`, { method: 'PATCH', body: JSON.stringify({ order: idx }) })
      const r = await apiFetch(`${BACKEND_URL}/api/admin/vitrines/${active.id}/`)
      if (r.ok) { const updated: Showcase = await r.json(); setShowcases((prev) => prev.map((sc) => sc.id === updated.id ? updated : sc)) }
    } finally { setBusy(false) }
  }

  async function toggleActive(s: Showcase, e: React.MouseEvent) {
    e.stopPropagation()
    const res = await apiFetch(`${BACKEND_URL}/api/admin/vitrines/${s.id}/`, { method: 'PATCH', body: JSON.stringify({ is_active: !s.is_active }) })
    if (res.ok) await loadShowcases()
  }

  const alreadyInShowcase = new Set(active?.items.map((i) => i.product.id) ?? [])

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Vitrine</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Configure as seções exibidas na página inicial. Cada vitrine é um carrossel independente.
          </p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" />
          Nova Seção
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3].map((i) => <div key={i} className="h-16 rounded-2xl bg-zinc-900 animate-pulse" />)}</div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar */}
          <div className="lg:w-64 shrink-0 space-y-1">
            {sorted.map((s) => (
              <div
                key={s.id}
                onClick={() => setActiveId(s.id)}
                className={`group w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium cursor-pointer transition-colors ${
                  activeId === s.id
                    ? 'bg-violet-600/20 text-violet-300 border border-violet-600/30'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800 border border-transparent'
                }`}
              >
                <span className="flex items-center gap-2 min-w-0">
                  <Tv2 className="w-4 h-4 shrink-0" />
                  <span className="truncate">{s.title || s.name}</span>
                  {!s.is_active && <span className="text-[10px] bg-zinc-700 text-zinc-400 px-1.5 py-0.5 rounded-full shrink-0">off</span>}
                </span>
                <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className={`text-xs tabular-nums mr-1 ${activeId === s.id ? 'text-violet-400' : 'text-zinc-600'}`}>{s.items_count}/{MAX_ITEMS}</span>
                  <button onClick={(e) => openEditShowcase(s, e)} className="p-1 rounded hover:bg-zinc-700 text-zinc-500 hover:text-white transition-colors">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(s) }} className="p-1 rounded hover:bg-zinc-700 text-zinc-500 hover:text-red-400 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
            {sorted.length === 0 && <p className="text-sm text-zinc-600 px-4 py-3">Nenhuma seção criada.</p>}
          </div>

          {/* Content */}
          {active && (
            <div className="flex-1 min-w-0">
              {/* Title/subtitle header */}
              <div className="flex items-start justify-between mb-4 gap-4">
                {editingTitle ? (
                  <div className="flex-1 space-y-2">
                    <Input value={titleDraft} onChange={(e) => setTitleDraft(e.target.value)} placeholder="Título exibido na loja" className="bg-zinc-900 border-zinc-700 text-white" />
                    <Input value={subtitleDraft} onChange={(e) => setSubtitleDraft(e.target.value)} placeholder="Subtítulo (opcional)" className="bg-zinc-900 border-zinc-700 text-white text-sm" />
                    <div className="flex gap-2">
                      <button onClick={saveTitle} disabled={savingTitle} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium disabled:opacity-50 transition-colors">
                        {savingTitle ? <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check className="w-3 h-3" />}
                        Salvar
                      </button>
                      <button onClick={() => setEditingTitle(false)} className="px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-white border border-zinc-700 hover:border-zinc-500 transition-colors">Cancelar</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-semibold text-white truncate">{active.title || active.name}</h2>
                      <button onClick={startEditTitle} className="p-1 rounded text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 transition-colors">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {active.subtitle && <p className="text-sm text-zinc-500 mt-0.5 truncate">{active.subtitle}</p>}
                  </div>
                )}
                <div className="flex items-center gap-3 shrink-0">
                  <button onClick={(e) => toggleActive(active, e)} className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-colors ${active.is_active ? 'border-green-700/50 bg-green-900/20 text-green-400 hover:bg-green-900/40' : 'border-zinc-700 bg-zinc-800 text-zinc-500 hover:text-white'}`}>
                    {active.is_active ? 'Ativa' : 'Inativa'}
                  </button>
                  <span className="text-xs text-zinc-500">{active.items.length}/{MAX_ITEMS} produtos</span>
                </div>
              </div>

              {/* Product search */}
              {active.items.length < MAX_ITEMS && (
                <div className="relative mb-5">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                  <Input placeholder="Buscar produto para adicionar..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-600" />
                  {(searchResults.length > 0 || searching) && (
                    <div className="absolute z-20 top-full mt-1 left-0 right-0 bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl overflow-hidden">
                      {searching && <p className="px-4 py-3 text-xs text-zinc-500">Buscando...</p>}
                      {searchResults.map((p) => {
                        const already = alreadyInShowcase.has(p.id)
                        return (
                          <button key={p.id} disabled={already || busy} onClick={() => addProduct(p)} className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-zinc-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                            {p.image_url ? <img src={p.image_url} alt={p.name} className="w-8 h-8 rounded object-cover bg-zinc-800 shrink-0" /> : <div className="w-8 h-8 rounded bg-zinc-800 shrink-0" />}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-white truncate">{p.name}</p>
                              <p className="text-xs text-zinc-500 font-mono">{p.sku}</p>
                            </div>
                            {already && <span className="text-xs text-violet-400 shrink-0">já adicionado</span>}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {active.items.length >= MAX_ITEMS && (
                <p className="text-xs text-amber-400 bg-amber-900/20 border border-amber-800/30 rounded-lg px-3 py-2 mb-4">
                  Limite de {MAX_ITEMS} produtos atingido. Remova um produto para adicionar outro.
                </p>
              )}

              {/* Product list */}
              {active.items.length === 0 ? (
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl px-6 py-12 text-center">
                  <Tv2 className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
                  <p className="text-sm text-zinc-500">Nenhum produto nesta seção.</p>
                  <p className="text-xs text-zinc-600 mt-1">Use a busca acima para adicionar produtos.</p>
                </div>
              ) : (
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-zinc-800">
                        <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase w-8">#</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase w-10" />
                        <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase">Produto</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase hidden md:table-cell">Preço</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-zinc-500 uppercase">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800">
                      {[...active.items].sort((a, b) => a.order - b.order).map((item, idx, arr) => (
                        <tr key={item.id} className="hover:bg-zinc-800/40 transition-colors">
                          <td className="px-4 py-3 text-zinc-600 tabular-nums text-xs">{idx + 1}</td>
                          <td className="px-4 py-3">
                            {item.product.image_url
                              ? <img src={item.product.image_url} alt={item.product.name} className="w-8 h-8 rounded object-cover bg-zinc-800" />
                              : <div className="w-8 h-8 rounded bg-zinc-800 flex items-center justify-center text-zinc-600 text-xs">?</div>}
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-white font-medium line-clamp-1">{item.product.name}</p>
                            <p className="text-xs text-zinc-600 font-mono">{item.product.sku}</p>
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell text-white">
                            {Number(item.product.price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button disabled={idx === 0 || busy} onClick={() => moveItem(item, 'up')} className="p-1 rounded text-zinc-500 hover:text-white hover:bg-zinc-700 disabled:opacity-25 transition-colors"><ChevronUp className="w-4 h-4" /></button>
                              <button disabled={idx === arr.length - 1 || busy} onClick={() => moveItem(item, 'down')} className="p-1 rounded text-zinc-500 hover:text-white hover:bg-zinc-700 disabled:opacity-25 transition-colors"><ChevronDown className="w-4 h-4" /></button>
                              <button disabled={busy} onClick={() => removeItem(item)} className="p-1 rounded text-zinc-500 hover:text-red-400 hover:bg-zinc-700 disabled:opacity-25 transition-colors ml-1"><X className="w-4 h-4" /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {!active && !loading && showcases.length === 0 && (
            <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-2xl px-6 py-16 text-center">
              <Tv2 className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
              <p className="text-sm text-zinc-500">Nenhuma seção criada ainda.</p>
              <p className="text-xs text-zinc-600 mt-1">Clique em &quot;Nova Seção&quot; para começar.</p>
            </div>
          )}
        </div>
      )}

      {/* Modal criar/editar vitrine */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="bg-zinc-950 border border-zinc-800 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-white">
              {editingShowcase ? 'Editar Seção' : 'Nova Seção da Vitrine'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Nome interno <span className="text-violet-400">*</span></label>
              <Input placeholder="Ex: destaques-semana" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-600" />
              <p className="text-xs text-zinc-600 mt-1">Identificador único (usado como slug na URL).</p>
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Título exibido na loja</label>
              <Input placeholder="Ex: Destaques da Semana" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-600" />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Subtítulo</label>
              <Input placeholder="Ex: Os mais vendidos desta semana" value={form.subtitle} onChange={(e) => setForm((f) => ({ ...f, subtitle: e.target.value }))} className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-600" />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Ordem de exibição</label>
              <Input type="number" placeholder="0" value={form.order} onChange={(e) => setForm((f) => ({ ...f, order: e.target.value }))} className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-600 w-24" />
              <p className="text-xs text-zinc-600 mt-1">Menor número aparece primeiro na página inicial.</p>
            </div>
          </div>
          {formError && <p className="text-xs text-red-400 mt-2 bg-red-900/20 border border-red-800/30 rounded-lg px-3 py-2">{formError}</p>}
          <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-zinc-800">
            <button onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-lg text-sm text-zinc-400 hover:text-white border border-zinc-800 hover:border-zinc-700 transition-colors">Cancelar</button>
            <button onClick={handleSaveShowcase} disabled={saving} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium disabled:opacity-50 transition-colors">
              {saving && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {editingShowcase ? 'Salvar' : 'Criar Seção'}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal excluir */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="bg-zinc-950 border border-zinc-800 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-white">Excluir Seção</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-zinc-400 mt-2">
            Tem certeza que deseja excluir a seção <span className="text-white font-medium">{deleteTarget?.title || deleteTarget?.name}</span>?
            Todos os produtos vinculados serão removidos. Esta ação não pode ser desfeita.
          </p>
          <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-zinc-800">
            <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 rounded-lg text-sm text-zinc-400 hover:text-white border border-zinc-800 hover:border-zinc-700 transition-colors">Cancelar</button>
            <button onClick={handleDeleteShowcase} disabled={deleting} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-medium disabled:opacity-50 transition-colors">
              {deleting && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              Excluir
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

