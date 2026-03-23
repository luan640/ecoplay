'use client'

import { Suspense, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || (typeof window !== 'undefined' ? window.location.protocol + '//' + window.location.hostname + ':8000' : 'http://localhost:8000')

type StepKey = 'acesso' | 'pessoal' | 'endereco' | 'finalizar'

function ContaCriarContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const initialEmail = searchParams.get('email') || ''
  const nextParam = searchParams.get('next') || ''
  const nextPath =
    nextParam.startsWith('/') && !nextParam.startsWith('//') ? nextParam : '/'

  const [step, setStep] = useState<StepKey>('acesso')
  const [loading, setLoading] = useState(false)
  const [notice, setNotice] = useState('')
  const [cepLoading, setCepLoading] = useState(false)
  const [cepNotice, setCepNotice] = useState('')

  const [acceptedTerms, setAcceptedTerms] = useState(false)

  const [acesso, setAcesso] = useState({
    email: initialEmail,
    emailConfirm: initialEmail,
    password: '',
    passwordConfirm: '',
  })

  const [pessoal, setPessoal] = useState({
    fullName: '',
    cpf: '',
    phone: '',
    landline: '',
    gender: '',
    birthDate: '',
  })

  const [endereco, setEndereco] = useState({
    cep: '',
    street: '',
    number: '',
    complement: '',
    reference: '',
    district: '',
    city: '',
    state: '',
  })

  function onlyCepDigits(value: string) {
    return value.replace(/\D/g, '').slice(0, 8)
  }

  function formatCep(value: string) {
    const digits = onlyCepDigits(value)
    if (digits.length <= 5) return digits
    return `${digits.slice(0, 5)}-${digits.slice(5)}`
  }

  async function handleCepLookup(rawCep: string) {
    const cep = onlyCepDigits(rawCep)
    if (cep.length !== 8) {
      setCepNotice('CEP inválido.')
      return
    }

    setCepLoading(true)
    setCepNotice('')
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`)
      const data = await response.json()

      if (!response.ok || data?.erro) {
        setCepNotice('CEP inválido.')
        return
      }

      setEndereco((prev) => ({
        ...prev,
        street: data?.logradouro || '',
        district: data?.bairro || '',
        city: data?.localidade || '',
        state: data?.uf || '',
        complement: '',
      }))
      setCepNotice('')
    } catch {
      setCepNotice('Não foi possível consultar o CEP.')
    } finally {
      setCepLoading(false)
    }
  }

  const steps = useMemo(
    () => [
      { key: 'acesso' as StepKey, label: 'Dados para acesso' },
      { key: 'pessoal' as StepKey, label: 'Dados pessoais' },
      { key: 'endereco' as StepKey, label: 'Endereço' },
      { key: 'finalizar' as StepKey, label: 'Finalização' },
    ],
    []
  )

  function canGoAcesso() {
    return (
      acesso.email.trim() &&
      acesso.emailConfirm.trim() &&
      acesso.password.trim() &&
      acesso.passwordConfirm.trim() &&
      acesso.email.trim() === acesso.emailConfirm.trim() &&
      acesso.password === acesso.passwordConfirm
    )
  }

  function canGoPessoal() {
    return (
      pessoal.fullName.trim() &&
      pessoal.cpf.trim() &&
      pessoal.phone.trim() &&
      pessoal.birthDate.trim()
    )
  }

  function canGoEndereco() {
    return (
      endereco.cep.trim() &&
      endereco.street.trim() &&
      endereco.number.trim() &&
      endereco.district.trim() &&
      endereco.city.trim() &&
      endereco.state.trim()
    )
  }

  async function handleCreateAccount() {
    if (!acceptedTerms) {
      setNotice('Li e concordo com os termos da Política de Privacidade é obrigatório.')
      return
    }

    setLoading(true)
    setNotice('')

    try {
      const res = await fetch(`${BACKEND_URL}/api/clientes/registro/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: acesso.email.trim(),
          full_name: pessoal.fullName.trim(),
          password: acesso.password,
          cpf: pessoal.cpf.trim(),
          birth_date: pessoal.birthDate,
          phone: pessoal.phone.trim(),
        }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setNotice(data?.email?.[0] || data?.detail || 'Falha ao criar conta.')
        return
      }

      router.push(
        `/conta/login?email=${encodeURIComponent(acesso.email.trim())}&next=${encodeURIComponent(nextPath)}`
      )
    } catch {
      setNotice('Erro de conexão com o servidor.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#0f0f0f] px-4 py-10 sm:py-14">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-3xl font-black text-[#f5f5f5]">Criar conta</h1>

        <div className="mt-6 grid grid-cols-2 gap-2 md:grid-cols-4">
          {steps.map((item) => (
            <div
              key={item.key}
              className={`rounded-xl border px-3 py-3 text-center text-xs font-bold sm:text-sm ${
                step === item.key
                  ? 'border-[#49e4e6] bg-[#49e4e6]/10 text-[#49e4e6]'
                  : 'border-[#2e2e2e] bg-[#141414] text-[#a3a3a3]'
              }`}
            >
              {item.label}
            </div>
          ))}
        </div>

        <section className="mt-4 rounded-2xl border border-[#2e2e2e] bg-[#141414] p-5 sm:p-6">
          {step === 'acesso' ? (
            <div className="space-y-4">
              <h2 className="text-lg font-black text-[#f5f5f5]">Dados para acesso</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm text-[#dddddd]">E-mail</label>
                  <Input
                    type="email"
                    value={acesso.email}
                    onChange={(e) => setAcesso((prev) => ({ ...prev, email: e.target.value }))}
                    className="mt-2 h-11 rounded-xl border-[#2e2e2e] bg-[#1a1a1a] text-[#f5f5f5]"
                  />
                </div>
                <div>
                  <label className="text-sm text-[#dddddd]">Confirmar e-mail</label>
                  <Input
                    type="email"
                    value={acesso.emailConfirm}
                    onChange={(e) => setAcesso((prev) => ({ ...prev, emailConfirm: e.target.value }))}
                    className="mt-2 h-11 rounded-xl border-[#2e2e2e] bg-[#1a1a1a] text-[#f5f5f5]"
                  />
                </div>
                <div>
                  <label className="text-sm text-[#dddddd]">Crie uma senha</label>
                  <Input
                    type="password"
                    value={acesso.password}
                    onChange={(e) => setAcesso((prev) => ({ ...prev, password: e.target.value }))}
                    className="mt-2 h-11 rounded-xl border-[#2e2e2e] bg-[#1a1a1a] text-[#f5f5f5]"
                  />
                </div>
                <div>
                  <label className="text-sm text-[#dddddd]">Confirmar senha</label>
                  <Input
                    type="password"
                    value={acesso.passwordConfirm}
                    onChange={(e) => setAcesso((prev) => ({ ...prev, passwordConfirm: e.target.value }))}
                    className="mt-2 h-11 rounded-xl border-[#2e2e2e] bg-[#1a1a1a] text-[#f5f5f5]"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  type="button"
                  disabled={!canGoAcesso()}
                  onClick={() => setStep('pessoal')}
                  className="h-11 rounded-xl bg-[#49e4e6] px-6 font-black text-[#0f0f0f] hover:bg-[#2fc8cc] disabled:opacity-50"
                >
                  seguir
                </Button>
              </div>
            </div>
          ) : null}

          {step === 'pessoal' ? (
            <div className="space-y-4">
              <h2 className="text-lg font-black text-[#f5f5f5]">Dados pessoais</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="text-sm text-[#dddddd]">Nome completo</label>
                  <Input
                    value={pessoal.fullName}
                    onChange={(e) => setPessoal((prev) => ({ ...prev, fullName: e.target.value }))}
                    className="mt-2 h-11 rounded-xl border-[#2e2e2e] bg-[#1a1a1a] text-[#f5f5f5]"
                  />
                </div>
                <div>
                  <label className="text-sm text-[#dddddd]">CPF</label>
                  <Input
                    value={pessoal.cpf}
                    onChange={(e) => setPessoal((prev) => ({ ...prev, cpf: e.target.value }))}
                    className="mt-2 h-11 rounded-xl border-[#2e2e2e] bg-[#1a1a1a] text-[#f5f5f5]"
                  />
                </div>
                <div>
                  <label className="text-sm text-[#dddddd]">Celular</label>
                  <Input
                    value={pessoal.phone}
                    onChange={(e) => setPessoal((prev) => ({ ...prev, phone: e.target.value }))}
                    className="mt-2 h-11 rounded-xl border-[#2e2e2e] bg-[#1a1a1a] text-[#f5f5f5]"
                  />
                </div>
                <div>
                  <label className="text-sm text-[#dddddd]">Telefone fixo</label>
                  <Input
                    value={pessoal.landline}
                    onChange={(e) => setPessoal((prev) => ({ ...prev, landline: e.target.value }))}
                    className="mt-2 h-11 rounded-xl border-[#2e2e2e] bg-[#1a1a1a] text-[#f5f5f5]"
                  />
                </div>
                <div>
                  <label className="text-sm text-[#dddddd]">Sexo</label>
                  <select
                    value={pessoal.gender}
                    onChange={(e) => setPessoal((prev) => ({ ...prev, gender: e.target.value }))}
                    className="mt-2 h-11 w-full rounded-xl border border-[#2e2e2e] bg-[#1a1a1a] px-3 text-[#f5f5f5]"
                  >
                    <option value="">- Selecione -</option>
                    <option value="feminino">Feminino</option>
                    <option value="masculino">Masculino</option>
                    <option value="outro">Outro</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm text-[#dddddd]">Data de nascimento</label>
                  <Input
                    type="date"
                    value={pessoal.birthDate}
                    onChange={(e) => setPessoal((prev) => ({ ...prev, birthDate: e.target.value }))}
                    className="mt-2 h-11 rounded-xl border-[#2e2e2e] bg-[#1a1a1a] text-[#f5f5f5]"
                  />
                </div>
              </div>

              <div className="flex justify-between gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep('acesso')}
                  className="h-11 border-[#2e2e2e] bg-[#1a1a1a] text-[#f5f5f5]"
                >
                  voltar
                </Button>
                <Button
                  type="button"
                  disabled={!canGoPessoal()}
                  onClick={() => setStep('endereco')}
                  className="h-11 rounded-xl bg-[#49e4e6] px-6 font-black text-[#0f0f0f] hover:bg-[#2fc8cc] disabled:opacity-50"
                >
                  seguir
                </Button>
              </div>
            </div>
          ) : null}

          {step === 'endereco' ? (
            <div className="space-y-4">
              <h2 className="text-lg font-black text-[#f5f5f5]">Endereço</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm text-[#dddddd]">CEP</label>
                  <Input
                    value={formatCep(endereco.cep)}
                    onChange={(e) => {
                      const nextCep = onlyCepDigits(e.target.value)
                      setEndereco((prev) => ({ ...prev, cep: nextCep }))
                      if (cepNotice) setCepNotice('')
                    }}
                    onBlur={(e) => handleCepLookup(e.target.value)}
                    className="mt-2 h-11 rounded-xl border-[#2e2e2e] bg-[#1a1a1a] text-[#f5f5f5]"
                  />
                  {cepLoading ? (
                    <p className="mt-2 text-xs text-[#9ca3af]">Consultando CEP...</p>
                  ) : null}
                  {cepNotice ? (
                    <p className="mt-2 text-xs text-[#fca5a5]">{cepNotice}</p>
                  ) : null}
                </div>
                <div className="flex items-end">
                  <button
                    type="button"
                    className="h-11 text-xs font-bold text-[#49e4e6] transition-colors hover:text-[#2fc8cc]"
                  >
                    Não sei meu cep
                  </button>
                </div>
                <div className="sm:col-span-2">
                  <label className="text-sm text-[#dddddd]">Endereço</label>
                  <Input
                    value={endereco.street}
                    onChange={(e) => setEndereco((prev) => ({ ...prev, street: e.target.value }))}
                    className="mt-2 h-11 rounded-xl border-[#2e2e2e] bg-[#1a1a1a] text-[#f5f5f5]"
                  />
                </div>
                <div>
                  <label className="text-sm text-[#dddddd]">Número</label>
                  <Input
                    value={endereco.number}
                    onChange={(e) => setEndereco((prev) => ({ ...prev, number: e.target.value }))}
                    className="mt-2 h-11 rounded-xl border-[#2e2e2e] bg-[#1a1a1a] text-[#f5f5f5]"
                  />
                </div>
                <div>
                  <label className="text-sm text-[#dddddd]">Complemento</label>
                  <Input
                    value={endereco.complement}
                    onChange={(e) => setEndereco((prev) => ({ ...prev, complement: e.target.value }))}
                    className="mt-2 h-11 rounded-xl border-[#2e2e2e] bg-[#1a1a1a] text-[#f5f5f5]"
                  />
                </div>
                <div>
                  <label className="text-sm text-[#dddddd]">Referência</label>
                  <Input
                    value={endereco.reference}
                    onChange={(e) => setEndereco((prev) => ({ ...prev, reference: e.target.value }))}
                    className="mt-2 h-11 rounded-xl border-[#2e2e2e] bg-[#1a1a1a] text-[#f5f5f5]"
                  />
                </div>
                <div>
                  <label className="text-sm text-[#dddddd]">Bairro</label>
                  <Input
                    value={endereco.district}
                    onChange={(e) => setEndereco((prev) => ({ ...prev, district: e.target.value }))}
                    className="mt-2 h-11 rounded-xl border-[#2e2e2e] bg-[#1a1a1a] text-[#f5f5f5]"
                  />
                </div>
                <div>
                  <label className="text-sm text-[#dddddd]">Cidade</label>
                  <Input
                    value={endereco.city}
                    onChange={(e) => setEndereco((prev) => ({ ...prev, city: e.target.value }))}
                    className="mt-2 h-11 rounded-xl border-[#2e2e2e] bg-[#1a1a1a] text-[#f5f5f5]"
                  />
                </div>
                <div>
                  <label className="text-sm text-[#dddddd]">Estado</label>
                  <Input
                    value={endereco.state}
                    onChange={(e) => setEndereco((prev) => ({ ...prev, state: e.target.value }))}
                    className="mt-2 h-11 rounded-xl border-[#2e2e2e] bg-[#1a1a1a] text-[#f5f5f5]"
                  />
                </div>
              </div>

              <div className="flex justify-between gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep('pessoal')}
                  className="h-11 border-[#2e2e2e] bg-[#1a1a1a] text-[#f5f5f5]"
                >
                  voltar
                </Button>
                <Button
                  type="button"
                  disabled={!canGoEndereco()}
                  onClick={() => setStep('finalizar')}
                  className="h-11 rounded-xl bg-[#49e4e6] px-6 font-black text-[#0f0f0f] hover:bg-[#2fc8cc] disabled:opacity-50"
                >
                  seguir
                </Button>
              </div>
            </div>
          ) : null}

          {step === 'finalizar' ? (
            <div className="space-y-4">
              <h2 className="text-lg font-black text-[#f5f5f5]">Finalização</h2>

              <label className="flex items-start gap-2 text-sm text-[#dddddd]">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="mt-1 accent-[#49e4e6]"
                />
                Li e concordo com os termos da Política de Privacidade
              </label>

              {notice ? <p className="text-xs text-[#fca5a5]">{notice}</p> : null}

              <div className="flex justify-between gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep('endereco')}
                  className="h-11 border-[#2e2e2e] bg-[#1a1a1a] text-[#f5f5f5]"
                >
                  voltar
                </Button>
                <Button
                  type="button"
                  disabled={!acceptedTerms || loading}
                  onClick={handleCreateAccount}
                  className="h-11 rounded-xl bg-[#49e4e6] px-6 font-black text-[#0f0f0f] hover:bg-[#2fc8cc] disabled:opacity-50"
                >
                  {loading ? 'Criando...' : 'criar conta'}
                </Button>
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  )
}

export default function ContaCriarPage() {
  return (
    <Suspense>
      <ContaCriarContent />
    </Suspense>
  )
}




