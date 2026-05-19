import { supabase } from '@/lib/supabase'
import { verifyToken } from '@/lib/auth'
import { NextResponse } from 'next/server'

export async function GET(req) {
  if (!verifyToken(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { data } = await supabase.from('facturas').select('*, factura_items(*)').order('id', { ascending: false })
  return NextResponse.json(data)
}

export async function POST(req) {
  if (!verifyToken(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { fecha, cliente_nombre, numero, total, items } = await req.json()
  const { data: factura } = await supabase.from('facturas').insert({ fecha, cliente_nombre, numero, total }).select().single()
  if (items?.length) {
    await supabase.from('factura_items').insert(items.map(i => ({ ...i, factura_id: factura.id })))
  }
  const { data } = await supabase.from('facturas').select('*, factura_items(*)').eq('id', factura.id).single()
  return NextResponse.json(data)
}
