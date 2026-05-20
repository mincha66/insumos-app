import { supabase } from '@/lib/supabase'
import { verifyToken } from '@/lib/auth'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function PUT(req, { params }) {
  if (!verifyToken(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const body = await req.json()
  const { data } = await supabase.from('clientes').update(body).eq('id', params.id).select().single()
  return NextResponse.json(data)
}

export async function DELETE(req, { params }) {
  if (!verifyToken(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  await supabase.from('clientes').delete().eq('id', params.id)
  return NextResponse.json({ ok: true })
}
