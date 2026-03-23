'use client'

import { apiFetch } from '@/lib/api'
import { getBackendUrl } from '@/lib/backend-url'
import { useEffect, useState, useCallback } from 'react'
import { Search, ChevronLeft, ChevronRight, Mail, Phone, MapPin } from 'lucide-react'
import { Input } from '@/components/ui/input'

const BACKEND_URL = getBackendUrl()

interface Cliente {
  id: number
  email: string
  full_name: string
  phone: string
  address_city: string
  address_state: string
  date_joined: string
  cpf: string | null
}

const perPage = 20

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

const avatarColors = [
  'bg-violet-500/20 text-violet-300',
  'bg-blue-500/20 text-blue-300',
  'bg-green-500/20 text-green-300',
  'bg-orange-500/20 text-orange-300',
  'bg-pink-500/20 text-pink-300',
]

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const totalPages = Math.ceil(total / perPage)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400)
    return () => clearTimeout(t)
  }, [search])

  const loadClientes = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams({
      page: String(page),
      ...(debouncedSearch ? { q: debouncedSearch } : {}),
    })
    apiFetch(`${BACKEND_URL}/api/admin/clientes/?${params}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        setClientes(data.results)
        setTotal(data.total)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [page, debouncedSearch])

  useEffect(() => {
    loadClientes()
  }, [loadClientes])

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Clientes</h1>
        <p className="text-sm text-zinc-500 mt-1">
          {total} {total === 1 ? 'cliente cadastrado' : 'clientes cadastrados'}
        </p>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
        <Input
          placeholder="Buscar por nome ou e-mail..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
          className="pl-9 bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600"
        />
      </div>

      {/* Cards grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 9 }).map((_, i) => (
            <div
              key={i}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 animate-pulse"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-zinc-800" />
                <div>
                  <div className="h-4 w-32 bg-zinc-800 rounded mb-1.5" />
                  <div className="h-3 w-44 bg-zinc-800 rounded" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-3 w-24 bg-zinc-800 rounded" />
                <div className="h-3 w-28 bg-zinc-800 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : clientes.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl px-6 py-16 text-center">
          <p className="text-sm text-zinc-500">Nenhum cliente encontrado.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {clientes.map((c, idx) => (
            <div
              key={c.id}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 hover:border-zinc-700 transition-colors"
            >
              <div className="flex items-start gap-3 mb-4">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 ${
                    avatarColors[idx % avatarColors.length]
                  }`}
                >
                  {initials(c.full_name || c.email)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {c.full_name || '—'}
                  </p>
                  <p className="text-xs text-zinc-500 truncate">{c.email}</p>
                </div>
              </div>

              <div className="space-y-1.5">
                {c.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
                    <span className="text-xs text-zinc-400">{c.phone}</span>
                  </div>
                )}
                {(c.address_city || c.address_state) && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
                    <span className="text-xs text-zinc-400">
                      {[c.address_city, c.address_state].filter(Boolean).join(', ')}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-600">Desde {formatDate(c.date_joined)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <p className="text-xs text-zinc-500">
            Página {page} de {totalPages} · {total} clientes
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
  )
}




