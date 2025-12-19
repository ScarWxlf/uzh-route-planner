"use client"

import { useEffect, useState } from "react"
import { Marker, Popup, useMap } from "react-leaflet"
import L from "leaflet"
import type { POI, POICategory } from "@/lib/types"

interface POILayerProps {
  enabled: boolean
  categories: POICategory[]
}

const CATEGORY_ICONS: Record<POICategory, string> = {
  cafe: "☕",
  restaurant: "🍽️",
  shop: "🛒",
  pharmacy: "💊",
  bank: "🏦",
  hotel: "🏨",
}

const CATEGORY_COLORS: Record<POICategory, string> = {
  cafe: "#8B4513",
  restaurant: "#FF6347",
  shop: "#4169E1",
  pharmacy: "#228B22",
  bank: "#FFD700",
  hotel: "#9370DB",
}

function createPOIIcon(category: POICategory) {
  return L.divIcon({
    className: "poi-marker",
    html: `<div style="
      background: ${CATEGORY_COLORS[category]};
      width: 28px;
      height: 28px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      border: 2px solid white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    ">${CATEGORY_ICONS[category]}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  })
}

export function POILayer({ enabled, categories }: POILayerProps) {
  const [pois, setPois] = useState<POI[]>([])
  const [loading, setLoading] = useState(false)
  const map = useMap()

  useEffect(() => {
    if (!enabled || categories.length === 0) {
      setPois([])
      return
    }

    const fetchPOIs = async () => {
      setLoading(true)
      const allPois: POI[] = []

      for (const category of categories) {
        try {
          const response = await fetch(`/api/poi?category=${category}&limit=20`)
          if (response.ok) {
            const data = await response.json()
            allPois.push(...data)
          }
        } catch {
          // Ignore errors
        }
      }

      setPois(allPois)
      setLoading(false)
    }

    fetchPOIs()
  }, [enabled, categories])

  if (!enabled || pois.length === 0) return null

  return (
    <>
      {pois.map((poi) => (
        <Marker key={poi.id} position={[poi.lat, poi.lon]} icon={createPOIIcon(poi.category)}>
          <Popup>
            <div className="text-sm">
              <div className="font-medium">{poi.name}</div>
              {poi.address && <div className="text-muted-foreground">{poi.address}</div>}
              <div className="text-xs text-muted-foreground mt-1">{poi.type}</div>
            </div>
          </Popup>
        </Marker>
      ))}
    </>
  )
}
