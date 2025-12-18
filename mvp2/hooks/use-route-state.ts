"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import type { AppState, UIState, MapPoint, RouteProfile, SavedPlace, RecentRoute, POICategory } from "@/lib/types"
import { fetchRoute } from "@/lib/osrm"
import { getSavedPlaces, savePlaceToStorage, removeSavedPlace, getRecentRoutes, saveRecentRoute } from "@/lib/storage"
import { useToast } from "@/hooks/use-toast"

const initialUIState: UIState = {
  panelOpen: true,
  layer: "streets",
  followMe: false,
  activeTab: "route",
  showShareDialog: false,
  multiStopEnabled: false,
}

export function useRouteState() {
  const [start, setStartState] = useState<MapPoint | null>(null)
  const [end, setEndState] = useState<MapPoint | null>(null)
  const [profile, setProfileState] = useState<RouteProfile>("car")
  const [route, setRoute] = useState<AppState["route"]>(null)
  const [userLocation, setUserLocation] = useState<AppState["userLocation"]>(null)
  const [isLoadingRoute, setIsLoadingRoute] = useState(false)
  const [isLoadingLocation, setIsLoadingLocation] = useState(false)
  const [waypoints, setWaypoints] = useState<MapPoint[]>([])
  const [poiEnabled, setPoiEnabled] = useState(false)
  const [poiCategories, setPoiCategories] = useState<POICategory[]>([])

  const [uiState, setUIState] = useState<UIState>(initialUIState)
  const [savedPlaces, setSavedPlaces] = useState<SavedPlace[]>([])
  const [recentRoutes, setRecentRoutes] = useState<RecentRoute[]>([])
  const { toast } = useToast()
  const routeRequestRef = useRef(0)
  const dragDebounceRef = useRef<NodeJS.Timeout>()

  // Load saved data from localStorage on mount
  useEffect(() => {
    setSavedPlaces(getSavedPlaces())
    setRecentRoutes(getRecentRoutes())
  }, [])

  // Parse URL params on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const startParam = params.get("s") || params.get("a")
    const endParam = params.get("e") || params.get("b")
    const modeParam = params.get("m") as RouteProfile | null

    if (startParam && endParam) {
      const [startLat, startLon] = startParam.split(",").map(Number)
      const [endLat, endLon] = endParam.split(",").map(Number)

      if (!isNaN(startLat) && !isNaN(startLon) && !isNaN(endLat) && !isNaN(endLon)) {
        setStartState({ lat: startLat, lon: startLon })
        setEndState({ lat: endLat, lon: endLon })
        if (modeParam === "walk") setProfileState("walk")
      }
    }
  }, [])

  // Fetch route when start/end/profile changes
  useEffect(() => {
    if (!start || !end) {
      setRoute(null)
      return
    }

    const requestId = ++routeRequestRef.current

    const getRoute = async () => {
      setIsLoadingRoute(true)

      const routeData = await fetchRoute(start.lat, start.lon, end.lat, end.lon, profile)

      // Only update if this is still the latest request
      if (requestId !== routeRequestRef.current) return

      if (routeData) {
        setRoute(routeData)
        setIsLoadingRoute(false)

        if (routeData.warnings?.length) {
          toast({
            title: "Увага",
            description: routeData.warnings[0],
            variant: "default",
          })
        }

        // Save to recent routes
        const recentRoute: RecentRoute = {
          id: `${Date.now()}`,
          start,
          end,
          profile,
          distance: routeData.distance,
          duration: routeData.duration,
          createdAt: Date.now(),
        }
        saveRecentRoute(recentRoute)
        setRecentRoutes(getRecentRoutes())
      } else {
        setIsLoadingRoute(false)
        toast({
          title: "Помилка маршруту",
          description: "Не вдалося розрахувати маршрут",
          variant: "destructive",
        })
      }
    }

    getRoute()
  }, [start, end, profile, toast])

  const setStart = useCallback((point: MapPoint | null) => {
    setStartState(point)
  }, [])

  const setEnd = useCallback((point: MapPoint | null) => {
    setEndState(point)
  }, [])

  const setProfile = useCallback((newProfile: RouteProfile) => {
    setProfileState(newProfile)
  }, [])

  const reversePoints = useCallback(() => {
    setStartState((prevStart) => {
      setEndState(prevStart)
      return end
    })
  }, [end])

  const clearRoute = useCallback(() => {
    setStartState(null)
    setEndState(null)
    setRoute(null)
    setWaypoints([])
    // Clear URL params
    window.history.replaceState({}, "", window.location.pathname)
  }, [])

  const locateUser = useCallback(() => {
    if (!navigator.geolocation) {
      toast({
        title: "Геолокація недоступна",
        description: "Ваш браузер не підтримує геолокацію",
        variant: "destructive",
      })
      return
    }

    setIsLoadingLocation(true)

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        setUserLocation({ lat: latitude, lon: longitude })
        setIsLoadingLocation(false)
        toast({
          title: "Місцезнаходження знайдено",
          description: "Ваше місцезнаходження визначено",
        })
      },
      (error) => {
        setIsLoadingLocation(false)
        let message = "Не вдалося визначити місцезнаходження"
        if (error.code === error.PERMISSION_DENIED) {
          message = "Доступ до геолокації заборонено"
        }
        toast({
          title: "Помилка геолокації",
          description: message,
          variant: "destructive",
        })
      },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }, [toast])

  const setUserLocationAsStart = useCallback(() => {
    if (userLocation) {
      setStart({ ...userLocation, label: "Моє місцезнаходження" })
    }
  }, [userLocation, setStart])

  const savePlace = useCallback(
    (point: MapPoint, name: string) => {
      const place: SavedPlace = {
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        name,
        lat: point.lat,
        lon: point.lon,
        createdAt: Date.now(),
      }
      savePlaceToStorage(place)
      setSavedPlaces(getSavedPlaces())
      toast({
        title: "Місце збережено",
        description: name,
      })
    },
    [toast],
  )

  const deletePlace = useCallback((id: string) => {
    removeSavedPlace(id)
    setSavedPlaces(getSavedPlaces())
  }, [])

  const restoreRoute = useCallback((routeData: RecentRoute) => {
    setStartState(routeData.start)
    setEndState(routeData.end)
    setProfileState(routeData.profile)
  }, [])

  const getShareUrl = useCallback(() => {
    if (!start || !end) return null

    const params = new URLSearchParams()
    params.set("a", `${start.lat},${start.lon}`)
    params.set("b", `${end.lat},${end.lon}`)
    params.set("m", profile)

    return `${window.location.origin}${window.location.pathname}?${params.toString()}`
  }, [start, end, profile])

  const copyShareUrl = useCallback(async () => {
    const url = getShareUrl()
    if (!url) {
      toast({
        title: "Помилка",
        description: "Спочатку створіть маршрут",
        variant: "destructive",
      })
      return
    }

    try {
      await navigator.clipboard.writeText(url)
      // Update URL in browser
      window.history.replaceState({}, "", url)
      toast({
        title: "Посилання скопійовано",
        description: "Посилання на маршрут скопійовано в буфер обміну",
      })
    } catch {
      toast({
        title: "Помилка",
        description: "Не вдалося скопіювати посилання",
        variant: "destructive",
      })
    }
  }, [getShareUrl, toast])

  const setStartDebounced = useCallback((lat: number, lon: number, label?: string) => {
    if (dragDebounceRef.current) {
      clearTimeout(dragDebounceRef.current)
    }
    dragDebounceRef.current = setTimeout(() => {
      setStartState({ lat, lon, label })
    }, 150)
  }, [])

  const setEndDebounced = useCallback((lat: number, lon: number, label?: string) => {
    if (dragDebounceRef.current) {
      clearTimeout(dragDebounceRef.current)
    }
    dragDebounceRef.current = setTimeout(() => {
      setEndState({ lat, lon, label })
    }, 150)
  }, [])

  const setLayer = useCallback((layer: UIState["layer"]) => {
    setUIState((prev) => ({ ...prev, layer }))
  }, [])

  const togglePanel = useCallback(() => {
    setUIState((prev) => ({ ...prev, panelOpen: !prev.panelOpen }))
  }, [])

  const setActiveTab = useCallback((tab: UIState["activeTab"]) => {
    setUIState((prev) => ({ ...prev, activeTab: tab }))
  }, [])

  const toggleFollowMe = useCallback(() => {
    setUIState((prev) => ({ ...prev, followMe: !prev.followMe }))
  }, [])

  const toggleShareDialog = useCallback((open?: boolean) => {
    setUIState((prev) => ({ ...prev, showShareDialog: open ?? !prev.showShareDialog }))
  }, [])

  const toggleMultiStop = useCallback(() => {
    setUIState((prev) => ({ ...prev, multiStopEnabled: !prev.multiStopEnabled }))
  }, [])

  const addWaypoint = useCallback((point: MapPoint) => {
    setWaypoints((prev) => [...prev, point])
  }, [])

  const removeWaypoint = useCallback((index: number) => {
    setWaypoints((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const togglePoi = useCallback((enabled?: boolean) => {
    setPoiEnabled((prev) => enabled ?? !prev)
  }, [])

  const togglePoiCategory = useCallback((category: POICategory) => {
    setPoiCategories((prev) => (prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]))
  }, [])

  const appState: AppState = {
    start,
    end,
    profile,
    route,
    userLocation,
    isLoadingRoute,
    isLoadingLocation,
  }

  return {
    appState,
    uiState,
    savedPlaces,
    recentRoutes,
    waypoints,
    poiEnabled,
    poiCategories,
    actions: {
      setStart,
      setEnd,
      setProfile,
      reversePoints,
      clearRoute,
      locateUser,
      setUserLocationAsStart,
      savePlace,
      deletePlace,
      restoreRoute,
      copyShareUrl,
      getShareUrl,
      setStartDebounced,
      setEndDebounced,
      setLayer,
      togglePanel,
      setActiveTab,
      toggleFollowMe,
      toggleShareDialog,
      toggleMultiStop,
      addWaypoint,
      removeWaypoint,
      togglePoi,
      togglePoiCategory,
    },
  }
}
