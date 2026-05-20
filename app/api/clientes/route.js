export const runtime = 'nodejs'
export const runtime = 'nodejs'
import { supabase } from '@/lib/supabase'
import { verifyToken } from '@/lib/auth'
import { NextResponse } from 'next/server'

export async function GET(req) {
  if (!verifyToken(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { data } = await supabase.from('clientes').select('*').order('id')
  return NextResponse.json(data)
}

export async function POST(req) {
  if (!verifyToken(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const body = await req.json()
  const { data } = await supabase.from('clientes').insert(body).select().single()
  return NextResponse.json(data)
}

