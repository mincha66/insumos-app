import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

export const runtime = 'nodejs'

export async function POST(req) {
  try {
    const { pdfBase64, cotizacionId, clienteNombre } = await req.json()
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
    })
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: 'minchitas@gmail.com,asesoriaenseguros023@gmail.com,bjosealejandro9@gmail.com',
      subject: `Cotización #${cotizacionId} — ${clienteNombre}`,
      text: `Se adjunta la cotización #${cotizacionId} para el cliente ${clienteNombre}.`,
      attachments: [{
        filename: `Cotizacion_${String(cotizacionId).padStart(3,'0')}_${clienteNombre.replace(/\s+/g,'_')}.pdf`,
        content: pdfBase64,
        encoding: 'base64'
      }]
    })
    return NextResponse.json({ ok: true })
  } catch(e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
