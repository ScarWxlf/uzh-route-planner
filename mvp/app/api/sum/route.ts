import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const payload = await request.json()
    const a = payload?.a
    const b = payload?.b
    if (typeof a !== 'number' || typeof b !== 'number') {
      return NextResponse.json({ ok: false, error: 'Fields `a` and `b` must be numbers' }, { status: 400 })
    }
    return NextResponse.json({ ok: true, a, b, sum: a + b })
  } catch (err) {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 })
  }
}
