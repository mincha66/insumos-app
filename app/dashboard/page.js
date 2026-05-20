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
  const [modal, setModal] = useState(null)
  const [editObj, setEditObj] = useState(null)
  const [remItems, setRemItems] = useState({})
  const [facItems, setFacItems] = useState({})
  const [cotItems, setCotItems] = useState([])
  const [form, setForm] = useState({})
  const [loading, setLoading] = useState(false)
  const [pdfPreview, setPdfPreview] = useState(null)
  const [sendingEmail, setSendingEmail] = useState(false)
  const fileRef = useRef()
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
  function openModal(name, obj = null) { setModal(name); setEditObj(obj); setForm(obj || {}); setRemItems({}); setFacItems({}); if (name !== 'cotizacion') setCotItems([]); setPdfPreview(null) }
  function closeModal() { setModal(null); setEditObj(null); setForm({}); setPdfPreview(null); setCotItems([]) }
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

  function toggleProdFac(p) { setFacItems(prev => { const n = { ...prev }; if (n[p.id]) delete n[p.id]; else n[p.id] = { prod: p, qty: 1 }; return n }) }
  async function saveFactura() {
    setLoading(true)
    const items = Object.values(facItems).map(i => ({ producto_nombre: i.prod.nombre, precio_unitario: i.prod.precio, cantidad: i.qty, subtotal: i.prod.precio * i.qty }))
    const total = items.reduce((s, i) => s + i.subtotal, 0)
    const numero = 'FAC-' + String(facturas.length + 1).padStart(3, '0')
    await api('/api/facturas', 'POST', { fecha: form.fecha, cliente_nombre: form.cliente_nombre, numero, total, items })
    await loadAll(); closeModal(); setLoading(false)
  }
  async function delFactura(id) { if (!window.confirm('¿Seguro que desea eliminar?')) return; await api('/api/facturas/' + id, 'DELETE'); await loadAll() }
  async function saveMovimiento() { setLoading(true); await api('/api/caja', 'POST', { ...form, caja: currentCaja }); await loadCaja(currentCaja); closeModal(); setLoading(false) }
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
    doc.rect(0, 0, pw, 35, 'F')
    doc.setFillColor(30, 58, 95)
    doc.rect(0, ph - 30, pw, 30, 'F')

    doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(11)
    doc.text(c.fecha || '', pw - 15, 15, { align: 'right' })

    let y = 45
    doc.setTextColor(30, 58, 95); doc.setFont('helvetica', 'bold'); doc.setFontSize(16)
    doc.text(c.titulo || 'Cotización de Insumos', ml, y); y += 7
    if (c.texto_adicional) {
      doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(80,80,80)
      doc.text(c.texto_adicional, ml, y); y += 7
    }
    y += 3
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

    if (c.notas) {
      if (y > ph - 50) { doc.addPage(); y = 15 }
      doc.setFont('helvetica','bold'); doc.setFontSize(10); doc.setTextColor(30,58,95)
      doc.text('Nota:', ml, y); y += 5
      doc.setFont('helvetica','normal'); doc.setTextColor(80,80,80); doc.setFontSize(9)
      const notaLineas = doc.splitTextToSize(c.notas, usable)
      doc.text(notaLineas, ml, y)
    }

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

    if (c.notas) {
      if (y > ph - 40) { doc.addPage(); y = 15 }
      doc.setTextColor(50,50,50); doc.setFont('helvetica','normal'); doc.setFontSize(9)
      doc.text(doc.splitTextToSize(c.notas, usable), ml, y); y += 10
    }

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

  const saldoCaja = cajaMovs.reduce((s, m) => m.tipo === 'ingreso' ? s + Number(m.valor) : s - Number(m.valor), 0)
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
                <div><div className="card-title">Facturas</div></div>
                <button className="btn btn-accent" onClick={() => openModal('factura')}>+ Nueva factura</button>
              </div>
              {facturas.length === 0 ? <div className="empty-state"><div className="icon">🧾</div><p>No hay facturas</p></div> : (
                <table><thead><tr><th>#</th><th>Fecha</th><th>Cliente</th><th>Total</th><th>Acciones</th></tr></thead>
                  <tbody>{facturas.map(f => (
                    <tr key={f.id}>
                      <td><span className="tag">{f.numero}</span></td><td>{f.fecha}</td><td>{f.cliente_nombre}</td>
                      <td style={{ color: '#057a55', fontWeight: 600 }}>${Number(f.total).toLocaleString('es-CO')}</td>
                      <td><button className="btn btn-sm btn-danger" onClick={() => delFactura(f.id)}>🗑️</button></td>
                    </tr>
                  ))}</tbody>
                </table>
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
                <button className="btn btn-accent" style={{ marginLeft: 'auto' }} onClick={() => openModal('movimiento')}>+ Movimiento</button>
              </div>
              <div className="card">
                <div className="card-header"><div className="card-title">Movimientos</div></div>
                {cajaMovs.length === 0 ? <div className="empty-state"><div className="icon">💰</div><p>No hay movimientos</p></div> : (
                  <table><thead><tr><th>Fecha</th><th>Concepto</th><th>Tipo</th><th>Valor</th><th>Saldo</th><th></th></tr></thead>
                    <tbody>{(() => { let acum = 0; return cajaMovs.map(m => { acum += m.tipo === 'ingreso' ? Number(m.valor) : -Number(m.valor); return (<tr key={m.id}><td>{m.fecha}</td><td>{m.concepto}</td><td style={{ color: m.tipo === 'ingreso' ? '#057a55' : '#c81e1e', fontWeight: 600 }}>{m.tipo === 'ingreso' ? '↑ Ingreso' : '↓ Egreso'}</td><td style={{ color: m.tipo === 'ingreso' ? '#057a55' : '#c81e1e', fontFamily: 'monospace' }}>{m.tipo === 'ingreso' ? '+' : '-'}${Number(m.valor).toLocaleString('es-CO')}</td><td style={{ fontFamily: 'monospace' }}>${acum.toLocaleString('es-CO')}</td><td><button className="btn btn-sm btn-danger" onClick={() => delMovimiento(m.id)}>🗑️</button></td></tr>) }) })()}</tbody>
                  </table>
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
                {modal === 'factura' && 'Nueva Factura'}
                {modal === 'movimiento' && 'Nuevo Movimiento — Caja ' + currentCaja}
              </div>
              <button className="modal-close" onClick={closeModal}>✕</button>
            </div>

            {modal === 'producto' && (<div><div className="form-row"><div className="field"><label>Referencia</label><input value={form.ref || ''} onChange={e => setF('ref', e.target.value)} placeholder="REF-001" /></div><div className="field"><label>Unidad</label><input value={form.unidad || ''} onChange={e => setF('unidad', e.target.value)} placeholder="Und, Kg..." /></div></div><div className="form-row"><div className="field" style={{ gridColumn: '1/-1' }}><label>Nombre</label><input value={form.nombre || ''} onChange={e => setF('nombre', e.target.value)} /></div></div><div className="modal-footer"><button className="btn" onClick={closeModal}>Cancelar</button><button className="btn btn-accent" onClick={saveProducto}>{loading ? 'Guardando...' : 'Guardar'}</button></div></div>)}

            {modal === 'cliente' && (<div><div className="form-row"><div className="field" style={{ gridColumn: '1/-1' }}><label>Nombre</label><input value={form.nombre || ''} onChange={e => setF('nombre', e.target.value)} /></div></div><div className="form-row"><div className="field"><label>NIT</label><input value={form.nit || ''} onChange={e => setF('nit', e.target.value)} /></div><div className="field"><label>Teléfono</label><input value={form.telefono || ''} onChange={e => setF('telefono', e.target.value)} /></div></div><div className="form-row"><div className="field"><label>Ciudad</label><input value={form.ciudad || ''} onChange={e => setF('ciudad', e.target.value)} /></div><div className="field"><label>Email</label><input value={form.email || ''} onChange={e => setF('email', e.target.value)} /></div></div><div className="form-row"><div className="field" style={{ gridColumn: '1/-1' }}><label>Dirección</label><input value={form.direccion || ''} onChange={e => setF('direccion', e.target.value)} /></div></div><div className="modal-footer"><button className="btn" onClick={closeModal}>Cancelar</button><button className="btn btn-accent" onClick={saveCliente}>{loading ? 'Guardando...' : 'Guardar'}</button></div></div>)}

            {modal === 'remitente' && (<div><div className="form-row"><div className="field" style={{ gridColumn: '1/-1' }}><label>Nombre completo</label><input value={form.nombre || ''} onChange={e => setF('nombre', e.target.value)} /></div></div><div className="form-row"><div className="field"><label>Cédula</label><input value={form.cedula || ''} onChange={e => setF('cedula', e.target.value)} /></div><div className="field"><label>Teléfono</label><input value={form.telefono || ''} onChange={e => setF('telefono', e.target.value)} /></div></div><div className="form-row"><div className="field"><label>Ciudad</label><input value={form.ciudad || ''} onChange={e => setF('ciudad', e.target.value)} /></div><div className="field"><label>Email</label><input value={form.email || ''} onChange={e => setF('email', e.target.value)} /></div></div><div className="form-row"><div className="field" style={{ gridColumn: '1/-1' }}><label>Dirección</label><input value={form.direccion || ''} onChange={e => setF('direccion', e.target.value)} /></div></div><div className="modal-footer"><button className="btn" onClick={closeModal}>Cancelar</button><button className="btn btn-accent" onClick={saveRemitente}>{loading ? 'Guardando...' : 'Guardar'}</button></div></div>)}

            {modal === 'remision' && (<div>
              <div className="form-row">
                <div className="field"><label>Fecha</label><input type="date" value={form.fecha || ''} onChange={e => setF('fecha', e.target.value)} /></div>
                <div className="field"><label>Cliente</label><select value={form.cliente_nombre || ''} onChange={e => setF('cliente_nombre', e.target.value)}><option value="">Seleccionar...</option>{clientes.map(c => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}</select></div>
                <div className="field"><label>Remitente</label><select value={form.remitente_nombre || ''} onChange={e => setF('remitente_nombre', e.target.value)}><option value="">Seleccionar...</option>{remitentes.map(r => <option key={r.id} value={r.nombre}>{r.nombre}</option>)}</select></div>
              </div>
              <div className="field" style={{ marginBottom: 14 }}>
                <label>Buscar y agregar producto</label>
                <select size="4" onChange={e => { if (e.target.value) { toggleProdRem(e.target.value); e.target.value = '' } }} style={{ width: '100%', background: '#fff', border: '1px solid #dde1ea', borderRadius: 6, color: '#111928', fontFamily: 'inherit', fontSize: 13 }}>
                  {productos.map(p => <option key={p.id} value={p.id}>{p.nombre} {p.ref ? '(' + p.ref + ')' : ''}</option>)}
                </select>
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

            {modal === 'factura' && (<div><div className="form-row"><div className="field"><label>Fecha</label><input type="date" value={form.fecha || ''} onChange={e => setF('fecha', e.target.value)} /></div><div className="field"><label>Cliente</label><select value={form.cliente_nombre || ''} onChange={e => setF('cliente_nombre', e.target.value)}><option value="">Seleccionar...</option>{clientes.map(c => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}</select></div></div><div className="field" style={{ marginBottom: 14 }}><label>Agregar producto</label><select onChange={e => { if (e.target.value) { toggleProdFac(productos.find(x => x.id == e.target.value)); e.target.value = '' } }} style={{ width: '100%', background: '#fff', border: '1px solid #dde1ea', borderRadius: 6, padding: '9px 12px', color: '#111928', fontFamily: 'inherit', fontSize: 13 }}><option value="">Seleccionar...</option>{productos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}</select></div>{Object.values(facItems).length > 0 && <div><table><thead><tr><th>Producto</th><th>Precio</th><th>Cant.</th><th>Subtotal</th><th></th></tr></thead><tbody>{Object.values(facItems).map(it => (<tr key={it.prod.id}><td>{it.prod.nombre}</td><td>${Number(it.prod.precio || 0).toLocaleString('es-CO')}</td><td><input type="number" min="1" value={it.qty} onChange={e => setFacItems(prev => ({ ...prev, [it.prod.id]: { ...prev[it.prod.id], qty: Number(e.target.value) || 1 } }))} style={{ width: 60, background: '#fff', border: '1px solid #dde1ea', borderRadius: 4, padding: '4px 6px', textAlign: 'center' }} /></td><td>${((it.prod.precio || 0) * it.qty).toLocaleString('es-CO')}</td><td><button onClick={() => setFacItems(prev => { const n = { ...prev }; delete n[it.prod.id]; return n })} style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer' }}>✕</button></td></tr>))}</tbody></table><div style={{ textAlign: 'right', fontWeight: 700, fontSize: 15, color: '#1a56db', padding: 8 }}>Total: ${Object.values(facItems).reduce((s, i) => s + (i.prod.precio || 0) * i.qty, 0).toLocaleString('es-CO')}</div></div>}<div className="modal-footer"><button className="btn" onClick={closeModal}>Cancelar</button><button className="btn btn-accent" onClick={saveFactura}>{loading ? 'Guardando...' : 'Guardar'}</button></div></div>)}

            {modal === 'movimiento' && (<div><div className="form-row"><div className="field"><label>Fecha</label><input type="date" value={form.fecha || ''} onChange={e => setF('fecha', e.target.value)} /></div><div className="field"><label>Tipo</label><select value={form.tipo || 'ingreso'} onChange={e => setF('tipo', e.target.value)}><option value="ingreso">Ingreso</option><option value="egreso">Egreso</option></select></div></div><div className="form-row"><div className="field" style={{ gridColumn: '1/-1' }}><label>Concepto</label><input value={form.concepto || ''} onChange={e => setF('concepto', e.target.value)} /></div></div><div className="form-row"><div className="field"><label>Valor</label><input type="number" value={form.valor || ''} onChange={e => setF('valor', e.target.value)} /></div></div><div className="modal-footer"><button className="btn" onClick={closeModal}>Cancelar</button><button className="btn btn-accent" onClick={saveMovimiento}>{loading ? 'Guardando...' : 'Registrar'}</button></div></div>)}
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
