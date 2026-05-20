import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_KEY
  return NextResponse.json({ 
    url: url ? 'ok' : 'missing',
    serviceKey: key ? key.slice(-10) : 'MISSING'
  })
}
