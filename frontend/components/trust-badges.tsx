import {
  CreditCard,
  Shield,
  Sparkles,
  Truck,
  Lock,
} from 'lucide-react'

const badges = [
  {
    id: 1,
    icon: CreditCard,
    title: '10x sem juros',
    subtitle: 'No cartão de crédito',
  },
  {
    id: 2,
    icon: Shield,
    title: 'Garantia de até 9 meses',
    subtitle: 'Em todos os produtos',
  },
  {
    id: 3,
    icon: Sparkles,
    title: 'Novidades todos os dias',
    subtitle: 'Estoque sempre renovado',
  },
  {
    id: 4,
    icon: Truck,
    title: 'Envio para todo o Brasil',
    subtitle: 'Frete rápido e seguro',
  },
  {
    id: 5,
    icon: Lock,
    title: 'SSL 100% seguro',
    subtitle: 'Sua compra protegida',
  },
]

export default function TrustBadges() {
  return (
    <section
      className="bg-[#141414] border-y border-[#2e2e2e]"
      aria-label="Diferenciais da loja"
    >
      <div className="max-w-screen-xl mx-auto px-4">
        <ul
          className="flex flex-wrap md:flex-nowrap items-center justify-between divide-y md:divide-y-0 md:divide-x divide-[#2e2e2e]"
          role="list"
        >
          {badges.map((badge) => {
            const Icon = badge.icon
            return (
              <li
                key={badge.id}
                className="flex items-center gap-3 py-4 px-4 md:px-6 flex-1 min-w-[50%] md:min-w-0 group"
                role="listitem"
              >
                <div className="flex-shrink-0 w-10 h-10 bg-[#49e4e6]/10 rounded-xl flex items-center justify-center group-hover:bg-[#49e4e6]/20 transition-colors">
                  <Icon className="w-5 h-5 text-[#49e4e6]" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-[#f5f5f5] text-sm font-bold leading-tight">
                    {badge.title}
                  </p>
                  <p className="text-[#888888] text-xs leading-tight mt-0.5">
                    {badge.subtitle}
                  </p>
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}

