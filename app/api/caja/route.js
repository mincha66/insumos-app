export const runtime = 'nodejs'
import { getSupabase } from '@/lib/supabase'
import { verifyToken } from '@/lib/auth'
import { NextResponse } from 'next/server'

export async function GET(req) {
  if (!verifyToken(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const caja = searchParams.get('caja')
  const query = supabase.from('caja_movimientos').select('*').order('id', { ascending: true })
  if (caja) query.eq('caja', caja)
  const { data } = await query
  return NextResponse.json(data)
}

export async function POST(req) {
  if (!verifyToken(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const body = await req.json()
  const { data } = await getSupabase().from('caja_movimientos').insert(body).select().single()
  return NextResponse.json(data)
}

