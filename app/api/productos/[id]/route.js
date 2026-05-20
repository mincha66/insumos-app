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
  const body = await req.json()
  const { data } = await getDB().from('productos').update(body).eq('id', id).select().single()
  return NextResponse.json(data)
}

export async function DELETE(req, context) {
  if (!verifyToken(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { id } = await context.params
  const { error } = await getDB().from('productos').delete().eq('id', id)
  return NextResponse.json({ ok: !error, error: error?.message })
}
