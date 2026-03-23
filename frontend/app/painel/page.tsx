'use client'

import { apiFetch } from '@/lib/api'
import { getBackendUrl } from '@/lib/backend-url'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Package,
  Users,
  ClipboardList,
  ArrowRight,
  ShoppingBag,
  Tag,
  TrendingUp,
  BarChart2,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'

const BACKEND_URL = getBackendUrl()

interface Stats {
  products: { total: number; active: number; inactive: number }
  clientes: { total: number }
  cotacoes: { total: number }
  vendas: { total: number; finalizadas: number }
  vendas_hoje: number
  faturamento_hoje: number
  faturamento_mes: number
  cupons_ativos: number
  top_produtos: Array<{ product_name: string; total_qty: number }>
  vendas_30dias: Array<{ date: string; count: number }>
  recent_cotacoes: Array<{
    id: number
    protocol: string
    full_name: string
    email: string
    city: string
    created_at: string
  }>
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

function formatDateLabel(iso: string) {
  const [, m, d] = iso.split('-')
  return `${d}/${m}`
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
  href,
}: {
  icon: React.ElementType
  label: string
  value: number | string
  sub?: string
  color: string
  href: string
}) {
  return (
    <Link
      href={href}
      className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 hover:border-zinc-700 transition-colors group"
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
        <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
      </div>
      <p className="text-3xl font-bold text-white">{value}</p>
      <p className="text-sm text-zinc-400 mt-1">{label}</p>
      {sub && <p className="text-xs text-zinc-600 mt-0.5">{sub}</p>}
    </Link>
  )
}

function SmallCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType
  label: string
  value: string | number
  color: string
}) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex items-center gap-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xl font-bold text-white truncate">{value}</p>
        <p className="text-xs text-zinc-500 mt-0.5">{label}</p>
      </div>
    </div>
  )
}

function ChartTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white shadow-lg">
        <p className="text-zinc-400 mb-0.5">{label}</p>
        <p className="font-semibold">{payload[0].value} venda{payload[0].value !== 1 ? 's' : ''}</p>
      </div>
    )
  }
  return null
}

function SkeletonBlock({ height }: { height?: string }) {
  return (
    <div
      className="bg-zinc-900 border border-zinc-800 rounded-2xl animate-pulse"
      style={{ height: height ?? '120px' }}
    />
  )
}

