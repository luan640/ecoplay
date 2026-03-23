'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  (typeof window !== 'undefined'
    ? window.location.protocol + '//' + window.location.hostname + ':8000'
    : 'http://localhost:8000')

interface StoreContextType {
  storeName: string
  logoUrl: string | null
  isLoaded: boolean
}

const StoreContext = createContext<StoreContextType>({
  storeName: 'Game Shop',
  logoUrl: null,
  isLoaded: false,
})

export function StoreProvider({ children }: { children: ReactNode }) {
  const [storeName, setStoreName] = useState('Game Shop')
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    fetch(`${BACKEND_URL}/api/store-settings/`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.store_name) setStoreName(data.store_name)
        if (data?.logo_url) setLogoUrl(data.logo_url)
      })
      .catch(() => {})
      .finally(() => setIsLoaded(true))
  }, [])

  return (
    <StoreContext.Provider value={{ storeName, logoUrl, isLoaded }}>
      {children}
    </StoreContext.Provider>
  )
}

export function useStore() {
  return useContext(StoreContext)
}
