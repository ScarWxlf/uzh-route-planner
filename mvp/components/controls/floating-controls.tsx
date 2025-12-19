"use client"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import { Locate, Layers, Trash2, Loader2, MapPin, HelpCircle } from "lucide-react"
import type { TileLayerKey } from "@/lib/uzhhorod"
import { TILE_LAYERS } from "@/lib/uzhhorod"
import type { POICategory } from "@/lib/types"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

interface FloatingControlsProps {
  layer: TileLayerKey
  onLayerChange: (layer: TileLayerKey) => void
  onLocate: () => void
  onClear: () => void
  isLoadingLocation: boolean
  hasRoute: boolean
  poiEnabled?: boolean
  poiCategories?: POICategory[]
  onTogglePoi?: (enabled?: boolean) => void
  onTogglePoiCategory?: (category: POICategory) => void
}

const POI_CATEGORY_LABELS: Record<POICategory, string> = {
  cafe: "Кафе",
  restaurant: "Ресторани",
  shop: "Магазини",
  pharmacy: "Аптеки",
  bank: "Банки",
  hotel: "Готелі",
}

export function FloatingControls({
  layer,
  onLayerChange,
  onLocate,
  onClear,
  isLoadingLocation,
  hasRoute,
  poiEnabled = false,
  poiCategories = [],
  onTogglePoi,
  onTogglePoiCategory,
}: FloatingControlsProps) {
  return (
    <div className="absolute bottom-24 right-4 z-[1000] flex flex-col gap-2 md:bottom-8">
      {/* Help / Instructions */}
      <Dialog>
        <DialogTrigger asChild>
          <Button
            size="icon"
            variant="secondary"
            className="h-10 w-10 shadow-lg"
            title="Допомога"
            aria-label="Допомога"
          >
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
                Введіть назву вулиці або локації в пошуковому полі та натисніть Enter або кнопку "Пошук".
                Виберіть результат зі списку.
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

      {/* Locate button */}
      <Button
        size="icon"
        variant="secondary"
        onClick={onLocate}
        disabled={isLoadingLocation}
        className="h-10 w-10 shadow-lg"
        aria-label="Знайти мене"
      >
        {isLoadingLocation ? <Loader2 className="h-5 w-5 animate-spin" /> : <Locate className="h-5 w-5" />}
      </Button>

      {onTogglePoi && onTogglePoiCategory && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="icon"
              variant={poiEnabled ? "default" : "secondary"}
              className="h-10 w-10 shadow-lg"
              aria-label="Показати POI"
            >
              <MapPin className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Точки інтересу</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {(Object.keys(POI_CATEGORY_LABELS) as POICategory[]).map((category) => (
              <DropdownMenuCheckboxItem
                key={category}
                checked={poiCategories.includes(category)}
                onCheckedChange={() => {
                  onTogglePoiCategory(category)
                  if (!poiEnabled) onTogglePoi(true)
                }}
              >
                {POI_CATEGORY_LABELS[category]}
              </DropdownMenuCheckboxItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onTogglePoi(false)}>Сховати всі</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Layer switcher */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon" variant="secondary" className="h-10 w-10 shadow-lg" aria-label="Змінити шар карти">
            <Layers className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {(Object.keys(TILE_LAYERS) as TileLayerKey[]).map((key) => (
            <DropdownMenuItem key={key} onClick={() => onLayerChange(key)} className={layer === key ? "bg-accent" : ""}>
              {TILE_LAYERS[key].name}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Clear button */}
      {hasRoute && (
        <Button
          size="icon"
          variant="destructive"
          onClick={onClear}
          className="h-10 w-10 shadow-lg"
          aria-label="Очистити маршрут"
        >
          <Trash2 className="h-5 w-5" />
        </Button>
      )}
    </div>
  )
}
