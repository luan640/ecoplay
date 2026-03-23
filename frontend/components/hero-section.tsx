'use client'

import { useState, useEffect, useCallback } from 'react'
import { ArrowRight, Zap } from 'lucide-react'
import { useStore } from '@/lib/store-context'

interface TimeLeft {
  days: number
  hours: number
  minutes: number
  seconds: number
}

function CountdownUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="bg-[#0f0f0f]/80 border border-[#49e4e6]/30 rounded-xl w-16 h-16 flex items-center justify-center shadow-lg shadow-[#49e4e6]/10">
        <span className="text-[#49e4e6] font-black text-2xl tabular-nums leading-none">
          {String(value).padStart(2, '0')}
        </span>
      </div>
      <span className="text-[#888888] text-[10px] font-semibold uppercase tracking-widest mt-1.5">
        {label}
      </span>
    </div>
  )
}

export default function HeroSection() {
  const { storeName } = useStore()
  const getTargetDate = useCallback(() => {
    const d = new Date()
    d.setDate(d.getDate() + 3)
    d.setHours(23, 59, 59, 0)
    return d
  }, [])

  const calculateTimeLeft = useCallback((): TimeLeft => {
    const target = getTargetDate()
    const diff = target.getTime() - Date.now()
    if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 }
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((diff % (1000 * 60)) / 1000)
    return { days, hours, minutes, seconds }
  }, [getTargetDate])

  const [timeLeft, setTimeLeft] = useState<TimeLeft>({ days: 0, hours: 0, minutes: 0, seconds: 0 })
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setTimeLeft(calculateTimeLeft())
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft())
    }, 1000)
    return () => clearInterval(timer)
  }, [calculateTimeLeft])

  return (
    <section
      className="relative min-h-[520px] flex items-center overflow-hidden"
      style={{
        background:
          'linear-gradient(135deg, #0f0f0f 0%, #131a3a 40%, #0f0f0f 100%)',
      }}
      aria-label="Ofertas em destaque"
    >
      {/* Background image with overlay */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-20"
        style={{ backgroundImage: "url('/images/hero-bg.jpg')" }}
        role="presentation"
      />

      {/* Spotlight effect */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 70% 60% at 80% 50%, rgba(73,228,230,0.08) 0%, transparent 70%)',
        }}
        role="presentation"
      />

      {/* Grid overlay */}
      <div
        className="absolute inset-0 opacity-5 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(73,228,230,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(73,228,230,0.3) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
        role="presentation"
      />

      <div className="relative max-w-screen-xl mx-auto px-4 py-16 w-full">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Left Side */}
          <div className="space-y-6">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-[#49e4e6]/10 border border-[#49e4e6]/30 rounded-full px-4 py-1.5">
              <Zap className="w-3.5 h-3.5 text-[#49e4e6] fill-[#49e4e6]" />
              <span className="text-[#49e4e6] text-xs font-bold uppercase tracking-widest">
                Oferta por tempo limitado
              </span>
            </div>

            {/* Title */}
            <div>
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-[#f5f5f5] leading-tight text-balance">
                2º ROUND DE{' '}
                <span className="text-[#49e4e6]">OFERTAS {storeName.toUpperCase()}</span>
              </h1>
              <p className="text-[#aaaaaa] text-base mt-3 leading-relaxed">
                Aproveite já antes que acabe. Estoque limitado com os melhores
                preços do Brasil em games e consoles usados.
              </p>
            </div>

            {/* Countdown */}
            <div>
              <p className="text-[#666666] text-xs font-semibold uppercase tracking-widest mb-3">
                Termina em:
              </p>
              <div className="flex items-start gap-3" role="timer" aria-live="polite" aria-label="Tempo restante da promoção">
                {mounted ? (
                  <>
                    <CountdownUnit value={timeLeft.days} label="Dias" />
                    <span className="text-[#49e4e6] font-black text-2xl mt-4">:</span>
                    <CountdownUnit value={timeLeft.hours} label="Horas" />
                    <span className="text-[#49e4e6] font-black text-2xl mt-4">:</span>
                    <CountdownUnit value={timeLeft.minutes} label="Min" />
                    <span className="text-[#49e4e6] font-black text-2xl mt-4">:</span>
                    <CountdownUnit value={timeLeft.seconds} label="Seg" />
                  </>
                ) : (
                  <div className="h-[86px] flex items-center">
                    <span className="text-[#555555] text-sm">Calculando...</span>
                  </div>
                )}
              </div>
            </div>

            {/* CTA */}
            <a
              href="#recentes"
              className="inline-flex items-center gap-2 bg-[#49e4e6] hover:bg-[#2fc8cc] text-[#0f0f0f] font-black text-sm px-6 py-3 rounded-xl transition-all hover:scale-105 active:scale-95 shadow-lg shadow-[#49e4e6]/20"
            >
              Ver todas as ofertas
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>

          {/* Right Side */}
          <div className="text-center md:text-right">
            <div className="inline-block">
              <div className="text-[#888888] text-sm font-semibold uppercase tracking-widest mb-2">
                Economize até
              </div>
              <div className="text-[#49e4e6] font-black leading-none"
                style={{ fontSize: 'clamp(4rem, 12vw, 9rem)' }}>
                80%
              </div>
              <div className="text-[#f5f5f5] text-xl md:text-2xl font-black mt-2">
                em games e consoles
              </div>
              <div className="text-[#aaaaaa] text-sm mt-2">
                Mais de 500 produtos disponíveis
              </div>

              {/* Stats */}
              <div className="flex items-center justify-center md:justify-end gap-6 mt-8">
                <div className="text-center">
                  <div className="text-[#49e4e6] text-2xl font-black">11+</div>
                  <div className="text-[#888888] text-xs">Anos no mercado</div>
                </div>
                <div className="w-px h-10 bg-[#2e2e2e]" role="separator" />
                <div className="text-center">
                  <div className="text-[#49e4e6] text-2xl font-black">50k+</div>
                  <div className="text-[#888888] text-xs">Clientes satisfeitos</div>
                </div>
                <div className="w-px h-10 bg-[#2e2e2e]" role="separator" />
                <div className="text-center">
                  <div className="text-[#49e4e6] text-2xl font-black">9 meses</div>
                  <div className="text-[#888888] text-xs">Garantia máxima</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

