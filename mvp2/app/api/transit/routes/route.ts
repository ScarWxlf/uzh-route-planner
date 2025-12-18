import { NextResponse } from "next/server"

export async function GET() {
  const transitEnabled = process.env.TRANSIT_ENABLED === "true"

  if (!transitEnabled) {
    return NextResponse.json({
      enabled: false,
      message: "Модуль транспорту вимкнений (потрібні GTFS/реальний API).",
      routes: [],
    })
  }

  // Placeholder for future GTFS implementation
  return NextResponse.json({
    enabled: true,
    routes: [],
  })
}
