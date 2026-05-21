'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'

export default function Dashboard() {
  const router = useRouter()
  const [page, setPage] = useState('dashboard')
  const [token, setToken] = useState('')
  const [productos, setProductos] = useState([])
  const [clientes, setClientes] = useState([])
  const [remitentes, setRemitentes] = useState([])
  const [remisiones, setRemisiones] = useState([])
  const [facturas, setFacturas] = useState([])
  const [cotizaciones, setCotizaciones] = useState([])
  const [cajaMovs, setCajaMovs] = useState([])
  const [currentCaja, setCurrentCaja] = useState('Alejandro')
  const [cajaSortDesc, setCajaSortDesc] = useState(true)
  const [modal, setModal] = useState(null)
  const [editObj, setEditObj] = useState(null)
  const [remItems, setRemItems] = useState({})
  const [facItems, setFacItems] = useState([])
  const [facRetencion, setFacRetencion] = useState(3)
  const [facConcepto, setFacConcepto] = useState('')
  const [facFormato, setFacFormato] = useState(1)
  const [facRemitente, setFacRemitente] = useState(null)
  const [remSearch, setRemSearch] = useState('')
  const [cotItems, setCotItems] = useState([])
  const [form, setForm] = useState({})
  const [loading, setLoading] = useState(false)
  const [pdfPreview, setPdfPreview] = useState(null)
  const [sendingEmail, setSendingEmail] = useState(false)
  const fileRef = useRef()
  const cajaFileRef = useRef()
  const plantillaRef = useRef()
  const cotItemsRef = useRef([])

  useEffect(() => { const t = localStorage.getItem('token'); if (!t) { router.push('/login'); return }; setToken(t) }, [router])

  const api = useCallback(async (url, method = 'GET', body = null) => {
    const t = localStorage.getItem('token')
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + t }, body: body ? JSON.stringify(body) : null })
    if (res.status === 401) { router.push('/login'); return null }
    return res.json()
  }, [router])

  const loadAll = useCallback(async () => {
    const [p, c, r, rem, fac, cot] = await Promise.all([
      api('/api/productos'), api('/api/clientes'), api('/api/remitentes'),
      api('/api/remisiones'), api('/api/facturas'), api('/api/cotizaciones')
    ])
    if (p) setProductos(p); if (c) setClientes(c); if (r) setRemitentes(r)
    if (rem) setRemisiones(rem); if (fac) setFacturas(fac); if (cot) setCotizaciones(cot)
  }, [api])

  const loadCaja = useCallback(async (caja) => { const data = await api('/api/caja?caja=' + caja); if (data) setCajaMovs(data) }, [api])
  useEffect(() => { if (token) { loadAll(); loadCaja(currentCaja) } }, [token, loadAll, loadCaja, currentCaja])

  function logout() { localStorage.removeItem('token'); router.push('/login') }
  function openModal(name, obj = null) {
    setModal(name); setEditObj(obj)
    setRemItems({}); setFacItems([]); setFacRetencion(3)
    setFacConcepto(''); setFacFormato(1); setFacRemitente(null)
    setRemSearch('')
    if (name === 'producto' && !obj) {
      const refs = productos.map(p => parseInt(p.ref) || 0)
      const nextRef = (refs.length > 0 ? Math.max(...refs) + 1 : 1).toString().padStart(3, '0')
      setForm({ ref: nextRef })
    } else {
      setForm(obj || {})
    }
    if (name !== 'cotizacion') setCotItems([])
    setPdfPreview(null)
  }
  function closeModal() { setModal(null); setEditObj(null); setForm({}); setPdfPreview(null); setCotItems([]); setRemSearch('') }
  function setF(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function saveProducto() { setLoading(true); if (editObj) await api('/api/productos/' + editObj.id, 'PUT', form); else await api('/api/productos', 'POST', form); await loadAll(); closeModal(); setLoading(false) }
  async function delProducto(id) { if (!window.confirm('¿Seguro que desea eliminar?')) return; await api('/api/productos/' + id, 'DELETE'); await loadAll() }
  async function cargaMasiva(e) {
    const file = e.target.files[0]; if (!file) return
    const text = await file.text()
    const lines = text.split('\n').filter(l => l.trim())
    const items = lines.slice(1).map(l => { const [ref, nombre, unidad] = l.split(',').map(x => x.trim()); return { ref, nombre, unidad } }).filter(i => i.nombre)
    if (!items.length) { alert('No se encontraron productos'); return }
    setLoading(true); await api('/api/productos', 'POST', items); await loadAll(); setLoading(false); alert(items.length + ' productos cargados')
  }

  async function saveCliente() { setLoading(true); if (editObj) await api('/api/clientes/' + editObj.id, 'PUT', form); else await api('/api/clientes', 'POST', form); await loadAll(); closeModal(); setLoading(false) }
  async function delCliente(id) { if (!window.confirm('¿Seguro que desea eliminar?')) return; await api('/api/clientes/' + id, 'DELETE'); await loadAll() }
  async function saveRemitente() { setLoading(true); if (editObj) await api('/api/remitentes/' + editObj.id, 'PUT', form); else await api('/api/remitentes', 'POST', form); await loadAll(); closeModal(); setLoading(false) }
  async function delRemitente(id) { if (!window.confirm('¿Seguro que desea eliminar?')) return; await api('/api/remitentes/' + id, 'DELETE'); await loadAll() }

  function toggleProdRem(id) {
    const p = productos.find(x => x.id == id); if (!p) return
    setRemItems(prev => { const n = { ...prev }; if (n[p.id]) delete n[p.id]; else n[p.id] = { prod: p, qty: 1 }; return n })
  }
  async function saveRemision() {
    setLoading(true)
    const items = Object.values(remItems).map(i => ({ producto_nombre: i.prod.nombre, producto_ref: i.prod.ref, producto_unidad: i.prod.unidad, cantidad: i.qty }))
    if (editObj) {
      await api('/api/remisiones/' + editObj.id, 'PUT', { fecha: form.fecha, cliente_nombre: form.cliente_nombre, remitente_nombre: form.remitente_nombre, items })
    } else {
      await api('/api/remisiones', 'POST', { fecha: form.fecha, cliente_nombre: form.cliente_nombre, remitente_nombre: form.remitente_nombre, items })
    }
    await loadAll(); closeModal(); setLoading(false)
  }
  async function delRemision(id) { if (!window.confirm('¿Seguro que desea eliminar?')) return; await api('/api/remisiones/' + id, 'DELETE'); await loadAll() }
  async function editRemision(r) {
    const items = {}
    ;(r.remision_items || []).forEach(i => {
      const p = productos.find(x => x.nombre === i.producto_nombre)
      if (p) items[p.id] = { prod: p, qty: i.cantidad }
      else items['_' + i.producto_nombre] = { prod: { id: '_' + i.producto_nombre, nombre: i.producto_nombre, ref: i.producto_ref, unidad: i.producto_unidad }, qty: i.cantidad }
    })
    setRemItems(items); setForm({ fecha: r.fecha, cliente_nombre: r.cliente_nombre, remitente_nombre: r.remitente_nombre }); setEditObj(r); setModal('remision')
  }

  function generarPdfRemision(r) {
    const jsPDF = window.jspdf?.jsPDF; if (!jsPDF) { alert('Cargando PDF, intenta de nuevo'); return null }
    const items = r.remision_items || []
    const rem = remitentes.find(x => x.nombre === r.remitente_nombre)
    const doc = new jsPDF({ unit: 'mm', format: 'a4' })
    const pw = doc.internal.pageSize.getWidth(), ml = 15, usable = pw - 30
    let y = 15
    doc.setFont('helvetica', 'bold'); doc.setFontSize(13)
    doc.text('REMISION DE ENTREGA', pw / 2, y, { align: 'center' }); y += 10
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold'); doc.text('Fecha:', ml, y); doc.setFont('helvetica', 'normal'); doc.text(r.fecha || '', ml + 25, y); y += 6
    doc.setFont('helvetica', 'bold'); doc.text('Destinatario:', ml, y); doc.setFont('helvetica', 'normal'); doc.text(r.cliente_nombre || '', ml + 28, y); y += 8
    const colItem = 14, colProd = usable - colItem - 24, colCant = 24, headerH = 7
    doc.setFillColor(30, 58, 95); doc.rect(ml, y, usable, headerH, 'F')
    doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(9)
    doc.text('Item', ml + colItem / 2, y + 4.8, { align: 'center' })
    doc.text('Producto', ml + colItem + colProd / 2, y + 4.8, { align: 'center' })
    doc.text('Cantidad', ml + colItem + colProd + colCant / 2, y + 4.8, { align: 'center' })
    y += headerH
    doc.setTextColor(0, 0, 0); doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5)
    items.forEach((item, idx) => {
      const nombreLineas = doc.splitTextToSize(item.producto_nombre || '', colProd - 4)
      const rowH = Math.max(6, nombreLineas.length * 5)
      doc.setDrawColor(208, 213, 221); doc.setLineWidth(0.2)
      doc.line(ml, y, ml + usable, y)
      doc.line(ml + colItem, y, ml + colItem, y + rowH)
      doc.line(ml + colItem + colProd, y, ml + colItem + colProd, y + rowH)
      doc.text(String(idx + 1), ml + colItem / 2, y + rowH / 2 + 1.5, { align: 'center' })
      doc.text(nombreLineas, ml + colItem + 2, y + 4.5)
      doc.text(String(item.cantidad), ml + colItem + colProd + colCant / 2, y + rowH / 2 + 1.5, { align: 'center' })
      y += rowH
    })
    doc.line(ml, y, ml + usable, y); y += 10
    doc.setFontSize(9.5); doc.setFont('helvetica', 'normal')
    doc.text('Observaciones:', ml, y); doc.setLineWidth(0.3); doc.setDrawColor(0, 0, 0)
    doc.line(ml + 35, y, ml + usable, y); y += 10
    doc.text('Remitente:', ml, y); doc.text(r.remitente_nombre || '', ml + 25, y)
    if (rem?.cedula) { y += 6; doc.text('Cédula:', ml, y); doc.text(rem.cedula, ml + 25, y) }
    if (rem?.telefono) { y += 6; doc.text('Teléfono:', ml, y); doc.text(rem.telefono, ml + 25, y) }
    y += 10
    doc.text('Recibido por:', ml, y); doc.line(ml + 30, y, ml + usable * 0.65, y); y += 10
    doc.text('Firma:', ml, y); doc.line(ml + 30, y, ml + usable * 0.65, y)
    return doc
  }

  function previewPdfRem(r) { const doc = generarPdfRemision(r); if (!doc) return; setPdfPreview(URL.createObjectURL(doc.output('blob'))); setModal('pdfpreview') }
  function downloadPdfRem(r) { const doc = generarPdfRemision(r); if (!doc) return; doc.save('Remision_' + String(r.id).padStart(3, '0') + '_' + r.cliente_nombre.replace(/\s+/g, '_') + '.pdf') }
  async function enviarEmailRem(r) {
    const doc = generarPdfRemision(r); if (!doc) return
    setSendingEmail(true)
    const res = await api('/api/remisiones/email', 'POST', { pdfBase64: doc.output('datauristring').split(',')[1], remisionId: r.id, clienteNombre: r.cliente_nombre })
    setSendingEmail(false); if (res?.ok) alert('Email enviado'); else alert('Error: ' + (res?.error || 'desconocido'))
  }

  function numeroALetras(num) {
    num = Math.floor(Number(num) || 0)
    if (num === 0) return 'CERO PESOS M.CTE'
    const U = ['','UN','DOS','TRES','CUATRO','CINCO','SEIS','SIETE','OCHO','NUEVE','DIEZ','ONCE','DOCE','TRECE','CATORCE','QUINCE','DIECISÉIS','DIECISIETE','DIECIOCHO','DIECINUEVE']
    const D = ['','','VEINTE','TREINTA','CUARENTA','CINCUENTA','SESENTA','SETENTA','OCHENTA','NOVENTA']
    const C = ['','CIENTO','DOSCIENTOS','TRESCIENTOS','CUATROCIENTOS','QUINIENTOS','SEISCIENTOS','SETECIENTOS','OCHOCIENTOS','NOVECIENTOS']
    function grupo(n) {
      let s = ''
      if (n === 100) return 'CIEN'
      if (n >= 100) { s += C[Math.floor(n/100)] + ' '; n %= 100 }
      if (n >= 20) { s += D[Math.floor(n/10)]; if (n%10) s += ' Y ' + U[n%10]; s += ' ' }
      else if (n > 0) s += U[n] + ' '
      return s.trim()
    }
    let r = '', n = num
    if (n >= 1000000) { const mv = Math.floor(n/1000000); r += (mv===1 ? 'UN MILLÓN' : grupo(mv)+' MILLONES')+' '; n %= 1000000 }
    if (n >= 1000)    { const tv = Math.floor(n/1000);    r += (tv===1 ? 'MIL' : grupo(tv)+' MIL')+' '; n %= 1000 }
    if (n > 0) r += grupo(n)
    return r.trim() + ' PESOS M.CTE'
  }
  function fmtCOP(n) { return '$' + Number(n||0).toLocaleString('es-CO') }
  function calcFacTotales() {
    const subtotal = facItems.reduce((s,i) => s+(i.subtotal||0), 0)
    const retencionValor = Math.round(subtotal * ((facRetencion||0)/100))
    return { subtotal, retencionValor, valorAPagar: subtotal - retencionValor }
  }
  function addProductoFac(prod) {
    if (!prod) return
    setFacItems(prev => {
      if (prev.find(i => i.id === prod.id)) return prev
      const vu = Number(prod.precio||0)
      return [...prev, { id: prod.id, nombre: prod.nombre, cantidad: 1, valorUnitario: vu, subtotal: vu }]
    })
  }
  function updateFacItem(id, field, raw) {
    const val = Number(raw)||0
    setFacItems(prev => prev.map(i => {
      if (i.id !== id) return i
      const u = { ...i, [field]: val }
      u.subtotal = u.cantidad * u.valorUnitario
      return u
    }))
  }
  function removeFacItem(id) { setFacItems(prev => prev.filter(i => i.id !== id)) }
  function selectFacRemitente(nombre) { setFacRemitente(remitentes.find(r => r.nombre === nombre) || null) }
  async function openFacEdit(factura) {
    const items = (factura.factura_items || []).map(i => ({
      id: i.id || Math.random(), nombre: i.producto_nombre,
      cantidad: i.cantidad, valorUnitario: i.precio_unitario, subtotal: i.subtotal
    }))
    setFacItems(items)
    setFacRetencion(factura.retencion_porcentaje || 3)
    setFacConcepto(factura.concepto || '')
    setFacFormato(factura.formato || 1)
    setFacRemitente(remitentes.find(r => r.nombre === factura.remitente_nombre) || null)
    setForm({
      numero: factura.numero, fecha: factura.fecha,
      cliente_nombre: factura.cliente_nombre, cliente_nit: factura.cliente_nit,
      cliente_ciudad: factura.cliente_ciudad, cliente_telefono: factura.cliente_telefono,
      cliente_email: factura.cliente_email, cliente_direccion: factura.cliente_direccion,
    })
    setEditObj(factura); setModal('factura')
  }
  async function saveFactura() {
    setLoading(true)
    const { subtotal, retencionValor, valorAPagar } = calcFacTotales()
    const payload = {
      numero: form.numero, fecha: form.fecha,
      cliente_nombre: form.cliente_nombre, cliente_nit: form.cliente_nit,
      cliente_ciudad: form.cliente_ciudad||'', cliente_telefono: form.cliente_telefono||'',
      cliente_email: form.cliente_email||'', cliente_direccion: form.cliente_direccion||'',
      remitente_nombre: facRemitente?.nombre||'', remitente_cedula: facRemitente?.cedula||'',
      remitente_telefono: facRemitente?.telefono||'', remitente_ciudad: facRemitente?.ciudad||'',
      remitente_email: facRemitente?.email||'', remitente_direccion: facRemitente?.direccion||'',
      retencion_porcentaje: facRetencion, retencion_valor: retencionValor,
      valor_a_pagar: valorAPagar, concepto: facConcepto, formato: facFormato, total: subtotal,
      items: facItems.map(i => ({ producto_nombre: i.nombre, precio_unitario: i.valorUnitario, cantidad: i.cantidad, subtotal: i.subtotal }))
    }
    if (editObj) await api('/api/facturas/' + editObj.id, 'PUT', payload)
    else await api('/api/facturas', 'POST', payload)
    await loadAll(); closeModal(); setLoading(false)
  }
  async function delFactura(id) { if (!window.confirm('¿Seguro que desea eliminar?')) return; await api('/api/facturas/'+id, 'DELETE'); await loadAll() }
  async function generarFacturaPDF(factura, abrir = true) {
    const jsPDF = window.jspdf?.jsPDF
    if (!jsPDF) { alert('Cargando PDF, intenta de nuevo'); return null }
    const doc = new jsPDF({ unit:'mm', format:'letter' })
    const W=216, m=14, cw=W-m*2
    const items = factura.factura_items || []
    const d = {
      entidad: factura.cliente_nombre||'', nit: factura.cliente_nit||'',
      fecha: factura.fecha||'', numero: factura.numero||'',
      rem_nombre: factura.remitente_nombre||'', rem_cedula: factura.remitente_cedula||'',
      rem_tel: factura.remitente_telefono||'', rem_ciudad: factura.remitente_ciudad||'',
      rem_email: factura.remitente_email||'', rem_dir: factura.remitente_direccion||'',
      concepto: factura.concepto||'',
      total: Number(factura.total||0), ret_pct: Number(factura.retencion_porcentaje||0),
      ret_val: Number(factura.retencion_valor||0), a_pagar: Number(factura.valor_a_pagar||0),
    }
    const fmt = Number(factura.formato||1)
    if      (fmt===1) facPDF1(doc,d,items,W,m,cw)
    else if (fmt===2) facPDF2(doc,d,items,W,m,cw)
    else if (fmt===3) facPDF3(doc,d,items,W,m,cw)
    else if (fmt===4) facPDF4(doc,d,items,W,m,cw)
    else              facPDF5(doc,d,items,W,m,cw)
    if (abrir) window.open(URL.createObjectURL(doc.output('blob')))
    return doc
  }
  function facPDF1(doc,d,items,W,m,cw) {
    const f=n=>'$'+Number(n||0).toLocaleString('es-CO'); let y=18
    doc.setDrawColor(0,0,0); doc.setLineWidth(0.3)
    doc.setFont('helvetica','bold'); doc.setFontSize(13); doc.setTextColor(0,0,0)
    doc.text(d.entidad.toUpperCase(),W-m,y,{align:'right'}); y+=6
    doc.setFont('helvetica','normal'); doc.setFontSize(9)
    doc.text('NIT: '+d.nit,W-m,y,{align:'right'}); y+=8
    doc.setLineWidth(1); doc.line(m,y,W-m,y); doc.setLineWidth(0.3); y+=6
    doc.setFontSize(8); doc.setFont('helvetica','bold')
    doc.text('FECHA:',m,y); doc.setFont('helvetica','normal'); doc.text(d.fecha,m+16,y)
    doc.setFont('helvetica','bold'); doc.text('CONSECUTIVO:',W-m-48,y); doc.setFont('helvetica','normal'); doc.text(d.numero,W-m,y,{align:'right'}); y+=8
    doc.setFontSize(9); doc.setFont('helvetica','bold'); doc.text('DEBE A:',m,y)
    doc.setFont('helvetica','normal'); doc.text(d.rem_nombre,m+23,y); y+=6
    doc.text('C.C No '+d.rem_cedula+'  RÉGIMEN SIMPLIFICADO',m,y); y+=5
    doc.text('DIRECCIÓN: '+d.rem_dir,m,y); y+=5
    doc.text('CIUDAD: '+d.rem_ciudad,m,y); doc.text('TEL: '+d.rem_tel,m+65,y); y+=5
    doc.text('EMAIL: '+d.rem_email,m,y); y+=7
    doc.setFont('helvetica','bold'); doc.text('POR CONCEPTO DE: ',m,y)
    doc.setFont('helvetica','normal'); doc.text(d.concepto,m+49,y); y+=8
    doc.setFillColor(200,200,200); doc.rect(m,y,cw,7,'F')
    doc.setFont('helvetica','bold'); doc.setFontSize(8)
    doc.text('#',m+4,y+4.5,{align:'center'}); doc.text('DESCRIPCIÓN',m+10,y+4.5)
    doc.text('CANT',m+112,y+4.5,{align:'center'}); doc.text('V/ UNITARIO',m+130,y+4.5)
    doc.text('VALOR TOTAL',W-m-1,y+4.5,{align:'right'}); y+=7
    doc.setFont('helvetica','normal')
    items.forEach((it,i)=>{
      if(i%2===0){doc.setFillColor(248,248,248);doc.rect(m,y,cw,6.5,'F')}
      doc.text(String(i+1),m+4,y+4.2,{align:'center'})
      doc.text((it.producto_nombre||'').substring(0,44),m+10,y+4.2)
      doc.text(String(it.cantidad||0),m+112,y+4.2,{align:'center'})
      doc.text(f(it.precio_unitario),m+130,y+4.2)
      doc.text(f(it.subtotal),W-m-1,y+4.2,{align:'right'}); y+=6.5
    }); y+=5
    doc.setFontSize(8); doc.setFont('helvetica','bold')
    doc.text('SON: '+numeroALetras(d.a_pagar),m,y); y+=2
    doc.line(W-m-73,y,W-m,y); y+=5
    doc.text('TOTAL',W-m-71,y); doc.setFont('helvetica','normal'); doc.text(f(d.total),W-m,y,{align:'right'}); y+=4
    doc.line(W-m-73,y,W-m,y); y+=5
    doc.setFont('helvetica','bold'); doc.text('RETENCIÓN ('+d.ret_pct+'%)',W-m-71,y); y+=5
    doc.setFont('helvetica','normal'); doc.text(f(d.ret_val),W-m,y,{align:'right'}); y+=4
    doc.line(W-m-73,y,W-m,y); y+=2
    doc.setFillColor(200,200,200); doc.rect(W-m-73,y,75,8,'F')
    doc.setFont('helvetica','bold'); doc.text('A PAGAR',W-m-71,y+5.5); doc.text(f(d.a_pagar),W-m-2,y+5.5,{align:'right'}); y+=20
    const sw=cw/4
    ;['FIRMA','REVISADO','APROBADO','AUTORIZADO'].forEach((s,i)=>{
      doc.setLineWidth(0.3); doc.line(m+i*sw+4,y,m+(i+1)*sw-4,y)
      doc.setFont('helvetica','normal'); doc.setFontSize(8); doc.text(s,m+i*sw+sw/2,y+5,{align:'center'})
    })
  }
  function facPDF2(doc,d,items,W,m,cw) {
    const f=n=>'$'+Number(n||0).toLocaleString('es-CO')
    const AZ=[26,86,179], AZL=[235,241,252]; let y=0
    doc.setFillColor(...AZ); doc.rect(0,0,W,32,'F')
    doc.setTextColor(255,255,255); doc.setFont('helvetica','bold'); doc.setFontSize(16)
    doc.text(d.entidad.toUpperCase(),m,14); doc.setFontSize(9); doc.setFont('helvetica','normal')
    doc.text('NIT: '+d.nit,m,20); doc.text('TEL: '+d.rem_tel,m,26)
    doc.setFontSize(22); doc.setFont('helvetica','bold')
    doc.text('FACTURA',W-m,20,{align:'right'}); doc.setFontSize(10)
    doc.text(d.numero,W-m,27,{align:'right'}); y=38
    doc.setTextColor(0,0,0); doc.setFillColor(...AZL); doc.rect(m,y,cw,28,'F')
    doc.setFont('helvetica','bold'); doc.text('DEBE A:',m+3,y+6)
    doc.setFont('helvetica','normal'); doc.text(d.rem_nombre,m+3,y+12)
    doc.text('C.C: '+d.rem_cedula,m+3,y+18); doc.text('DIR: '+d.rem_dir,m+3,y+24)
    doc.text('CIUDAD: '+d.rem_ciudad,m+100,y+12); doc.text('EMAIL: '+d.rem_email,m+100,y+18); doc.text('FECHA: '+d.fecha,m+100,y+24); y+=32
    doc.setFont('helvetica','bold'); doc.text('POR CONCEPTO DE: ',m,y); doc.setFont('helvetica','normal'); doc.text(d.concepto,m+49,y); y+=8
    doc.setFillColor(...AZ); doc.rect(m,y,cw,7,'F')
    doc.setTextColor(255,255,255); doc.setFont('helvetica','bold'); doc.setFontSize(8)
    doc.text('#',m+4,y+4.5,{align:'center'}); doc.text('DESCRIPCIÓN',m+10,y+4.5)
    doc.text('CANT',m+112,y+4.5,{align:'center'}); doc.text('V/ UNITARIO',m+130,y+4.5)
    doc.text('VALOR TOTAL',W-m-1,y+4.5,{align:'right'}); y+=7
    doc.setTextColor(0,0,0); doc.setFont('helvetica','normal')
    items.forEach((it,i)=>{
      if(i%2===0){doc.setFillColor(...AZL);doc.rect(m,y,cw,6.5,'F')}
      doc.text(String(i+1),m+4,y+4.2,{align:'center'})
      doc.text((it.producto_nombre||'').substring(0,44),m+10,y+4.2)
      doc.text(String(it.cantidad||0),m+112,y+4.2,{align:'center'})
      doc.text(f(it.precio_unitario),m+130,y+4.2)
      doc.text(f(it.subtotal),W-m-1,y+4.2,{align:'right'}); y+=6.5
    }); y+=5
    doc.setFont('helvetica','bold'); doc.text('SON: '+numeroALetras(d.a_pagar),m,y); y+=5
    doc.setFillColor(...AZL); doc.rect(W-m-74,y-1,76,28,'F')
    doc.text('TOTAL',W-m-72,y+5); doc.setFont('helvetica','normal'); doc.text(f(d.total),W-m-1,y+5,{align:'right'})
    doc.setFont('helvetica','bold'); doc.text('RETENCIÓN ('+d.ret_pct+'%)',W-m-72,y+11); doc.setFont('helvetica','normal'); doc.text(f(d.ret_val),W-m-1,y+11,{align:'right'})
    doc.setFillColor(...AZ); doc.rect(W-m-74,y+16,76,10,'F')
    doc.setTextColor(255,255,255); doc.setFont('helvetica','bold')
    doc.text('A PAGAR',W-m-72,y+22); doc.text(f(d.a_pagar),W-m-1,y+22,{align:'right'})
    doc.setTextColor(0,0,0); y+=38
    doc.setFillColor(...AZ); doc.rect(m,y,cw,8,'F')
    doc.setTextColor(255,255,255); doc.setFontSize(8)
    ;['FIRMA','REVISADO','APROBADO','AUTORIZADO'].forEach((s,i)=>doc.text(s,m+i*(cw/4)+cw/8,y+5,{align:'center'}))
  }
  function facPDF3(doc,d,items,W,m,cw) {
    const f=n=>'$'+Number(n||0).toLocaleString('es-CO')
    const GD=[51,65,85], GL=[241,245,249], GA=[226,232,240]; let y=0
    doc.setFillColor(...GD); doc.rect(0,0,W,28,'F')
    doc.setTextColor(255,255,255); doc.setFont('helvetica','bold'); doc.setFontSize(13)
    doc.text(d.entidad.toUpperCase(),m,12); doc.setFontSize(9); doc.setFont('helvetica','normal')
    doc.text('NIT: '+d.nit+'   TEL: '+d.rem_tel,m,19)
    doc.setFont('helvetica','bold'); doc.setFontSize(11)
    doc.text('FACTURA '+d.numero,W-m,12,{align:'right'}); doc.setFontSize(9); doc.setFont('helvetica','normal')
    doc.text('Fecha: '+d.fecha,W-m,19,{align:'right'}); y=34
    doc.setTextColor(0,0,0); doc.setFillColor(...GL); doc.rect(m,y,cw,26,'F')
    doc.setFont('helvetica','bold'); doc.text('▶  DEBE A',m+3,y+6); doc.setFont('helvetica','normal')
    doc.text(d.rem_nombre,m+3,y+12); doc.text('CC '+d.rem_cedula+' | '+d.rem_ciudad,m+3,y+18); doc.text('Dir: '+d.rem_dir,m+3,y+24)
    doc.text('EMAIL: '+d.rem_email,m+100,y+12); doc.text('TEL: '+d.rem_tel,m+100,y+18); y+=30
    doc.setFont('helvetica','bold'); doc.text('POR CONCEPTO DE: ',m,y); doc.setFont('helvetica','normal'); doc.text(d.concepto,m+49,y); y+=8
    doc.setFillColor(...GD); doc.rect(m,y,cw,7,'F')
    doc.setTextColor(255,255,255); doc.setFont('helvetica','bold'); doc.setFontSize(8)
    doc.text('#',m+4,y+4.5,{align:'center'}); doc.text('DESCRIPCIÓN',m+10,y+4.5)
    doc.text('CANT',m+112,y+4.5,{align:'center'}); doc.text('V/ UNITARIO',m+130,y+4.5)
    doc.text('VALOR TOTAL',W-m-1,y+4.5,{align:'right'}); y+=7
    doc.setTextColor(0,0,0); doc.setFont('helvetica','normal')
    items.forEach((it,i)=>{
      if(i%2===0){doc.setFillColor(...GL);doc.rect(m,y,cw,6.5,'F')}
      doc.text(String(i+1),m+4,y+4.2,{align:'center'})
      doc.text((it.producto_nombre||'').substring(0,44),m+10,y+4.2)
      doc.text(String(it.cantidad||0),m+112,y+4.2,{align:'center'})
      doc.text(f(it.precio_unitario),m+130,y+4.2)
      doc.text(f(it.subtotal),W-m-1,y+4.2,{align:'right'}); y+=6.5
    }); y+=5
    doc.setFont('helvetica','bold'); doc.text('SON: '+numeroALetras(d.a_pagar),m,y); y+=5
    doc.line(W-m-74,y,W-m,y); y+=5
    doc.text('TOTAL',W-m-72,y); doc.setFont('helvetica','normal'); doc.text(f(d.total),W-m,y,{align:'right'}); y+=4
    doc.line(W-m-74,y,W-m,y); y+=5
    doc.setFont('helvetica','bold'); doc.text('RETENCIÓN ('+d.ret_pct+'%)',W-m-72,y); doc.setFont('helvetica','normal'); doc.text(f(d.ret_val),W-m,y,{align:'right'}); y+=4
    doc.line(W-m-74,y,W-m,y); y+=2
    doc.setFillColor(...GD); doc.rect(W-m-74,y,76,9,'F')
    doc.setTextColor(255,255,255); doc.setFont('helvetica','bold')
    doc.text('A PAGAR',W-m-72,y+6); doc.text(f(d.a_pagar),W-m-1,y+6,{align:'right'}); y+=18
    doc.setTextColor(0,0,0); doc.setLineWidth(0.3)
    ;['FIRMA','REVISADO','APROBADO','AUTORIZADO'].forEach((s,i)=>{
      doc.line(m+i*(cw/4)+4,y,m+(i+1)*(cw/4)-4,y)
      doc.setFont('helvetica','normal'); doc.setFontSize(8); doc.text(s,m+i*(cw/4)+(cw/8),y+5,{align:'center'})
    })
  }
  function facPDF4(doc,d,items,W,m,cw) {
    const f=n=>'$'+Number(n||0).toLocaleString('es-CO')
    const GR=[100,116,139]; let y=18
    doc.setFont('helvetica','bold'); doc.setFontSize(18); doc.setTextColor(0,0,0)
    doc.text(d.entidad.toUpperCase(),m,y); y+=7
    doc.setFont('helvetica','normal'); doc.setFontSize(9); doc.setTextColor(...GR)
    doc.text('NIT: '+d.nit+'   ·   '+d.rem_tel+'   ·   '+d.rem_email,m,y); y+=3
    doc.setLineWidth(0.8); doc.setDrawColor(0,0,0); doc.line(m,y,W-m,y); y+=6
    doc.setTextColor(0,0,0); doc.setFontSize(8)
    doc.setFont('helvetica','bold'); doc.text('FACTURA N°',m,y); doc.setFont('helvetica','normal'); doc.text(d.numero,m+28,y)
    doc.setFont('helvetica','bold'); doc.text('FECHA',W-m-50,y); doc.setFont('helvetica','normal'); doc.text(d.fecha,W-m-30,y); y+=6
    doc.setFont('helvetica','bold'); doc.text('DEBE A',m,y); doc.setFont('helvetica','normal'); doc.text(d.rem_nombre+' | CC '+d.rem_cedula,m+18,y); y+=5
    doc.text('DIR: '+d.rem_dir+' | '+d.rem_ciudad,m,y); y+=5
    doc.setFont('helvetica','bold'); doc.text('CONCEPTO',m,y); doc.setFont('helvetica','normal'); doc.text(d.concepto,m+25,y); y+=7
    doc.setLineWidth(0.5); doc.setDrawColor(...GR); doc.line(m,y,W-m,y)
    doc.setFont('helvetica','bold'); doc.setFontSize(8); doc.setTextColor(...GR)
    doc.text('#',m+4,y+5,{align:'center'}); doc.text('DESCRIPCIÓN',m+10,y+5)
    doc.text('CANT',m+112,y+5,{align:'center'}); doc.text('V/ UNITARIO',m+130,y+5)
    doc.text('VALOR TOTAL',W-m-1,y+5,{align:'right'}); y+=5
    doc.setLineWidth(0.3); doc.line(m,y,W-m,y); y+=4
    doc.setTextColor(0,0,0); doc.setFont('helvetica','normal')
    items.forEach((it,i)=>{
      doc.text(String(i+1),m+4,y+4,{align:'center'})
      doc.text((it.producto_nombre||'').substring(0,44),m+10,y+4)
      doc.text(String(it.cantidad||0),m+112,y+4,{align:'center'})
      doc.text(f(it.precio_unitario),m+130,y+4)
      doc.text(f(it.subtotal),W-m-1,y+4,{align:'right'})
      doc.setLineWidth(0.2); doc.setDrawColor(210,214,219); doc.line(m,y+6.5,W-m,y+6.5); y+=6.5
    }); y+=5
    doc.setTextColor(...GR); doc.setFont('helvetica','italic')
    doc.text('SON: '+numeroALetras(d.a_pagar),m,y); y+=5
    doc.setTextColor(0,0,0); doc.setFont('helvetica','normal'); doc.setLineWidth(0.3); doc.setDrawColor(...GR)
    doc.line(W-m-74,y,W-m,y); y+=5
    doc.setFont('helvetica','bold'); doc.text('TOTAL',W-m-72,y); doc.setFont('helvetica','normal'); doc.text(f(d.total),W-m,y,{align:'right'}); y+=5
    doc.setFont('helvetica','bold'); doc.text('RETENCIÓN ('+d.ret_pct+'%)',W-m-72,y); doc.setFont('helvetica','normal'); doc.text(f(d.ret_val),W-m,y,{align:'right'}); y+=4
    doc.setLineWidth(0.8); doc.setDrawColor(0,0,0); doc.line(W-m-74,y,W-m,y); y+=5
    doc.setFont('helvetica','bold'); doc.setFontSize(10); doc.text('A PAGAR',W-m-72,y); doc.text(f(d.a_pagar),W-m,y,{align:'right'}); y+=18
    doc.setFontSize(8); doc.setFont('helvetica','normal'); doc.setLineWidth(0.3); doc.setDrawColor(...GR)
    ;['FIRMA','REVISADO','APROBADO','AUTORIZADO'].forEach((s,i)=>{
      doc.line(m+i*(cw/4)+4,y,m+(i+1)*(cw/4)-4,y)
      doc.text(s,m+i*(cw/4)+(cw/8),y+5,{align:'center'})
    })
  }
  function facPDF5(doc,d,items,W,m,cw) {
    const f=n=>'$'+Number(n||0).toLocaleString('es-CO')
    const VE=[5,150,105], VEL=[236,253,245]; let y=0
    doc.setFillColor(...VE); doc.rect(0,0,W,30,'F')
    doc.setFillColor(4,120,87); doc.rect(W-60,0,60,30,'F')
    doc.setTextColor(255,255,255); doc.setFont('helvetica','bold'); doc.setFontSize(14)
    doc.text(d.entidad.toUpperCase(),m,13); doc.setFontSize(9); doc.setFont('helvetica','normal')
    doc.text('NIT: '+d.nit,m,20); doc.text(d.rem_email,m,26)
    doc.setFontSize(11); doc.setFont('helvetica','bold')
    doc.text('FACTURA',W-m,12,{align:'right'}); doc.setFontSize(10)
    doc.text(d.numero,W-m,19,{align:'right'}); doc.setFontSize(8); doc.text(d.fecha,W-m,26,{align:'right'}); y=36
    doc.setTextColor(0,0,0); doc.setFillColor(...VEL); doc.rect(m,y,cw,26,'F')
    doc.setFont('helvetica','bold'); doc.setFontSize(9); doc.setTextColor(...VE)
    doc.text('DEBE A',m+3,y+7); doc.setTextColor(0,0,0); doc.setFont('helvetica','normal')
    doc.text(d.rem_nombre,m+3,y+13); doc.text('CC: '+d.rem_cedula,m+3,y+19); doc.text(d.rem_ciudad,m+3,y+25)
    doc.text('TEL: '+d.rem_tel,m+100,y+13); doc.text('DIR: '+d.rem_dir,m+100,y+19); y+=30
    doc.setFont('helvetica','bold'); doc.setTextColor(...VE)
    doc.text('POR CONCEPTO DE: ',m,y); doc.setTextColor(0,0,0); doc.setFont('helvetica','normal')
    doc.text(d.concepto,m+49,y); y+=8
    doc.setFillColor(...VE); doc.rect(m,y,cw,7,'F')
    doc.setTextColor(255,255,255); doc.setFont('helvetica','bold'); doc.setFontSize(8)
    doc.text('#',m+4,y+4.5,{align:'center'}); doc.text('DESCRIPCIÓN',m+10,y+4.5)
    doc.text('CANT',m+112,y+4.5,{align:'center'}); doc.text('V/ UNITARIO',m+130,y+4.5)
    doc.text('VALOR TOTAL',W-m-1,y+4.5,{align:'right'}); y+=7
    doc.setTextColor(0,0,0); doc.setFont('helvetica','normal')
    items.forEach((it,i)=>{
      if(i%2===0){doc.setFillColor(...VEL);doc.rect(m,y,cw,6.5,'F')}
      doc.text(String(i+1),m+4,y+4.2,{align:'center'})
      doc.text((it.producto_nombre||'').substring(0,44),m+10,y+4.2)
      doc.text(String(it.cantidad||0),m+112,y+4.2,{align:'center'})
      doc.text(f(it.precio_unitario),m+130,y+4.2)
      doc.text(f(it.subtotal),W-m-1,y+4.2,{align:'right'}); y+=6.5
    }); y+=5
    doc.setFont('helvetica','bold'); doc.setTextColor(...VE)
    doc.text('SON: '+numeroALetras(d.a_pagar),m,y); doc.setTextColor(0,0,0); y+=5
    doc.line(W-m-74,y,W-m,y); y+=5
    doc.text('TOTAL',W-m-72,y); doc.setFont('helvetica','normal'); doc.text(f(d.total),W-m,y,{align:'right'}); y+=5
    doc.setFont('helvetica','bold'); doc.text('RETENCIÓN ('+d.ret_pct+'%)',W-m-72,y); doc.setFont('helvetica','normal'); doc.text(f(d.ret_val),W-m,y,{align:'right'}); y+=4
    doc.setFillColor(...VE); doc.rect(W-m-74,y,76,10,'F')
    doc.setTextColor(255,255,255); doc.setFont('helvetica','bold')
    doc.text('A PAGAR',W-m-72,y+7); doc.text(f(d.a_pagar),W-m-1,y+7,{align:'right'}); y+=20
    doc.setTextColor(0,0,0); doc.setLineWidth(0.3); doc.setDrawColor(...VE)
    ;['FIRMA','REVISADO','APROBADO','AUTORIZADO'].forEach((s,i)=>{
      doc.line(m+i*(cw/4)+4,y,m+(i+1)*(cw/4)-4,y)
      doc.setFont('helvetica','normal'); doc.setFontSize(8); doc.text(s,m+i*(cw/4)+(cw/8),y+5,{align:'center'})
    })
  }
  function exportarFacExcel(factura) {
    const XLSX = window.XLSX; if (!XLSX) { alert('Cargando Excel, intenta de nuevo'); return }
    const items = factura.factura_items || []
    const wsData = [
      ['FACTURA: '+factura.numero],[],
      ['Fecha:', factura.fecha],
      ['Cliente:', factura.cliente_nombre, 'NIT:', factura.cliente_nit],
      ['Remitente:', factura.remitente_nombre, 'CC:', factura.remitente_cedula],
      ['Dirección:', factura.remitente_direccion, 'Ciudad:', factura.remitente_ciudad],
      ['Teléfono:', factura.remitente_telefono, 'Email:', factura.remitente_email],
      ['Concepto:', factura.concepto],[],
      ['#','Descripción','Cantidad','Valor Unitario','Subtotal'],
      ...items.map((it,i)=>[i+1,it.producto_nombre,it.cantidad,it.precio_unitario,it.subtotal]),
      [],['' ,'','','TOTAL',factura.total],
      ['','','','RETENCIÓN ('+factura.retencion_porcentaje+'%)',factura.retencion_valor],
      ['','','','A PAGAR',factura.valor_a_pagar],[],
      ['SON: '+numeroALetras(factura.valor_a_pagar)]
    ]
    const wb = window.XLSX.utils.book_new()
    const ws = window.XLSX.utils.aoa_to_sheet(wsData)
    ws['!cols'] = [{wch:5},{wch:40},{wch:12},{wch:18},{wch:18}]
    window.XLSX.utils.book_append_sheet(wb, ws, 'Factura')
    window.XLSX.writeFile(wb, 'Factura_'+factura.numero+'.xlsx')
  }
  async function enviarFacturaEmail(factura) {
    setSendingEmail(true)
    try {
      const doc = await generarFacturaPDF(factura, false)
      if (!doc) { setSendingEmail(false); return }
      const pdfBase64 = doc.output('datauristring').split(',')[1]
      const res = await api('/api/facturas/email', 'POST', { factura, pdfBase64 })
      alert(res?.ok ? '✅ Correo enviado' : '❌ Error enviando correo')
    } catch(e) { alert('❌ Error: '+e.message) }
    setSendingEmail(false)
  }
  async function cargaMasivaCaja(e) {
    const file = e.target.files[0]; if (!file) return
    const text = await file.text()
    const lines = text.split('\n').filter(l => l.trim())
    const items = lines.slice(1).map(l => {
      const [fecha, tipo, concepto, valor, detalle] = l.split(',').map(x => x.trim())
      return { fecha, tipo: tipo||'Ingreso', concepto, valor: Number(valor)||0, detalle: detalle||null, caja: currentCaja }
    }).filter(i => i.fecha && i.concepto)
    if (!items.length) { alert('No se encontraron movimientos'); return }
    setLoading(true)
    for (const item of items) { await api('/api/caja', 'POST', item) }
    await loadCaja(currentCaja); setLoading(false); e.target.value = ''
    alert(items.length + ' movimientos cargados')
  }
  function openMovEdit(m) {
    setEditObj(m)
    setForm({
      fecha: m.fecha,
      movimiento: m.movimiento || ((m.tipo==='ingreso'||m.tipo==='Ingreso') ? 'Entrada' : 'Salida'),
      tipo: m.tipo || 'Ingreso',
      detalle: m.detalle || '',
      cliente_nombre: m.cliente_nombre || '',
      contrato: m.contrato || '',
      concepto: m.concepto || '',
      valor: m.valor
    })
    setModal('movimiento')
  }
  async function saveMovimiento() {
    setLoading(true)
    if (editObj) await api('/api/caja/' + editObj.id, 'PUT', { ...form, caja: currentCaja })
    else await api('/api/caja', 'POST', { ...form, caja: currentCaja })
    await loadCaja(currentCaja); closeModal(); setLoading(false)
  }
  async function delMovimiento(id) { if (!window.confirm('¿Seguro que desea eliminar?')) return; await api('/api/caja/' + id, 'DELETE'); await loadCaja(currentCaja) }

  // COTIZACIONES
  async function openCotizacion(obj = null) {
    if (obj) {
      const t = localStorage.getItem('token')
      const res = await fetch('/api/cotizaciones/' + obj.id, { headers: { 'Authorization': 'Bearer ' + t } })
      const fresh = await res.json()
      const freshItems = (fresh.cotizacion_items || []).map(i => ({ producto_nombre: i.producto_nombre, cantidad: i.cantidad, valor_unitario: i.valor_unitario, subtotal: i.subtotal }))
      setEditObj(fresh)
      setForm({ numero: fresh.numero, fecha: fresh.fecha, plantilla: fresh.plantilla, notas: fresh.notas, titulo: fresh.titulo || 'Cotización de Insumos', texto_adicional: fresh.texto_adicional || '', cliente_nombre: fresh.cliente_nombre, cliente_ciudad: fresh.cliente_ciudad, cliente_nit: fresh.cliente_nit, proponente_nombre: fresh.proponente_nombre, proponente_email: fresh.proponente_email, proponente_telefono: fresh.proponente_telefono, proponente_cedula: fresh.proponente_cedula || '' })
      setCotItems(freshItems)
      setModal('cotizacion')
    } else {
      const num = 'COT-' + String(cotizaciones.length + 1).padStart(3, '0')
      setEditObj(null)
      setForm({ numero: num, fecha: new Date().toISOString().split('T')[0], plantilla: 'oficial', notas: '', titulo: 'Cotización de Insumos', texto_adicional: '', proponente_cedula: '' })
      setCotItems([])
      setModal('cotizacion')
    }
  }

  function addCotItem() { setCotItems(prev => [...prev, { producto_nombre: '', cantidad: 1, valor_unitario: 0, subtotal: 0 }]) }
  function updateCotItem(idx, field, val) {
    setCotItems(prev => prev.map((item, i) => {
      if (i !== idx) return item
      const updated = { ...item, [field]: val }
      if (field === 'cantidad' || field === 'valor_unitario') updated.subtotal = Number(updated.cantidad) * Number(updated.valor_unitario)
      return updated
    }))
  }
  function removeCotItem(idx) { setCotItems(prev => prev.filter((_, i) => i !== idx)) }

  async function saveCotizacion() {
    setLoading(true)
    const total = cotItems.reduce((s, i) => s + Number(i.subtotal), 0)
    const payload = { ...form, total, items: cotItems }
    if (editObj) await api('/api/cotizaciones/' + editObj.id, 'PUT', payload)
    else await api('/api/cotizaciones', 'POST', payload)
    await loadAll(); closeModal(); setLoading(false)
  }

  async function delCotizacion(id) { if (!window.confirm('¿Seguro que desea eliminar?')) return; await api('/api/cotizaciones/' + id, 'DELETE'); await loadAll() }

  function generarPdfCotOficial(c) {
    const jsPDF = window.jspdf?.jsPDF; if (!jsPDF) { alert('Cargando PDF'); return null }
    const doc = new jsPDF({ unit: 'mm', format: 'a4' })
    const pw = doc.internal.pageSize.getWidth(), ph = doc.internal.pageSize.getHeight()
    const ml = 15, usable = pw - 30

    doc.setFillColor(30, 58, 95)
    doc.rect(0, 0, pw, 50, 'F')
    doc.setFillColor(30, 58, 95)
    doc.rect(0, ph - 30, pw, 30, 'F')

    doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(18)
    doc.text(c.titulo || 'Cotización de Insumos', ml, 26)
    if (c.texto_adicional) {
      doc.setFont('helvetica', 'normal'); doc.setFontSize(10)
      doc.text(c.texto_adicional, ml, 37)
    }
    doc.setFontSize(10); doc.setFont('helvetica', 'bold')
    doc.text(c.fecha || '', pw - 15, 13, { align: 'right' })
    doc.setFontSize(9); doc.setFont('helvetica', 'normal')
    doc.text(c.numero || '', pw - 15, 21, { align: 'right' })

    let y = 60
    doc.setTextColor(30, 58, 95); doc.setFont('helvetica', 'bold'); doc.setFontSize(13)
    doc.text(c.cliente_nombre || '', ml, y); y += 6
    if (c.cliente_ciudad) { doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.setTextColor(80,80,80); doc.text(c.cliente_ciudad, ml, y); y += 10 }
    else y += 4

    doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(30,58,95)
    doc.text('Proponente: ' + (c.proponente_nombre || ''), ml, y); y += 5
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(80,80,80)
    if (c.proponente_cedula) { doc.text('C.C. ' + c.proponente_cedula, ml, y); y += 4 }
    if (c.proponente_email) { doc.text(c.proponente_email, ml, y); y += 4 }
    if (c.proponente_telefono) { doc.text(c.proponente_telefono, ml, y); y += 8 }
    else y += 4

    const colProd = usable * 0.55, colCant = usable * 0.13, colUnit = usable * 0.16, colTot = usable * 0.16
    const hH = 8
    doc.setFillColor(30, 58, 95); doc.rect(ml, y, usable, hH, 'F')
    doc.setTextColor(255,255,255); doc.setFont('helvetica','bold'); doc.setFontSize(9)
    doc.text('Producto', ml + 3, y + 5.5)
    doc.text('Cantidad', ml + colProd + colCant/2, y + 5.5, { align: 'center' })
    doc.text('Unitario', ml + colProd + colCant + colUnit/2, y + 5.5, { align: 'center' })
    doc.text('Total', ml + colProd + colCant + colUnit + colTot/2, y + 5.5, { align: 'center' })
    y += hH

    doc.setTextColor(0,0,0); doc.setFont('helvetica','normal'); doc.setFontSize(9)
    const items = c.cotizacion_items || []
    items.forEach(item => {
      if (y > ph - 60) { doc.addPage(); y = 15 }
      const lineas = doc.splitTextToSize(item.producto_nombre || '', colProd - 4)
      const rH = Math.max(7, lineas.length * 5)
      doc.setDrawColor(200,200,200); doc.setLineWidth(0.2); doc.line(ml, y, ml+usable, y)
      doc.text(lineas, ml + 3, y + 4.5)
      doc.text(String(item.cantidad), ml + colProd + colCant/2, y + rH/2 + 1.5, { align: 'center' })
      doc.text('$' + Number(item.valor_unitario).toLocaleString('es-CO'), ml + colProd + colCant + colUnit/2, y + rH/2 + 1.5, { align: 'center' })
      doc.text('$' + Number(item.subtotal).toLocaleString('es-CO'), ml + colProd + colCant + colUnit + colTot/2, y + rH/2 + 1.5, { align: 'center' })
      y += rH
    })
    doc.line(ml, y, ml+usable, y); y += 8
    doc.setFont('helvetica','bold'); doc.setFontSize(11); doc.setTextColor(30,58,95)
    doc.text('TOTAL: $' + Number(c.total).toLocaleString('es-CO'), ml + usable, y, { align: 'right' }); y += 12

    const totalPages = doc.internal.getNumberOfPages()
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i)
      doc.setFillColor(30,58,95); doc.rect(0, ph-30, pw, 30, 'F')
      doc.setTextColor(255,255,255); doc.setFont('helvetica','normal'); doc.setFontSize(8)
      if (c.notas) {
        const notaLineas = doc.splitTextToSize(c.notas, usable - 20)
        doc.text(notaLineas, ml, ph - 24)
      }
      doc.setFontSize(9)
      if (c.proponente_telefono) doc.text('Tel: ' + c.proponente_telefono, ml, ph - 8)
      if (c.proponente_email) doc.text(c.proponente_email, ml + 50, ph - 8)
    }
    return doc
  }


  function generarPdfCotSabana(c) {
    const jsPDF = window.jspdf?.jsPDF; if (!jsPDF) { alert('Cargando PDF'); return null }
    const doc = new jsPDF({ unit: 'mm', format: 'a4' })
    const pw = doc.internal.pageSize.getWidth(), ph = doc.internal.pageSize.getHeight(), ml = 15, usable = pw - 30
    let y = 15

    doc.setFillColor(180, 100, 200); doc.rect(0, 0, pw * 0.08, 40, 'F')
    doc.setFont('helvetica', 'bold'); doc.setFontSize(26); doc.setTextColor(180, 100, 200)
    doc.text(c.titulo || 'Cotización de Insumos', ml + 5, 22)
    if (c.texto_adicional) {
      doc.setFontSize(10); doc.setFont('helvetica','normal'); doc.setTextColor(100,100,100)
      doc.text(c.texto_adicional, ml + 5, 30)
    }
    y = 45

    doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(50,50,50)
    doc.text(c.proponente_nombre || '', ml, y)
    doc.text('Creada: ' + (c.fecha || ''), pw/2, y); y += 5
    doc.setFont('helvetica','normal')
    if (c.proponente_cedula) { doc.text('C.C. ' + c.proponente_cedula, ml, y) }
    doc.text('Cotización N.º: ' + (c.numero || ''), pw/2, y); y += 5
    if (c.proponente_email) { doc.text(c.proponente_email, ml, y) }
    doc.text('Elaborada para: ' + (c.cliente_nombre || ''), pw/2, y); y += 5
    if (c.proponente_telefono) { doc.text('Tel: ' + c.proponente_telefono, ml, y) }
    if (c.cliente_ciudad) { doc.text(c.cliente_ciudad, pw/2, y) }
    y += 12

    const colProd = usable*0.55, colCant = usable*0.13, colUnit = usable*0.16, colTot = usable*0.16, hH = 8
    doc.setFillColor(180,100,200); doc.rect(ml, y, usable, hH, 'F')
    doc.setTextColor(255,255,255); doc.setFont('helvetica','bold'); doc.setFontSize(9)
    doc.text('Producto', ml + colProd/2, y+5.5, { align:'center' })
    doc.text('Cantidad', ml+colProd+colCant/2, y+5.5, { align:'center' })
    doc.text('Unitario', ml+colProd+colCant+colUnit/2, y+5.5, { align:'center' })
    doc.text('Total', ml+colProd+colCant+colUnit+colTot/2, y+5.5, { align:'center' })
    y += hH

    doc.setTextColor(0,0,0); doc.setFont('helvetica','normal'); doc.setFontSize(9)
    const items = c.cotizacion_items || []
    items.forEach(item => {
      if (y > ph - 50) { doc.addPage(); y = 15 }
      const lineas = doc.splitTextToSize(item.producto_nombre || '', colProd - 4)
      const rH = Math.max(7, lineas.length * 5)
      doc.setDrawColor(200,200,200); doc.setLineWidth(0.2); doc.line(ml, y, ml+usable, y)
      doc.text(lineas, ml+3, y+4.5)
      doc.text(String(item.cantidad), ml+colProd+colCant/2, y+rH/2+1.5, { align:'center' })
      doc.text('$'+Number(item.valor_unitario).toLocaleString('es-CO'), ml+colProd+colCant+colUnit/2, y+rH/2+1.5, { align:'center' })
      doc.text('$'+Number(item.subtotal).toLocaleString('es-CO'), ml+colProd+colCant+colUnit+colTot/2, y+rH/2+1.5, { align:'center' })
      y += rH
    })
    doc.line(ml, y, ml+usable, y); y += 12

    if (c.notas) {
      if (y > ph - 40) { doc.addPage(); y = 15 }
      doc.setFont('helvetica','bold'); doc.setFontSize(10); doc.setTextColor(180,100,200)
      doc.text('Términos y condiciones:', ml, y); y += 6
      doc.setFont('helvetica','normal'); doc.setTextColor(50,50,50); doc.setFontSize(9)
      doc.text(doc.splitTextToSize(c.notas, usable), ml, y)
    }
    return doc
  }


  function generarPdfCotFenny(c) {
    const jsPDF = window.jspdf?.jsPDF; if (!jsPDF) { alert('Cargando PDF'); return null }
    const doc = new jsPDF({ unit: 'mm', format: 'a4' })
    const pw = doc.internal.pageSize.getWidth(), ph = doc.internal.pageSize.getHeight(), ml = 15, usable = pw - 30
    let y = 15

    doc.setFillColor(0, 120, 200); doc.rect(0, 0, pw, 40, 'F')
    doc.setFillColor(0, 180, 180); doc.rect(pw*0.7, 0, pw*0.3, 40, 'F')
    doc.setTextColor(255,255,255); doc.setFont('helvetica','bold'); doc.setFontSize(22)
    doc.text(c.titulo || 'COTIZACIÓN', pw/2, 18, { align:'center' })
    if (c.texto_adicional) {
      doc.setFontSize(10); doc.setFont('helvetica','normal')
      doc.text(c.texto_adicional, pw/2, 28, { align:'center' })
    }
    y = 50

    doc.setTextColor(0,120,200); doc.setFont('helvetica','bold'); doc.setFontSize(10)
    doc.text('COTIZACIÓN', ml, y)
    doc.text('CLIENTE', pw/2, y); y += 5
    doc.setFont('helvetica','normal'); doc.setTextColor(50,50,50)
    doc.text(c.proponente_nombre || '', ml, y)
    doc.setTextColor(0,120,200); doc.setFont('helvetica','bold')
    doc.text(c.cliente_nombre || '', pw/2, y); y += 5
    doc.setFont('helvetica','normal'); doc.setTextColor(50,50,50)
    if (c.proponente_cedula) { doc.text('C.C. ' + c.proponente_cedula, ml, y) }
    if (c.cliente_ciudad) doc.text(c.cliente_ciudad, pw/2, y)
    y += 5
    doc.text('Nº. ' + (c.numero || ''), ml, y)
    y += 5; doc.text(c.fecha || '', ml, y)
    if (c.proponente_telefono) { doc.text('Tel: ' + c.proponente_telefono, ml, y+5) }
    y += 14

    const colProd = usable*0.52, colCant = usable*0.12, colUnit = usable*0.18, colTot = usable*0.18, hH = 8
    doc.setFillColor(0,100,180); doc.rect(ml, y, usable, hH, 'F')
    doc.setTextColor(255,255,255); doc.setFont('helvetica','bold'); doc.setFontSize(9)
    doc.text('DESCRIPCION', ml+3, y+5.5)
    doc.text('CANT', ml+colProd+colCant/2, y+5.5, { align:'center' })
    doc.text('V/ UNITARIO', ml+colProd+colCant+colUnit/2, y+5.5, { align:'center' })
    doc.text('VALOR TOTAL', ml+colProd+colCant+colUnit+colTot/2, y+5.5, { align:'center' })
    y += hH

    doc.setTextColor(0,0,0); doc.setFont('helvetica','normal'); doc.setFontSize(9)
    const items = c.cotizacion_items || []
    items.forEach(item => {
      if (y > ph - 50) { doc.addPage(); y = 15 }
      const lineas = doc.splitTextToSize(item.producto_nombre || '', colProd - 4)
      const rH = Math.max(7, lineas.length * 5)
      doc.setDrawColor(180,180,180); doc.setLineWidth(0.2); doc.line(ml, y, ml+usable, y)
      doc.text(lineas, ml+3, y+4.5)
      doc.text(String(item.cantidad), ml+colProd+colCant/2, y+rH/2+1.5, { align:'center' })
      doc.text('$'+Number(item.valor_unitario).toLocaleString('es-CO'), ml+colProd+colCant+colUnit/2, y+rH/2+1.5, { align:'center' })
      doc.text('$'+Number(item.subtotal).toLocaleString('es-CO'), ml+colProd+colCant+colUnit+colTot/2, y+rH/2+1.5, { align:'center' })
      y += rH
    })
    doc.line(ml, y, ml+usable, y); y += 5
    doc.setFont('helvetica','bold'); doc.setTextColor(0,100,180)
    doc.text('Total', ml+colProd+colCant+colUnit-5, y+5)
    doc.text('$'+Number(c.total).toLocaleString('es-CO'), ml+usable, y+5, { align:'right' }); y += 14

    const totalPages = doc.internal.getNumberOfPages()
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i)
      doc.setFillColor(0,120,200); doc.rect(0, ph-25, pw*0.5, 25, 'F')
      doc.setFillColor(0,180,180); doc.rect(pw*0.5, ph-25, pw*0.5, 25, 'F')
      doc.setTextColor(255,255,255); doc.setFontSize(7.5); doc.setFont('helvetica','normal')
      if (c.notas) {
        const notaLineas = doc.splitTextToSize(c.notas, pw*0.45)
        doc.text(notaLineas, ml, ph-20)
      }
      doc.setFontSize(8)
      if (c.proponente_nombre) doc.text(c.proponente_nombre, pw*0.5 + 5, ph-10)
    }
    return doc
  }


  function generarPdfCot(c) {
    if (c.plantilla === 'sabana') return generarPdfCotSabana(c)
    if (c.plantilla === 'fenny') return generarPdfCotFenny(c)
    return generarPdfCotOficial(c)
  }

  function generarXlsxCot(c) {
    const XLSX = window.XLSX
    if (!XLSX) { alert('Cargando librería Excel, intenta de nuevo'); return }
    const items = c.cotizacion_items || []
    const wsData = [
      ['COTIZACIÓN', c.numero || '', '', ''],
      ['Fecha', c.fecha || '', '', ''],
      ['Cliente', c.cliente_nombre || '', '', ''],
      ['Ciudad', c.cliente_ciudad || '', '', ''],
      ['Proponente', c.proponente_nombre || '', '', ''],
      ['', '', '', ''],
      ['Producto', 'Cantidad', 'Valor Unitario', 'Total'],
      ...items.map(i => [i.producto_nombre, i.cantidad, i.valor_unitario, i.subtotal]),
      ['', '', 'TOTAL', c.total],
      ['', '', '', ''],
      ['Notas', c.notas || '', '', '']
    ]
    const ws = XLSX.utils.aoa_to_sheet(wsData)
    ws['!cols'] = [{ wch: 40 }, { wch: 12 }, { wch: 16 }, { wch: 16 }]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Cotización')
    XLSX.writeFile(wb, 'Cotizacion_' + (c.numero || c.id) + '_' + (c.cliente_nombre || '').replace(/\s+/g, '_') + '.xlsx')
  }

  function previewPdfCot(c) { const doc = generarPdfCot(c); if (!doc) return; setPdfPreview(URL.createObjectURL(doc.output('blob'))); setModal('pdfpreview') }
  function downloadPdfCot(c) { const doc = generarPdfCot(c); if (!doc) return; doc.save('Cotizacion_' + String(c.id).padStart(3, '0') + '_' + (c.cliente_nombre || '').replace(/\s+/g, '_') + '.pdf') }
  async function enviarEmailCot(c) {
    const doc = generarPdfCot(c); if (!doc) return
    setSendingEmail(true)
    const res = await api('/api/cotizaciones/email', 'POST', { pdfBase64: doc.output('datauristring').split(',')[1], cotizacionId: c.id, clienteNombre: c.cliente_nombre })
    setSendingEmail(false); if (res?.ok) alert('Email enviado'); else alert('Error: ' + (res?.error || 'desconocido'))
  }

  const saldoCaja = cajaMovs.reduce((s, m) => { const esE = m.movimiento === 'Entrada' || (!m.movimiento && (m.tipo === 'ingreso' || m.tipo === 'Ingreso')); return esE ? s + Number(m.valor) : s - Number(m.valor) }, 0)
  const navItems = [
    { id: 'dashboard', icon: '🏠', label: 'Dashboard' },
    { id: 'remisiones', icon: '📋', label: 'Remisiones' },
    { id: 'cotizaciones', icon: '📄', label: 'Cotizaciones' },
    { id: 'facturas', icon: '🧾', label: 'Facturas' },
    { id: 'caja', icon: '💰', label: 'Caja' },
    { id: 'productos', icon: '📦', label: 'Productos' },
    { id: 'clientes', icon: '👤', label: 'Clientes' },
    { id: 'remitentes', icon: '🏷️', label: 'Remitentes' }
  ]

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <aside style={{ width: 220, background: '#1e3a5f', borderRight: '1px solid #1a3050', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '20px 16px', borderBottom: '1px solid #1a3050', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, background: '#1a56db', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>⚙️</div>
          <div><div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>Insumos</div><div style={{ fontSize: 10, color: '#93c5fd' }}>Sistema de gestión</div></div>
        </div>
        <nav style={{ flex: 1, padding: '12px 8px', overflowY: 'auto' }}>
          {navItems.map(n => (
            <div key={n.id} onClick={() => { setPage(n.id); if (n.id === 'caja') loadCaja(currentCaja) }}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 6, cursor: 'pointer', marginBottom: 2, fontSize: 13, fontWeight: 500, background: page === n.id ? 'rgba(255,255,255,0.15)' : 'transparent', color: page === n.id ? '#fff' : '#93c5fd' }}>
              <span>{n.icon}</span>{n.label}
            </div>
          ))}
        </nav>
        <div style={{ padding: '12px 8px', borderTop: '1px solid #1a3050' }}>
          <div onClick={logout} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 6, cursor: 'pointer' }}>
            <div style={{ width: 30, height: 30, background: '#1a56db', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600, color: '#fff' }}>A</div>
            <div><div style={{ fontSize: 13, fontWeight: 500, color: '#fff' }}>Admin</div><div style={{ fontSize: 11, color: '#93c5fd' }}>Cerrar sesión</div></div>
          </div>
        </div>
      </aside>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#f4f6f9' }}>
        <div style={{ height: 56, borderBottom: '1px solid #dde1ea', display: 'flex', alignItems: 'center', padding: '0 24px', background: '#fff' }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#111928' }}>{navItems.find(n => n.id === page)?.label}</div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>

          {page === 'dashboard' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 16, marginBottom: 20 }}>
                {[{ icon: '📋', label: 'Remisiones', val: remisiones.length }, { icon: '📄', label: 'Cotizaciones', val: cotizaciones.length }, { icon: '🧾', label: 'Facturas', val: facturas.length }, { icon: '📦', label: 'Productos', val: productos.length }, { icon: '👤', label: 'Clientes', val: clientes.length }].map(s => (
                  <div key={s.label} className="card">
                    <div style={{ fontSize: 22, marginBottom: 10 }}>{s.icon}</div>
                    <div style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', fontWeight: 600 }}>{s.label}</div>
                    <div style={{ fontSize: 28, fontWeight: 700, color: '#1a56db' }}>{s.val}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {page === 'remisiones' && (
            <div className="card">
              <div className="card-header">
                <div><div className="card-title">Remisiones</div></div>
                <button className="btn btn-accent" onClick={() => openModal('remision')}>+ Nueva remisión</button>
              </div>
              {remisiones.length === 0 ? <div className="empty-state"><div className="icon">📋</div><p>No hay remisiones</p></div> : (
                <div style={{ overflowX: 'auto' }}>
                  <table><thead><tr><th>#</th><th>Fecha</th><th>Cliente</th><th>Remitente</th><th>Items</th><th>Acciones</th></tr></thead>
                    <tbody>{remisiones.map(r => (
                      <tr key={r.id}>
                        <td><span className="tag">#{r.id}</span></td>
                        <td>{r.fecha}</td><td>{r.cliente_nombre}</td><td>{r.remitente_nombre}</td>
                        <td>{(r.remision_items || []).length}</td>
                        <td style={{ whiteSpace: 'nowrap', display: 'flex', gap: 4 }}>
                          <button className="btn btn-sm" onClick={() => editRemision(r)}>✏️</button>
                          <button className="btn btn-sm" onClick={() => previewPdfRem(r)}>👁️</button>
                          <button className="btn btn-sm btn-success" onClick={() => downloadPdfRem(r)}>⬇️ PDF</button>
                          <button className="btn btn-sm" style={{ borderColor: '#6366f1', color: '#6366f1' }} onClick={() => enviarEmailRem(r)}>{sendingEmail ? '...' : '📧'}</button>
                          <button className="btn btn-sm btn-danger" onClick={() => delRemision(r.id)}>🗑️</button>
                        </td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {page === 'cotizaciones' && (
            <div className="card">
              <div className="card-header">
                <div><div className="card-title">Cotizaciones</div><div className="card-subtitle">Generador de cotizaciones con 3 plantillas</div></div>
                <button className="btn btn-accent" onClick={() => openCotizacion()}>+ Nueva cotización</button>
              </div>
              {cotizaciones.length === 0 ? <div className="empty-state"><div className="icon">📄</div><p>No hay cotizaciones</p></div> : (
                <div style={{ overflowX: 'auto' }}>
                  <table><thead><tr><th>#</th><th>Fecha</th><th>Cliente</th><th>Plantilla</th><th>Total</th><th>Acciones</th></tr></thead>
                    <tbody>{cotizaciones.map(c => (
                      <tr key={c.id}>
                        <td><span className="tag">{c.numero}</span></td>
                        <td>{c.fecha}</td><td>{c.cliente_nombre}</td>
                        <td><span className="badge badge-blue">{c.plantilla === 'oficial' ? 'Oficial Sugerida' : c.plantilla === 'sabana' ? 'Insumos Sabana' : c.plantilla === 'fenny' ? 'Luz Fenny' : c.plantilla}</span></td>
                        <td style={{ color: '#057a55', fontWeight: 600 }}>${Number(c.total).toLocaleString('es-CO')}</td>
                        <td style={{ whiteSpace: 'nowrap', display: 'flex', gap: 4 }}>
                          <button className="btn btn-sm" onClick={() => openCotizacion(c)}>✏️</button>
                          <button className="btn btn-sm" onClick={() => previewPdfCot(c)}>👁️</button>
                          <button className="btn btn-sm btn-success" onClick={() => downloadPdfCot(c)}>⬇️ PDF</button>
                          <button className="btn btn-sm" style={{ borderColor: '#10b981', color: '#10b981' }} onClick={() => generarXlsxCot(c)}>⬇️ XLS</button>
                          <button className="btn btn-sm" style={{ borderColor: '#6366f1', color: '#6366f1' }} onClick={() => enviarEmailCot(c)}>📧</button>
                          <button className="btn btn-sm btn-danger" onClick={() => delCotizacion(c.id)}>🗑️</button>
                        </td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {page === 'facturas' && (
            <div className="card">
              <div className="card-header">
                <div><div className="card-title">🧾 Facturas</div></div>
                <button className="btn btn-accent" onClick={() => openModal('factura')}>+ Nueva factura</button>
              </div>
              {facturas.length === 0 ? <div className="empty-state"><div className="icon">🧾</div><p>No hay facturas</p></div> : (
                <div style={{overflowX:'auto'}}>
                  <table><thead><tr><th>N°</th><th>Fecha</th><th>Cliente</th><th>Remitente</th><th style={{textAlign:'right'}}>Total</th><th style={{textAlign:'right'}}>A Pagar</th><th>Acciones</th></tr></thead>
                    <tbody>{facturas.map(f => (
                      <tr key={f.id}>
                        <td><span className="tag">{f.numero}</span></td>
                        <td>{f.fecha}</td>
                        <td>{f.cliente_nombre}</td>
                        <td>{f.remitente_nombre||'—'}</td>
                        <td style={{textAlign:'right'}}>{fmtCOP(f.total)}</td>
                        <td style={{textAlign:'right',fontWeight:700,color:'#059669'}}>{fmtCOP(f.valor_a_pagar)}</td>
                        <td style={{whiteSpace:'nowrap',display:'flex',gap:4}}>
                          <button className="btn btn-sm" title="Editar" onClick={() => openFacEdit(f)}>✏️</button>
                          <button className="btn btn-sm" title="Ver PDF" onClick={() => generarFacturaPDF(f)}>👁️</button>
                          <button className="btn btn-sm" title="Descargar Excel" onClick={() => exportarFacExcel(f)}>📊</button>
                          <button className="btn btn-sm" title="Enviar email" onClick={() => enviarFacturaEmail(f)}>{sendingEmail ? '...' : '📧'}</button>
                          <button className="btn btn-sm btn-danger" onClick={() => delFactura(f.id)}>🗑️</button>
                        </td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {page === 'caja' && (
            <div>
              <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
                {['Alejandro', 'Mincha', 'Santiago'].map(c => (
                  <button key={c} onClick={() => { setCurrentCaja(c); loadCaja(c) }}
                    style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid', cursor: 'pointer', fontSize: 13, fontWeight: 500, background: currentCaja === c ? '#1a56db' : '#fff', borderColor: currentCaja === c ? '#1a56db' : '#dde1ea', color: currentCaja === c ? '#fff' : '#6b7280' }}>
                    💼 Caja {c}
                  </button>
                ))}
              </div>
              <div style={{ background: '#1e3a5f', borderRadius: 10, padding: '20px 24px', marginBottom: 16, display: 'flex', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 12, color: '#93c5fd', fontWeight: 500 }}>Saldo actual — Caja {currentCaja}</div>
                  <div style={{ fontSize: 32, fontWeight: 700, color: '#fff', fontFamily: 'monospace' }}>${saldoCaja.toLocaleString('es-CO')}</div>
                </div>
                <div style={{display:'flex',gap:8,marginLeft:'auto'}}>
                  <button className="btn" onClick={()=>{const a=document.createElement('a');a.href='data:text/csv;charset=utf-8,fecha,tipo,concepto,valor,detalle\n2026-01-15,Ingreso,Pago cliente,500000,\n2026-01-16,Gasto,Transporte mercancía,45000,Transporte\n2026-01-17,Costo,Material oficina,30000,';a.download='template_caja.csv';a.click()}}>⬇️ Template</button>
                  <button className="btn" onClick={()=>cajaFileRef.current.click()}>📤 Carga masiva</button>
                  <input ref={cajaFileRef} type="file" accept=".csv" style={{display:'none'}} onChange={cargaMasivaCaja}/>
                  <button className="btn btn-accent" onClick={() => openModal('movimiento')}>+ Movimiento</button>
                </div>
              </div>
              <div className="card">
                <div className="card-header">
                  <div className="card-title">Movimientos</div>
                  <button className="btn btn-sm" onClick={()=>setCajaSortDesc(p=>!p)} style={{marginLeft:'auto'}}>
                    {cajaSortDesc ? '↓ Más reciente' : '↑ Más antigua'}
                  </button>
                </div>
                {cajaMovs.length === 0 ? <div className="empty-state"><div className="icon">💰</div><p>No hay movimientos</p></div> : (
                  <div style={{overflowX:'auto'}}>
                  <table><thead><tr>
                      <th>#</th><th>Fecha</th><th>Movimiento</th><th>Tipo</th><th>Detalle</th>
                      <th>Cliente</th><th>Contrato</th><th>Concepto</th><th>Monto</th><th>Saldo</th><th></th>
                    </tr></thead>
                    <tbody>{(() => {
                      let acum = 0
                      const conSaldo = cajaMovs.map((m, idx) => {
                        const esE = m.movimiento === 'Entrada' || (!m.movimiento && (m.tipo === 'ingreso' || m.tipo === 'Ingreso'))
                        acum += esE ? Number(m.valor) : -Number(m.valor)
                        return { ...m, _esE: esE, _saldo: acum, _num: idx + 1 }
                      })
                      const ordenados = cajaSortDesc ? [...conSaldo].reverse() : conSaldo
                      return ordenados.map(m => (
                        <tr key={m.id}>
                          <td style={{color:'#9ca3af',fontSize:11,textAlign:'center'}}>{m._num}</td>
                          <td>{m.fecha}</td>
                          <td style={{color: m._esE ? '#057a55' : '#c81e1e', fontWeight:600}}>{m._esE ? '↑ Entrada' : '↓ Salida'}</td>
                          <td style={{fontSize:12}}>{m.tipo}</td>
                          <td style={{color:'#6b7280',fontSize:12}}>{m.detalle||'—'}</td>
                          <td style={{fontSize:12}}>{m.cliente_nombre||'—'}</td>
                          <td style={{fontSize:12}}>{m.contrato||'—'}</td>
                          <td style={{fontSize:12}}>{m.concepto}</td>
                          <td style={{color: m._esE ? '#057a55' : '#c81e1e', fontFamily:'monospace'}}>{m._esE ? '+' : '-'}${Number(m.valor).toLocaleString('es-CO')}</td>
                          <td style={{fontFamily:'monospace'}}>${m._saldo.toLocaleString('es-CO')}</td>
                          <td style={{whiteSpace:'nowrap',display:'flex',gap:4}}>
                            <button className="btn btn-sm" title="Editar" onClick={()=>openMovEdit(m)}>✏️</button>
                            <button className="btn btn-sm btn-danger" title="Eliminar" onClick={()=>delMovimiento(m.id)}>🗑️</button>
                          </td>
                        </tr>
                      ))
                    })()}</tbody>
                  </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {page === 'productos' && (
            <div className="card">
              <div className="card-header">
                <div><div className="card-title">Productos</div></div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn" onClick={() => { const a = document.createElement('a'); a.href = 'data:text/csv;charset=utf-8,ref,nombre,unidad\nREF-001,Nombre del producto,Und'; a.download = 'template_productos.csv'; a.click() }}>⬇️ Template</button>
                  <button className="btn" onClick={() => fileRef.current.click()}>📤 Carga masiva</button>
                  <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={cargaMasiva} />
                  <button className="btn btn-accent" onClick={() => openModal('producto')}>+ Nuevo</button>
                </div>
              </div>
              {productos.length === 0 ? <div className="empty-state"><div className="icon">📦</div><p>No hay productos</p></div> : (
                <table><thead><tr><th>Ref.</th><th>Nombre</th><th>Unidad</th><th>Acciones</th></tr></thead>
                  <tbody>{productos.map(p => (
                    <tr key={p.id}>
                      <td><span className="tag">{p.ref}</span></td><td>{p.nombre}</td><td>{p.unidad || '—'}</td>
                      <td><button className="btn btn-sm" style={{ marginRight: 4 }} onClick={() => openModal('producto', p)}>✏️</button><button className="btn btn-sm btn-danger" onClick={() => delProducto(p.id)}>🗑️</button></td>
                    </tr>
                  ))}</tbody>
                </table>
              )}
            </div>
          )}

          {page === 'clientes' && (
            <div className="card">
              <div className="card-header">
                <div><div className="card-title">Clientes</div></div>
                <button className="btn btn-accent" onClick={() => openModal('cliente')}>+ Nuevo cliente</button>
              </div>
              {clientes.length === 0 ? <div className="empty-state"><div className="icon">👤</div><p>No hay clientes</p></div> : (
                <table><thead><tr><th>Nombre</th><th>NIT</th><th>Ciudad</th><th>Teléfono</th><th>Acciones</th></tr></thead>
                  <tbody>{clientes.map(c => (
                    <tr key={c.id}>
                      <td>{c.nombre}</td><td>{c.nit || '—'}</td><td>{c.ciudad || '—'}</td><td>{c.telefono || '—'}</td>
                      <td><button className="btn btn-sm" style={{ marginRight: 4 }} onClick={() => openModal('cliente', c)}>✏️</button><button className="btn btn-sm btn-danger" onClick={() => delCliente(c.id)}>🗑️</button></td>
                    </tr>
                  ))}</tbody>
                </table>
              )}
            </div>
          )}

          {page === 'remitentes' && (
            <div className="card">
              <div className="card-header">
                <div><div className="card-title">Remitentes</div></div>
                <button className="btn btn-accent" onClick={() => openModal('remitente')}>+ Nuevo remitente</button>
              </div>
              {remitentes.length === 0 ? <div className="empty-state"><div className="icon">🏷️</div><p>No hay remitentes</p></div> : (
                <table><thead><tr><th>Nombre</th><th>Cédula</th><th>Teléfono</th><th>Ciudad</th><th>Acciones</th></tr></thead>
                  <tbody>{remitentes.map(r => (
                    <tr key={r.id}>
                      <td>{r.nombre}</td><td>{r.cedula || '—'}</td><td>{r.telefono || '—'}</td><td>{r.ciudad || '—'}</td>
                      <td><button className="btn btn-sm" style={{ marginRight: 4 }} onClick={() => openModal('remitente', r)}>✏️</button><button className="btn btn-sm btn-danger" onClick={() => delRemitente(r.id)}>🗑️</button></td>
                    </tr>
                  ))}</tbody>
                </table>
              )}
            </div>
          )}

        </div>
      </div>

      {/* MODALES */}
      {modal && modal !== 'pdfpreview' && modal !== 'cotizacion' && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="modal" style={{ width: ['remision', 'factura'].includes(modal) ? 700 : 520 }}>
            <div className="modal-header">
              <div className="modal-title">
                {modal === 'producto' && (editObj ? 'Editar Producto' : 'Nuevo Producto')}
                {modal === 'cliente' && (editObj ? 'Editar Cliente' : 'Nuevo Cliente')}
                {modal === 'remitente' && (editObj ? 'Editar Remitente' : 'Nuevo Remitente')}
                {modal === 'remision' && (editObj ? 'Editar Remisión' : 'Nueva Remisión')}
                {modal === 'factura' && (editObj ? 'Editar Factura' : 'Nueva Factura')}
                {modal === 'movimiento' && (editObj ? 'Editar Movimiento' : 'Nuevo Movimiento') + ' — Caja ' + currentCaja}
              </div>
              <button className="modal-close" onClick={closeModal}>✕</button>
            </div>

            {modal === 'producto' && (<div><div className="form-row"><div className="field"><label>Ref. (auto)</label><input value={form.ref || ''} readOnly style={{background:'#f3f4f6',cursor:'default'}} /></div><div className="field"><label>Unidad</label><input value={form.unidad || ''} onChange={e => setF('unidad', e.target.value)} placeholder="Und, Kg..." /></div></div><div className="form-row"><div className="field" style={{ gridColumn: '1/-1' }}><label>Nombre</label><input value={form.nombre || ''} onChange={e => setF('nombre', e.target.value)} /></div></div><div className="modal-footer"><button className="btn" onClick={closeModal}>Cancelar</button><button className="btn btn-accent" onClick={saveProducto}>{loading ? 'Guardando...' : 'Guardar'}</button></div></div>)}

            {modal === 'cliente' && (<div><div className="form-row"><div className="field" style={{ gridColumn: '1/-1' }}><label>Nombre</label><input value={form.nombre || ''} onChange={e => setF('nombre', e.target.value)} /></div></div><div className="form-row"><div className="field"><label>NIT</label><input value={form.nit || ''} onChange={e => setF('nit', e.target.value)} /></div><div className="field"><label>Teléfono</label><input value={form.telefono || ''} onChange={e => setF('telefono', e.target.value)} /></div></div><div className="form-row"><div className="field"><label>Ciudad</label><input value={form.ciudad || ''} onChange={e => setF('ciudad', e.target.value)} /></div><div className="field"><label>Email</label><input value={form.email || ''} onChange={e => setF('email', e.target.value)} /></div></div><div className="form-row"><div className="field" style={{ gridColumn: '1/-1' }}><label>Dirección</label><input value={form.direccion || ''} onChange={e => setF('direccion', e.target.value)} /></div></div><div className="modal-footer"><button className="btn" onClick={closeModal}>Cancelar</button><button className="btn btn-accent" onClick={saveCliente}>{loading ? 'Guardando...' : 'Guardar'}</button></div></div>)}

            {modal === 'remitente' && (<div><div className="form-row"><div className="field" style={{ gridColumn: '1/-1' }}><label>Nombre completo</label><input value={form.nombre || ''} onChange={e => setF('nombre', e.target.value)} /></div></div><div className="form-row"><div className="field"><label>Cédula</label><input value={form.cedula || ''} onChange={e => setF('cedula', e.target.value)} /></div><div className="field"><label>Teléfono</label><input value={form.telefono || ''} onChange={e => setF('telefono', e.target.value)} /></div></div><div className="form-row"><div className="field"><label>Ciudad</label><input value={form.ciudad || ''} onChange={e => setF('ciudad', e.target.value)} /></div><div className="field"><label>Email</label><input value={form.email || ''} onChange={e => setF('email', e.target.value)} /></div></div><div className="form-row"><div className="field" style={{ gridColumn: '1/-1' }}><label>Dirección</label><input value={form.direccion || ''} onChange={e => setF('direccion', e.target.value)} /></div></div><div className="modal-footer"><button className="btn" onClick={closeModal}>Cancelar</button><button className="btn btn-accent" onClick={saveRemitente}>{loading ? 'Guardando...' : 'Guardar'}</button></div></div>)}

            {modal === 'remision' && (<div>
              <div className="form-row">
                <div className="field"><label>Fecha</label><input type="date" value={form.fecha || ''} onChange={e => setF('fecha', e.target.value)} /></div>
                <div className="field"><label>Cliente</label><select value={form.cliente_nombre || ''} onChange={e => setF('cliente_nombre', e.target.value)}><option value="">Seleccionar...</option>{clientes.map(c => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}</select></div>
                <div className="field"><label>Remitente</label><select value={form.remitente_nombre || ''} onChange={e => setF('remitente_nombre', e.target.value)}><option value="">Seleccionar...</option>{remitentes.map(r => <option key={r.id} value={r.nombre}>{r.nombre}</option>)}</select></div>
              </div>
              <div className="field" style={{ marginBottom: 14, position:'relative' }}>
                <label>Buscar y agregar producto</label>
                <input type="text" value={remSearch} onChange={e=>setRemSearch(e.target.value)} placeholder="Escribe para buscar..." style={{ width:'100%', background:'#fff', border:'1px solid #dde1ea', borderRadius:6, padding:'9px 12px', color:'#111928', fontFamily:'inherit', fontSize:13 }}/>
                {remSearch && (
                  <div style={{position:'absolute',top:'100%',left:0,right:0,background:'#fff',border:'1px solid #dde1ea',borderRadius:'0 0 6px 6px',maxHeight:200,overflowY:'auto',zIndex:100,boxShadow:'0 4px 12px rgba(0,0,0,0.1)'}}>
                    {productos.filter(p=>(p.nombre||'').toLowerCase().includes(remSearch.toLowerCase())).slice(0,12).map(p=>(
                      <div key={p.id} onClick={()=>{toggleProdRem(p.id);setRemSearch('')}} style={{padding:'8px 12px',cursor:'pointer',borderBottom:'1px solid #f0f0f0',fontSize:13}}>
                        {p.nombre} {p.ref ? <span style={{color:'#6b7280',fontSize:11}}>({p.ref})</span> : ''}
                      </div>
                    ))}
                    {productos.filter(p=>(p.nombre||'').toLowerCase().includes(remSearch.toLowerCase())).length===0 && (
                      <div style={{padding:'10px 12px',color:'#9ca3af',fontSize:13}}>Sin resultados</div>
                    )}
                  </div>
                )}
              </div>
              {Object.values(remItems).length > 0 && (
                <table style={{ marginBottom: 14 }}>
                  <thead><tr><th>Producto</th><th>Unidad</th><th>Cantidad</th><th></th></tr></thead>
                  <tbody>{Object.values(remItems).map(it => (
                    <tr key={it.prod.id}>
                      <td style={{ whiteSpace: 'normal', wordBreak: 'break-word', maxWidth: 200 }}>{it.prod.nombre}</td>
                      <td>{it.prod.unidad || '—'}</td>
                      <td><input type="number" min="1" value={it.qty} onChange={e => setRemItems(prev => ({ ...prev, [it.prod.id]: { ...prev[it.prod.id], qty: Number(e.target.value) || 1 } }))} style={{ width: 70, background: '#fff', border: '1px solid #dde1ea', borderRadius: 4, padding: '4px 8px', color: '#111928', textAlign: 'center' }} /></td>
                      <td><button onClick={() => setRemItems(prev => { const n = { ...prev }; delete n[it.prod.id]; return n })} style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: 16 }}>✕</button></td>
                    </tr>
                  ))}</tbody>
                </table>
              )}
              <div className="modal-footer">
                <button className="btn" onClick={closeModal}>Cancelar</button>
                <button className="btn btn-accent" onClick={saveRemision}>{loading ? 'Guardando...' : editObj ? 'Actualizar' : 'Guardar'}</button>
              </div>
            </div>)}

            {modal === 'factura' && (() => {
              const tots = calcFacTotales()
              const inS = { width:'100%', background:'#fff', border:'1px solid #dde1ea', borderRadius:6, padding:'9px 12px', color:'#111928', fontFamily:'inherit', fontSize:13 }
              const secS = { background:'#f9fafb', borderRadius:8, padding:'12px 14px', marginBottom:12, border:'1px solid #eef0f4' }
              return (
                <div>
                  <div className="form-row">
                    <div className="field"><label>Consecutivo</label><input value={form.numero||''} onChange={e=>setF('numero',e.target.value)} placeholder="FAC-001" style={inS}/></div>
                    <div className="field"><label>Fecha</label><input type="date" value={form.fecha||''} onChange={e=>setF('fecha',e.target.value)} /></div>
                    <div className="field"><label>Formato PDF</label>
                      <select value={facFormato} onChange={e=>setFacFormato(Number(e.target.value))} style={inS}>
                        <option value={1}>Formato 1 — Clásico</option>
                        <option value={2}>Formato 2 — Azul Marino</option>
                        <option value={3}>Formato 3 — Corporativo</option>
                        <option value={4}>Formato 4 — Minimalista</option>
                        <option value={5}>Formato 5 — Verde</option>
                      </select>
                    </div>
                  </div>
                  <div style={secS}>
                    <div style={{fontWeight:700,fontSize:13,marginBottom:8,color:'#1a56db'}}>👤 Cliente</div>
                    <div className="field" style={{marginBottom:8}}><label>Seleccionar Cliente</label>
                      <select onChange={e=>{const cl=clientes.find(x=>x.nombre===e.target.value);if(cl){setF('cliente_nombre',cl.nombre);setF('cliente_nit',cl.nit||'');setF('cliente_ciudad',cl.ciudad||'');setF('cliente_telefono',cl.telefono||'');setF('cliente_email',cl.email||'');setF('cliente_direccion',cl.direccion||'')}}} style={inS}>
                        <option value="">Seleccionar...</option>
                        {clientes.map(cl=><option key={cl.id} value={cl.nombre}>{cl.nombre}</option>)}
                      </select>
                    </div>
                    {form.cliente_nombre && (
                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'4px 16px',fontSize:12,color:'#374151',background:'#fff',borderRadius:6,padding:10,border:'1px solid #e5e7eb'}}>
                        <div><span style={{color:'#6b7280'}}>Nombre:</span> {form.cliente_nombre}</div>
                        <div><span style={{color:'#6b7280'}}>NIT:</span> {form.cliente_nit}</div>
                        <div><span style={{color:'#6b7280'}}>Ciudad:</span> {form.cliente_ciudad}</div>
                        <div><span style={{color:'#6b7280'}}>Tel:</span> {form.cliente_telefono}</div>
                        <div style={{gridColumn:'1/-1'}}><span style={{color:'#6b7280'}}>Dirección:</span> {form.cliente_direccion}</div>
                      </div>
                    )}
                  </div>
                  <div style={secS}>
                    <div style={{fontWeight:700,fontSize:13,marginBottom:8,color:'#1a56db'}}>📋 Remitente (proveedor)</div>
                    <div className="field" style={{marginBottom:8}}><label>Seleccionar Remitente</label>
                      <select onChange={e=>selectFacRemitente(e.target.value)} style={inS}>
                        <option value="">Seleccionar...</option>
                        {remitentes.map(r=><option key={r.id} value={r.nombre}>{r.nombre}</option>)}
                      </select>
                    </div>
                    {facRemitente && (
                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'4px 16px',fontSize:12,color:'#374151',background:'#fff',borderRadius:6,padding:10,border:'1px solid #e5e7eb'}}>
                        <div><span style={{color:'#6b7280'}}>CC:</span> {facRemitente.cedula}</div>
                        <div><span style={{color:'#6b7280'}}>Tel:</span> {facRemitente.telefono}</div>
                        <div><span style={{color:'#6b7280'}}>Ciudad:</span> {facRemitente.ciudad}</div>
                        <div><span style={{color:'#6b7280'}}>Email:</span> {facRemitente.email}</div>
                        <div style={{gridColumn:'1/-1'}}><span style={{color:'#6b7280'}}>Dirección:</span> {facRemitente.direccion}</div>
                      </div>
                    )}
                  </div>
                  <div className="field" style={{marginBottom:12}}><label>Por concepto de</label>
                    <input value={facConcepto} onChange={e=>setFacConcepto(e.target.value)} placeholder="Ej: Insumos de aseo, papelería..." style={inS}/>
                  </div>
                  <div className="field" style={{marginBottom:8}}><label>Agregar producto</label>
                    <select onChange={e=>{if(e.target.value){addProductoFac(productos.find(x=>x.id==e.target.value));e.target.value=''}}} style={inS}>
                      <option value="">Seleccionar producto...</option>
                      {productos.map(p=><option key={p.id} value={p.id}>{p.nombre}</option>)}
                    </select>
                  </div>
                  {facItems.length > 0 && (
                    <div style={{overflowX:'auto',marginBottom:8}}>
                      <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
                        <thead><tr style={{background:'#f3f4f6'}}>
                          <th style={{padding:'6px 8px',textAlign:'center',width:32}}>#</th>
                          <th style={{padding:'6px 8px',textAlign:'left'}}>Producto</th>
                          <th style={{padding:'6px 8px',textAlign:'center',width:80}}>Cantidad</th>
                          <th style={{padding:'6px 8px',textAlign:'right',width:120}}>Valor Unitario</th>
                          <th style={{padding:'6px 8px',textAlign:'right',width:120}}>Valor Total</th>
                          <th style={{width:28}}></th>
                        </tr></thead>
                        <tbody>
                          {facItems.map((it,idx)=>(
                            <tr key={it.id} style={{borderBottom:'1px solid #f0f0f0'}}>
                              <td style={{padding:'5px 8px',textAlign:'center',color:'#6b7280'}}>{idx+1}</td>
                              <td style={{padding:'5px 8px'}}>{it.nombre}</td>
                              <td style={{padding:'5px 8px'}}>
                                <input type="number" min="1" value={it.cantidad} onChange={e=>updateFacItem(it.id,'cantidad',e.target.value)} style={{width:60,background:'#fff',border:'1px solid #dde1ea',borderRadius:4,padding:'4px 6px',textAlign:'center',fontSize:12}}/>
                              </td>
                              <td style={{padding:'5px 8px'}}>
                                <input type="number" min="0" value={it.valorUnitario} onChange={e=>updateFacItem(it.id,'valorUnitario',e.target.value)} style={{width:110,background:'#fff',border:'1px solid #dde1ea',borderRadius:4,padding:'4px 6px',textAlign:'right',fontSize:12}}/>
                              </td>
                              <td style={{padding:'5px 8px',textAlign:'right',fontWeight:600}}>{fmtCOP(it.subtotal)}</td>
                              <td><button onClick={()=>removeFacItem(it.id)} style={{background:'none',border:'none',color:'#9ca3af',cursor:'pointer',fontSize:14}}>✕</button></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div style={{marginTop:12,background:'#f9fafb',borderRadius:8,padding:'10px 14px',border:'1px solid #eef0f4'}}>
                        <div style={{display:'flex',justifyContent:'space-between',padding:'5px 0',borderBottom:'1px solid #e5e7eb'}}>
                          <span style={{fontWeight:600,fontSize:13}}>TOTAL</span>
                          <span style={{fontWeight:700,fontSize:14}}>{fmtCOP(tots.subtotal)}</span>
                        </div>
                        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:'1px solid #e5e7eb'}}>
                          <div style={{display:'flex',alignItems:'center',gap:8}}>
                            <span style={{fontWeight:600,fontSize:13}}>RETENCIÓN</span>
                            <input type="number" min="0" max="100" step="0.5" value={facRetencion} onChange={e=>setFacRetencion(Number(e.target.value)||0)} style={{width:52,background:'#fff',border:'1px solid #dde1ea',borderRadius:4,padding:'3px 6px',textAlign:'center',fontSize:12}}/>
                            <span style={{fontSize:13,color:'#6b7280'}}>%</span>
                          </div>
                          <span style={{fontSize:13,color:'#6b7280'}}>{fmtCOP(tots.retencionValor)}</span>
                        </div>
                        <div style={{display:'flex',justifyContent:'space-between',padding:'8px 0 4px'}}>
                          <span style={{fontWeight:700,fontSize:14}}>VALOR A PAGAR</span>
                          <span style={{fontWeight:700,fontSize:16,color:'#059669'}}>{fmtCOP(tots.valorAPagar)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="modal-footer">
                    <button className="btn" onClick={closeModal}>Cancelar</button>
                    <button className="btn btn-accent" onClick={saveFactura}>{loading ? 'Guardando...' : 'Guardar Factura'}</button>
                  </div>
                </div>
              )
            })()}

            {modal === 'movimiento' && (
              <div>
                <div className="form-row">
                  <div className="field"><label>Fecha</label><input type="date" value={form.fecha||''} onChange={e=>setF('fecha',e.target.value)} /></div>
                  <div className="field"><label>Movimiento</label>
                    <select value={form.movimiento||'Entrada'} onChange={e=>setF('movimiento',e.target.value)}>
                      <option value="Entrada">↑ Entrada</option>
                      <option value="Salida">↓ Salida</option>
                    </select>
                  </div>
                  <div className="field"><label>Tipo</label>
                    <select value={form.tipo||'Ingreso'} onChange={e=>{setF('tipo',e.target.value);if(e.target.value!=='Gasto')setF('detalle','')}}>
                      <option value="Ingreso">Ingreso</option>
                      <option value="Costo">Costo</option>
                      <option value="Gasto">Gasto</option>
                    </select>
                  </div>
                  {form.tipo==='Gasto' && (
                    <div className="field"><label>Detalle</label>
                      <select value={form.detalle||''} onChange={e=>setF('detalle',e.target.value)}>
                        <option value="">Seleccionar...</option>
                        <option value="Transporte">Transporte</option>
                        <option value="Generales">Generales</option>
                        <option value="Comisiones">Comisiones</option>
                        <option value="Contribuciones">Contribuciones</option>
                      </select>
                    </div>
                  )}
                </div>
                <div className="form-row">
                  <div className="field"><label>Cliente</label>
                    <select value={form.cliente_nombre||''} onChange={e=>setF('cliente_nombre',e.target.value)}>
                      <option value="">Seleccionar...</option>
                      <option value="Varios">Varios</option>
                      {clientes.map(cl=><option key={cl.id} value={cl.nombre}>{cl.nombre}</option>)}
                    </select>
                  </div>
                  <div className="field"><label>Contrato</label>
                    {['','Aseo','Papelería','Tecnología','Enseres'].includes(form.contrato||'') ? (
                      <select value={form.contrato||''} onChange={e=>setF('contrato',e.target.value)}>
                        <option value="">Seleccionar...</option>
                        <option value="Aseo">Aseo</option>
                        <option value="Papelería">Papelería</option>
                        <option value="Tecnología">Tecnología</option>
                        <option value="Enseres">Enseres</option>
                        <option value="__nuevo__">+ Añadir nuevo...</option>
                      </select>
                    ) : (
                      <div style={{display:'flex',gap:6}}>
                        <input value={form.contrato==='__nuevo__'?'':form.contrato} onChange={e=>setF('contrato',e.target.value)} placeholder="Nombre del contrato..." style={{flex:1,background:'#fff',border:'1px solid #dde1ea',borderRadius:6,padding:'9px 12px',fontSize:13}}/>
                        <button onClick={()=>setF('contrato','')} style={{background:'none',border:'1px solid #dde1ea',borderRadius:6,padding:'6px 10px',cursor:'pointer',color:'#6b7280'}}>✕</button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="form-row"><div className="field" style={{gridColumn:'1/-1'}}><label>Concepto</label><input value={form.concepto||''} onChange={e=>setF('concepto',e.target.value)} /></div></div>
                <div className="form-row"><div className="field"><label>Monto</label><input type="number" value={form.valor||''} onChange={e=>setF('valor',e.target.value)} /></div></div>
                <div className="modal-footer">
                  <button className="btn" onClick={closeModal}>Cancelar</button>
                  <button className="btn btn-accent" onClick={saveMovimiento}>{loading ? 'Guardando...' : 'Registrar'}</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL COTIZACION */}
      {modal === 'cotizacion' && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="modal" style={{ width: '90vw', maxWidth: 900 }}>
            <div className="modal-header">
              <div className="modal-title">{editObj ? 'Editar Cotización' : 'Nueva Cotización'}</div>
              <button className="modal-close" onClick={closeModal}>✕</button>
            </div>
            <div className="form-row">
              <div className="field"><label>Número</label><input value={form.numero || ''} onChange={e => setF('numero', e.target.value)} /></div>
              <div className="field"><label>Fecha</label><input type="date" value={form.fecha || ''} onChange={e => setF('fecha', e.target.value)} /></div>
              <div className="field"><label>Plantilla</label>
                <select value={form.plantilla || 'oficial'} onChange={e => setF('plantilla', e.target.value)}>
                  <option value="oficial">Oficial Sugerida</option>
                  <option value="sabana">Insumos Sabana</option>
                  <option value="fenny">Luz Fenny</option>
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="field" style={{gridColumn:'1/-1'}}><label>Título del documento (editable)</label><input value={form.titulo || 'Cotización de Insumos'} onChange={e => setF('titulo', e.target.value)} placeholder="Cotización de Insumos" /></div>
            </div>
            <div className="form-row">
              <div className="field" style={{gridColumn:'1/-1'}}><label>Texto adicional (editable)</label><input value={form.texto_adicional || ''} onChange={e => setF('texto_adicional', e.target.value)} placeholder="Texto adicional debajo del título" /></div>
            </div>
            <div className="form-row">
              <div className="field"><label>Cliente</label>
                <select value={form.cliente_nombre || ''} onChange={e => {
                  const c = clientes.find(x => x.nombre === e.target.value)
                  setF('cliente_nombre', e.target.value)
                  if (c) { setF('cliente_ciudad', c.ciudad || ''); setF('cliente_nit', c.nit || '') }
                }}>
                  <option value="">Seleccionar...</option>
                  {clientes.map(c => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}
                </select>
              </div>
              <div className="field"><label>Ciudad cliente</label><input value={form.cliente_ciudad || ''} onChange={e => setF('cliente_ciudad', e.target.value)} placeholder="Ciudad" /></div>
            </div>
            <div className="form-row">
              <div className="field"><label>Proponente</label>
                <select value={form.proponente_nombre || ''} onChange={e => {
                  const r = remitentes.find(x => x.nombre === e.target.value)
                  setF('proponente_nombre', e.target.value)
                  if (r) { setF('proponente_email', r.email || ''); setF('proponente_telefono', r.telefono || ''); setF('proponente_cedula', r.cedula || '') }
                }}>
                  <option value="">Seleccionar...</option>
                  {remitentes.map(r => <option key={r.id} value={r.nombre}>{r.nombre}</option>)}
                </select>
              </div>
              <div className="field"><label>Email proponente</label><input value={form.proponente_email || ''} onChange={e => setF('proponente_email', e.target.value)} /></div>
              <div className="field"><label>Teléfono proponente</label><input value={form.proponente_telefono || ''} onChange={e => setF('proponente_telefono', e.target.value)} /></div>
              <div className="field"><label>Cédula proponente</label><input value={form.proponente_cedula || ''} onChange={e => setF('proponente_cedula', e.target.value)} /></div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Productos</label>
                <button className="btn btn-sm btn-accent" onClick={addCotItem}>+ Agregar fila</button>
              </div>
              <table>
                <thead><tr><th style={{ width: '45%' }}>Producto</th><th>Cantidad</th><th>Valor Unitario</th><th>Subtotal</th><th></th></tr></thead>
                <tbody>
                  {cotItems.map((item, idx) => (
                    <tr key={idx}>
                      <td>
                        <input list={'prod-list-' + idx} value={item.producto_nombre || ''} onChange={e => updateCotItem(idx, 'producto_nombre', e.target.value)} style={{ width: '100%', background: '#fff', border: '1px solid #dde1ea', borderRadius: 4, padding: '5px 8px', fontSize: 12 }} placeholder="Nombre del producto" />
                        <datalist id={'prod-list-' + idx}>{productos.map(p => <option key={p.id} value={p.nombre} />)}</datalist>
                      </td>
                      <td><input type="number" min="1" value={item.cantidad} onChange={e => updateCotItem(idx, 'cantidad', Number(e.target.value))} style={{ width: 70, background: '#fff', border: '1px solid #dde1ea', borderRadius: 4, padding: '5px 8px', textAlign: 'center', fontSize: 12 }} /></td>
                      <td><input type="number" value={item.valor_unitario} onChange={e => updateCotItem(idx, 'valor_unitario', Number(e.target.value))} style={{ width: 110, background: '#fff', border: '1px solid #dde1ea', borderRadius: 4, padding: '5px 8px', textAlign: 'right', fontSize: 12 }} /></td>
                      <td style={{ fontFamily: 'monospace', fontSize: 12, color: '#1a56db', fontWeight: 600 }}>${Number(item.subtotal).toLocaleString('es-CO')}</td>
                      <td><button onClick={() => removeCotItem(idx)} style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: 16 }}>✕</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ textAlign: 'right', padding: '10px 0', fontWeight: 700, fontSize: 15, color: '#1a56db' }}>
                TOTAL: ${cotItems.reduce((s, i) => s + Number(i.subtotal), 0).toLocaleString('es-CO')}
              </div>
            </div>

            <div className="field" style={{ marginBottom: 14 }}>
              <label>Notas / Términos y condiciones</label>
              <textarea value={form.notas || ''} onChange={e => setF('notas', e.target.value)} style={{ width: '100%', background: '#fff', border: '1px solid #dde1ea', borderRadius: 6, padding: '9px 12px', color: '#111928', fontFamily: 'inherit', fontSize: 13, minHeight: 80, resize: 'vertical' }} placeholder="Ej: Cotización válida por 7 días..." />
            </div>

            <div className="modal-footer">
              <button className="btn" onClick={closeModal}>Cancelar</button>
              <button className="btn btn-accent" onClick={saveCotizacion}>{loading ? 'Guardando...' : editObj ? 'Actualizar' : 'Guardar cotización'}</button>
            </div>
          </div>
        </div>
      )}

      {modal === 'pdfpreview' && pdfPreview && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && closeModal()}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 20, width: '90vw', height: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ fontWeight: 600, fontSize: 15 }}>Vista previa</div>
              <button className="modal-close" onClick={closeModal}>✕</button>
            </div>
            <iframe src={pdfPreview} style={{ flex: 1, border: 'none', borderRadius: 8, width: '100%' }} />
          </div>
        </div>
      )}

      <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js" async></script>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js" async></script>
    </div>
  )
}
