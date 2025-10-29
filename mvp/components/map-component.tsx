"use client"

import type React from "react"
import { useEffect, useRef, useState } from "react"
import { Navigation, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import type { RouteMode } from "./map-view"
import { getCurrentLocation } from "@/utils/location-utils"

declare global {
  interface Window {
    L: any
  }
}

interface MapComponentProps {
  mapRef: React.MutableRefObject<any>
  routeMode: RouteMode
}

interface RouteInfo {
  distance: number // in meters
  duration: number // in seconds
  mode: "driving" | "walking"
}

export default function MapComponent({ mapRef, routeMode }: MapComponentProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [leafletLoaded, setLeafletLoaded] = useState(false)
  const [userLocation, setUserLocation] = useState<any>(null)
  const [routePoints, setRoutePoints] = useState<any[]>([])
  const routeLayerRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const userMarkerRef = useRef<any>(null)
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null)

  useEffect(() => {
    const link = document.createElement("link")
    link.rel = "stylesheet"
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
    document.head.appendChild(link)

    const script = document.createElement("script")
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
    script.onload = () => {
      setLeafletLoaded(true)
    }
    document.head.appendChild(script)

    return () => {
      document.head.removeChild(link)
      document.head.removeChild(script)
    }
  }, [])

  useEffect(() => {
    if (!containerRef.current || mapRef.current || !leafletLoaded || !window.L) return

    const L = window.L

    const map = L.map(containerRef.current).setView([48.6208, 22.2879], 13)

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(map)

    mapRef.current = map

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [leafletLoaded])

  useEffect(() => {
    if (!mapRef.current || !window.L) return

    const L = window.L
    const map = mapRef.current

    const handleMapClick = (e: any) => {
      if (!routeMode) return

      const newPoint = e.latlng
      setRoutePoints((prev) => {
        const updated = [...prev, newPoint]

        const marker = L.marker(newPoint, {
          icon: L.divIcon({
            className: "custom-marker",
            html: `<div class="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">${updated.length}</div>`,
            iconSize: [32, 32],
            iconAnchor: [16, 16],
          }),
        }).addTo(map)

        marker.on("contextmenu", (e: any) => {
          L.DomEvent.stopPropagation(e)
          const markerIndex = markersRef.current.indexOf(marker)
          if (markerIndex !== -1) {
            removeRoutePoint(markerIndex)
          }
        })

        markersRef.current.push(marker)

        if (updated.length >= 2) {
          drawRoute(updated, routeMode)
        }

        return updated
      })
    }

    map.on("click", handleMapClick)

    return () => {
      map.off("click", handleMapClick)
    }
  }, [routeMode, leafletLoaded])

  useEffect(() => {
    if (!routeMode) {
      clearRoute()
    } else if (routePoints.length >= 2) {
      console.log("[v0] Route mode changed to:", routeMode, "- redrawing route")
      drawRoute(routePoints, routeMode)
    }
  }, [routeMode])

  const drawRoute = async (points: any[], mode: "driving" | "walking") => {
    if (!mapRef.current || points.length < 2 || !window.L) return

    const L = window.L
    const map = mapRef.current
    if (!map || typeof map.addLayer !== "function") {
      console.error("[v0] Invalid map instance")
      return
    }

    try {
      console.log("[v0] Drawing route with mode:", mode)
      const coords = points.map((p: any) => `${p.lng},${p.lat}`).join(";")
      const profile = mode === "driving" ? "car" : "foot"
      console.log("[v0] Using OSRM profile:", profile)
      const response = await fetch(
        `https://router.project-osrm.org/route/v1/${profile}/${coords}?overview=full&geometries=geojson`,
      )
      const data = await response.json()

      if (data.routes && data.routes[0] && data.routes[0].geometry && data.routes[0].geometry.coordinates) {
        const route = data.routes[0]
        const rawCoordinates = route.geometry.coordinates

        const validCoordinates = rawCoordinates
          .filter((coord: any) => {
            if (!coord || !Array.isArray(coord) || coord.length < 2) {
              return false
            }
            const lng = coord[0]
            const lat = coord[1]
            return (
              typeof lng === "number" &&
              typeof lat === "number" &&
              !Number.isNaN(lng) &&
              !Number.isNaN(lat) &&
              Number.isFinite(lng) &&
              Number.isFinite(lat)
            )
          })
          .map((coord: number[]) => {
            return [coord[1], coord[0]] as [number, number]
          })

        if (validCoordinates.length === 0) {
          console.error("[v0] No valid coordinates found in route geometry")
          return
        }

        // A polyline needs at least 2 points
        if (validCoordinates.length < 2) {
          console.error("[v0] Not enough coordinates for a polyline (need at least 2, got", validCoordinates.length, ")")
          return
        }

        // Verify coordinates are in valid ranges (latitude: -90 to 90, longitude: -180 to 180)
        const hasInvalidRange = validCoordinates.some((coord: [number, number]) => {
          const lat = coord[0]
          const lng = coord[1]
          return lat < -90 || lat > 90 || lng < -180 || lng > 180
        })

        if (hasInvalidRange) {
          console.error("[v0] Coordinates are outside valid range")
          return
        }

        if (!mapRef.current || typeof mapRef.current.addLayer !== "function") {
          console.error("[v0] Map instance became invalid")
          return
        }

        setRouteInfo({
          distance: route.distance,
          duration: route.duration,
          mode: mode,
        })

        console.log("[v0] Route info:", {
          distance: `${(route.distance / 1000).toFixed(2)} km`,
          duration: `${Math.round(route.duration / 60)} min`,
          mode: mode,
        })

        if (routeLayerRef.current && mapRef.current) {
          mapRef.current.removeLayer(routeLayerRef.current)
        }

        // Create polyline and add to map with error handling
        try {
          // Double-check map is still valid and properly initialized
          const currentMap = mapRef.current
          if (!currentMap || typeof currentMap.addLayer !== "function" || typeof currentMap.setView !== "function") {
            console.error("[v0] Map instance is invalid or not properly initialized")
            return
          }

          // Verify map container exists in DOM and has dimensions
          const container = currentMap.getContainer ? currentMap.getContainer() : null
          if (!container) {
            console.error("[v0] Map container not found")
            return
          }
          
          // Check container has dimensions (Leaflet needs this for projection calculations)
          const containerRect = container.getBoundingClientRect()
          if (!containerRect || containerRect.width === 0 || containerRect.height === 0) {
            console.error("[v0] Map container has no dimensions (width:", containerRect?.width, "height:", containerRect?.height, ")")
            // Try to invalidate size to force Leaflet to recalculate
            if (currentMap.invalidateSize) {
              currentMap.invalidateSize()
            }
            // Still proceed - invalidateSize might fix it, but wrap in try-catch
          }

          // Create polyline
          const polyline = L.polyline(validCoordinates, {
            color: mode === "driving" ? "#3b82f6" : "#10b981",
            weight: 5,
            opacity: 0.7,
          })

          // Verify polyline was created successfully
          if (!polyline || typeof polyline.addTo !== "function") {
            console.error("[v0] Failed to create polyline")
            return
          }

          // Helper function to safely add polyline to map
          let retryCount = 0
          const MAX_RETRIES = 10
          const addPolylineToMap = () => {
            try {
              if (!mapRef.current || mapRef.current !== currentMap) {
                console.error("[v0] Map reference changed before adding layer")
                return false
              }

              // Verify container has dimensions before adding
              const container = currentMap.getContainer ? currentMap.getContainer() : null
              if (container) {
                const rect = container.getBoundingClientRect()
                if (rect && (rect.width === 0 || rect.height === 0)) {
                  // Container has no dimensions, invalidate size and retry
                  if (retryCount >= MAX_RETRIES) {
                    console.error("[v0] Max retries reached, container still has no dimensions")
                    return false
                  }
                  retryCount++
                  if (currentMap.invalidateSize) {
                    currentMap.invalidateSize()
                  }
                  // Retry after a short delay
                  setTimeout(() => {
                    addPolylineToMap()
                  }, 100)
                  return false
                }
              }

              // Container has dimensions, safe to add layer
              routeLayerRef.current = polyline.addTo(currentMap)
              
              // Verify layer was added successfully
              if (routeLayerRef.current && currentMap.hasLayer && currentMap.hasLayer(routeLayerRef.current)) {
                // Fit bounds only if layer was successfully added
                if (typeof routeLayerRef.current.getBounds === "function") {
                  try {
                    const bounds = routeLayerRef.current.getBounds()
                    if (bounds && currentMap.fitBounds) {
                      currentMap.fitBounds(bounds, { padding: [50, 50] })
                    }
                  } catch (boundsError) {
                    console.warn("[v0] Could not fit bounds:", boundsError)
                  }
                }
                console.log("[v0] Route drawn successfully")
                return true
              } else {
                console.warn("[v0] Polyline may not have been added to map correctly")
                return false
              }
            } catch (addError) {
              console.error("[v0] Error adding polyline to map:", addError)
              routeLayerRef.current = null
              return false
            }
          }

          // Add to map with additional safety check - ensure map is ready
          try {
            // Use whenReady to ensure map is fully initialized
            if (currentMap.whenReady) {
              currentMap.whenReady(() => {
                addPolylineToMap()
              })
            } else {
              // Fallback: try to add directly, with retry if needed
              if (!addPolylineToMap()) {
                // If failed, try once more after a short delay
                setTimeout(() => {
                  addPolylineToMap()
                }, 200)
              }
            }
          } catch (addError) {
            console.error("[v0] Error in polyline addition logic:", addError)
            routeLayerRef.current = null
          }
        } catch (polylineError) {
          console.error("[v0] Error creating polyline:", polylineError)
          routeLayerRef.current = null
        }
      } else {
        console.error("[v0] Invalid route data from OSRM:", data)
      }
    } catch (error) {
      console.error("Route drawing error:", error)
    }
  }

  const clearRoute = () => {
    if (routeLayerRef.current && mapRef.current) {
      mapRef.current.removeLayer(routeLayerRef.current)
      routeLayerRef.current = null
    }

    markersRef.current.forEach((marker) => {
      if (mapRef.current) {
        mapRef.current.removeLayer(marker)
      }
    })
    markersRef.current = []
    setRoutePoints([])
    setRouteInfo(null)
  }

  const removeRoutePoint = (index: number) => {
    if (!mapRef.current) return

    if (markersRef.current[index]) {
      mapRef.current.removeLayer(markersRef.current[index])
    }

    const newPoints = routePoints.filter((_, i) => i !== index)
    const newMarkers = markersRef.current.filter((_, i) => i !== index)

    markersRef.current.forEach((marker) => {
      if (mapRef.current) {
        mapRef.current.removeLayer(marker)
      }
    })

    markersRef.current = []

    if (window.L) {
      const L = window.L
      newPoints.forEach((point, idx) => {
        const marker = L.marker(point, {
          icon: L.divIcon({
            className: "custom-marker",
            html: `<div class="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">${idx + 1}</div>`,
            iconSize: [32, 32],
            iconAnchor: [16, 16],
          }),
        }).addTo(mapRef.current)

        marker.on("contextmenu", (e: any) => {
          L.DomEvent.stopPropagation(e)
          const markerIndex = markersRef.current.indexOf(marker)
          if (markerIndex !== -1) {
            removeRoutePoint(markerIndex)
          }
        })

        markersRef.current.push(marker)
      })
    }

    setRoutePoints(newPoints)

    if (newPoints.length >= 2 && routeMode) {
      drawRoute(newPoints, routeMode)
    } else {
      if (routeLayerRef.current && mapRef.current) {
        mapRef.current.removeLayer(routeLayerRef.current)
        routeLayerRef.current = null
      }
      setRouteInfo(null)
    }
  }

  const formatDistance = (meters: number) => {
    if (meters < 1000) {
      return `${Math.round(meters)} м`
    }
    return `${(meters / 1000).toFixed(2)} км`
  }

  const formatDuration = (seconds: number) => {
    const minutes = Math.round(seconds / 60)
    if (minutes < 60) {
      return `${minutes} хв`
    }
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return `${hours} год ${remainingMinutes} хв`
  }

  const handleGetCurrentLocation = () => {
    if (!mapRef.current || !window.L) return

    const L = window.L

    getCurrentLocation(
      mapRef,
      (lat, lng) => {
        const location = L.latLng(lat, lng)
        setUserLocation(location)

        if (userMarkerRef.current) {
          mapRef.current.removeLayer(userMarkerRef.current)
        }

        userMarkerRef.current = L.marker(location, {
          icon: L.divIcon({
            className: "user-location-marker",
            html: `<div class="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg border-4 border-white">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            </div>`,
            iconSize: [40, 40],
            iconAnchor: [20, 20],
          }),
        }).addTo(mapRef.current)

        mapRef.current.setView(location, 15)
        console.log("[v0] Centered map on user location")
      },
      (error) => {
        console.error("[v0] Location error:", error)
        alert(error)
      },
    )
  }

  if (!leafletLoaded) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-muted">
        <div className="text-center">
          <div className="mb-2 text-lg font-medium">Loading map...</div>
          <div className="text-sm text-muted-foreground">Please wait</div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div ref={containerRef} className="h-full w-full" />

      {routeInfo && (
        <Card className="absolute bottom-4 left-4 z-[1000] p-4 shadow-lg">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div
                  className={`h-3 w-3 rounded-full ${routeInfo.mode === "driving" ? "bg-blue-500" : "bg-green-500"}`}
                />
                <span className="font-semibold">{routeInfo.mode === "driving" ? "Автомобіль" : "Пішки"}</span>
              </div>
              <div className="space-y-1 text-sm">
                <div>
                  <span className="text-muted-foreground">Відстань:</span>{" "}
                  <span className="font-medium">{formatDistance(routeInfo.distance)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Час:</span>{" "}
                  <span className="font-medium">{formatDuration(routeInfo.duration)}</span>
                </div>
              </div>
            </div>
            <Button size="icon" variant="ghost" onClick={clearRoute} className="h-6 w-6">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      <Button
        size="icon"
        variant="secondary"
        onClick={handleGetCurrentLocation}
        className="absolute bottom-4 right-4 z-[1000] h-12 w-12 shadow-lg"
        title="Моя локація"
      >
        <Navigation className="h-6 w-6" />
      </Button>

      {routePoints.length > 0 && (
        <Button variant="destructive" onClick={clearRoute} className="absolute bottom-20 right-4 z-[1000] shadow-lg">
          Очистити маршрут
        </Button>
      )}
    </>
  )
}
