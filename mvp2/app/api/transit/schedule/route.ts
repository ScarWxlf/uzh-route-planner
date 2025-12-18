import { NextResponse } from "next/server"

export async function GET() {
  const transitEnabled = process.env.TRANSIT_ENABLED === "true"

  if (!transitEnabled) {
    return NextResponse.json({
      enabled: false,
      schedule: [],
    })
  }

  return NextResponse.json({
    enabled: true,
    schedule: [],
  })
}
