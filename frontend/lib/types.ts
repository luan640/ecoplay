/**
 * Canonical Product type used across the entire frontend.
 * Field names stay camelCase to avoid refactoring all existing components.
 * Use `mapApiProduct` to convert raw API responses to this shape.
 */
export interface Product {
  id: number
  title: string
  slug: string
  image: string
  images: string[]
  originalPrice: number
  salePrice: number
  pixPrice: number
  discount: number
  platform: string
  subplatform: string
  category: string
  condition: string
  inStock: boolean
  installments: number
  installmentPrice: number
  description: string
  details: { label: string; value: string }[]
  rating: number
  reviewCount: number
  sku: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapApiProduct(raw: any): Product {
  const price = parseFloat(raw.price ?? '0') || 0
  const oldPrice = parseFloat(raw.old_price ?? '0') || 0
  const discount = oldPrice > 0 ? Math.round((1 - price / oldPrice) * 100) : 0

  // Resolve image: prefer the backend-served image_url (absolute), then
  // gallery_images[0] (Next.js static assets already seeded), then raw.image.
  const firstGallery: string =
    Array.isArray(raw.gallery_images) && raw.gallery_images[0]
      ? String(raw.gallery_images[0])
      : ''
  const image: string = raw.image_url || firstGallery || raw.image || '/images/placeholder.jpg'

  // gallery_images may be stored as a JSON array of URL strings
  const rawGallery = raw.gallery_images
  let images: string[] = []
  if (Array.isArray(rawGallery)) {
    images = rawGallery.map(String).filter(Boolean)
  } else if (typeof rawGallery === 'string') {
    try {
      const parsed = JSON.parse(rawGallery)
      images = Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : []
    } catch {
      images = []
    }
  }

  // Ensure product cover is always the first image in the gallery.
  if (image) {
    images = [image, ...images.filter((img) => img !== image)]
  }

  if (images.length === 0) {
    images = ['/images/placeholder.jpg']
  }

  return {
    id: raw.id ?? 0,
    title: raw.name ?? '',
    slug: raw.slug ?? '',
    image,
    images,
    originalPrice: oldPrice,
    salePrice: price,
    pixPrice: parseFloat(raw.pix_price ?? '0') || 0,
    discount,
    platform: raw.platform ?? '',
    subplatform: raw.subplatform ?? '',
    category: raw.category ?? '',
    condition: raw.condition ?? '',
    inStock: raw.in_stock ?? false,
    installments: raw.installments ?? 1,
    installmentPrice: parseFloat(raw.installment_price ?? '0') || 0,
    description: raw.description ?? '',
    details: Array.isArray(raw.details) ? raw.details : [],
    rating: parseFloat(raw.rating ?? '0') || 0,
    reviewCount: raw.review_count ?? 0,
    sku: raw.sku ?? '',
  }
}
