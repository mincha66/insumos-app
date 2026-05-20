import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function GET() {
  const key = process.env.SUPABASE_SERVICE_KEY
  return NextResponse.json({ 
    serviceKey: key ? key.slice(-10) : 'MISSING'
  })
}
