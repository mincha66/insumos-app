import { createClient } from '@supabase/supabase-js'
import { verifyToken } from '@/lib/auth'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

function getDB() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
}

export async function GET(req, context) {
  if (!verifyToken(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { id } = await context.params
  const { data } = await getDB().from('cotizaciones').select('*, cotizacion_items(*)').eq('id', id).single()
  return NextResponse.json(data)
}

export async function PUT(req, context) {
  if (!verifyToken(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { id } = await context.params
  const { items, ...rest } = await req.json()
  const db = getDB()
  await db.from('cotizacion_items').delete().eq('cotizacion_id', id)
  await db.from('cotizaciones').update(rest).eq('id', id)
  if (items?.length) await db.from('cotizacion_items').insert(items.map(i => ({ ...i, cotizacion_id: Number(id) })))
  const { data } = await db.from('cotizaciones').select('*, cotizacion_items(*)').eq('id', id).single()
  return NextResponse.json(data)
}

export async function DELETE(req, context) {
  if (!verifyToken(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { id } = await context.params
  const { error } = await getDB().from('cotizaciones').delete().eq('id', id)
  return NextResponse.json({ ok: !error, error: error?.message })
}
