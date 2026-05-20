import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  )
  const { data: antes } = await supabase.from('productos').select('*')
  const { error } = await supabase.from('productos').delete().neq('id', 0)
  const { data: despues } = await supabase.from('productos').select('*')
  return NextResponse.json({ 
    antes: antes?.length,
    despues: despues?.length,
    error: error?.message || null
  })
}
