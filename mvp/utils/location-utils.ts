export const getCurrentLocation = (
  mapRef: any,
  onSuccess?: (lat: number, lng: number) => void,
  onError?: (error: string) => void,
) => {
  if (!navigator.geolocation) {
    const errorMsg = "Geolocation is not supported by your browser"
    console.error(errorMsg)
    if (onError) onError(errorMsg)
    return
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const { latitude, longitude } = position.coords
      console.log("[v0] Current location:", latitude, longitude)

      if (onSuccess) {
        onSuccess(latitude, longitude)
      }
    },
    (error) => {
      let errorMsg = "Unable to retrieve your location"
      switch (error.code) {
        case error.PERMISSION_DENIED:
          errorMsg = "Location permission denied"
          break
        case error.POSITION_UNAVAILABLE:
          errorMsg = "Location information unavailable"
          break
        case error.TIMEOUT:
          errorMsg = "Location request timed out"
          break
      }
      console.error("[v0] Geolocation error:", errorMsg)
      if (onError) onError(errorMsg)
    },
    {
      enableHighAccuracy: true,
      timeout: 5000,
      maximumAge: 0,
    },
  )
}
