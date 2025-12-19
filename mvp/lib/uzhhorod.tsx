// Uzhhorod city center coordinates
export const UZHHOROD_CENTER = {
  lat: 48.6208,
  lon: 22.2879,
}

// Default map zoom level
export const DEFAULT_ZOOM = 14
export const UZHHOROD_ZOOM = DEFAULT_ZOOM

// Bounding box for Uzhhorod area (south,west,north,east for Overpass)
// For Nominatim viewbox: left,top,right,bottom = west,north,east,south
export const UZHHOROD_BBOX = "48.55,22.20,48.68,22.38"

// Nominatim viewbox format: west,north,east,south
export const UZHHOROD_VIEWBOX = "22.20,48.68,22.38,48.55"

// Map tile layers
export const TILE_LAYERS = {
  streets: {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>',
    name: "Вулиці",
  },
  satellite: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "&copy; Esri",
    name: "Супутник",
  },
  dark: {
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
    name: "Темна",
  },
} as const

export type TileLayerKey = keyof typeof TILE_LAYERS
