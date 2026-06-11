import { verifyToken } from '@/lib/auth'
import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
export const runtime = 'nodejs'
export async function POST(req) {
  if (!verifyToken(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { factura, pdfBase64 } = await req.json()
  const transporter = nodemailer.createTransport({ service: 'gmail', auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS } })
  const html = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto"><div style="background:#1a56db;color:#fff;padding:20px 24px;border-radius:8px 8px 0 0"><h2 style="margin:0">Factura ${factura.numero}</h2><p style="margin:4px 0 0;opacity:0.85">Fecha: ${factura.fecha}</p></div><div style="background:#f9fafb;padding:20px 24px;border:1px solid #e5e7eb"><p><b>Cliente:</b> ${factura.cliente_nombre} — NIT: ${factura.cliente_nit||'—'}</p><p><b>Remitente:</b> ${factura.remitente_nombre||'—'}</p><p><b>Concepto:</b> ${factura.concepto||'—'}</p><hr style="border:none;border-top:1px solid #e5e7eb;margin:12px 0"/><p><b>Total:</b> $${Number(factura.total||0).toLocaleString('es-CO')}</p><p><b>Retención (${factura.retencion_porcentaje||0}%):</b> $${Number(factura.retencion_valor||0).toLocaleString('es-CO')}</p><p style="font-size:16px"><b>A Pagar:</b> $${Number(factura.valor_a_pagar||0).toLocaleString('es-CO')}</p></div></div>`
  await transporter.sendMail({
    from: `"Insumos App" <${process.env.EMAIL_USER}>`,
    to: process.env.EMAIL_RECIPIENTS,
    subject: `Factura ${factura.numero} — ${factura.cliente_nombre}`,
    html,
    attachments: [{ filename: `Factura_${factura.numero}.pdf`, content: pdfBase64, encoding: 'base64', contentType: 'application/pdf' }]
  })
  return NextResponse.json({ ok: true })
}
