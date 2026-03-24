import { type Product, mapApiProduct, type ReviewsResponse } from './types'

export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

// ---------------------------------------------------------------------------
// Product fetch helpers (used in Server Components and Client Components alike)
// ---------------------------------------------------------------------------

interface FetchProductsParams {
  category?: string
  platform?: string   // comma-separated, e.g. "PS4,PS5"
  condition?: string  // comma-separated, e.g. "Usado,Seminovo"
  q?: string
  active?: boolean
  page?: number
  page_size?: number
  price_min?: number
  price_max?: number
  ordering?: string
}

export interface FetchProductsResult {
  results: Product[]
  total: number
  page: number
  pages: number
  per_page: number
}

/**
 * Fetches a paginated product list from the public API.
 * Safe to call server-side (Next.js Server Component) or client-side.
 */
export async function fetchProducts(params: FetchProductsParams = {}): Promise<FetchProductsResult> {
  const qs = new URLSearchParams()
  qs.set('active', '1')
  if (params.category) qs.set('category', params.category)
  if (params.platform) qs.set('platform', params.platform)
  if (params.condition) qs.set('condition', params.condition)
  if (params.q) qs.set('q', params.q)
  if (params.page) qs.set('page', String(params.page))
  if (params.page_size) qs.set('page_size', String(params.page_size))
  if (params.price_min !== undefined) qs.set('price_min', String(params.price_min))
  if (params.price_max !== undefined && params.price_max !== Infinity) qs.set('price_max', String(params.price_max))
  if (params.ordering) qs.set('ordering', params.ordering)

  const empty: FetchProductsResult = { results: [], total: 0, page: 1, pages: 1, per_page: 20 }
  try {
    const res = await fetch(`${API_BASE}/api/produtos/?${qs.toString()}`, {
      cache: 'no-store',
    })
    if (!res.ok) return empty
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = await res.json()
    const items: unknown[] = Array.isArray(data) ? data : (data.results ?? [])
    return {
      results: items.map(mapApiProduct),
      total: data.total ?? items.length,
      page: data.page ?? 1,
      pages: data.pages ?? 1,
      per_page: data.per_page ?? 20,
    }
  } catch {
    return empty
  }
}

/**
 * Fetches a single product by slug.
 * Returns null when not found or on error.
 */
export async function fetchProductBySlug(slug: string): Promise<Product | null> {
  try {
    const res = await fetch(`${API_BASE}/api/produtos/${encodeURIComponent(slug)}/`, {
      cache: 'no-store',
    })
    if (!res.ok) return null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = await res.json()
    return mapApiProduct(data)
  } catch {
    return null
  }
}

export interface ShowcaseSection {
  id: number
  name: string
  slug: string
  title: string
  subtitle: string
  order: number
  products: Product[]
}

/**
 * Fetches a single vitrine (showcase) by slug.
 * Endpoint: GET /api/vitrines/<slug>/
 */
export async function fetchShowcase(slug: string): Promise<ShowcaseSection | null> {
  try {
    const res = await fetch(`${API_BASE}/api/vitrines/${encodeURIComponent(slug)}/`, {
      cache: 'no-store',
    })
    if (!res.ok) return null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = await res.json()
    return {
      ...data,
      products: Array.isArray(data.products) ? data.products.map(mapApiProduct) : [],
    }
  } catch {
    return null
  }
}

/**
 * Fetches all active vitrines (showcases) ordered by their configured order.
 * Endpoint: GET /api/vitrines/
 */
export async function fetchAllShowcases(): Promise<ShowcaseSection[]> {
  try {
    const res = await fetch(`${API_BASE}/api/vitrines/`, { cache: 'no-store' })
    if (!res.ok) return []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any[] = await res.json()
    return Array.isArray(data)
      ? data.map((s) => ({
          ...s,
          products: Array.isArray(s.products) ? s.products.map(mapApiProduct) : [],
        }))
      : []
  } catch {
    return []
  }
}

// ---------------------------------------------------------------------------
// Reviews
// ---------------------------------------------------------------------------

export async function fetchProductReviews(slug: string): Promise<ReviewsResponse> {
  const empty: ReviewsResponse = {
    reviews: [],
    total: 0,
    average: 0,
    breakdown: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 },
    user_review: null,
    can_review: false,
  }
  try {
    const res = await apiFetch(`${API_BASE}/api/produtos/${encodeURIComponent(slug)}/avaliacoes/`)
    if (!res.ok) return empty
    return await res.json()
  } catch {
    return empty
  }
}

export async function submitProductReview(
  slug: string,
  data: { rating: number; comment: string }
): Promise<{ ok: boolean; error?: string; data?: unknown }> {
  try {
    const res = await apiFetch(
      `${API_BASE}/api/produtos/${encodeURIComponent(slug)}/avaliacoes/`,
      { method: 'POST', body: JSON.stringify(data) }
    )
    const json = await res.json()
    if (!res.ok) return { ok: false, error: json.detail ?? 'Erro ao enviar avaliação.' }
    return { ok: true, data: json }
  } catch {
    return { ok: false, error: 'Erro de conexão.' }
  }
}

// ---------------------------------------------------------------------------
// CSRF helpers
// ---------------------------------------------------------------------------

/**
 * Reads Django's csrftoken cookie value.
 * Returns an empty string when running server-side (no document).
 */
export function getCsrfToken(): string {
  if (typeof document === 'undefined') return ''
  const match = document.cookie.match(/(?:^|;\s*)csrftoken=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : ''
}

/**
 * Drop-in replacement for `fetch` that:
 *  - always sends credentials (session cookie)
 *  - automatically adds X-CSRFToken for non-GET/HEAD/OPTIONS requests
 *  - defaults Content-Type to application/json when a body is present
 */
export function apiFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const method = (init.method ?? 'GET').toUpperCase()
  const needsCsrf = !['GET', 'HEAD', 'OPTIONS', 'TRACE'].includes(method)

  const headers = new Headers(init.headers as HeadersInit | undefined)

  if (needsCsrf) {
    headers.set('X-CSRFToken', getCsrfToken())
  }

  if (init.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  return fetch(url, {
    ...init,
    credentials: 'include',
    headers,
  })
}
