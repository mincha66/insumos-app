import { createClient } from '@supabase/supabase-js'
import { verifyToken } from '@/lib/auth'
import { NextResponse } from 'next/server'
export const runtime = 'nodejs'
function getDB() { return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY) }
export async function GET(req, context) {
  if (!verifyToken(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { id } = await context.params
  const { data } = await getDB().from('facturas').select('*, factura_items(*)').eq('id', id).single()
  return NextResponse.json(data)
}
export async function PUT(req, context) {
  if (!verifyToken(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { id } = await context.params
  const { items, ...campos } = await req.json()
  const db = getDB()
  await db.from('facturas').update(campos).eq('id', id)
  if (items?.length) {
    await db.from('factura_items').delete().eq('factura_id', id)
    await db.from('factura_items').insert(items.map(i => ({ ...i, factura_id: Number(id) })))
  }
  const { data } = await db.from('facturas').select('*, factura_items(*)').eq('id', id).single()
  return NextResponse.json(data)
}
export async function DELETE(req, context) {
  if (!verifyToken(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { id } = await context.params
  const db = getDB()
  await db.from('factura_items').delete().eq('factura_id', id)
  await db.from('facturas').delete().eq('id', id)
  return NextResponse.json({ ok: true })
}
