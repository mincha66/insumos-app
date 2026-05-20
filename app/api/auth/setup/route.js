import { getSupabase } from '@/lib/supabase'
import bcrypt from 'bcryptjs'
import { NextResponse } from 'next/server'

export async function GET() {
  const hash = await bcrypt.hash('admin123', 10)
  await getSupabase().from('usuarios').upsert({ username: 'admin', password_hash: hash })
  return NextResponse.json({ ok: true, mensaje: 'Usuario admin creado' })
}
