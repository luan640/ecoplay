function isLocalHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1'
}

export function getBackendUrl(): string {
  const configured =
    process.env.NEXT_PUBLIC_BACKEND_URL ?? process.env.NEXT_PUBLIC_API_URL

  if (typeof window === 'undefined') {
    return configured ?? 'http://localhost:8000'
  }

  const fallback = `${window.location.protocol}//${window.location.hostname}:8000`
  if (!configured) return fallback

  try {
    const apiUrl = new URL(configured)
    const currentHost = window.location.hostname

    if (isLocalHost(apiUrl.hostname) && isLocalHost(currentHost)) {
      apiUrl.hostname = currentHost
      return apiUrl.origin
    }

    return apiUrl.origin
  } catch {
    return fallback
  }
}
