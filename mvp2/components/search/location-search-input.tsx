"use client"

import type React from "react"

import { useState, useRef, useEffect, useCallback } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Loader2, MapPin, X } from "lucide-react"
import { geocodeSearch } from "@/lib/geocode"
import type { GeocodingResult, MapPoint } from "@/lib/types"
import { cn } from "@/lib/utils"

interface LocationSearchInputProps {
  placeholder: string
  value: MapPoint | null
  onSelect: (result: GeocodingResult) => void
  onClear: () => void
  onSetAsA?: (result: GeocodingResult) => void
  onSetAsB?: (result: GeocodingResult) => void
  showQuickActions?: boolean
  className?: string
  inputClassName?: string
}

function parseCoordinates(input: string): { lat: number; lon: number } | null {
  const cleaned = input.trim().replace(/\s+/g, "")
  const match = cleaned.match(/^(-?\d+\.?\d*),(-?\d+\.?\d*)$/)
  if (match) {
    const lat = Number.parseFloat(match[1])
    const lon = Number.parseFloat(match[2])
    if (lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
      return { lat, lon }
    }
  }
  return null
}

export function LocationSearchInput({
  placeholder,
  value,
  onSelect,
  onClear,
  onSetAsA,
  onSetAsB,
  showQuickActions = false,
  className,
  inputClassName,
}: LocationSearchInputProps) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<GeocodingResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<NodeJS.Timeout>()

  // Update display value when external value changes
  useEffect(() => {
    if (value?.label) {
      setQuery(value.label)
    } else if (value) {
      setQuery(`${value.lat.toFixed(5)}, ${value.lon.toFixed(5)}`)
    } else {
      setQuery("")
    }
  }, [value])

  // Debounced search
  const search = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setResults([])
      setIsOpen(false)
      return
    }

    const coords = parseCoordinates(searchQuery)
    if (coords) {
      setResults([
        {
          placeId: `coords-${coords.lat}-${coords.lon}`,
          displayName: `${coords.lat.toFixed(5)}, ${coords.lon.toFixed(5)}`,
          lat: coords.lat,
          lon: coords.lon,
          type: "coordinates",
        },
      ])
      setIsOpen(true)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    const searchResults = await geocodeSearch(searchQuery)
    setResults(searchResults)
    setIsOpen(searchResults.length > 0)
    setIsLoading(false)
    setActiveIndex(-1)
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value
    setQuery(newQuery)

    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    debounceRef.current = setTimeout(() => {
      search(newQuery)
    }, 300)
  }

  const handleSelect = (result: GeocodingResult) => {
    setQuery(result.displayName.split(",")[0])
    setIsOpen(false)
    setResults([])
    onSelect(result)
  }

  const handleClear = () => {
    setQuery("")
    setResults([])
    setIsOpen(false)
    onClear()
    inputRef.current?.focus()
  }

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault()
        setActiveIndex((prev) => Math.min(prev + 1, results.length - 1))
        break
      case "ArrowUp":
        e.preventDefault()
        setActiveIndex((prev) => Math.max(prev - 1, 0))
        break
      case "Enter":
        e.preventDefault()
        if (activeIndex >= 0 && results[activeIndex]) {
          handleSelect(results[activeIndex])
        }
        break
      case "Escape":
        setIsOpen(false)
        break
    }
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [])

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          className={cn("pl-9 pr-9", inputClassName)}
          aria-label={placeholder}
          aria-expanded={isOpen}
          aria-controls="search-results"
          aria-activedescendant={activeIndex >= 0 ? `result-${activeIndex}` : undefined}
          role="combobox"
          autoComplete="off"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
        {!isLoading && (query || value) && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="Очистити"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Dropdown results */}
      {isOpen && results.length > 0 && (
        <ul
          id="search-results"
          role="listbox"
          className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-popover p-1 shadow-lg"
        >
          {results.map((result, index) => (
            <li
              key={result.placeId}
              id={`result-${index}`}
              role="option"
              aria-selected={index === activeIndex}
              className={cn(
                "cursor-pointer rounded-sm px-3 py-2 text-sm",
                index === activeIndex
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-accent hover:text-accent-foreground",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0" onClick={() => handleSelect(result)}>
                  <div className="font-medium">{result.displayName.split(",")[0]}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {result.displayName.split(",").slice(1).join(",").trim()}
                  </div>
                </div>
                {showQuickActions && (onSetAsA || onSetAsB) && (
                  <div className="flex gap-1 flex-shrink-0">
                    {onSetAsA && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2 text-xs"
                        onClick={(e) => {
                          e.stopPropagation()
                          onSetAsA(result)
                          setIsOpen(false)
                        }}
                      >
                        <span className="text-green-600 font-bold">A</span>
                      </Button>
                    )}
                    {onSetAsB && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2 text-xs"
                        onClick={(e) => {
                          e.stopPropagation()
                          onSetAsB(result)
                          setIsOpen(false)
                        }}
                      >
                        <span className="text-red-600 font-bold">B</span>
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
