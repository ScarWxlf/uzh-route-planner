"use client"

import dynamic from "next/dynamic"
import { useRouteState } from "@/hooks/use-route-state"
import { useIsMobile } from "@/hooks/use-mobile"
import { SearchPanel } from "./search-panel"
import { FloatingControls } from "@/components/controls/floating-controls"
import { RoutePanel } from "@/components/panel/route-panel"
import { ShareDialog } from "@/components/share/share-dialog"
import type { GeocodingResult, MapPoint } from "@/lib/types"
import { useCallback, useRef } from "react"

// Dynamic import for Leaflet to avoid SSR issues
const MapView = dynamic(() => import("./map-view"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-muted">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  ),
})

export function MapShell() {
  const { appState, uiState, savedPlaces, recentRoutes, waypoints, poiEnabled, poiCategories, actions } =
    useRouteState()
  const isMobile = useIsMobile()
  const clickCountRef = useRef(0)

  // Handle search result selection
  const handleStartSelect = useCallback(
    (result: GeocodingResult) => {
      actions.setStart({
        lat: result.lat,
        lon: result.lon,
        label: result.displayName.split(",")[0],
        placeId: result.placeId,
      })
    },
    [actions],
  )

  const handleEndSelect = useCallback(
    (result: GeocodingResult) => {
      actions.setEnd({
        lat: result.lat,
        lon: result.lon,
        label: result.displayName.split(",")[0],
        placeId: result.placeId,
      })
    },
    [actions],
  )

  // Handle map click
  const handleMapClick = useCallback(
    (lat: number, lon: number) => {
      const point: MapPoint = { lat, lon }

      if (!appState.start) {
        // First click: set start
        actions.setStart(point)
        clickCountRef.current = 1
      } else if (!appState.end) {
        // Second click: set end
        actions.setEnd(point)
        clickCountRef.current = 2
      } else {
        // Third+ click: replace end (or alternate)
        actions.setEnd(point)
      }
    },
    [appState.start, appState.end, actions],
  )

  const handleStartDrag = useCallback(
    (lat: number, lon: number) => {
      actions.setStartDebounced(lat, lon, appState.start?.label)
    },
    [actions, appState.start?.label],
  )

  const handleEndDrag = useCallback(
    (lat: number, lon: number) => {
      actions.setEndDebounced(lat, lon, appState.end?.label)
    },
    [actions, appState.end?.label],
  )

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      {/* Map */}
      <MapView
        start={appState.start}
        end={appState.end}
        route={appState.route}
        profile={appState.profile}
        userLocation={appState.userLocation}
        layer={uiState.layer}
        followMe={uiState.followMe}
        onMapClick={handleMapClick}
        onStartDrag={handleStartDrag}
        onEndDrag={handleEndDrag}
        poiEnabled={poiEnabled}
        poiCategories={poiCategories}
      />

      {/* Search panel */}
      <SearchPanel
        start={appState.start}
        end={appState.end}
        profile={appState.profile}
        route={appState.route}
        isLoading={appState.isLoadingRoute}
        onStartSelect={handleStartSelect}
        onEndSelect={handleEndSelect}
        onStartClear={() => actions.setStart(null)}
        onEndClear={() => actions.setEnd(null)}
        onProfileChange={actions.setProfile}
      />

      {/* Floating controls */}
      <FloatingControls
        layer={uiState.layer}
        onLayerChange={actions.setLayer}
        onLocate={actions.locateUser}
        onClear={actions.clearRoute}
        isLoadingLocation={appState.isLoadingLocation}
        hasRoute={!!(appState.start || appState.end)}
        poiEnabled={poiEnabled}
        poiCategories={poiCategories}
        onTogglePoi={actions.togglePoi}
        onTogglePoiCategory={actions.togglePoiCategory}
      />

      {/* Route panel */}
      <RoutePanel
        route={appState.route}
        start={appState.start}
        end={appState.end}
        isLoading={appState.isLoadingRoute}
        savedPlaces={savedPlaces}
        recentRoutes={recentRoutes}
        activeTab={uiState.activeTab}
        panelOpen={uiState.panelOpen}
        isMobile={isMobile}
        onReversePoints={actions.reversePoints}
        onClearRoute={actions.clearRoute}
        onShare={() => actions.toggleShareDialog(true)}
        onSavePlace={actions.savePlace}
        onDeletePlace={actions.deletePlace}
        onRestoreRoute={actions.restoreRoute}
        onSetStart={actions.setStart}
        onSetEnd={actions.setEnd}
        onActiveTabChange={actions.setActiveTab}
        onTogglePanel={actions.togglePanel}
      />

      <ShareDialog
        open={uiState.showShareDialog}
        onOpenChange={actions.toggleShareDialog}
        shareUrl={actions.getShareUrl()}
        route={appState.route}
        start={appState.start}
        end={appState.end}
      />
    </div>
  )
}
