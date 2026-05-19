import { supabase } from '@/lib/supabase'
import { verifyToken } from '@/lib/auth'
import { NextResponse } from 'next/server'

export async function DELETE(req, { params }) {
  if (!verifyToken(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  await supabase.from('remisiones').delete().eq('id', params.id)
  return NextResponse.json({ ok: true })
}
