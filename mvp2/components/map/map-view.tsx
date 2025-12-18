"use client"

import { useEffect, useRef } from "react"
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  useMap,
  useMapEvents,
  ScaleControl,
  ZoomControl,
} from "react-leaflet"
import L from "leaflet"
import { UZHHOROD_CENTER, UZHHOROD_ZOOM, TILE_LAYERS, type TileLayerKey } from "@/lib/uzhhorod"
import type { MapPoint, RouteData, LatLon, RouteProfile, POICategory } from "@/lib/types"
import { POILayer } from "@/components/poi/poi-layer"

// Fix for default marker icons in Leaflet with webpack
const startIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

const endIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

const userIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

interface MapViewProps {
  start: MapPoint | null
  end: MapPoint | null
  route: RouteData | null
  profile: RouteProfile
  userLocation: LatLon | null
  layer: TileLayerKey
  followMe: boolean
  onMapClick: (lat: number, lon: number) => void
  onStartDrag: (lat: number, lon: number) => void
  onEndDrag: (lat: number, lon: number) => void
  poiEnabled?: boolean
  poiCategories?: POICategory[]
}

// Component to handle map events
function MapEventHandler({
  onMapClick,
  userLocation,
  followMe,
  start,
  end,
}: {
  onMapClick: (lat: number, lon: number) => void
  userLocation: LatLon | null
  followMe: boolean
  start: MapPoint | null
  end: MapPoint | null
}) {
  const map = useMap()
  const initialFitDone = useRef(false)

  useMapEvents({
    click: (e) => {
      onMapClick(e.latlng.lat, e.latlng.lng)
    },
  })

  // Center on user location when followMe is enabled
  useEffect(() => {
    if (followMe && userLocation) {
      map.setView([userLocation.lat, userLocation.lon], map.getZoom())
    }
  }, [followMe, userLocation, map])

  // Fit bounds to show both markers
  useEffect(() => {
    if (start && end && !initialFitDone.current) {
      const bounds = L.latLngBounds([start.lat, start.lon], [end.lat, end.lon])
      map.fitBounds(bounds, { padding: [50, 50] })
      initialFitDone.current = true
    }
  }, [start, end, map])

  return null
}

// Draggable marker component
function DraggableMarker({
  position,
  icon,
  onDragEnd,
}: {
  position: [number, number]
  icon: L.Icon
  onDragEnd: (lat: number, lon: number) => void
}) {
  const markerRef = useRef<L.Marker>(null)

  const eventHandlers = {
    dragend() {
      const marker = markerRef.current
      if (marker) {
        const { lat, lng } = marker.getLatLng()
        onDragEnd(lat, lng)
      }
    },
  }

  return <Marker draggable eventHandlers={eventHandlers} position={position} ref={markerRef} icon={icon} />
}

export default function MapView({
  start,
  end,
  route,
  profile,
  userLocation,
  layer,
  followMe,
  onMapClick,
  onStartDrag,
  onEndDrag,
  poiEnabled = false,
  poiCategories = [],
}: MapViewProps) {
  const tileLayer = TILE_LAYERS[layer]

  // Convert GeoJSON coordinates to Leaflet format
  const routePositions: [number, number][] =
    route?.geometry?.coordinates?.map((coord: number[]) => [coord[1], coord[0]] as [number, number]) || []

  const routeColor = profile === "walk" ? "#22c55e" : "#3b82f6"
  const dashArray = route?.fallback ? "10, 10" : undefined

  return (
    <MapContainer center={UZHHOROD_CENTER} zoom={UZHHOROD_ZOOM} className="h-full w-full" zoomControl={false}>
      <TileLayer attribution={tileLayer.attribution} url={tileLayer.url} />
      <ZoomControl position="bottomright" />
      <ScaleControl position="bottomleft" metric imperial={false} />

      <MapEventHandler
        onMapClick={onMapClick}
        userLocation={userLocation}
        followMe={followMe}
        start={start}
        end={end}
      />

      {/* Start marker */}
      {start && <DraggableMarker position={[start.lat, start.lon]} icon={startIcon} onDragEnd={onStartDrag} />}

      {/* End marker */}
      {end && <DraggableMarker position={[end.lat, end.lon]} icon={endIcon} onDragEnd={onEndDrag} />}

      {/* User location marker */}
      {userLocation && <Marker position={[userLocation.lat, userLocation.lon]} icon={userIcon} />}

      {/* Route polyline */}
      {routePositions.length > 0 && (
        <Polyline
          positions={routePositions}
          pathOptions={{
            color: routeColor,
            weight: 5,
            opacity: 0.8,
            dashArray,
          }}
        />
      )}

      <POILayer enabled={poiEnabled} categories={poiCategories} />
    </MapContainer>
  )
}
