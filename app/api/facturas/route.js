import { createClient } from '@supabase/supabase-js'
import { verifyToken } from '@/lib/auth'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

function getDB() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
}

export async function GET(req) {
  if (!verifyToken(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { data } = await getDB().from('facturas').select('*, factura_items(*)').order('id', { ascending: false })
  return NextResponse.json(data)
}

export async function POST(req) {
  if (!verifyToken(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { fecha, cliente_nombre, numero, total, items } = await req.json()
  const db = getDB()
  const { data: factura } = await db.from('facturas').insert({ fecha, cliente_nombre, numero, total }).select().single()
  if (items?.length) await db.from('factura_items').insert(items.map(i => ({ ...i, factura_id: factura.id })))
  const { data } = await db.from('facturas').select('*, factura_items(*)').eq('id', factura.id).single()
  return NextResponse.json(data)
}