export default function PainelPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    apiFetch(`${BACKEND_URL}/api/admin/stats/`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then(setStats)
      .catch(() => setError('Nao foi possivel carregar as estatisticas.'))
      .finally(() => setLoading(false))
  }, [])

  const chartData =
    stats?.vendas_30dias?.map((d) => ({
      ...d,
      label: formatDateLabel(d.date),
    })) ?? []

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-sm text-zinc-500 mt-1">Visao geral da loja</p>
      </div>

      {loading && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonBlock key={i} height="88px" />
            ))}
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <SkeletonBlock height="264px" />
            <SkeletonBlock height="264px" />
            <SkeletonBlock height="264px" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonBlock key={i} height="120px" />
            ))}
          </div>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-3">
          {error}
        </p>
      )}

      {stats && (
        <>
          {/* Linha 1: cards rapidos */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            <SmallCard
              icon={ShoppingBag}
              label="Vendas finalizadas hoje"
              value={stats.vendas_hoje}
              color="bg-violet-500/20 text-violet-400"
            />
            <SmallCard
              icon={TrendingUp}
              label="Faturamento do dia"
              value={formatCurrency(stats.faturamento_hoje)}
              color="bg-green-500/20 text-green-400"
            />
            <SmallCard
              icon={BarChart2}
              label="Faturamento do mês"
              value={formatCurrency(stats.faturamento_mes)}
              color="bg-blue-500/20 text-blue-400"
            />
            <SmallCard
              icon={Tag}
              label="Cupons ativos"
              value={stats.cupons_ativos}
              color="bg-amber-500/20 text-amber-400"
            />
          </div>

          {/* Linha 2: grafico + top produtos */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <div className="xl:col-span-2 bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <p className="text-sm font-semibold text-white mb-1">Vendas finalizadas nos últimos 30 dias</p>
              <p className="text-xs text-zinc-600 mb-5">Total de vendas finalizadas por dia</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart
                  data={chartData}
                  barSize={10}
                  margin={{ top: 0, right: 4, bottom: 0, left: -20 }}
                >
                  <CartesianGrid vertical={false} stroke="#27272a" />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: '#71717a', fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    interval={4}
                  />
                  <YAxis
                    tick={{ fill: '#71717a', fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                  <Bar dataKey="count" fill="#7c3aed" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden flex flex-col">
              <div className="px-6 py-4 border-b border-zinc-800">
                <p className="text-sm font-semibold text-white">Top 5 produtos</p>
                <p className="text-xs text-zinc-600 mt-0.5">Por quantidade vendida (finalizadas)</p>
              </div>
              {stats.top_produtos.length === 0 ? (
                <div className="flex-1 flex items-center justify-center px-6 py-8">
                  <p className="text-sm text-zinc-600 text-center">Nenhuma venda finalizada ainda.</p>
                </div>
              ) : (
                <div className="divide-y divide-zinc-800 flex-1">
                  {stats.top_produtos.map((p, i) => {
                    const max = stats.top_produtos[0]?.total_qty || 1
                    const pct = Math.round((p.total_qty / max) * 100)
                    return (
                      <div key={p.product_name} className="px-6 py-3 flex items-center gap-3">
                        <span className="text-xs font-semibold text-zinc-600 w-4 shrink-0">
                          {i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-white truncate leading-tight">
                            {p.product_name}
                          </p>
                          <div className="mt-1.5 h-1 rounded-full bg-zinc-800 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-violet-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                        <span className="text-xs font-semibold text-zinc-400 shrink-0 ml-2">
                          {p.total_qty}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Linha 3: cards gerais */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            <StatCard
              icon={Package}
              label="Produtos"
              value={stats.products.total}
              sub={`${stats.products.active} ativos - ${stats.products.inactive} inativos`}
              color="bg-blue-500/20 text-blue-400"
              href="/painel/produtos"
            />
            <StatCard
              icon={Users}
              label="Clientes"
              value={stats.clientes.total}
              color="bg-green-500/20 text-green-400"
              href="/painel/clientes"
            />
            <StatCard
              icon={ClipboardList}
              label="Cotacoes"
              value={stats.cotacoes.total}
              color="bg-violet-500/20 text-violet-400"
              href="/painel/cotacoes"
            />
          </div>

          {/* Linha 4: ultimas cotacoes */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
              <h2 className="text-sm font-semibold text-white">Últimas cotações</h2>
              <Link
                href="/painel/cotacoes"
                className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
              >
                Ver todas
              </Link>
            </div>

            {stats.recent_cotacoes.length === 0 ? (
              <p className="px-6 py-8 text-sm text-zinc-500 text-center">
                Nenhuma cotacao recebida ainda.
              </p>
            ) : (
              <div className="divide-y divide-zinc-800">
                {stats.recent_cotacoes.map((q) => (
                  <Link
                    key={q.id}
                    href={`/painel/cotacoes?id=${q.id}`}
                    className="flex items-center justify-between px-6 py-4 hover:bg-zinc-800/50 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm text-white font-medium truncate">{q.full_name}</p>
                      <p className="text-xs text-zinc-500 truncate">
                        {q.email}
                        {q.city ? ` - ${q.city}` : ''}
                      </p>
                    </div>
                    <div className="text-right ml-4 shrink-0">
                      <p className="text-xs text-zinc-400">{formatDate(q.created_at)}</p>
                      <p className="text-xs text-zinc-600 font-mono">#{q.id}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
