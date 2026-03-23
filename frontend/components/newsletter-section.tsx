'use client'

import { useState } from 'react'

export default function NewsletterSection() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!email) return
    setSubmitted(true)
    setEmail('')
  }

  return (
    <section
      className="bg-[#141414] border-y border-[#2e2e2e] py-14 my-8"
      aria-label="Newsletter"
    >
      <div className="max-w-screen-xl mx-auto px-4 text-center">
        <p className="text-[#49e4e6] text-xs font-bold uppercase tracking-widest mb-2">
          Fique por dentro
        </p>
        <h2 className="text-[#f5f5f5] text-2xl md:text-3xl font-black mb-3 text-balance">
          Receba as melhores ofertas em primeira mão
        </h2>
        <p className="text-[#888888] text-sm mb-6 max-w-md mx-auto leading-relaxed">
          Cadastre-se e seja o primeiro a saber sobre novidades, promoções
          exclusivas e chegadas de produtos.
        </p>

        {submitted ? (
          <div className="inline-flex items-center gap-2 bg-[#166534]/40 border border-[#22c55e]/30 text-[#22c55e] text-sm font-semibold px-6 py-3 rounded-xl">
            Cadastrado com sucesso! Em breve voce receberá nossas ofertas.
          </div>
        ) : (
          <form
            className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
            onSubmit={handleSubmit}
            aria-label="Formulário de cadastro na newsletter"
          >
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Seu melhor e-mail"
              className="flex-1 bg-[#1a1a1a] border border-[#2e2e2e] rounded-xl px-4 py-3 text-sm text-[#f5f5f5] placeholder-[#555555] focus:outline-none focus:border-[#49e4e6] focus:ring-1 focus:ring-[#49e4e6] transition-all"
              aria-label="E-mail para newsletter"
              required
            />
            <button
              type="submit"
              className="bg-[#49e4e6] hover:bg-[#2fc8cc] text-[#0f0f0f] font-black text-sm px-6 py-3 rounded-xl transition-all hover:scale-105 active:scale-95 whitespace-nowrap"
            >
              Quero receber
            </button>
          </form>
        )}
      </div>
    </section>
  )
}

