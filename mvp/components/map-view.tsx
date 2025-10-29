"use client"

import type React from "react"

import { useRef, useState } from "react"
import dynamic from "next/dynamic"
import { Search, Navigation, Route, MapPin, Loader2, HelpCircle, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

const MapComponent = dynamic(() => import("@/components/map-component"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-muted">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  ),
})

export type RouteMode = "driving" | "walking" | null

export default function MapView() {
  const [searchQuery, setSearchQuery] = useState("")
  const [routeMode, setRouteMode] = useState<RouteMode>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<any[]>([])
  const mapRef = useRef<any>(null)

  const handleSearch = async () => {
    if (!searchQuery.trim()) return

    setIsSearching(true)
    try {
      // Search using Nominatim API with Uzhhorod bounds
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          searchQuery + ", Uzhhorod, Ukraine",
        )}&limit=5&bounded=1&viewbox=22.2,48.6,22.4,48.7`,
      )
      const data = await response.json()
      setSearchResults(data)

      if (data.length > 0 && mapRef.current) {
        const firstResult = data[0]
        const map = mapRef.current
        
        // Ensure map is properly initialized before calling setView
        if (typeof map.setView === "function" && map.getContainer) {
          const container = map.getContainer()
          if (container) {
            const rect = container.getBoundingClientRect()
            // If container has no dimensions, invalidate size first
            if (rect && (rect.width === 0 || rect.height === 0)) {
              if (map.invalidateSize) {
                map.invalidateSize()
              }
              // Wait a bit for invalidateSize to take effect
              setTimeout(() => {
                if (mapRef.current && typeof mapRef.current.setView === "function") {
                  try {
                    mapRef.current.setView([Number.parseFloat(firstResult.lat), Number.parseFloat(firstResult.lon)], 16)
                  } catch (error) {
                    console.error("[map-view] Error setting view:", error)
                  }
                }
              }, 100)
            } else {
              // Container has dimensions, safe to call setView
              try {
                map.setView([Number.parseFloat(firstResult.lat), Number.parseFloat(firstResult.lon)], 16)
              } catch (error) {
                console.error("[map-view] Error setting view:", error)
              }
            }
          } else {
            // Use whenReady if available
            if (map.whenReady) {
              map.whenReady(() => {
                if (mapRef.current && typeof mapRef.current.setView === "function") {
                  try {
                    mapRef.current.setView([Number.parseFloat(firstResult.lat), Number.parseFloat(firstResult.lon)], 16)
                  } catch (error) {
                    console.error("[map-view] Error setting view:", error)
                  }
                }
              })
            }
          }
        }
      }
    } catch (error) {
      console.error("Search error:", error)
    } finally {
      setIsSearching(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch()
    }
  }

  const handleResultClick = (result: any) => {
    if (mapRef.current) {
      const map = mapRef.current
      
      // Ensure map is properly initialized before calling setView
      if (typeof map.setView === "function" && map.getContainer) {
        const container = map.getContainer()
        if (container) {
          const rect = container.getBoundingClientRect()
          // If container has no dimensions, invalidate size first
          if (rect && (rect.width === 0 || rect.height === 0)) {
            if (map.invalidateSize) {
              map.invalidateSize()
            }
            setTimeout(() => {
              if (mapRef.current && typeof mapRef.current.setView === "function") {
                try {
                  mapRef.current.setView([Number.parseFloat(result.lat), Number.parseFloat(result.lon)], 17)
                } catch (error) {
                  console.error("[map-view] Error setting view:", error)
                }
              }
            }, 100)
          } else {
            try {
              map.setView([Number.parseFloat(result.lat), Number.parseFloat(result.lon)], 17)
            } catch (error) {
              console.error("[map-view] Error setting view:", error)
            }
          }
        } else if (map.whenReady) {
          map.whenReady(() => {
            if (mapRef.current && typeof mapRef.current.setView === "function") {
              try {
                mapRef.current.setView([Number.parseFloat(result.lat), Number.parseFloat(result.lon)], 17)
              } catch (error) {
                console.error("[map-view] Error setting view:", error)
              }
            }
          })
        }
      }
      
      setSearchResults([])
      setSearchQuery("")
    }
  }

  return (
    <div className="relative h-full w-full">
      {/* Search Bar */}
      <Card className="absolute left-4 top-4 z-[1000] w-full max-w-md shadow-lg">
        <div className="flex items-center gap-2 p-3">
          <Search className="h-5 w-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Пошук вулиць або локацій в Ужгороді..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            className="border-0 focus-visible:ring-0"
          />
          {searchQuery && (
            <Button
              size="icon"
              variant="ghost"
              onClick={() => {
                setSearchQuery("")
                setSearchResults([])
              }}
              className="h-8 w-8 shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
          <Button size="sm" onClick={handleSearch} disabled={isSearching} className="shrink-0">
            {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Пошук"}
          </Button>
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="border-t">
            {searchResults.map((result, index) => (
              <button
                key={index}
                onClick={() => handleResultClick(result)}
                className="flex w-full items-start gap-3 border-b p-3 text-left transition-colors hover:bg-muted last:border-b-0"
              >
                <MapPin className="mt-1 h-4 w-4 shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{result.display_name}</p>
                  <p className="text-xs text-muted-foreground">{result.type}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </Card>

      {/* Control Buttons */}
      <div className="absolute right-4 top-4 z-[1000] flex flex-col gap-2">
        <Dialog>
          <DialogTrigger asChild>
            <Button size="icon" variant="secondary" className="h-10 w-10 shadow-lg" title="Допомога">
              <HelpCircle className="h-5 w-5" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Як користуватись картою Ужгорода</DialogTitle>
              <DialogDescription>Інструкції по використанню додатку</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 text-sm">
              <div>
                <h4 className="mb-2 font-semibold">🔍 Пошук</h4>
                <p className="text-muted-foreground">
                  Введіть назву вулиці або локації в пошуковому полі та натисніть Enter або кнопку "Пошук". Виберіть
                  результат зі списку.
                </p>
              </div>
              <div>
                <h4 className="mb-2 font-semibold">🚗 Побудова маршруту</h4>
                <p className="text-muted-foreground">
                  1. Натисніть кнопку з іконкою автомобіля (для їзди) або піші (для ходьби)
                  <br />
                  2. Клікайте на карті, щоб додати точки маршруту
                  <br />
                  3. Маршрут побудується автоматично після додавання 2+ точок
                </p>
              </div>
              <div>
                <h4 className="mb-2 font-semibold">❌ Видалення точок</h4>
                <p className="text-muted-foreground">
                  Клікніть правою кнопкою миші на маркері, щоб видалити окрему точку. Або натисніть "Очистити маршрут"
                  для видалення всього маршруту.
                </p>
              </div>
              <div>
                <h4 className="mb-2 font-semibold">📍 Моя локація</h4>
                <p className="text-muted-foreground">
                  Натисніть кнопку з іконкою компаса внизу справа, щоб показати вашу поточну локацію на карті.
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Button
          size="icon"
          variant={routeMode === "driving" ? "default" : "secondary"}
          onClick={() => setRouteMode(routeMode === "driving" ? null : "driving")}
          className="h-10 w-10 shadow-lg"
          title="Маршрут для автомобіля"
        >
          <Route className="h-5 w-5" />
        </Button>
        <Button
          size="icon"
          variant={routeMode === "walking" ? "default" : "secondary"}
          onClick={() => setRouteMode(routeMode === "walking" ? null : "walking")}
          className="h-10 w-10 shadow-lg"
          title="Маршрут для пішоходів"
        >
          <Navigation className="h-5 w-5" />
        </Button>
      </div>

      {/* Map */}
      <MapComponent mapRef={mapRef} routeMode={routeMode} />
    </div>
  )
}
