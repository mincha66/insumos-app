import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
    const hash = await bcrypt.hash('admin123', 10)
    const { error } = await supabase.from('usuarios').upsert({ username: 'admin', password_hash: hash })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, mensaje: 'Usuario admin creado' })
  } catch(e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
