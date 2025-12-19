import { type NextRequest, NextResponse } from "next/server"
import { UZHHOROD_VIEWBOX } from "@/lib/uzhhorod"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get("q")

  if (!query) {
    return NextResponse.json({ error: 'Query parameter "q" is required' }, { status: 400 })
  }

  try {
    const nominatimUrl = new URL("https://nominatim.openstreetmap.org/search")
    nominatimUrl.searchParams.set("q", query)
    nominatimUrl.searchParams.set("format", "jsonv2")
    nominatimUrl.searchParams.set("limit", "5")
    nominatimUrl.searchParams.set("addressdetails", "1")
    nominatimUrl.searchParams.set("bounded", "1")
    nominatimUrl.searchParams.set("viewbox", UZHHOROD_VIEWBOX)
    nominatimUrl.searchParams.set("accept-language", "uk,en")

    const response = await fetch(nominatimUrl.toString(), {
      headers: {
        "User-Agent": "UzhRoutePlanner/1.0",
      },
    })

    if (!response.ok) {
      throw new Error(`Nominatim API error: ${response.status}`)
    }

    const data = await response.json()

    // Normalize results
    const results = data.map((item: any) => ({
      placeId: item.place_id?.toString() || "",
      displayName: item.display_name || "",
      lat: Number.parseFloat(item.lat),
      lon: Number.parseFloat(item.lon),
      type: item.type || "",
      address: item.address
        ? {
            road: item.address.road,
            city: item.address.city || item.address.town || item.address.village,
            county: item.address.county,
            state: item.address.state,
            country: item.address.country,
          }
        : undefined,
    }))

    return NextResponse.json(results)
  } catch (error) {
    console.error("Geocoding proxy error:", error)
    return NextResponse.json({ error: "Failed to geocode location" }, { status: 500 })
  }
}
