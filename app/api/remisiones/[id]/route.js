import { createClient } from '@supabase/supabase-js'
import { verifyToken } from '@/lib/auth'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

function getDB() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
}

export async function PUT(req, context) {
  if (!verifyToken(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { id } = await context.params
  const { fecha, cliente_nombre, remitente_nombre, items } = await req.json()
  const db = getDB()
  await db.from('remision_items').delete().eq('remision_id', id)
  await db.from('remisiones').update({ fecha, cliente_nombre, remitente_nombre }).eq('id', id)
  if (items?.length) await db.from('remision_items').insert(items.map(i => ({ ...i, remision_id: Number(id) })))
  const { data } = await db.from('remisiones').select('*, remision_items(*)').eq('id', id).single()
  return NextResponse.json(data)
}

export async function DELETE(req, context) {
  if (!verifyToken(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { id } = await context.params
  const { error } = await getDB().from('remisiones').delete().eq('id', id)
  return NextResponse.json({ ok: !error, error: error?.message })
}
