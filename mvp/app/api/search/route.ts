import { NextResponse } from 'next/server'

// GET /api/search?q=place+name&limit=5
export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const q = url.searchParams.get('q')
    const limit = url.searchParams.get('limit') || '5'

    if (!q) {
      return NextResponse.json({ ok: false, error: 'Missing query parameter `q`' }, { status: 400 })
    }

    // Restrict search to Uzhhorod (example bounding box)
    const viewbox = '22.2,48.6,22.4,48.7'
    const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      q + ', Uzhhorod, Ukraine',
    )}&limit=${encodeURIComponent(limit)}&bounded=1&viewbox=${viewbox}`

    const res = await fetch(nominatimUrl, {
      headers: { 'User-Agent': 'uzh-route-planner-test/1.0 (your-email@example.com)' },
    })
    const data = await res.json()

    return NextResponse.json({ ok: true, results: data })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
