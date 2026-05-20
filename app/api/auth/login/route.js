import { getSupabase } from '@/lib/supabase'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST(req) {
  try {
    const { username, password } = await req.json()
    const { data: user, error } = await supabase
      .from('usuarios').select('*').eq('username', username).single()
    if (error || !user) return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 })
    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 })
    const token = jwt.sign({ id: user.id, username }, process.env.JWT_SECRET, { expiresIn: '7d' })
    return NextResponse.json({ token })
  } catch(e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
