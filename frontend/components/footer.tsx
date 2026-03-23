'use client'

import { Instagram, Facebook, Youtube, Twitter } from 'lucide-react'
import { useStore } from '@/lib/store-context'

export default function Footer() {
  const { storeName, logoUrl } = useStore()
  return (
    <footer className="bg-[#0a0a0a] border-t border-[#2e2e2e] mt-16" role="contentinfo">
      <div className="max-w-screen-xl mx-auto px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 rounded-lg overflow-hidden border border-[#2e2e2e] bg-[#1a1a1a]">
                <img
                  src={logoUrl || '/logo.jpeg'}
                  alt={storeName}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-[#f5f5f5] font-bold text-sm uppercase">{storeName}</span>
                <span className="text-[#49e4e6] font-black text-sm uppercase">Usado</span>
              </div>
            </div>
            <p className="text-[#666666] text-sm leading-relaxed mb-4">
              Informação relevante sobre a loja. Exemplo: Loja pioneira em venda de usados virtualmente
            </p>
            <div className="flex items-center gap-3">
              {[Instagram, Facebook, Youtube, Twitter].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="w-9 h-9 rounded-xl bg-[#1a1a1a] border border-[#2e2e2e] flex items-center justify-center text-[#888888] hover:text-[#49e4e6] hover:border-[#49e4e6] transition-all"
                  aria-label={`Redes sociais link ${i + 1}`}
                >
                  <Icon className="w-4 h-4" aria-hidden="true" />
                </a>
              ))}
            </div>
          </div>

          {/* Links */}
          <div>
            <h3 className="text-[#f5f5f5] font-bold text-sm uppercase tracking-wider mb-4">
              Categorias
            </h3>
            <ul className="space-y-2.5" role="list">
              {['PlayStation', 'Xbox', 'Nintendo', 'Raridades', 'PCs & Notebooks', 'Outros'].map((item) => (
                <li key={item} role="listitem">
                  <a
                    href="#"
                    className="text-[#666666] text-sm hover:text-[#49e4e6] transition-colors"
                  >
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-[#f5f5f5] font-bold text-sm uppercase tracking-wider mb-4">
              Minha Conta
            </h3>
            <ul className="space-y-2.5" role="list">
              {['Meu Perfil', 'Meus Pedidos', 'Lista de Desejos', 'Endereços', `Vender para ${storeName}`].map((item) => (
                <li key={item} role="listitem">
                  <a
                    href="#"
                    className="text-[#666666] text-sm hover:text-[#49e4e6] transition-colors"
                  >
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-[#f5f5f5] font-bold text-sm uppercase tracking-wider mb-4">
              Atendimento
            </h3>
            <ul className="space-y-2.5" role="list">
              {['Central de Ajuda', 'Política de Trocas', 'Prazo de Entrega', 'Fale Conosco', 'Trabalhe Conosco'].map((item) => (
                <li key={item} role="listitem">
                  <a
                    href="#"
                    className="text-[#666666] text-sm hover:text-[#49e4e6] transition-colors"
                  >
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="mt-10 pt-8 border-t border-[#2e2e2e]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-[#666666] text-xs mb-2 uppercase tracking-wider font-semibold">
                Formas de pagamento
              </p>
              <div className="flex flex-wrap gap-2">
                {['Visa', 'Master', 'Elo', 'Pix', 'Boleto'].map((method) => (
                  <span
                    key={method}
                    className="bg-[#1a1a1a] border border-[#2e2e2e] text-[#888888] text-xs font-bold px-3 py-1.5 rounded-lg"
                  >
                    {method}
                  </span>
                ))}
              </div>
            </div>
            <div className="text-right">
              <p className="text-[#666666] text-xs mb-1">
                © {new Date().getFullYear()} {storeName}. Todos os direitos reservados.
              </p>
              <p className="text-[#444444] text-xs">
                CNPJ: 00.000.000/0001-00
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

