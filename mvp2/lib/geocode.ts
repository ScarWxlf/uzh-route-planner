import type { GeocodingResult } from "./types"

// Simple in-memory cache for geocoding results
const cache = new Map<string, GeocodingResult[]>()

export async function geocodeSearch(query: string): Promise<GeocodingResult[]> {
  if (!query || query.length < 2) return []

  // Check cache first
  const cacheKey = query.toLowerCase().trim()
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey)!
  }

  try {
    const response = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`)
    if (!response.ok) throw new Error("Geocoding failed")

    const results: GeocodingResult[] = await response.json()

    // Cache results
    cache.set(cacheKey, results)

    return results
  } catch (error) {
    console.error("Geocoding error:", error)
    return []
  }
}
