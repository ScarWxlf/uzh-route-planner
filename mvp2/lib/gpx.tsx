import type { RouteData, MapPoint } from "./types"

export function generateGPX(route: RouteData, start: MapPoint | null, end: MapPoint | null): string {
  const coordinates = route.geometry?.coordinates || []

  const now = new Date().toISOString()
  const startName = start?.label || "Початок"
  const endName = end?.label || "Кінець"

  let gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="UzhRoutePlanner" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>Маршрут: ${startName} → ${endName}</name>
    <time>${now}</time>
  </metadata>
  <trk>
    <name>Маршрут</name>
    <trkseg>
`

  for (const coord of coordinates) {
    gpx += `      <trkpt lat="${coord[1]}" lon="${coord[0]}"></trkpt>\n`
  }

  gpx += `    </trkseg>
  </trk>
</gpx>`

  return gpx
}

export function downloadGPX(gpxContent: string, filename = "route.gpx") {
  const blob = new Blob([gpxContent], { type: "application/gpx+xml" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
