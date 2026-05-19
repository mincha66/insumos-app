import { supabase } from '@/lib/supabase'
import { verifyToken } from '@/lib/auth'
import { NextResponse } from 'next/server'

export async function GET(req) {
  if (!verifyToken(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { data } = await supabase.from('remisiones').select('*, remision_items(*)').order('id', { ascending: false })
  return NextResponse.json(data)
}

export async function POST(req) {
  if (!verifyToken(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { fecha, cliente_nombre, remitente_nombre, items } = await req.json()
  const { data: remision } = await supabase.from('remisiones').insert({ fecha, cliente_nombre, remitente_nombre }).select().single()
  if (items?.length) {
    await supabase.from('remision_items').insert(items.map(i => ({ ...i, remision_id: remision.id })))
  }
  const { data } = await supabase.from('remisiones').select('*, remision_items(*)').eq('id', remision.id).single()
  return NextResponse.json(data)
}
