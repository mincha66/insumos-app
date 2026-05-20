import { createClient } from '@supabase/supabase-js'
import { verifyToken } from '@/lib/auth'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

function getDB() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
}

export async function GET(req) {
  if (!verifyToken(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { data } = await getDB().from('cotizaciones').select('*, cotizacion_items(*)').order('id', { ascending: false })
  return NextResponse.json(data)
}

export async function POST(req) {
  if (!verifyToken(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { items, ...rest } = await req.json()
  const db = getDB()
  const { data: cot } = await db.from('cotizaciones').insert(rest).select().single()
  if (items?.length) await db.from('cotizacion_items').insert(items.map(i => ({ ...i, cotizacion_id: cot.id })))
  const { data } = await db.from('cotizaciones').select('*, cotizacion_items(*)').eq('id', cot.id).single()
  return NextResponse.json(data)
}
