'use client'

import { useEffect, useState, useCallback } from 'react'
import { Star, CheckCircle, Loader2 } from 'lucide-react'
import { fetchProductReviews, submitProductReview } from '@/lib/api'
import type { Review, ReviewsResponse } from '@/lib/types'

interface Props {
  productSlug: string
}

function StarRating({
  value,
  onChange,
  size = 'md',
}: {
  value: number
  onChange?: (v: number) => void
  size?: 'sm' | 'md'
}) {
  const [hovered, setHovered] = useState(0)
  const dim = size === 'sm' ? 'w-3.5 h-3.5' : 'w-6 h-6'
  const active = hovered || value

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onChange?.(s)}
          onMouseEnter={() => onChange && setHovered(s)}
          onMouseLeave={() => onChange && setHovered(0)}
          className={onChange ? 'cursor-pointer' : 'cursor-default pointer-events-none'}
          aria-label={`${s} estrelas`}
        >
          <Star
            className={`${dim} transition-colors ${
              s <= active
                ? 'fill-[#49e4e6] text-[#49e4e6]'
                : 'fill-[#2e2e2e] text-[#2e2e2e]'
            }`}
          />
        </button>
      ))}
    </div>
  )
}

function RatingBar({ star, count, total }: { star: number; count: number; total: number }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-[#888] w-3 text-right">{star}</span>
      <Star className="w-3 h-3 fill-[#49e4e6] text-[#49e4e6]" />
      <div className="flex-1 h-1.5 bg-[#2e2e2e] rounded-full overflow-hidden">
        <div
          className="h-full bg-[#49e4e6] rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[#555] w-5 text-right">{count}</span>
    </div>
  )
}

function ReviewCard({ review }: { review: Review }) {
  const date = new Date(review.created_at).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

  return (
    <div className="border border-[#2e2e2e] rounded-2xl p-5 bg-[#141414] flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-[#f5f5f5] text-sm font-semibold">{review.user_name}</span>
            {review.verified_purchase && (
              <span className="flex items-center gap-1 text-[10px] font-bold text-[#22c55e] bg-[#166534]/20 px-2 py-0.5 rounded-full">
                <CheckCircle className="w-3 h-3" />
                Compra verificada
              </span>
            )}
          </div>
          <StarRating value={review.rating} size="sm" />
        </div>
        <span className="text-[#555] text-[11px] flex-shrink-0">{date}</span>
      </div>
      {review.comment && (
        <p className="text-[#aaa] text-sm leading-relaxed">{review.comment}</p>
      )}
    </div>
  )
}

function ReviewForm({
  onSubmit,
}: {
  onSubmit: (rating: number, comment: string) => Promise<void>
}) {
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!rating) {
      setError('Selecione uma nota.')
      return
    }
    setError('')
    setLoading(true)
    await onSubmit(rating, comment)
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="border border-[#49e4e6]/30 rounded-2xl p-5 bg-[#141414] flex flex-col gap-4">
      <h3 className="text-[#f5f5f5] font-bold text-sm">Deixe sua avaliação</h3>

      <div className="flex flex-col gap-1">
        <span className="text-[#888] text-xs">Nota *</span>
        <StarRating value={rating} onChange={setRating} />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-[#888] text-xs" htmlFor="review-comment">
          Comentário (opcional)
        </label>
        <textarea
          id="review-comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          maxLength={1000}
          placeholder="Conte sua experiência com o produto..."
          className="bg-[#1a1a1a] border border-[#2e2e2e] rounded-xl px-3 py-2.5 text-sm text-[#f5f5f5] placeholder-[#555] resize-none focus:outline-none focus:border-[#49e4e6]/50 transition-colors"
        />
        <span className="text-[#444] text-[10px] text-right">{comment.length}/1000</span>
      </div>

      {error && <p className="text-[#e53e3e] text-xs">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="flex items-center justify-center gap-2 bg-[#49e4e6] text-[#0f0f0f] font-bold text-sm px-5 py-2.5 rounded-xl hover:bg-[#2fc8cc] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        Enviar avaliação
      </button>
    </form>
  )
}

export default function ProductReviews({ productSlug }: Props) {
  const [data, setData] = useState<ReviewsResponse | null>(null)
  const [submitted, setSubmitted] = useState(false)

  const load = useCallback(async () => {
    const result = await fetchProductReviews(productSlug)
    setData(result)
  }, [productSlug])

  useEffect(() => {
    load()
  }, [load])

  async function handleSubmit(rating: number, comment: string) {
    const res = await submitProductReview(productSlug, { rating, comment })
    if (res.ok) {
      setSubmitted(true)
      await load()
    }
  }

  if (!data) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="w-6 h-6 animate-spin text-[#49e4e6]" />
      </div>
    )
  }

  return (
    <section className="max-w-screen-xl mx-auto px-4 py-10" aria-label="Avaliações">
      <h2 className="text-[#f5f5f5] text-xl font-black mb-6">
        Avaliações dos clientes
        <span className="block w-10 h-0.5 bg-[#49e4e6] mt-2" />
      </h2>

      <div className="grid md:grid-cols-3 gap-8">
        {/* Summary */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col items-center gap-1 py-6 border border-[#2e2e2e] rounded-2xl bg-[#141414]">
            <span className="text-5xl font-black text-[#f5f5f5]">
              {data.average > 0 ? data.average.toFixed(1) : '–'}
            </span>
            <StarRating value={Math.round(data.average)} size="sm" />
            <span className="text-[#555] text-xs mt-1">
              {data.total} {data.total === 1 ? 'avaliação' : 'avaliações'}
            </span>
          </div>

          {data.total > 0 && (
            <div className="flex flex-col gap-2">
              {[5, 4, 3, 2, 1].map((s) => (
                <RatingBar
                  key={s}
                  star={s}
                  count={data.breakdown[String(s)] ?? 0}
                  total={data.total}
                />
              ))}
            </div>
          )}

          {data.can_review && !submitted && (
            <ReviewForm onSubmit={handleSubmit} />
          )}

          {submitted && (
            <div className="flex items-center gap-2 text-[#22c55e] text-sm border border-[#22c55e]/30 rounded-xl px-4 py-3 bg-[#166534]/10">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              Avaliação enviada com sucesso!
            </div>
          )}

          {data.user_review && !submitted && (
            <div className="border border-[#49e4e6]/20 rounded-2xl p-4 bg-[#141414] flex flex-col gap-2">
              <span className="text-[#888] text-xs font-semibold uppercase tracking-wide">
                Sua avaliação
              </span>
              <StarRating value={data.user_review.rating} size="sm" />
              {data.user_review.comment && (
                <p className="text-[#aaa] text-sm">{data.user_review.comment}</p>
              )}
            </div>
          )}
        </div>

        {/* Reviews list */}
        <div className="md:col-span-2 flex flex-col gap-4">
          {data.reviews.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center border border-[#2e2e2e] rounded-2xl bg-[#141414]">
              <Star className="w-10 h-10 text-[#2e2e2e] mb-3" />
              <p className="text-[#555] text-sm">Ainda não há avaliações para este produto.</p>
              <p className="text-[#444] text-xs mt-1">
                Seja o primeiro a avaliar após sua compra.
              </p>
            </div>
          ) : (
            data.reviews.map((r) => <ReviewCard key={r.id} review={r} />)
          )}
        </div>
      </div>
    </section>
  )
}
