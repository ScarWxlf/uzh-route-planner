import { type NextRequest, NextResponse } from "next/server"
import type { RouteStep } from "@/lib/types"
import type { GeoJSON } from "geojson"

const OSRM_BASE_URL = "https://router.project-osrm.org"
const ORS_BASE_URL = "https://api.openrouteservice.org"

export const dynamic = "force-dynamic"
export const revalidate = 0

interface NormalizedRouteResponse {
  provider: "osrm" | "ors"
  profile: "car" | "walk"
  geometry: GeoJSON.LineString
  distanceMeters: number
  durationSeconds: number
  steps?: RouteStep[]
  warnings?: string[]
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const profile = searchParams.get("profile") || "car"
  const start = searchParams.get("start")
  const end = searchParams.get("end")

  if (!start || !end) {
    return NextResponse.json({ error: "Start and end coordinates are required" }, { status: 400 })
  }

  const [startLat, startLon] = start.split(",").map(Number)
  const [endLat, endLon] = end.split(",").map(Number)

  if (isNaN(startLat) || isNaN(startLon) || isNaN(endLat) || isNaN(endLon)) {
    return NextResponse.json({ error: "Invalid coordinates format" }, { status: 400 })
  }

  try {
    if (profile === "walk") {
      const walkResult = await tryOSRMProfile("walking", startLat, startLon, endLat, endLon)
      if (walkResult) {
        return formatNormalizedResponse(walkResult, "osrm", "walk")
      }

      // Try OSRM foot as fallback
      const footResult = await tryOSRMProfile("foot", startLat, startLon, endLat, endLon)
      if (footResult) {
        return formatNormalizedResponse(footResult, "osrm", "walk")
      }

      // Try OpenRouteService if API key exists and is not disabled
      const orsKey = process.env.ORS_API_KEY
      if (orsKey && orsKey !== "DISABLED") {
        const orsResult = await tryORSWalking(orsKey, startLat, startLon, endLat, endLon)
        if (orsResult) {
          return formatNormalizedResponse(orsResult, "ors", "walk")
        }
      }

      const drivingFallback = await tryOSRMProfile("driving", startLat, startLon, endLat, endLon)
      if (drivingFallback) {
        return formatNormalizedResponse(drivingFallback, "osrm", "walk", [
          "Пішохідний профіль недоступний. Показано альтернативний маршрут.",
        ])
      }

      return NextResponse.json({ error: "No route found" }, { status: 404 })
    }

    const drivingResult = await tryOSRMProfile("driving", startLat, startLon, endLat, endLon)
    if (drivingResult) {
      return formatNormalizedResponse(drivingResult, "osrm", "car")
    }

    return NextResponse.json({ error: "No route found between these points" }, { status: 404 })
  } catch (error) {
    console.error("Routing proxy error:", error)
    return NextResponse.json({ error: "Failed to calculate route" }, { status: 500 })
  }
}

async function tryOSRMProfile(
  osrmProfile: string,
  startLat: number,
  startLon: number,
  endLat: number,
  endLon: number,
): Promise<any | null> {
  try {
    const osrmUrl = `${OSRM_BASE_URL}/route/v1/${osrmProfile}/${startLon},${startLat};${endLon},${endLat}?overview=full&geometries=geojson&steps=true`

    const response = await fetch(osrmUrl, {
      headers: { "User-Agent": "UzhRoutePlanner/1.0" },
      cache: "no-store",
    })

    if (!response.ok) return null

    const data = await response.json()
    if (data.code !== "Ok" || !data.routes?.[0]) return null

    return data.routes[0]
  } catch {
    return null
  }
}

async function tryORSWalking(
  apiKey: string,
  startLat: number,
  startLon: number,
  endLat: number,
  endLon: number,
): Promise<any | null> {
  try {
    const response = await fetch(`${ORS_BASE_URL}/v2/directions/foot-walking?api_key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        coordinates: [
          [startLon, startLat],
          [endLon, endLat],
        ],
        format: "geojson",
      }),
    })

    if (!response.ok) return null

    const data = await response.json()
    if (!data.features?.[0]) return null

    const feature = data.features[0]
    return {
      geometry: feature.geometry,
      distance: feature.properties.summary.distance,
      duration: feature.properties.summary.duration,
      legs: feature.properties.segments
        ? [
            {
              steps: feature.properties.segments[0].steps?.map((s: any) => ({
                maneuver: { instruction: s.instruction, type: s.type },
                name: s.name,
                distance: s.distance,
                duration: s.duration,
              })),
            },
          ]
        : [],
    }
  } catch {
    return null
  }
}

function formatNormalizedResponse(route: any, provider: "osrm" | "ors", profile: "car" | "walk", warnings?: string[]) {
  const steps: RouteStep[] = []

  if (route.legs) {
    for (const leg of route.legs) {
      if (leg.steps) {
        for (const step of leg.steps) {
          steps.push({
            instruction: step.maneuver?.instruction || formatManeuver(step.maneuver),
            distance: step.distance || 0,
            duration: step.duration || 0,
            name: step.name || "",
            maneuver: step.maneuver ? { type: step.maneuver.type, modifier: step.maneuver.modifier } : undefined,
          })
        }
      }
    }
  }

  const result: NormalizedRouteResponse = {
    provider,
    profile,
    geometry: route.geometry,
    distanceMeters: route.distance || 0,
    durationSeconds: route.duration || 0,
    steps,
  }

  if (warnings?.length) {
    result.warnings = warnings
  }

  // Also include legacy fields for backward compatibility
  return NextResponse.json(
  {
    ...result,
    distance: result.distanceMeters,
    duration: result.durationSeconds,
    fallback: !!warnings?.length,
  },
  {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    },
  },
)
}

function formatManeuver(maneuver: any): string {
  if (!maneuver) return "Продовжуйте"

  const type = maneuver.type || ""
  const modifier = maneuver.modifier || ""

  const translations: Record<string, string> = {
    "turn-left": "Поверніть ліворуч",
    "turn-right": "Поверніть праворуч",
    "turn-slight left": "Злегка ліворуч",
    "turn-slight right": "Злегка праворуч",
    "turn-sharp left": "Різко ліворуч",
    "turn-sharp right": "Різко праворуч",
    "continue-straight": "Продовжуйте прямо",
    "depart-": "Почніть рух",
    "arrive-": "Прибуття",
    "roundabout-": "Кільце",
    "rotary-": "Кільцевий рух",
  }

  const key = `${type}-${modifier}`
  return translations[key] || translations[`${type}-`] || "Продовжуйте"
}
