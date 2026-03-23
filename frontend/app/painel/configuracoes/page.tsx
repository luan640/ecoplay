'use client'

import { apiFetch, getCsrfToken } from '@/lib/api'
import { getBackendUrl } from '@/lib/backend-url'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Check, ShoppingCart, KeyRound, Eye, EyeOff, PackageX, Tag } from 'lucide-react'

const BACKEND_URL = getBackendUrl()

interface StoreConfig {
  store_name: string
  logo_url: string | null
  allow_zero_stock_sale: boolean
  show_zero_stock_products: boolean
  show_zero_price_products: boolean
  updated_at: string | null
}

function ToggleSwitch({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean
  onChange: (val: boolean) => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? 'bg-violet-600' : 'bg-zinc-700'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  )
}

function PasswordInput({
  value,
  onChange,
  placeholder,
  disabled,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  disabled?: boolean
}) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg text-sm px-3 py-2 pr-10 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-600 disabled:opacity-50"
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
        tabIndex={-1}
      >
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  )
}

export default function ConfiguracoesPage() {
  // â”€â”€ Store settings â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [config, setConfig] = useState<StoreConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [configError, setConfigError] = useState('')
  const [allowZeroStock, setAllowZeroStock] = useState(false)
  const [showZeroStockProducts, setShowZeroStockProducts] = useState(false)
  const [showZeroPriceProducts, setShowZeroPriceProducts] = useState(false)
  const [storeName, setStoreName] = useState('')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)

  // â”€â”€ Password change â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [pwCurrent, setPwCurrent] = useState('')
  const [pwNew, setPwNew] = useState('')
  const [pwConfirm, setPwConfirm] = useState('')
  const [pwSaving, setPwSaving] = useState(false)
  const [pwError, setPwError] = useState('')
  const [pwSuccess, setPwSuccess] = useState(false)

  useEffect(() => {
    apiFetch(`${BACKEND_URL}/api/admin/configuracoes/`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: StoreConfig) => {
        setConfig(data)
        setStoreName(data.store_name || '')
        setLogoPreview(data.logo_url || null)
        setAllowZeroStock(data.allow_zero_stock_sale)
        setShowZeroStockProducts(data.show_zero_stock_products)
        setShowZeroPriceProducts(data.show_zero_price_products)
      })
      .catch(() => setConfigError('Erro ao carregar configurações.'))
      .finally(() => setLoading(false))
  }, [])

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    setConfigError('')
    try {
      const formData = new FormData()
      formData.append('store_name', storeName)
      formData.append('allow_zero_stock_sale', String(allowZeroStock))
      formData.append('show_zero_stock_products', String(showZeroStockProducts))
      formData.append('show_zero_price_products', String(showZeroPriceProducts))
      if (logoFile) formData.append('logo', logoFile)

      const res = await fetch(`${BACKEND_URL}/api/admin/configuracoes/`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'X-CSRFToken': getCsrfToken() },
        body: formData,
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setConfigError(data?.detail || 'Erro ao salvar configurações.'); return }
      setConfig(data)
      setStoreName(data.store_name || '')
      setLogoPreview(data.logo_url || logoPreview)
      setLogoFile(null)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } finally {
      setSaving(false)
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    setPwError('')
    setPwSuccess(false)
    if (!pwCurrent || !pwNew || !pwConfirm) { setPwError('Preencha todos os campos.'); return }
    if (pwNew !== pwConfirm) { setPwError('As senhas nÃ£o coincidem.'); return }
    if (pwNew.length < 6) { setPwError('A nova senha deve ter pelo menos 6 caracteres.'); return }

    setPwSaving(true)
    try {
      const res = await apiFetch(`${BACKEND_URL}/api/admin/change-password/`, {
        method: 'POST',
        body: JSON.stringify({
          current_password: pwCurrent,
          new_password: pwNew,
          confirm_password: pwConfirm,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setPwError(data?.detail || 'Erro ao alterar senha.'); return }
      setPwCurrent('')
      setPwNew('')
      setPwConfirm('')
      setPwSuccess(true)
      setTimeout(() => setPwSuccess(false), 4000)
    } finally {
      setPwSaving(false)
    }
  }

  function formatDate(iso: string | null) {
    if (!iso) return 'â€”'
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Configurações</h1>
        <p className="text-sm text-zinc-500 mt-1">Gerencie as preferências da loja.</p>
      </div>

      {loading ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-5 bg-zinc-800 rounded animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {/* Identidade da loja */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl">
            <div className="px-6 py-4">
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-5">
                Identidade da loja
              </p>

              {/* Store name */}
              <div className="mb-5">
                <label className="block text-xs text-zinc-400 mb-1.5">Nome da loja</label>
                <input
                  type="text"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  disabled={saving}
                  placeholder="Ex: Game Shop"
                  className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg text-sm px-3 py-2 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-600 disabled:opacity-50"
                />
                <p className="text-xs text-zinc-600 mt-1">
                  Exibido no header, footer, checkout e nos metadados da loja.
                </p>
              </div>

              {/* Logo upload */}
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Logo da loja</label>
                {logoPreview && (
                  <div className="mb-2">
                    <img
                      src={logoPreview}
                      alt="Preview da logo"
                      className="w-16 h-16 rounded-xl object-cover border border-zinc-700"
                    />
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  disabled={saving}
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    setLogoFile(file)
                    setLogoPreview(URL.createObjectURL(file))
                  }}
                  className="text-sm text-zinc-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-zinc-700 file:text-zinc-300 hover:file:bg-zinc-600 disabled:opacity-50"
                />
                <p className="text-xs text-zinc-600 mt-1">
                  Formatos: PNG, JPEG, WebP. Recomendado: 200×200 px.
                </p>
              </div>
            </div>
          </div>

          {/* â”€â”€ Loja â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl divide-y divide-zinc-800">
            <div className="px-6 py-4">
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4">
                Vendas
              </p>
              <div className="flex items-start justify-between gap-6">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="mt-0.5 p-2 rounded-lg bg-zinc-800 shrink-0">
                    <ShoppingCart className="w-4 h-4 text-zinc-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">
                      Aceitar venda com estoque zerado
                    </p>
                    <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">
                      Quando ativado, É possível finalizar vendas mesmo que o produto não
                      possua unidades em estoque registradas.
                    </p>
                  </div>
                </div>
                <ToggleSwitch
                  checked={allowZeroStock}
                  onChange={setAllowZeroStock}
                  disabled={saving}
                />
              </div>
            </div>

            <div className="px-6 py-4">
              <div className="flex items-start justify-between gap-6">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="mt-0.5 p-2 rounded-lg bg-zinc-800 shrink-0">
                    <PackageX className="w-4 h-4 text-zinc-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">
                      Mostrar itens com estoque zero
                    </p>
                    <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">
                      Quando ativado, produtos com estoque zerado continuam visíveis
                      na vitrine e nos resultados de busca.
                    </p>
                  </div>
                </div>
                <ToggleSwitch
                  checked={showZeroStockProducts}
                  onChange={setShowZeroStockProducts}
                  disabled={saving}
                />
              </div>
            </div>

            <div className="px-6 py-4">
              <div className="flex items-start justify-between gap-6">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="mt-0.5 p-2 rounded-lg bg-zinc-800 shrink-0">
                    <Tag className="w-4 h-4 text-zinc-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">
                      Mostrar itens com valor zerado
                    </p>
                    <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">
                      Quando ativado, produtos com preço igual a zero continuam visíveis
                      na vitrine e nos resultados de busca.
                    </p>
                  </div>
                </div>
                <ToggleSwitch
                  checked={showZeroPriceProducts}
                  onChange={setShowZeroPriceProducts}
                  disabled={saving}
                />
              </div>
            </div>

            <div className="px-6 py-4 flex items-center justify-between gap-4">
              <div>
                {config?.updated_at && (
                  <p className="text-xs text-zinc-600">
                    Última atualização: {formatDate(config.updated_at)}
                  </p>
                )}
                {configError && <p className="text-xs text-red-400">{configError}</p>}
              </div>
              <Button
                onClick={handleSave}
                disabled={saving}
                className={`flex items-center gap-2 transition-colors ${
                  saved
                    ? 'bg-green-600 hover:bg-green-600 text-white'
                    : 'bg-violet-600 hover:bg-violet-500 text-white'
                }`}
              >
                {saved ? (
                  <><Check className="w-4 h-4" />Salvo!</>
                ) : saving ? 'Salvando...' : 'Salvar configurações'}
              </Button>
            </div>
          </div>

          {/* â”€â”€ Senha â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl divide-y divide-zinc-800">
            <div className="px-6 py-4">
              <div className="flex items-center gap-3 mb-5">
                <div className="p-2 rounded-lg bg-zinc-800 shrink-0">
                  <KeyRound className="w-4 h-4 text-zinc-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Alterar senha</p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Atualize a senha de acesso ao painel administrativo.
                  </p>
                </div>
              </div>

              <form onSubmit={handleChangePassword} className="space-y-3">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5">Senha atual</label>
                  <PasswordInput
                    value={pwCurrent}
                    onChange={setPwCurrent}
                    placeholder="Digite a senha atual"
                    disabled={pwSaving}
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5">Nova senha</label>
                  <PasswordInput
                    value={pwNew}
                    onChange={setPwNew}
                    placeholder="Mínimo 6 caracteres"
                    disabled={pwSaving}
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5">Confirmar nova senha</label>
                  <PasswordInput
                    value={pwConfirm}
                    onChange={setPwConfirm}
                    placeholder="Repita a nova senha"
                    disabled={pwSaving}
                  />
                </div>

                {pwError && <p className="text-xs text-red-400">{pwError}</p>}
                {pwSuccess && (
                  <p className="text-xs text-green-400 flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5" />
                    Senha alterada com sucesso!
                  </p>
                )}

                <div className="pt-1">
                  <Button
                    type="submit"
                    disabled={pwSaving}
                    className="bg-violet-600 hover:bg-violet-500 text-white"
                  >
                    {pwSaving ? 'Alterando...' : 'Alterar senha'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
