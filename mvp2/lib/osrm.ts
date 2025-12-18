import type { RouteData, RouteProfile } from "./types"

export async function fetchRoute(
  startLat: number,
  startLon: number,
  endLat: number,
  endLon: number,
  profile: RouteProfile,
): Promise<RouteData | null> {
  try {
    const response = await fetch(
      `/api/route?profile=${profile}&start=${startLat},${startLon}&end=${endLat},${endLon}`,
      { cache: "no-store" },
    )


    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || "Routing failed")
    }

    return await response.json()
  } catch (error) {
    console.error("Routing error:", error)
    return null
  }
}
