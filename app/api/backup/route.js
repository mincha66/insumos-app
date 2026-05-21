import { NextResponse } from 'next/server'
export const runtime = 'nodejs'
export async function POST(req) {
  const url = process.env.GOOGLE_SCRIPT_URL
  if (!url) return NextResponse.json({ ok: false })
  try {
    const data = await req.json()
    await fetch(url, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(data), redirect:'follow' })
    return NextResponse.json({ ok: true })
  } catch(e) { return NextResponse.json({ ok: false, error: e.message }) }
}
