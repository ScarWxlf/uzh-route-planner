import type { SavedPlace, RecentRoute } from "./types"

const SAVED_PLACES_KEY = "uzh-route-saved-places"
const RECENT_ROUTES_KEY = "uzh-route-recent-routes"
const MAX_RECENT_ROUTES = 10

// Saved Places
export function getSavedPlaces(): SavedPlace[] {
  if (typeof window === "undefined") return []
  try {
    const data = localStorage.getItem(SAVED_PLACES_KEY)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

export function savePlaceToStorage(place: SavedPlace): void {
  const places = getSavedPlaces()
  // Avoid duplicates by placeId or coordinates
  const exists = places.some((p) => p.id === place.id || (p.lat === place.lat && p.lon === place.lon))
  if (!exists) {
    places.unshift(place)
    localStorage.setItem(SAVED_PLACES_KEY, JSON.stringify(places))
  }
}

export function removeSavedPlace(id: string): void {
  const places = getSavedPlaces().filter((p) => p.id !== id)
  localStorage.setItem(SAVED_PLACES_KEY, JSON.stringify(places))
}

// Recent Routes
export function getRecentRoutes(): RecentRoute[] {
  if (typeof window === "undefined") return []
  try {
    const data = localStorage.getItem(RECENT_ROUTES_KEY)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

export function saveRecentRoute(route: RecentRoute): void {
  let routes = getRecentRoutes()
  // Remove duplicate if exists
  routes = routes.filter(
    (r) =>
      !(
        r.start.lat === route.start.lat &&
        r.start.lon === route.start.lon &&
        r.end.lat === route.end.lat &&
        r.end.lon === route.end.lon &&
        r.profile === route.profile
      ),
  )
  routes.unshift(route)
  // Keep only last N routes
  routes = routes.slice(0, MAX_RECENT_ROUTES)
  localStorage.setItem(RECENT_ROUTES_KEY, JSON.stringify(routes))
}

export function clearRecentRoutes(): void {
  localStorage.setItem(RECENT_ROUTES_KEY, JSON.stringify([]))
}
