'use client'

import { apiFetch } from '@/lib/api'
import { getBackendUrl } from '@/lib/backend-url'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Gamepad2, Lock } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

const BACKEND_URL = getBackendUrl()

export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || !password.trim()) {
      setError('Preencha e-mail e senha.')
      return
    }
    setError('')
    setLoading(true)
    try {
      const res = await apiFetch(`${BACKEND_URL}/api/admin/login/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(
          data?.detail ||
            (Array.isArray(data?.non_field_errors)
              ? data.non_field_errors[0]
              : 'Credenciais inválidas.')
        )
        return
      }
      const meRes = await apiFetch(`${BACKEND_URL}/api/clientes/me/`)
      const meData = await meRes.json().catch(() => null)
      if (!meRes.ok || !meData?.authenticated || meData?.user?.user_type !== 'ADMIN') {
        setError('Sessão não foi persistida. Entre novamente.')
        return
      }

      router.push('/painel')
    } catch {
      setError('Erro de conexão. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-violet-600/20 border border-violet-600/40 rounded-2xl flex items-center justify-center mb-4">
            <Gamepad2 className="w-7 h-7 text-violet-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">EcoPlay Admin</h1>
          <p className="text-sm text-zinc-500 mt-1">Painel do administrador</p>
        </div>

        {/* Card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
          <div className="flex items-center gap-2 mb-6">
            <Lock className="w-4 h-4 text-zinc-500" />
            <span className="text-sm text-zinc-400 font-medium">Acesso restrito</span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                E-mail
              </label>
              <Input
                type="email"
                placeholder="admin@ecoplay.com.br"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                className="bg-zinc-800 border-zinc-700 focus:border-violet-500 text-white placeholder:text-zinc-600"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                Senha
              </label>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="bg-zinc-800 border-zinc-700 focus:border-violet-500 text-white placeholder:text-zinc-600"
              />
            </div>

            {error && (
              <p className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-violet-600 hover:bg-violet-700 text-white font-medium"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Entrando...
                </span>
              ) : (
                'Entrar no painel'
              )}
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-zinc-600 mt-6">
          Área exclusiva para administradores.{' '}
          <a href="/" className="text-zinc-500 hover:text-zinc-300 underline">
            Ir para a loja
          </a>
        </p>
      </div>
    </div>
  )
}





