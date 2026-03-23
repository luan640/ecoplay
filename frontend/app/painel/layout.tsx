'use client'

import { apiFetch } from '@/lib/api'
import { getBackendUrl } from '@/lib/backend-url'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  LayoutDashboard,
  ClipboardList,
  Package,
  Users,
  LogOut,
  Gamepad2,
  Menu,
  X,
  Tag,
  Monitor,
  Tv2,
  TicketPercent,
  CircleDollarSign,
  ChevronsLeft,
  ChevronsRight,
  ArrowLeftRight,
  Settings,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const BACKEND_URL = getBackendUrl()

const navSections = [
  {
    label: 'Geral',
    items: [
      { label: 'Dashboard', href: '/painel', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Cadastro',
    items: [
      { label: 'Produtos', href: '/painel/produtos', icon: Package },
      { label: 'Categorias', href: '/painel/categorias', icon: Tag },
      { label: 'Plataformas', href: '/painel/plataformas', icon: Monitor },
      { label: 'Subplataformas', href: '/painel/subplataformas', icon: Tv2 },
      { label: 'Cupons', href: '/painel/cupons', icon: TicketPercent },
    ],
  },
  {
    label: 'Estoque',
    items: [
      { label: 'Cotações', href: '/painel/cotacoes', icon: ClipboardList },
      { label: 'Vendas', href: '/painel/vendas', icon: CircleDollarSign },
      { label: 'Extrato', href: '/painel/extrato', icon: ArrowLeftRight },
    ],
  },
  {
    label: 'Loja',
    items: [
      { label: 'Vitrine', href: '/painel/vitrine', icon: Tv2 },
      { label: 'Clientes', href: '/painel/clientes', icon: Users },
    ],
  },
]

function AdminSidebar({
  open,
  onClose,
  collapsed,
  onToggleCollapse,
}: {
  open: boolean
  onClose: () => void
  collapsed: boolean
  onToggleCollapse: () => void
}) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    await apiFetch(`${BACKEND_URL}/api/clientes/logout/`, {
      method: 'POST',
    })
    router.push('/painel/login')
  }

  return (
    <>
      {/* Overlay mobile */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-full bg-zinc-900 border-r border-zinc-800 flex flex-col transition-all duration-300',
          'lg:translate-x-0 lg:static lg:z-auto',
          open ? 'translate-x-0' : '-translate-x-full',
          collapsed ? 'w-16' : 'w-64'
        )}
      >
        {/* Logo */}
        <div
          className={cn(
            'flex items-center border-b border-zinc-800 shrink-0',
            collapsed ? 'justify-center px-0 py-5' : 'gap-2 px-4 py-5'
          )}
        >
          <Gamepad2 className="text-violet-400 w-6 h-6 shrink-0" />
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white leading-none">EcoPlay</p>
              <p className="text-xs text-zinc-500 mt-0.5">Painel Admin</p>
            </div>
          )}
          {/* Mobile close */}
          {!collapsed && (
            <button
              className="lg:hidden text-zinc-400 hover:text-white"
              onClick={onClose}
            >
              <X className="w-5 h-5" />
            </button>
          )}
          {/* Desktop collapse toggle */}
          <button
            className={cn(
              'hidden lg:flex items-center justify-center rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors',
              collapsed ? 'w-8 h-8' : 'w-7 h-7 ml-auto'
            )}
            onClick={onToggleCollapse}
            title={collapsed ? 'Expandir sidebar' : 'Contrair sidebar'}
          >
            {collapsed ? (
              <ChevronsRight className="w-4 h-4" />
            ) : (
              <ChevronsLeft className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav
          className={cn(
            'flex-1 py-4 overflow-y-auto overflow-x-hidden',
            collapsed ? 'px-2' : 'px-3'
          )}
        >
          {navSections.map((section, si) => (
            <div key={section.label} className={cn(si > 0 && 'mt-4')}>
              {!collapsed && (
                <p className="px-3 mb-1 text-[10px] font-bold uppercase tracking-widest text-zinc-600">
                  {section.label}
                </p>
              )}
              {collapsed && si > 0 && (
                <div className="border-t border-zinc-800 my-2" />
              )}
              <div className="space-y-0.5">
                {section.items.map(({ label, href, icon: Icon }) => {
                  const active =
                    href === '/painel'
                      ? pathname === '/painel'
                      : pathname.startsWith(href)
                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={onClose}
                      title={collapsed ? label : undefined}
                      className={cn(
                        'flex items-center rounded-lg text-sm font-medium transition-colors',
                        collapsed
                          ? 'justify-center w-10 h-10 mx-auto'
                          : 'gap-3 px-3 py-2.5',
                        active
                          ? 'bg-violet-600/20 text-violet-300 border border-violet-600/30'
                          : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                      )}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      {!collapsed && label}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom bar: Configurações + Sair */}
        <div
          className={cn(
            'border-t border-zinc-800',
            collapsed ? 'p-2 flex flex-col items-center gap-1' : 'p-4 flex items-center gap-2'
          )}
        >
          <Link
            href="/painel/configuracoes"
            title="Configurações"
            className={cn(
              'flex items-center rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors',
              collapsed ? 'justify-center w-10 h-10' : 'gap-3 px-3 py-2.5 text-sm flex-1'
            )}
          >
            <Settings className="w-4 h-4 shrink-0" />
            {!collapsed && 'Configurações'}
          </Link>
          <button
            onClick={handleLogout}
            title="Sair"
            className={cn(
              'flex items-center rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-400/10 transition-colors',
              collapsed ? 'justify-center w-10 h-10' : 'gap-3 px-3 py-2.5 text-sm'
            )}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!collapsed && 'Sair'}
          </button>
        </div>
      </aside>
    </>
  )
}

export default function PainelLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [checking, setChecking] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  useEffect(() => {
    // Skip auth check on login page
    if (pathname.startsWith('/painel/login')) {
      setChecking(false)
      return
    }

    apiFetch(`${BACKEND_URL}/api/clientes/me/`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data?.authenticated || data?.user?.user_type !== 'ADMIN') {
          router.replace('/painel/login')
        } else {
          setChecking(false)
        }
      })
      .catch(() => router.replace('/painel/login'))
  }, [pathname, router])

  if (pathname.startsWith('/painel/login')) {
    return <>{children}</>
  }

  if (checking) {
    return (
      <div className="h-screen flex items-center justify-center bg-zinc-950">
        <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-zinc-950 text-white overflow-hidden">
      <AdminSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar (mobile) */}
        <header className="flex items-center gap-3 px-4 py-3 bg-zinc-900 border-b border-zinc-800 lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-zinc-400 hover:text-white"
          >
            <Menu className="w-5 h-5" />
          </button>
          <Gamepad2 className="text-violet-400 w-5 h-5" />
          <span className="text-sm font-semibold">Painel Admin</span>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">{children}</main>
      </div>
    </div>
  )
}




