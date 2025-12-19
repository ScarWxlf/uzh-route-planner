// Core types for the route planner
import type { GeoJSON } from "geojson"

export interface LatLon {
  lat: number
  lon: number
}

export interface MapPoint extends LatLon {
  label?: string
  placeId?: string
}

export interface GeocodingResult {
  placeId: string
  displayName: string
  lat: number
  lon: number
  type: string
  address?: {
    road?: string
    city?: string
    county?: string
    state?: string
    country?: string
  }
}

export interface RouteStep {
  instruction: string
  distance: number
  duration: number
  name?: string
  maneuver?: {
    type: string
    modifier?: string
  }
}

export interface RouteData {
  geometry: {
    type: "LineString"
    coordinates: number[][]
  }
  distance: number
  duration: number

  // ✅ add these (because API returns them)
  profile?: RouteProfile          // "car" | "walk"
  provider?: "osrm" | "ors"
  warnings?: string[]
  fallback?: boolean

  steps?: RouteStep[]
}


export type RouteProfile = "car" | "walk"

export interface SavedPlace {
  id: string
  name: string
  lat: number
  lon: number
  createdAt: number
}

export interface RecentRoute {
  id: string
  start: MapPoint
  end: MapPoint
  profile: RouteProfile
  distance: number
  duration: number
  createdAt: number
}

export interface AppState {
  start: MapPoint | null
  end: MapPoint | null
  profile: RouteProfile
  route: RouteData | null
  userLocation: LatLon | null
  isLoadingRoute: boolean
  isLoadingLocation: boolean
}

export interface UIState {
  panelOpen: boolean
  layer: "streets" | "satellite" | "dark"
  followMe: boolean
  activeTab: "route" | "saved" | "recent" | "poi" | "transit"
  showShareDialog: boolean
  multiStopEnabled: boolean
}

export interface POI {
  id: string
  name: string
  lat: number
  lon: number
  type: string
  category: POICategory
  address?: string
}

export type POICategory = "cafe" | "restaurant" | "shop" | "pharmacy" | "bank" | "hotel"

export interface TransitRoute {
  id: string
  name: string
  type: "bus" | "trolleybus" | "tram"
  color?: string
}

export interface TransitVehicle {
  id: string
  routeId: string
  lat: number
  lon: number
  heading?: number
}

export interface Waypoint extends MapPoint {
  order: number
}
