import { type NextRequest, NextResponse } from "next/server"
import { UZHHOROD_VIEWBOX } from "@/lib/uzhhorod"
import type { POI, POICategory } from "@/lib/types"

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"

// Category search queries for Nominatim
const CATEGORY_QUERIES: Record<POICategory, string> = {
  cafe: "cafe",
  restaurant: "restaurant",
  shop: "supermarket",
  pharmacy: "pharmacy",
  bank: "bank",
  hotel: "hotel",
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const category = searchParams.get("category") as POICategory | null
  const limit = Number.parseInt(searchParams.get("limit") || "50", 10)

  if (!category || !CATEGORY_QUERIES[category]) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 })
  }

  try {
    const query = CATEGORY_QUERIES[category]

    const url = new URL(NOMINATIM_URL)
    url.searchParams.set("q", query)
    url.searchParams.set("format", "jsonv2")
    url.searchParams.set("limit", String(Math.min(limit, 50)))
    url.searchParams.set("bounded", "1")
    url.searchParams.set("viewbox", UZHHOROD_VIEWBOX)
    url.searchParams.set("addressdetails", "1")
    url.searchParams.set("namedetails", "1")
    url.searchParams.set("extratags", "1")
    url.searchParams.set("accept-language", "uk")

    const response = await fetch(url.toString(), {
      headers: {
        "User-Agent": "UzhRoutePlanner/1.0 (https://github.com/uzhhorod-route-planner)",
      },
    })

    if (!response.ok) {
      throw new Error(`Nominatim error: ${response.status}`)
    }

    const data = await response.json()

    const pois: POI[] = data
      .filter((place: any) => place.lat && place.lon)
      .map((place: any) => ({
        id: String(place.place_id),
        name: place.namedetails?.name || place.display_name?.split(",")[0] || "Без назви",
        lat: Number(place.lat),
        lon: Number(place.lon),
        type: place.type || category,
        category,
        address: place.address
          ? [place.address.road, place.address.house_number].filter(Boolean).join(" ") || undefined
          : undefined,
        displayName: place.display_name,
      }))

    return NextResponse.json(pois)
  } catch (error) {
    console.error("POI fetch error:", error)
    return NextResponse.json({ error: "Не вдалося завантажити POI (Nominatim). Спробуйте пізніше." }, { status: 500 })
  }
}
