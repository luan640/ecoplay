import type { Product } from '@/lib/mock-data'

export const CART_STORAGE_KEY = 'game-store-cart'
const CART_UPDATED_EVENT = 'game-store-cart-updated'

export interface CartItem {
  productId: number
  slug: string
  name: string
  platform: string
  image: string
  oldPrice: number
  price: number
  pixPrice: number
  quantity: number
}

function isBrowser() {
  return typeof window !== 'undefined'
}

function emitCartUpdated() {
  if (!isBrowser()) return
  window.dispatchEvent(new Event(CART_UPDATED_EVENT))
}

function sanitize(items: CartItem[]): CartItem[] {
  return items
    .filter((item) => item && item.productId && item.quantity > 0)
    .map((item) => ({ ...item, quantity: Math.max(1, Math.floor(item.quantity)) }))
}

export function readCart(): CartItem[] {
  if (!isBrowser()) return []
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as CartItem[]
    return Array.isArray(parsed) ? sanitize(parsed) : []
  } catch {
    return []
  }
}

export function writeCart(items: CartItem[]) {
  if (!isBrowser()) return
  window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(sanitize(items)))
  emitCartUpdated()
}

export function addProductToCart(product: Product, quantity = 1) {
  const items = readCart()
  const existing = items.find((item) => item.productId === product.id)

  if (existing) {
    existing.quantity += Math.max(1, quantity)
  } else {
    items.push({
      productId: product.id,
      slug: product.slug,
      name: product.title,
      platform: product.platform,
      image: product.image,
      oldPrice: product.originalPrice,
      price: product.salePrice,
      pixPrice: product.pixPrice,
      quantity: Math.max(1, quantity),
    })
  }

  writeCart(items)
}

export function updateCartItemQuantity(productId: number, quantity: number) {
  const items = readCart().map((item) =>
    item.productId === productId
      ? { ...item, quantity: Math.max(1, Math.floor(quantity)) }
      : item
  )
  writeCart(items)
}

export function removeCartItem(productId: number) {
  writeCart(readCart().filter((item) => item.productId !== productId))
}

export function subscribeCart(callback: () => void) {
  if (!isBrowser()) return () => {}

  const handler = () => callback()
  window.addEventListener('storage', handler)
  window.addEventListener(CART_UPDATED_EVENT, handler)
  return () => {
    window.removeEventListener('storage', handler)
    window.removeEventListener(CART_UPDATED_EVENT, handler)
  }
}
