import { NextResponse } from 'next/server'

// POST /api/route
// Body: { points: [{ lat:number, lng:number }, ...], mode: 'driving'|'walking' }
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const points = body?.points
    const mode = body?.mode || 'driving'

    if (!Array.isArray(points) || points.length < 2) {
      return NextResponse.json({ ok: false, error: '`points` must be an array with 2+ items' }, { status: 400 })
    }

    const profile = mode === 'walking' || mode === 'foot' ? 'foot' : 'car'

    // Build coords string lng,lat;lng,lat;...
    const coords = points
      .map((p: any) => {
        const lat = Number(p.lat)
        const lng = Number(p.lng)
        if (Number.isNaN(lat) || Number.isNaN(lng)) throw new Error('Invalid point coordinates')
        return `${lng},${lat}`
      })
      .join(';')

    const osrmUrl = `https://router.project-osrm.org/route/v1/${profile}/${coords}?overview=full&geometries=geojson`

    const res = await fetch(osrmUrl)
    const data = await res.json()

    if (!data.routes || !data.routes[0]) {
      return NextResponse.json({ ok: false, error: 'No route returned by OSRM', data }, { status: 500 })
    }

    const route = data.routes[0]
    return NextResponse.json({ ok: true, distance: route.distance, duration: route.duration, geometry: route.geometry })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 400 })
  }
}
