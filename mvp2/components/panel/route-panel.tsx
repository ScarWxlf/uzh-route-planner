"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import {
  ArrowRightLeft,
  Share2,
  Star,
  Clock,
  Route,
  ChevronLeft,
  ChevronRight,
  Trash2,
  MapPin,
  Navigation,
  Car,
  Footprints,
  Bus,
  AlertTriangle,
} from "lucide-react"
import type { RouteData, SavedPlace, RecentRoute, MapPoint, UIState } from "@/lib/types"
import { cn } from "@/lib/utils"

interface RoutePanelProps {
  route: RouteData | null
  start: MapPoint | null
  end: MapPoint | null
  isLoading: boolean
  savedPlaces: SavedPlace[]
  recentRoutes: RecentRoute[]
  activeTab: UIState["activeTab"]
  panelOpen: boolean
  isMobile: boolean
  onReversePoints: () => void
  onClearRoute: () => void
  onShare: () => void
  onSavePlace: (point: MapPoint, name: string) => void
  onDeletePlace: (id: string) => void
  onRestoreRoute: (route: RecentRoute) => void
  onSetStart: (point: MapPoint) => void
  onSetEnd: (point: MapPoint) => void
  onActiveTabChange: (tab: UIState["activeTab"]) => void
  onTogglePanel: () => void
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

function RouteSteps({ steps }: { steps: RouteData["steps"] }) {
  if (!steps || steps.length === 0) {
    return <p className="text-sm text-muted-foreground py-4 text-center">Покрокові інструкції недоступні</p>
  }

  return (
    <div className="space-y-2">
      {steps.map((step, index) => (
        <div key={index} className="flex gap-3 p-2 rounded-md hover:bg-accent/50">
          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
            {index + 1}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm">{step.instruction}</p>
            {step.name && <p className="text-xs text-muted-foreground">{step.name}</p>}
            <p className="text-xs text-muted-foreground">
              {formatDistance(step.distance)} • {formatDuration(step.duration)}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}

function SavePlaceDialog({
  point,
  onSave,
}: {
  point: MapPoint | null
  onSave: (name: string) => void
}) {
  const [name, setName] = useState("")

  if (!point) return null

  return (
    <div className="flex gap-2">
      <Input placeholder="Назва місця" value={name} onChange={(e) => setName(e.target.value)} className="flex-1" />
      <Button
        size="sm"
        onClick={() => {
          if (name.trim()) {
            onSave(name.trim())
            setName("")
          }
        }}
        disabled={!name.trim()}
      >
        <Star className="h-4 w-4" />
      </Button>
    </div>
  )
}

function TransitPlaceholder() {
  return (
    <div className="text-center py-8 text-muted-foreground">
      <Bus className="h-12 w-12 mx-auto mb-2 opacity-50" />
      <p className="font-medium">Модуль транспорту</p>
      <p className="text-sm mt-1">Модуль транспорту вимкнений (потрібні GTFS/реальний API).</p>
    </div>
  )
}

function PanelContent({
  route,
  start,
  end,
  isLoading,
  savedPlaces,
  recentRoutes,
  activeTab,
  onReversePoints,
  onClearRoute,
  onShare,
  onSavePlace,
  onDeletePlace,
  onRestoreRoute,
  onSetStart,
  onSetEnd,
  onActiveTabChange,
}: Omit<RoutePanelProps, "panelOpen" | "isMobile" | "onTogglePanel">) {
  const [savingPoint, setSavingPoint] = useState<"start" | "end" | null>(null)

  const hasWarnings = route?.warnings && route.warnings.length > 0

  return (
    <div className="flex flex-col h-full">
      <Tabs
        value={activeTab}
        onValueChange={(v) => onActiveTabChange(v as UIState["activeTab"])}
        className="flex-1 flex flex-col"
      >
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="route" className="text-xs">
            <Route className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Маршрут</span>
          </TabsTrigger>
          <TabsTrigger value="saved" className="text-xs">
            <Star className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Збережені</span>
          </TabsTrigger>
          <TabsTrigger value="recent" className="text-xs">
            <Clock className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Останні</span>
          </TabsTrigger>
          <TabsTrigger value="transit" className="text-xs">
            <Bus className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Транспорт</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="route" className="flex-1 flex flex-col mt-4 overflow-hidden">
          {/* Route summary */}
          {route && (
            <div className="bg-accent/50 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl font-bold">{formatDistance(route.distance)}</span>
                <div className="flex items-center gap-2">
                  <span className="text-lg text-muted-foreground">{formatDuration(route.duration)}</span>
                  {route.provider && (
                    <Badge variant="outline" className="text-xs">
                      {route.provider.toUpperCase()}
                    </Badge>
                  )}
                </div>
              </div>
              {hasWarnings && (
                <div className="flex items-center gap-2 text-sm text-amber-600 mb-2">
                  <AlertTriangle className="h-4 w-4" />
                  <span>{route.warnings![0]}</span>
                </div>
              )}
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={onReversePoints}>
                  <ArrowRightLeft className="h-4 w-4 mr-1" />
                  Розвернути
                </Button>
                <Button size="sm" variant="outline" onClick={onShare}>
                  <Share2 className="h-4 w-4 mr-1" />
                  Поділитися
                </Button>
                <Button size="sm" variant="destructive" onClick={onClearRoute}>
                  <Trash2 className="h-4 w-4 mr-1" />
                  Очистити
                </Button>
              </div>
            </div>
          )}

          {/* Save place options */}
          {(start || end) && (
            <div className="space-y-2 mb-4">
              {start && !savingPoint && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => setSavingPoint("start")}
                >
                  <Star className="h-4 w-4 mr-2" />
                  Зберегти початок
                </Button>
              )}
              {savingPoint === "start" && start && (
                <SavePlaceDialog
                  point={start}
                  onSave={(name) => {
                    onSavePlace(start, name)
                    setSavingPoint(null)
                  }}
                />
              )}
              {end && !savingPoint && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => setSavingPoint("end")}
                >
                  <Star className="h-4 w-4 mr-2" />
                  Зберегти кінець
                </Button>
              )}
              {savingPoint === "end" && end && (
                <SavePlaceDialog
                  point={end}
                  onSave={(name) => {
                    onSavePlace(end, name)
                    setSavingPoint(null)
                  }}
                />
              )}
            </div>
          )}

          {/* Route steps */}
          <ScrollArea className="flex-1">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : route ? (
              <RouteSteps steps={route.steps} />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Navigation className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Оберіть точки на карті або в пошуку</p>
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="saved" className="flex-1 overflow-hidden mt-4">
          <ScrollArea className="h-full">
            {savedPlaces.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Star className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Немає збережених місць</p>
              </div>
            ) : (
              <div className="space-y-2">
                {savedPlaces.map((place) => (
                  <div key={place.id} className="flex items-center gap-2 p-2 rounded-md hover:bg-accent/50">
                    <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{place.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {place.lat.toFixed(4)}, {place.lon.toFixed(4)}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => onSetStart({ lat: place.lat, lon: place.lon, label: place.name })}
                        aria-label="Встановити як початок"
                      >
                        <span className="text-xs font-bold text-green-600">A</span>
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => onSetEnd({ lat: place.lat, lon: place.lon, label: place.name })}
                        aria-label="Встановити як кінець"
                      >
                        <span className="text-xs font-bold text-red-600">B</span>
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => onDeletePlace(place.id)}
                        aria-label="Видалити"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="recent" className="flex-1 overflow-hidden mt-4">
          <ScrollArea className="h-full">
            {recentRoutes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Немає останніх маршрутів</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentRoutes.map((route) => (
                  <button
                    key={route.id}
                    className="w-full flex items-center gap-2 p-2 rounded-md hover:bg-accent/50 text-left"
                    onClick={() => onRestoreRoute(route)}
                  >
                    {route.profile === "car" ? (
                      <Car className="h-4 w-4 text-blue-500 flex-shrink-0" />
                    ) : (
                      <Footprints className="h-4 w-4 text-green-500 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">
                        {route.start.label || `${route.start.lat.toFixed(3)}, ${route.start.lon.toFixed(3)}`}
                        {" → "}
                        {route.end.label || `${route.end.lat.toFixed(3)}, ${route.end.lon.toFixed(3)}`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistance(route.distance)} • {formatDuration(route.duration)}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="transit" className="flex-1 overflow-hidden mt-4">
          <TransitPlaceholder />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export function RoutePanel(props: RoutePanelProps) {
  const { panelOpen, isMobile, onTogglePanel } = props

  // Mobile: Bottom sheet
  if (isMobile) {
    return (
      <Sheet open={panelOpen} onOpenChange={onTogglePanel}>
        <SheetTrigger asChild>
          <Button variant="secondary" size="sm" className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[1000] shadow-lg">
            <Route className="h-4 w-4 mr-2" />
            {props.route ? formatDistance(props.route.distance) : "Маршрут"}
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom" className="h-[70vh]">
          <SheetHeader>
            <SheetTitle>Деталі маршруту</SheetTitle>
          </SheetHeader>
          <div className="mt-4 h-[calc(100%-60px)]">
            <PanelContent {...props} />
          </div>
        </SheetContent>
      </Sheet>
    )
  }

  // Desktop: Side panel
  return (
    <>
      {/* Toggle button */}
      <Button
        variant="secondary"
        size="icon"
        onClick={onTogglePanel}
        className={cn(
          "fixed top-1/2 -translate-y-1/2 z-[1000] shadow-lg transition-all",
          panelOpen ? "right-[340px]" : "right-4",
        )}
        aria-label={panelOpen ? "Сховати панель" : "Показати панель"}
      >
        {panelOpen ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
      </Button>

      {/* Side panel */}
      <div
        className={cn(
          "fixed top-0 right-0 h-full w-[340px] bg-background border-l shadow-lg z-[999] transition-transform",
          panelOpen ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="p-4 h-full">
          <h2 className="text-lg font-semibold mb-4">Деталі маршруту</h2>
          <PanelContent {...props} />
        </div>
      </div>
    </>
  )
}
