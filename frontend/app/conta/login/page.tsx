'use client'

import { apiFetch } from '@/lib/api'
import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || (typeof window !== 'undefined' ? window.location.protocol + '//' + window.location.hostname + ':8000' : 'http://localhost:8000')

function GoogleGIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.9-5.5 3.9-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.2.8 3.9 1.5l2.7-2.6C16.9 3.5 14.6 2.5 12 2.5A9.5 9.5 0 1 0 12 21.5c5.5 0 9.1-3.9 9.1-9.3 0-.6-.1-1.1-.1-1.5H12Z"
      />
      <path
        fill="#34A853"
        d="M2.5 7.7l3.2 2.3c.9-2 2.9-3.5 5.3-3.5 1.9 0 3.2.8 3.9 1.5l2.7-2.6C16.9 3.5 14.6 2.5 12 2.5c-3.6 0-6.7 2-8.3 5.2Z"
      />
      <path
        fill="#FBBC05"
        d="M12 21.5c2.5 0 4.7-.8 6.3-2.3l-2.9-2.3c-.8.6-1.9 1-3.4 1-2.6 0-4.8-1.7-5.6-4.1l-3.1 2.4C4.9 19.4 8.2 21.5 12 21.5Z"
      />
      <path
        fill="#4285F4"
        d="M21.1 12.2c0-.6-.1-1.1-.1-1.5H12v3.9h5.5c-.3 1.3-1.1 2.3-2.1 3l2.9 2.3c1.7-1.6 2.8-4 2.8-7.7Z"
      />
    </svg>
  )
}

function ContaLoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const prefillEmail = searchParams.get('email') || ''
  const nextParam = searchParams.get('next') || ''
  const nextPath =
    nextParam.startsWith('/') && !nextParam.startsWith('//') ? nextParam : '/'

  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [loading, setLoading] = useState(false)
  const [checkingEmail, setCheckingEmail] = useState(false)
  const [notice, setNotice] = useState('')

  const [loginEmail, setLoginEmail] = useState(prefillEmail)
  const [loginPassword, setLoginPassword] = useState('')
  const [registerEmail, setRegisterEmail] = useState(prefillEmail)

  function handleGoogleAuth() {
    const frontendNext = `${window.location.origin}${nextPath}`
    const url = `${BACKEND_URL}/auth/login/google-oauth2/?next=${encodeURIComponent(frontendNext)}`
    window.location.href = url
  }

  async function handleLoginSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!loginEmail.trim() || !loginPassword.trim()) {
      setNotice('Preencha e-mail e senha.')
      return
    }

    setLoading(true)
    setNotice('')
    try {
      const res = await apiFetch(`${BACKEND_URL}/api/clientes/login/`, {
        method: 'POST',
        body: JSON.stringify({ email: loginEmail.trim(), password: loginPassword }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setNotice(data?.non_field_errors?.[0] || data?.detail || 'Falha no login.')
        return
      }
      router.push(nextPath)
    } catch {
      setNotice('Erro de conexão com o servidor.')
    } finally {
      setLoading(false)
    }
  }

  async function handleRegisterStart() {
    const email = registerEmail.trim().toLowerCase()
    if (!email) {
      setNotice('Preencha o e-mail.')
      return
    }

    setCheckingEmail(true)
    setNotice('')
    try {
      const res = await apiFetch(
        `${BACKEND_URL}/api/clientes/check-email/?email=${encodeURIComponent(email)}`
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setNotice(data?.detail || 'Falha ao validar e-mail.')
        return
      }
      if (data?.exists) {
        setLoginEmail(email)
        setMode('login')
        setNotice('E-mail já cadastrado. Faça login para continuar.')
        return
      }
      router.push(
        `/conta/criar?next=${encodeURIComponent(nextPath)}&email=${encodeURIComponent(email)}`
      )
    } catch {
      setNotice('Erro de conexão com o servidor.')
    } finally {
      setCheckingEmail(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#0f0f0f] px-4 py-16 sm:py-24">
      <div className="mx-auto max-w-xl">
        <div className="relative rounded-2xl border border-[#2e2e2e] bg-[#141414] p-6 pt-12 sm:p-8 sm:pt-14">
          <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2">
            <button
              type="button"
              onClick={() => setMode((curr) => (curr === 'login' ? 'register' : 'login'))}
              className="h-11 rounded-full border border-[#49e4e6]/40 bg-[#111111] px-6 text-sm font-black text-[#49e4e6] transition-colors hover:bg-[#1a1a1a]"
            >
              {mode === 'login' ? 'Ainda não possuo cadastro' : 'Já sou cadastrado'}
            </button>
          </div>

          {mode === 'login' ? (
            <>
              <h1 className="text-2xl font-black text-[#f5f5f5]">Já sou cadastrado</h1>
              <form onSubmit={handleLoginSubmit} className="mt-6 space-y-4">
                <div>
                  <label className="text-sm text-[#dddddd]">E-mail</label>
                  <Input
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="mt-2 h-11 rounded-xl border-[#2e2e2e] bg-[#1a1a1a] text-[#f5f5f5]"
                  />
                </div>

                <div>
                  <label className="text-sm text-[#dddddd]">Senha</label>
                  <Input
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="mt-2 h-11 rounded-xl border-[#2e2e2e] bg-[#1a1a1a] text-[#f5f5f5]"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setMode('register')}
                    className="text-xs font-semibold text-[#9ca3af] hover:text-[#49e4e6] transition-colors"
                  >
                    esqueceu senha ou precisa criar?
                  </button>
                  <a
                    href="/painel/login"
                    className="text-xs font-semibold text-[#9ca3af] hover:text-[#49e4e6] transition-colors"
                  >
                    painel admin
                  </a>
                </div>

                {notice ? <p className="text-xs text-[#fca5a5]">{notice}</p> : null}

                <Button
                  type="submit"
                  disabled={loading}
                  className="h-11 w-full rounded-xl bg-[#49e4e6] font-black text-[#0f0f0f] hover:bg-[#2fc8cc]"
                >
                  {loading ? 'Entrando...' : 'Entrar'}
                </Button>

                <Button
                  type="button"
                  onClick={handleGoogleAuth}
                  className="h-11 w-full rounded-xl border border-[#d1d5db] bg-white font-semibold text-[#1f2937] hover:bg-[#f9fafb]"
                >
                  <span className="flex items-center gap-2">
                    <GoogleGIcon />
                    <span>Fazer Login com o Google</span>
                  </span>
                </Button>
              </form>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-black text-[#f5f5f5]">Ainda não possuo cadastro</h1>
              <div className="mt-6 space-y-4">
                <div>
                  <label className="text-sm text-[#dddddd]">E-mail</label>
                  <Input
                    type="email"
                    value={registerEmail}
                    onChange={(e) => setRegisterEmail(e.target.value)}
                    className="mt-2 h-11 rounded-xl border-[#2e2e2e] bg-[#1a1a1a] text-[#f5f5f5]"
                  />
                </div>

                <Button
                  type="button"
                  onClick={handleRegisterStart}
                  disabled={checkingEmail}
                  className="h-11 w-full rounded-xl bg-[#49e4e6] font-black text-[#0f0f0f] hover:bg-[#2fc8cc]"
                >
                  {checkingEmail ? 'Validando...' : 'cadastrar'}
                </Button>

                <Button
                  type="button"
                  onClick={handleGoogleAuth}
                  className="h-11 w-full rounded-xl border border-[#d1d5db] bg-white font-semibold text-[#1f2937] hover:bg-[#f9fafb]"
                >
                  <span className="flex items-center gap-2">
                    <GoogleGIcon />
                    <span>Fazer Login com o Google</span>
                  </span>
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  )
}

export default function ContaLoginPage() {
  return (
    <Suspense>
      <ContaLoginContent />
    </Suspense>
  )
}




