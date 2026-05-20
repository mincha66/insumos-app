export const runtime = 'nodejs'
import { getSupabase } from '@/lib/supabase'
import { verifyToken } from '@/lib/auth'
import { NextResponse } from 'next/server'


export async function GET(req) {
  if (!verifyToken(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { data } = await getSupabase().from('productos').select('*').order('nombre')
  return NextResponse.json(data)
}

export async function POST(req) {
  if (!verifyToken(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const body = await req.json()
  if (Array.isArray(body)) {
    const { data } = await getSupabase().from('productos').insert(body).select()
    return NextResponse.json(data)
  }
  const { data } = await getSupabase().from('productos').insert(body).select().single()
  return NextResponse.json(data)
}

