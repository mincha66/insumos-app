import { verifyToken } from '@/lib/auth'
import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

export const runtime = 'nodejs'

export async function POST(req) {
  if (!verifyToken(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  try {
    const { pdfBase64, remisionId, clienteNombre } = await req.json()
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
    })
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_RECIPIENTS,
      subject: `Remisión #${remisionId} — ${clienteNombre}`,
      text: `Se adjunta la remisión #${remisionId} para el cliente ${clienteNombre}.`,
      attachments: [{
        filename: `Remision_${String(remisionId).padStart(3,'0')}_${clienteNombre.replace(/\s+/g,'_')}.pdf`,
        content: pdfBase64,
        encoding: 'base64'
      }]
    })
    return NextResponse.json({ ok: true })
  } catch(e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
