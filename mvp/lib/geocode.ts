import type { GeocodingResult } from "./types"

type CacheEntry = { data: GeocodingResult[]; ts: number }
const cache = new Map<string, CacheEntry>()
const CACHE_TTL_MS = 5 * 60 * 1000

let activeController: AbortController | null = null

function normalizeQuery(q: string) {
  return q.trim().replace(/\s+/g, " ")
}

function withCityBoost(q: string) {
  const lower = q.toLowerCase()
  // якщо користувач не вказав місто — підсилюємо
  if (!lower.includes("ужгород") && !lower.includes("uzhhorod")) {
    return `${q}, Ужгород`
  }
  return q
}

export async function geocodeSearch(query: string): Promise<GeocodingResult[]> {
  const q = normalizeQuery(query)
  if (q.length < 2) return []

  const cacheKey = q.toLowerCase()
  const cached = cache.get(cacheKey)
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return cached.data
  }

  // cancel previous request
  if (activeController) activeController.abort()
  activeController = new AbortController()

  try {
    const boosted = withCityBoost(q)
    const response = await fetch(`/api/geocode?q=${encodeURIComponent(boosted)}&limit=7`, {
      signal: activeController.signal,
      cache: "no-store",
    })

    if (!response.ok) throw new Error("Geocoding failed")

    const results: GeocodingResult[] = await response.json()

    // ✅ НЕ кешуємо порожній результат (це важливо для “не знаходить”)
    if (results.length > 0) {
      cache.set(cacheKey, { data: results, ts: Date.now() })
    }

    return results
  } catch (error: any) {
    // Abort — це нормально, просто ігноруємо
    if (error?.name === "AbortError") return []
    console.error("Geocoding error:", error)
    return []
  }
}
