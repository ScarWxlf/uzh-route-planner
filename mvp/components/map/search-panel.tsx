"use client"

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { LocationSearchInput } from "@/components/search/location-search-input"
import { Car, Footprints, Loader2, AlertTriangle } from "lucide-react"
import type { MapPoint, RouteProfile, RouteData, GeocodingResult } from "@/lib/types"
import { cn } from "@/lib/utils"

interface SearchPanelProps {
  start: MapPoint | null
  end: MapPoint | null
  profile: RouteProfile
  route: RouteData | null
  isLoading: boolean
  onStartSelect: (result: GeocodingResult) => void
  onEndSelect: (result: GeocodingResult) => void
  onStartClear: () => void
  onEndClear: () => void
  onProfileChange: (profile: RouteProfile) => void
}

function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} м`
  }
  return `${(meters / 1000).toFixed(1)} км`
}

function formatDuration(seconds: number): string {
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) {
    return `${minutes} хв`
  }
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours} год ${mins} хв`
}

export function SearchPanel({
  start,
  end,
  profile,
  route,
  isLoading,
  onStartSelect,
  onEndSelect,
  onStartClear,
  onEndClear,
  onProfileChange,
}: SearchPanelProps) {
  const hasFallback = Boolean(route?.fallback || route?.warnings?.length)


  return (
    <div className="absolute top-4 left-4 right-4 md:left-4 md:right-auto z-[1000]">
      <div className="bg-background/95 backdrop-blur-sm rounded-lg shadow-lg p-3 md:p-4 w-full md:w-[380px]">
        <div className="flex flex-col gap-2 md:gap-3">
          {/* Start input */}
          <LocationSearchInput
            placeholder="Початок (A)"
            value={start}
            onSelect={onStartSelect}
            onClear={onStartClear}
            onSetAsA={onStartSelect}
            onSetAsB={onEndSelect}
            showQuickActions
            inputClassName="bg-background border-green-500/50 focus-visible:ring-green-500"
          />

          {/* End input */}
          <LocationSearchInput
            placeholder="Кінець (B)"
            value={end}
            onSelect={onEndSelect}
            onClear={onEndClear}
            onSetAsA={onStartSelect}
            onSetAsB={onEndSelect}
            showQuickActions
            inputClassName="bg-background border-red-500/50 focus-visible:ring-red-500"
          />

          {/* Profile toggle and route summary */}
          <div className="flex items-center gap-2 md:gap-3">
            <Tabs value={profile} onValueChange={(v) => onProfileChange(v as RouteProfile)} className="flex-shrink-0">
              <TabsList className="h-9">
                <TabsTrigger value="car" className="px-3">
                  <Car className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline">Авто</span>
                </TabsTrigger>
                <TabsTrigger value="walk" className="px-3">
                  <Footprints className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline">Пішки</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Route summary */}
            <div className="flex-1 flex items-center justify-end gap-2 text-sm">
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : route ? (
                <>
                  <span className={cn("font-semibold", (route.profile ?? profile) === "walk" ? "text-green-600" : "text-blue-600"
)}>
                    {formatDistance(route.distance)}
                  </span>
                  <span className="text-muted-foreground">•</span>
                  <span className="text-muted-foreground">{formatDuration(route.duration)}</span>
                  {hasFallback && (
                    <Badge variant="outline" className="text-xs gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      fallback
                    </Badge>
                  )}
                </>
              ) : (
                <span className="text-muted-foreground text-xs">Оберіть точки</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
