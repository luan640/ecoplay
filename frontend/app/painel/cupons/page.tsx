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

type DiscountType = 'PERCENT' | 'FIXED'

interface Coupon {
  id: number
  code: string
  discount_type: DiscountType
  value: string
  min_order_value: string | null
  max_discount_value: string | null
  starts_at: string | null
  ends_at: string | null
  usage_limit: number | null
  usage_limit_per_user: number | null
  used_count: number
  is_active: boolean
  created_at: string
}

const EMPTY_FORM = {
  code: '',
  discount_type: 'PERCENT' as DiscountType,
  value: '',
  min_order_value: '',
  max_discount_value: '',
  starts_at: '',
  ends_at: '',
  usage_limit: '',
  usage_limit_per_user: '',
  is_active: true,
}

function isoToInputDateTime(value: string | null) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  const yyyy = d.getFullYear()
  const mm = pad(d.getMonth() + 1)
  const dd = pad(d.getDate())
  const hh = pad(d.getHours())
  const mi = pad(d.getMinutes())
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`
}

function inputDateTimeToIso(value: string) {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString()
}

export default function CuponsPage() {
  const [items, setItems] = useState<Coupon[]>([])
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState<'' | '1' | '0'>('')
  const [loading, setLoading] = useState(true)

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Coupon | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const [deleteTarget, setDeleteTarget] = useState<Coupon | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350)
    return () => clearTimeout(t)
  }, [search])

  const load = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (debouncedSearch) params.set('q', debouncedSearch)
    if (activeFilter) params.set('active', activeFilter)
    const suffix = params.toString() ? `?${params.toString()}` : ''
    apiFetch(`${BACKEND_URL}/api/admin/cupons/${suffix}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        setItems(data.results)
        setTotal(data.total)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [debouncedSearch, activeFilter])

  useEffect(() => { load() }, [load])

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setFormError(null)
    setModalOpen(true)
  }

  function openEdit(item: Coupon) {
    setEditing(item)
    setForm({
      code: item.code,
      discount_type: item.discount_type,
      value: item.value ?? '',
      min_order_value: item.min_order_value ?? '',
      max_discount_value: item.max_discount_value ?? '',
      starts_at: isoToInputDateTime(item.starts_at),
      ends_at: isoToInputDateTime(item.ends_at),
      usage_limit: item.usage_limit == null ? '' : String(item.usage_limit),
      usage_limit_per_user:
        item.usage_limit_per_user == null ? '' : String(item.usage_limit_per_user),
      is_active: item.is_active,
    })
    setFormError(null)
    setModalOpen(true)
  }

  async function handleSave() {
    setFormError(null)
    if (!form.code.trim()) {
      setFormError('Codigo do cupom e obrigatorio.')
      return
    }
    if (!form.value || Number(form.value) <= 0) {
      setFormError('Informe um valor de desconto valido.')
      return
    }

    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        code: form.code.trim().toUpperCase(),
        discount_type: form.discount_type,
        value: form.value,
        min_order_value: form.min_order_value ? form.min_order_value : null,
        max_discount_value: form.max_discount_value ? form.max_discount_value : null,
        starts_at: inputDateTimeToIso(form.starts_at),
        ends_at: inputDateTimeToIso(form.ends_at),
        usage_limit: form.usage_limit ? Number(form.usage_limit) : null,
        usage_limit_per_user: form.usage_limit_per_user
          ? Number(form.usage_limit_per_user)
          : null,
        is_active: form.is_active,
      }
      const url = editing
        ? `${BACKEND_URL}/api/admin/cupons/${editing.id}/`
        : `${BACKEND_URL}/api/admin/cupons/`
      const method = editing ? 'PATCH' : 'POST'
      const res = await apiFetch(url, {
        method,
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        const msg = Object.values(data).flat().join(' ') || 'Erro ao salvar cupom.'
        setFormError(msg)
        return
      }
      setModalOpen(false)
      load()
    } finally {
      setSaving(false)
    }
  }

  async function handleToggle(item: Coupon) {
    await apiFetch(`${BACKEND_URL}/api/admin/cupons/${item.id}/`, {
      method: 'PATCH',
      body: JSON.stringify({ is_active: !item.is_active }),
    })
    load()
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await apiFetch(`${BACKEND_URL}/api/admin/cupons/${deleteTarget.id}/`, {
        method: 'DELETE',
      })
      setDeleteTarget(null)
      load()
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Cupons</h1>
          <p className="text-sm text-zinc-500 mt-1">
            {total} {total === 1 ? 'cupom cadastrado' : 'cupons cadastrados'}
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Novo Cupom
        </button>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
          <Input
            placeholder="Buscar por codigo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600"
          />
        </div>
        <div className="flex gap-2">
          {(['', '1', '0'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setActiveFilter(v)}
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

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800">
              <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Codigo</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Desconto</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider hidden md:table-cell">Vigencia</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider hidden lg:table-cell">Uso</th>
              <th className="text-center px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Ativo</th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Acoes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {loading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-5 py-3"><div className="h-4 w-24 bg-zinc-800 rounded" /></td>
                    <td className="px-5 py-3"><div className="h-4 w-24 bg-zinc-800 rounded" /></td>
                    <td className="px-5 py-3 hidden md:table-cell"><div className="h-4 w-36 bg-zinc-800 rounded" /></td>
                    <td className="px-5 py-3 hidden lg:table-cell"><div className="h-4 w-16 bg-zinc-800 rounded" /></td>
                    <td className="px-5 py-3"><div className="h-4 w-8 bg-zinc-800 rounded mx-auto" /></td>
                    <td className="px-5 py-3" />
                  </tr>
                ))
              : items.length === 0
              ? null
              : items.map((item) => (
                  <tr key={item.id} className="hover:bg-zinc-800/40 transition-colors">
                    <td className="px-5 py-3">
                      <p className="text-sm text-white font-semibold">{item.code}</p>
                    </td>
                    <td className="px-5 py-3 text-zinc-300">
                      {item.discount_type === 'PERCENT' ? `${item.value}%` : `R$ ${item.value}`}
                    </td>
                    <td className="px-5 py-3 text-zinc-400 text-xs hidden md:table-cell">
                      {item.starts_at ? new Date(item.starts_at).toLocaleDateString('pt-BR') : 'Sem inicio'}
                      {' - '}
                      {item.ends_at ? new Date(item.ends_at).toLocaleDateString('pt-BR') : 'Sem fim'}
                    </td>
                    <td className="px-5 py-3 text-zinc-400 text-xs hidden lg:table-cell">
                      {item.used_count}/{item.usage_limit ?? '∞'}
                      {item.usage_limit_per_user ? ` · por usuário: ${item.usage_limit_per_user}` : ''}
                    </td>
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
          <p className="px-6 py-12 text-center text-sm text-zinc-500">Nenhum cupom encontrado.</p>
        )}
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="bg-zinc-950 border border-zinc-800 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-white">
              {editing ? 'Editar Cupom' : 'Novo Cupom'}
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
            <div>
              <label className="block text-xs text-zinc-400 mb-1">
                Codigo <span className="text-violet-400">*</span>
              </label>
              <Input
                placeholder="Ex: DESCONTO10"
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-600"
              />
            </div>

            <div>
              <label className="block text-xs text-zinc-400 mb-1">Tipo</label>
              <select
                value={form.discount_type}
                onChange={(e) => setForm((f) => ({ ...f, discount_type: e.target.value as DiscountType }))}
                className="w-full bg-zinc-900 border border-zinc-700 text-white rounded-md h-9 text-sm px-2"
              >
                <option value="PERCENT">Percentual (%)</option>
                <option value="FIXED">Valor fixo (R$)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-zinc-400 mb-1">
                Valor do desconto <span className="text-violet-400">*</span>
              </label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder={form.discount_type === 'PERCENT' ? '10' : '20.00'}
                value={form.value}
                onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
                className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-600"
              />
            </div>

            <div>
              <label className="block text-xs text-zinc-400 mb-1">Valor minimo do pedido</label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="Opcional"
                value={form.min_order_value}
                onChange={(e) => setForm((f) => ({ ...f, min_order_value: e.target.value }))}
                className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-600"
              />
            </div>

            <div>
              <label className="block text-xs text-zinc-400 mb-1">Desconto maximo (R$)</label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="Opcional"
                value={form.max_discount_value}
                onChange={(e) => setForm((f) => ({ ...f, max_discount_value: e.target.value }))}
                className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-600"
              />
            </div>

            <div>
              <label className="block text-xs text-zinc-400 mb-1">Limite de uso</label>
              <Input
                type="number"
                min="0"
                step="1"
                placeholder="Opcional"
                value={form.usage_limit}
                onChange={(e) => setForm((f) => ({ ...f, usage_limit: e.target.value }))}
                className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-600"
              />
            </div>

            <div>
              <label className="block text-xs text-zinc-400 mb-1">Uso por usuario</label>
              <Input
                type="number"
                min="0"
                step="1"
                placeholder="Opcional"
                value={form.usage_limit_per_user}
                onChange={(e) => setForm((f) => ({ ...f, usage_limit_per_user: e.target.value }))}
                className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-600"
              />
            </div>

            <div>
              <label className="block text-xs text-zinc-400 mb-1">Inicio</label>
              <Input
                type="datetime-local"
                value={form.starts_at}
                onChange={(e) => setForm((f) => ({ ...f, starts_at: e.target.value }))}
                className="bg-zinc-900 border-zinc-700 text-white"
              />
            </div>

            <div>
              <label className="block text-xs text-zinc-400 mb-1">Fim</label>
              <Input
                type="datetime-local"
                value={form.ends_at}
                onChange={(e) => setForm((f) => ({ ...f, ends_at: e.target.value }))}
                className="bg-zinc-900 border-zinc-700 text-white"
              />
            </div>

            <div className="sm:col-span-2 flex items-center gap-3">
              <button type="button" onClick={() => setForm((f) => ({ ...f, is_active: !f.is_active }))}>
                {form.is_active
                  ? <ToggleRight className="w-6 h-6 text-green-400" />
                  : <ToggleLeft className="w-6 h-6 text-zinc-600" />}
              </button>
              <span className="text-sm text-zinc-400">{form.is_active ? 'Cupom ativo' : 'Cupom inativo'}</span>
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

      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="bg-zinc-950 border border-zinc-800 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-white">Excluir Cupom</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-zinc-400 mt-2">
            Tem certeza que deseja excluir <span className="text-white font-medium">{deleteTarget?.code}</span>?
            Esta acao nao pode ser desfeita.
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




