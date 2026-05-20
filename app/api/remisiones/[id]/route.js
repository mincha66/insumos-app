import { getSupabase } from '@/lib/supabase'
import { verifyToken } from '@/lib/auth'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function PUT(req, { params }) {
  if (!verifyToken(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { fecha, cliente_nombre, remitente_nombre, items } = await req.json()
  await getSupabase().from('remision_items').delete().eq('remision_id', params.id)
  await getSupabase().from('remisiones').update({ fecha, cliente_nombre, remitente_nombre }).eq('id', params.id)
  if (items?.length) await getSupabase().from('remision_items').insert(items.map(i => ({ ...i, remision_id: Number(params.id) })))
  const { data } = await getSupabase().from('remisiones').select('*, remision_items(*)').eq('id', params.id).single()
  return NextResponse.json(data)
}

export async function DELETE(req, { params }) {
  if (!verifyToken(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  await getSupabase().from('remisiones').delete().eq('id', params.id)
  return NextResponse.json({ ok: true })
}
