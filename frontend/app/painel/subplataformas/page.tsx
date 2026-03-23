'use client'

import { apiFetch } from '@/lib/api'
import { getBackendUrl } from '@/lib/backend-url'
import { useEffect, useState, useCallback } from 'react'
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

const BACKEND_URL = getBackendUrl()

interface Platform {
  id: number
  name: string
}

interface Subplatform {
  id: number
  platform: number
  platform_name: string
  name: string
  is_active: boolean
  created_at: string
}

const PAGE_SIZE = 20

export default function SubplataformasPage() {
  const [items, setItems] = useState<Subplatform[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [filterPlatform, setFilterPlatform] = useState('')
  const [loading, setLoading] = useState(true)
  const [platforms, setPlatforms] = useState<Platform[]>([])

  // modal
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Subplatform | null>(null)
  const [platformId, setPlatformId] = useState<number | ''>('')
  const [name, setName] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // confirm delete
  const [deleteTarget, setDeleteTarget] = useState<Subplatform | null>(null)
  const [deleting, setDeleting] = useState(false)

  // bulk select
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const allPageSelected = items.length > 0 && items.every((i) => selected.has(i.id))

  // Load platforms for filter + form selects
  useEffect(() => {
    apiFetch(`${BACKEND_URL}/api/admin/plataformas/?page_size=200`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setPlatforms(d.results ?? []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1) }, 350)
    return () => clearTimeout(t)
  }, [search])

  const load = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), page_size: String(PAGE_SIZE) })
    if (debouncedSearch) params.set('q', debouncedSearch)
    if (filterPlatform) params.set('platform', filterPlatform)
    apiFetch(`${BACKEND_URL}/api/admin/subplataformas/?${params}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        setItems(data.results)
        setTotal(data.total)
        setPages(data.pages ?? 1)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [debouncedSearch, filterPlatform, page])

  useEffect(() => { load() }, [load])

  function toggleSelect(id: number) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (allPageSelected) {
      setSelected((prev) => { const next = new Set(prev); items.forEach((i) => next.delete(i.id)); return next })
    } else {
      setSelected((prev) => { const next = new Set(prev); items.forEach((i) => next.add(i.id)); return next })
    }
  }

  async function handleBulkDelete() {
    if (!window.confirm(`Excluir ${selected.size} subplataforma(s)? Esta ação não pode ser desfeita.`)) return
    setBulkDeleting(true)
    try {
      await Promise.all(
        Array.from(selected).map((id) =>
          apiFetch(`${BACKEND_URL}/api/admin/subplataformas/${id}/`, { method: 'DELETE' })
        )
      )
      setSelected(new Set())
      load()
    } finally {
      setBulkDeleting(false)
    }
  }

  function openCreate() {
    setEditing(null)
    setPlatformId('')
    setName('')
    setIsActive(true)
    setFormError(null)
    setModalOpen(true)
  }

  function openEdit(item: Subplatform) {
    setEditing(item)
    setPlatformId(item.platform)
    setName(item.name)
    setIsActive(item.is_active)
    setFormError(null)
    setModalOpen(true)
  }

  async function handleSave() {
    setFormError(null)
    if (!platformId) { setFormError('Selecione uma plataforma.'); return }
    if (!name.trim()) { setFormError('Nome é obrigatório.'); return }
    setSaving(true)
    try {
      const url = editing
        ? `${BACKEND_URL}/api/admin/subplataformas/${editing.id}/`
        : `${BACKEND_URL}/api/admin/subplataformas/`
      const method = editing ? 'PATCH' : 'POST'
      const res = await apiFetch(url, {
        method,
        body: JSON.stringify({ platform: platformId, name: name.trim(), is_active: isActive }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setFormError(Object.values(data).flat().join(' ') || 'Erro ao salvar.')
        return
      }
      setModalOpen(false)
      load()
    } finally {
      setSaving(false)
    }
  }

  async function handleToggle(item: Subplatform) {
    await apiFetch(`${BACKEND_URL}/api/admin/subplataformas/${item.id}/`, {
      method: 'PATCH',
      body: JSON.stringify({ is_active: !item.is_active }),
    })
    load()
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await apiFetch(`${BACKEND_URL}/api/admin/subplataformas/${deleteTarget.id}/`, { method: 'DELETE' })
      setDeleteTarget(null)
      load()
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Subplataformas</h1>
          <p className="text-sm text-zinc-500 mt-1">
            {total} {total === 1 ? 'subplataforma cadastrada' : 'subplataformas cadastradas'}
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nova Subplataforma
        </button>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 mb-4 px-4 py-2.5 bg-violet-950/40 border border-violet-800/40 rounded-xl">
          <span className="text-sm text-violet-300 font-medium">{selected.size} selecionada(s)</span>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setSelected(new Set())}
              className="px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-white border border-zinc-700 hover:border-zinc-500 transition-colors"
            >
              Limpar seleção
            </button>
            <button
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-600 hover:bg-red-500 text-white disabled:opacity-50 transition-colors"
            >
              {bulkDeleting && <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              Excluir {selected.size} selecionada(s)
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[180px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
          <Input
            placeholder="Buscar subplataforma..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600"
          />
        </div>
        <select
          value={filterPlatform}
          onChange={(e) => { setFilterPlatform(e.target.value); setPage(1) }}
          className="bg-zinc-900 border border-zinc-800 text-white rounded-md px-3 py-2 text-sm min-w-[160px]"
        >
          <option value="">Todas as plataformas</option>
          {platforms.map((p) => (
            <option key={p.id} value={p.name}>{p.name}</option>
          ))}
        </select>
      </div>

      {/* List */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800">
              <th className="px-5 py-3 w-10">
                <input
                  type="checkbox"
                  checked={allPageSelected}
                  onChange={toggleSelectAll}
                  className="rounded border-zinc-600 bg-zinc-800 accent-violet-500 cursor-pointer"
                />
              </th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Plataforma</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Subplataforma</th>
              <th className="text-center px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Ativa</th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {loading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-5 py-3"><div className="h-4 w-4 bg-zinc-800 rounded" /></td>
                    <td className="px-5 py-3"><div className="h-4 w-28 bg-zinc-800 rounded" /></td>
                    <td className="px-5 py-3"><div className="h-4 w-40 bg-zinc-800 rounded" /></td>
                    <td className="px-5 py-3"><div className="h-4 w-8 bg-zinc-800 rounded mx-auto" /></td>
                    <td className="px-5 py-3" />
                  </tr>
                ))
              : items.length === 0
              ? null
              : items.map((item) => (
                  <tr key={item.id} className={`hover:bg-zinc-800/40 transition-colors ${selected.has(item.id) ? 'bg-violet-950/20' : ''}`}>
                    <td className="px-5 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(item.id)}
                        onChange={() => toggleSelect(item.id)}
                        className="rounded border-zinc-600 bg-zinc-800 accent-violet-500 cursor-pointer"
                      />
                    </td>
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-zinc-800 text-zinc-300">
                        {item.platform_name}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-white font-medium">{item.name}</td>
                    <td className="px-5 py-3 text-center">
                      <button onClick={() => handleToggle(item)}>
                        {item.is_active
                          ? <ToggleRight className="w-5 h-5 text-green-400 mx-auto" />
                          : <ToggleLeft className="w-5 h-5 text-zinc-600 mx-auto" />}
                      </button>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEdit(item)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(item)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-zinc-800 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
        {!loading && items.length === 0 && (
          <p className="px-6 py-12 text-center text-sm text-zinc-500">Nenhuma subplataforma encontrada.</p>
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4">
        <p className="text-xs text-zinc-500">
          Página {page} de {pages} &mdash; {total} subplataformas
        </p>
        <div className="flex items-center gap-1">
          <button onClick={() => setPage(1)} disabled={page === 1} className="px-2 py-1 rounded text-xs text-zinc-400 hover:text-white disabled:opacity-30 border border-zinc-800 hover:border-zinc-600 transition-colors">«</button>
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-2 py-1 rounded text-xs text-zinc-400 hover:text-white disabled:opacity-30 border border-zinc-800 hover:border-zinc-600 transition-colors">‹</button>
          {Array.from({ length: Math.min(5, pages) }, (_, i) => {
            const start = Math.max(1, Math.min(page - 2, pages - 4))
            return start + i
          }).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`px-2.5 py-1 rounded text-xs border transition-colors ${p === page ? 'bg-violet-600 border-violet-600 text-white' : 'text-zinc-400 hover:text-white border-zinc-800 hover:border-zinc-600'}`}
            >
              {p}
            </button>
          ))}
          <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page === pages} className="px-2 py-1 rounded text-xs text-zinc-400 hover:text-white disabled:opacity-30 border border-zinc-800 hover:border-zinc-600 transition-colors">›</button>
          <button onClick={() => setPage(pages)} disabled={page === pages} className="px-2 py-1 rounded text-xs text-zinc-400 hover:text-white disabled:opacity-30 border border-zinc-800 hover:border-zinc-600 transition-colors">»</button>
        </div>
      </div>

      {/* Modal criar/editar */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="bg-zinc-950 border border-zinc-800 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-white">
              {editing ? 'Editar Subplataforma' : 'Nova Subplataforma'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div>
              <label className="block text-xs text-zinc-400 mb-1">
                Plataforma <span className="text-violet-400">*</span>
              </label>
              <select
                value={platformId}
                onChange={(e) => setPlatformId(e.target.value ? Number(e.target.value) : '')}
                className="w-full bg-zinc-900 border border-zinc-700 text-white rounded-md h-9 text-sm px-2"
              >
                <option value="">— Selecione —</option>
                {platforms.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-zinc-400 mb-1">
                Nome <span className="text-violet-400">*</span>
              </label>
              <Input
                placeholder="Ex: PS5"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-600"
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              />
            </div>

            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setIsActive((v) => !v)}>
                {isActive
                  ? <ToggleRight className="w-6 h-6 text-green-400" />
                  : <ToggleLeft className="w-6 h-6 text-zinc-600" />}
              </button>
              <span className="text-sm text-zinc-400">{isActive ? 'Ativa' : 'Inativa'}</span>
            </div>
          </div>

          {formError && (
            <p className="text-xs text-red-400 mt-2 bg-red-900/20 border border-red-800/30 rounded-lg px-3 py-2">
              {formError}
            </p>
          )}

          <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-zinc-800">
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
              {saving && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {editing ? 'Salvar' : 'Criar'}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal confirmar exclusão */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="bg-zinc-950 border border-zinc-800 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-white">Excluir Subplataforma</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-zinc-400 mt-2">
            Tem certeza que deseja excluir{' '}
            <span className="text-white font-medium">{deleteTarget?.platform_name} → {deleteTarget?.name}</span>?
            Esta ação não pode ser desfeita.
          </p>
          <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-zinc-800">
            <button
              onClick={() => setDeleteTarget(null)}
              className="px-4 py-2 rounded-lg text-sm text-zinc-400 hover:text-white border border-zinc-800 hover:border-zinc-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-medium disabled:opacity-50 transition-colors"
            >
              {deleting && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              Excluir
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
