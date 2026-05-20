import { createClient } from '@supabase/supabase-js'
import { verifyToken } from '@/lib/auth'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

function getDB() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
}

export async function GET(req) {
  if (!verifyToken(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { data } = await getDB().from('remisiones').select('*, remision_items(*)').order('id', { ascending: false })
  return NextResponse.json(data)
}

export async function POST(req) {
  if (!verifyToken(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { fecha, cliente_nombre, remitente_nombre, items } = await req.json()
  const db = getDB()
  const { data: remision } = await db.from('remisiones').insert({ fecha, cliente_nombre, remitente_nombre }).select().single()
  if (items?.length) await db.from('remision_items').insert(items.map(i => ({ ...i, remision_id: remision.id })))
  const { data } = await db.from('remisiones').select('*, remision_items(*)').eq('id', remision.id).single()
  return NextResponse.json(data)
}
