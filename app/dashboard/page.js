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
  const [cajaMovs, setCajaMovs] = useState([])
  const [currentCaja, setCurrentCaja] = useState('Alejandro')
  const [modal, setModal] = useState(null)
  const [editObj, setEditObj] = useState(null)
  const [remItems, setRemItems] = useState({})
  const [facItems, setFacItems] = useState({})
  const [form, setForm] = useState({})
  const [loading, setLoading] = useState(false)
  const [pdfPreview, setPdfPreview] = useState(null)
  const [sendingEmail, setSendingEmail] = useState(false)
  const fileRef = useRef()

  useEffect(() => { const t = localStorage.getItem('token'); if (!t) { router.push('/login'); return }; setToken(t) }, [router])

  const api = useCallback(async (url, method = 'GET', body = null) => {
    const t = localStorage.getItem('token')
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + t }, body: body ? JSON.stringify(body) : null })
    if (res.status === 401) { router.push('/login'); return null }
    return res.json()
  }, [router])

  const loadAll = useCallback(async () => {
    const [p, c, r, rem, fac] = await Promise.all([api('/api/productos'), api('/api/clientes'), api('/api/remitentes'), api('/api/remisiones'), api('/api/facturas')])
    if (p) setProductos(p); if (c) setClientes(c); if (r) setRemitentes(r); if (rem) setRemisiones(rem); if (fac) setFacturas(fac)
  }, [api])

  const loadCaja = useCallback(async (caja) => { const data = await api('/api/caja?caja=' + caja); if (data) setCajaMovs(data) }, [api])
  useEffect(() => { if (token) { loadAll(); loadCaja(currentCaja) } }, [token, loadAll, loadCaja, currentCaja])

  function logout() { localStorage.removeItem('token'); router.push('/login') }
  function openModal(name, obj = null) { setModal(name); setEditObj(obj); setForm(obj || {}); setRemItems({}); setFacItems({}); setPdfPreview(null) }
  function closeModal() { setModal(null); setEditObj(null); setForm({}); setPdfPreview(null) }
  function setF(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function saveProducto() { setLoading(true); if (editObj) await api('/api/productos/' + editObj.id, 'PUT', form); else await api('/api/productos', 'POST', form); await loadAll(); closeModal(); setLoading(false) }
  async function delProducto(id) { if (!confirm('Eliminar?')) return; await api('/api/productos/' + id, 'DELETE'); loadAll() }

  async function cargaMasiva(e) {
    const file = e.target.files[0]; if (!file) return
    const text = await file.text()
    const lines = text.split('\n').filter(l => l.trim())
    const items = lines.slice(1).map(l => { const [ref, nombre, unidad] = l.split(',').map(x => x.trim()); return { ref, nombre, unidad } }).filter(i => i.nombre)
    if (!items.length) { alert('No se encontraron productos'); return }
    setLoading(true)
    await api('/api/productos', 'POST', items)
    await loadAll(); setLoading(false); alert(items.length + ' productos cargados')
  }

  async function saveCliente() { setLoading(true); if (editObj) await api('/api/clientes/' + editObj.id, 'PUT', form); else await api('/api/clientes', 'POST', form); await loadAll(); closeModal(); setLoading(false) }
  async function delCliente(id) { if (!confirm('Eliminar?')) return; await api('/api/clientes/' + id, 'DELETE'); loadAll() }

  async function saveRemitente() { setLoading(true); if (editObj) await api('/api/remitentes/' + editObj.id, 'PUT', form); else await api('/api/remitentes', 'POST', form); await loadAll(); closeModal(); setLoading(false) }
  async function delRemitente(id) { if (!confirm('Eliminar?')) return; await api('/api/remitentes/' + id, 'DELETE'); loadAll() }

  function toggleProdRem(id) {
    const p = productos.find(x => x.id == id); if (!p) return
    setRemItems(prev => { const n = { ...prev }; if (n[p.id]) delete n[p.id]; else n[p.id] = { prod: p, qty: 1 }; return n })
  }

  async function saveRemision() {
    setLoading(true)
    const items = Object.values(remItems).map(i => ({ producto_nombre: i.prod.nombre, producto_ref: i.prod.ref, producto_unidad: i.prod.unidad, cantidad: i.qty }))
    const data = await api('/api/remisiones', 'POST', { fecha: form.fecha, cliente_nombre: form.cliente_nombre, remitente_nombre: form.remitente_nombre, items })
    await loadAll(); closeModal(); setLoading(false)
  }

  async function delRemision(id) { if (!confirm('Eliminar?')) return; await api('/api/remisiones/' + id, 'DELETE'); loadAll() }

  async function editRemision(r) {
    const items = {}
    ;(r.remision_items || []).forEach(i => {
      const p = productos.find(x => x.nombre === i.producto_nombre)
      if (p) items[p.id] = { prod: p, qty: i.cantidad }
      else items['_' + i.producto_nombre] = { prod: { id: '_' + i.producto_nombre, nombre: i.producto_nombre, ref: i.producto_ref, unidad: i.producto_unidad }, qty: i.cantidad }
    })
    setRemItems(items)
    setForm({ fecha: r.fecha, cliente_nombre: r.cliente_nombre, remitente_nombre: r.remitente_nombre, editId: r.id })
    setEditObj(r); setModal('remision')
  }

  async function updateRemision() {
    setLoading(true)
    const items = Object.values(remItems).map(i => ({ producto_nombre: i.prod.nombre, producto_ref: i.prod.ref, producto_unidad: i.prod.unidad, cantidad: i.qty }))
    await supabaseDeleteItems(form.editId)
    await api('/api/remisiones/' + form.editId, 'PUT', { fecha: form.fecha, cliente_nombre: form.cliente_nombre, remitente_nombre: form.remitente_nombre, items })
    await loadAll(); closeModal(); setLoading(false)
  }

  async function supabaseDeleteItems(id) { await api('/api/remisiones/' + id + '/items', 'DELETE') }

  function generarPdfRemision(r) {
    const jsPDF = window.jspdf?.jsPDF
    if (!jsPDF) { alert('Cargando PDF, intenta de nuevo en 2 segundos'); return null }
    const items = r.remision_items || []
    const rem = remitentes.find(x => x.nombre === r.remitente_nombre)
    const doc = new jsPDF({ unit: 'mm', format: 'a4' })
    const pw = doc.internal.pageSize.getWidth()
    const ml = 15, mr = 15, usable = pw - ml - mr
    let y = 15

    doc.setFont('helvetica', 'bold'); doc.setFontSize(13)
    doc.text('REMISION DE ENTREGA', pw / 2, y, { align: 'center' }); y += 10

    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold'); doc.text('Fecha:', ml, y)
    doc.setFont('helvetica', 'normal'); doc.text(r.fecha || '', ml + 25, y); y += 6
    doc.setFont('helvetica', 'bold'); doc.text('Destinatario:', ml, y)
    doc.setFont('helvetica', 'normal'); doc.text(r.cliente_nombre || '', ml + 28, y); y += 8

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
      if (idx % 2 === 0) { doc.setFillColor(245, 247, 250); doc.rect(ml, y, usable, rowH, 'F') }
      doc.setDrawColor(208, 213, 221); doc.setLineWidth(0.2)
      doc.line(ml, y, ml + usable, y)
      doc.line(ml + colItem, y, ml + colItem, y + rowH)
      doc.line(ml + colItem + colProd, y, ml + colItem + colProd, y + rowH)
      doc.text(String(idx + 1), ml + colItem / 2, y + rowH / 2 + 1.5, { align: 'center' })
      doc.text(nombreLineas, ml + colItem + 2, y + 4.5)
      doc.text(String(item.cantidad), ml + colItem + colProd + colCant / 2, y + rowH / 2 + 1.5, { align: 'center' })
      y += rowH
    })
    doc.line(ml, y, ml + usable, y)
    doc.setDrawColor(30, 58, 95); doc.setLineWidth(0.4)
    const tableTop = 15 + 10 + 6 + 6 + 8
    doc.rect(ml, tableTop + 8, usable, y - tableTop - 8, 'S')

    y += 10
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

  function previewPdf(r) {
    const doc = generarPdfRemision(r); if (!doc) return
    const blob = doc.output('blob')
    const url = URL.createObjectURL(blob)
    setPdfPreview(url); setModal('pdfpreview')
  }

  function downloadPdf(r) {
    const doc = generarPdfRemision(r); if (!doc) return
    doc.save('Remision_' + String(r.id).padStart(3, '0') + '_' + r.cliente_nombre.replace(/\s+/g, '_') + '.pdf')
  }

  async function enviarEmail(r) {
    const doc = generarPdfRemision(r); if (!doc) return
    setSendingEmail(true)
    const pdfBase64 = doc.output('datauristring').split(',')[1]
    const res = await api('/api/remisiones/email', 'POST', { pdfBase64, remisionId: r.id, clienteNombre: r.cliente_nombre })
    setSendingEmail(false)
    if (res?.ok) alert('Email enviado correctamente')
    else alert('Error enviando email: ' + (res?.error || 'desconocido'))
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
  async function delFactura(id) { if (!confirm('Eliminar?')) return; await api('/api/facturas/' + id, 'DELETE'); loadAll() }
  async function saveMovimiento() { setLoading(true); await api('/api/caja', 'POST', { ...form, caja: currentCaja }); await loadCaja(currentCaja); closeModal(); setLoading(false) }
  async function delMovimiento(id) { if (!confirm('Eliminar?')) return; await api('/api/caja/' + id, 'DELETE'); loadCaja(currentCaja) }

  const saldoCaja = cajaMovs.reduce((s, m) => m.tipo === 'ingreso' ? s + Number(m.valor) : s - Number(m.valor), 0)
  const navItems = [{ id: 'dashboard', icon: '🏠', label: 'Dashboard' }, { id: 'remisiones', icon: '📋', label: 'Remisiones' }, { id: 'facturas', icon: '🧾', label: 'Facturas' }, { id: 'caja', icon: '💰', label: 'Caja' }, { id: 'productos', icon: '📦', label: 'Productos' }, { id: 'clientes', icon: '👤', label: 'Clientes' }, { id: 'remitentes', icon: '🏷️', label: 'Remitentes' }]

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <aside style={{ width: 220, background: '#1e3a5f', borderRight: '1px solid #1a3050', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '20px 16px', borderBottom: '1px solid #1a3050', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, background: '#1a56db', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>⚙️</div>
          <div><div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>Insumos</div><div style={{ fontSize: 10, color: '#93c5fd' }}>Sistema de gestión</div></div>
        </div>
        <nav style={{ flex: 1, padding: '12px 8px' }}>
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
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 16, marginBottom: 20 }}>
                {[{ icon: '📋', label: 'Remisiones', val: remisiones.length }, { icon: '🧾', label: 'Facturas', val: facturas.length }, { icon: '📦', label: 'Productos', val: productos.length }, { icon: '👤', label: 'Clientes', val: clientes.length }].map(s => (
                  <div key={s.label} className="card">
                    <div style={{ fontSize: 22, marginBottom: 10 }}>{s.icon}</div>
                    <div style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', fontWeight: 600 }}>{s.label}</div>
                    <div style={{ fontSize: 28, fontWeight: 700, color: '#1a56db' }}>{s.val}</div>
                  </div>
                ))}
              </div>
              <div className="card">
                <div className="card-header"><div className="card-title">Actividad reciente</div></div>
                {remisiones.length === 0 && facturas.length === 0 ? <div className="empty-state"><div className="icon">📊</div><p>No hay actividad aún</p></div> : (
                  <table><thead><tr><th>Tipo</th><th>Descripción</th><th>Fecha</th></tr></thead>
                    <tbody>{[...remisiones.slice(0, 5).map(r => ({ tipo: '📋', desc: 'Remisión #' + r.id + ' — ' + r.cliente_nombre, fecha: r.fecha })), ...facturas.slice(0, 5).map(f => ({ tipo: '🧾', desc: 'Factura ' + f.numero + ' — ' + f.cliente_nombre, fecha: f.fecha }))].sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 8).map((a, i) => (
                      <tr key={i}><td>{a.tipo}</td><td>{a.desc}</td><td>{a.fecha}</td></tr>
                    ))}</tbody>
                  </table>
                )}
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
                          <button className="btn btn-sm" onClick={() => previewPdf(r)}>👁️ Ver</button>
                          <button className="btn btn-sm btn-success" onClick={() => downloadPdf(r)}>⬇️ PDF</button>
                          <button className="btn btn-sm" style={{ borderColor: '#6366f1', color: '#6366f1' }} onClick={() => enviarEmail(r)}>{sendingEmail ? '...' : '📧'}</button>
                          <button className="btn btn-sm btn-danger" onClick={() => delRemision(r.id)}>🗑️</button>
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
                      <td style={{ color: '#057a55', fontWeight: 600 }}>${Number(f.total).toLocaleString()}</td>
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
                  <div style={{ fontSize: 32, fontWeight: 700, color: '#fff', fontFamily: 'monospace' }}>${saldoCaja.toLocaleString()}</div>
                </div>
                <button className="btn btn-accent" style={{ marginLeft: 'auto' }} onClick={() => openModal('movimiento')}>+ Movimiento</button>
              </div>
              <div className="card">
                <div className="card-header"><div className="card-title">Movimientos</div></div>
                {cajaMovs.length === 0 ? <div className="empty-state"><div className="icon">💰</div><p>No hay movimientos</p></div> : (
                  <table><thead><tr><th>Fecha</th><th>Concepto</th><th>Tipo</th><th>Valor</th><th>Saldo</th><th></th></tr></thead>
                    <tbody>{(() => { let acum = 0; return cajaMovs.map(m => { acum += m.tipo === 'ingreso' ? Number(m.valor) : -Number(m.valor); return (<tr key={m.id}><td>{m.fecha}</td><td>{m.concepto}</td><td style={{ color: m.tipo === 'ingreso' ? '#057a55' : '#c81e1e', fontWeight: 600 }}>{m.tipo === 'ingreso' ? '↑ Ingreso' : '↓ Egreso'}</td><td style={{ color: m.tipo === 'ingreso' ? '#057a55' : '#c81e1e', fontFamily: 'monospace' }}>{m.tipo === 'ingreso' ? '+' : '-'}${Number(m.valor).toLocaleString()}</td><td style={{ fontFamily: 'monospace' }}>${acum.toLocaleString()}</td><td><button className="btn btn-sm btn-danger" onClick={() => delMovimiento(m.id)}>🗑️</button></td></tr>) }) })()}</tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {page === 'productos' && (
            <div className="card">
              <div className="card-header">
                <div><div className="card-title">Productos</div><div className="card-subtitle">Catálogo de productos</div></div>
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
                <table><thead><tr><th>Nombre</th><th>NIT</th><th>Teléfono</th><th>Acciones</th></tr></thead>
                  <tbody>{clientes.map(c => (
                    <tr key={c.id}>
                      <td>{c.nombre}</td><td>{c.nit || '—'}</td><td>{c.telefono || '—'}</td>
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

      {modal && modal !== 'pdfpreview' && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="modal" style={{ width: ['remision', 'factura'].includes(modal) ? 700 : 520 }}>
            <div className="modal-header">
              <div className="modal-title">{modal === 'producto' && (editObj ? 'Editar Producto' : 'Nuevo Producto')}{modal === 'cliente' && (editObj ? 'Editar Cliente' : 'Nuevo Cliente')}{modal === 'remitente' && (editObj ? 'Editar Remitente' : 'Nuevo Remitente')}{modal === 'remision' && (editObj ? 'Editar Remisión' : 'Nueva Remisión')}{modal === 'factura' && 'Nueva Factura'}{modal === 'movimiento' && 'Nuevo Movimiento — Caja ' + currentCaja}</div>
              <button className="modal-close" onClick={closeModal}>✕</button>
            </div>

            {modal === 'producto' && (<div><div className="form-row"><div className="field"><label>Referencia</label><input value={form.ref || ''} onChange={e => setF('ref', e.target.value)} placeholder="REF-001" /></div><div className="field"><label>Unidad</label><input value={form.unidad || ''} onChange={e => setF('unidad', e.target.value)} placeholder="Und, Kg..." /></div></div><div className="form-row"><div className="field" style={{ gridColumn: '1/-1' }}><label>Nombre</label><input value={form.nombre || ''} onChange={e => setF('nombre', e.target.value)} /></div></div><div className="modal-footer"><button className="btn" onClick={closeModal}>Cancelar</button><button className="btn btn-accent" onClick={saveProducto}>{loading ? 'Guardando...' : 'Guardar'}</button></div></div>)}

            {modal === 'cliente' && (<div><div className="form-row"><div className="field" style={{ gridColumn: '1/-1' }}><label>Nombre</label><input value={form.nombre || ''} onChange={e => setF('nombre', e.target.value)} /></div></div><div className="form-row"><div className="field"><label>NIT</label><input value={form.nit || ''} onChange={e => setF('nit', e.target.value)} /></div><div className="field"><label>Teléfono</label><input value={form.telefono || ''} onChange={e => setF('telefono', e.target.value)} /></div></div><div className="form-row"><div className="field" style={{ gridColumn: '1/-1' }}><label>Email</label><input value={form.email || ''} onChange={e => setF('email', e.target.value)} /></div></div><div className="form-row"><div className="field" style={{ gridColumn: '1/-1' }}><label>Dirección</label><input value={form.direccion || ''} onChange={e => setF('direccion', e.target.value)} /></div></div><div className="modal-footer"><button className="btn" onClick={closeModal}>Cancelar</button><button className="btn btn-accent" onClick={saveCliente}>{loading ? 'Guardando...' : 'Guardar'}</button></div></div>)}

            {modal === 'remitente' && (<div><div className="form-row"><div className="field" style={{ gridColumn: '1/-1' }}><label>Nombre completo</label><input value={form.nombre || ''} onChange={e => setF('nombre', e.target.value)} /></div></div><div className="form-row"><div className="field"><label>Cédula</label><input value={form.cedula || ''} onChange={e => setF('cedula', e.target.value)} /></div><div className="field"><label>Teléfono</label><input value={form.telefono || ''} onChange={e => setF('telefono', e.target.value)} /></div></div><div className="form-row"><div className="field"><label>Ciudad</label><input value={form.ciudad || ''} onChange={e => setF('ciudad', e.target.value)} /></div><div className="field"><label>Email</label><input value={form.email || ''} onChange={e => setF('email', e.target.value)} /></div></div><div className="form-row"><div className="field" style={{ gridColumn: '1/-1' }}><label>Dirección</label><input value={form.direccion || ''} onChange={e => setF('direccion', e.target.value)} /></div></div><div className="modal-footer"><button className="btn" onClick={closeModal}>Cancelar</button><button className="btn btn-accent" onClick={saveRemitente}>{loading ? 'Guardando...' : 'Guardar'}</button></div></div>)}

            {modal === 'remision' && (<div>
              <div className="form-row">
                <div className="field"><label>Fecha</label><input type="date" value={form.fecha || ''} onChange={e => setF('fecha', e.target.value)} /></div>
                <div className="field"><label>Cliente</label><select value={form.cliente_nombre || ''} onChange={e => setF('cliente_nombre', e.target.value)}><option value="">Seleccionar...</option>{clientes.map(c => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}</select></div>
                <div className="field"><label>Remitente</label><select value={form.remitente_nombre || ''} onChange={e => setF('remitente_nombre', e.target.value)}><option value="">Seleccionar...</option>{remitentes.map(r => <option key={r.id} value={r.nombre}>{r.nombre}</option>)}</select></div>
              </div>
              <div className="field" style={{ marginBottom: 14 }}>
                <label>Agregar producto</label>
                <select onChange={e => { if (e.target.value) { toggleProdRem(e.target.value); e.target.value = '' } }} style={{ width: '100%', background: '#fff', border: '1px solid #dde1ea', borderRadius: 6, padding: '9px 12px', color: '#111928', fontFamily: 'inherit', fontSize: 13 }}>
                  <option value="">Seleccionar producto...</option>
                  {productos.map(p => <option key={p.id} value={p.id}>{p.nombre} {p.ref ? '(' + p.ref + ')' : ''}</option>)}
                </select>
              </div>
              {Object.values(remItems).length > 0 && (
                <table style={{ marginBottom: 14, background: '#f8faff', border: '1px solid #dde1ea', borderRadius: 6 }}>
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
                <button className="btn btn-accent" onClick={editObj ? updateRemision : saveRemision}>{loading ? 'Guardando...' : editObj ? 'Actualizar' : 'Guardar remisión'}</button>
              </div>
            </div>)}

            {modal === 'factura' && (<div><div className="form-row"><div className="field"><label>Fecha</label><input type="date" value={form.fecha || ''} onChange={e => setF('fecha', e.target.value)} /></div><div className="field"><label>Cliente</label><select value={form.cliente_nombre || ''} onChange={e => setF('cliente_nombre', e.target.value)}><option value="">Seleccionar...</option>{clientes.map(c => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}</select></div></div><div className="field" style={{ marginBottom: 14 }}><label>Agregar producto</label><select onChange={e => { if (e.target.value) { toggleProdFac(productos.find(x => x.id == e.target.value)); e.target.value = '' } }} style={{ width: '100%', background: '#fff', border: '1px solid #dde1ea', borderRadius: 6, padding: '9px 12px', color: '#111928', fontFamily: 'inherit', fontSize: 13 }}><option value="">Seleccionar producto...</option>{productos.map(p => <option key={p.id} value={p.id}>{p.nombre} — ${Number(p.precio || 0).toLocaleString()}</option>)}</select></div>{Object.values(facItems).length > 0 && <div><table style={{ marginBottom: 8 }}><thead><tr><th>Producto</th><th>Precio</th><th>Cant.</th><th>Subtotal</th><th></th></tr></thead><tbody>{Object.values(facItems).map(it => (<tr key={it.prod.id}><td>{it.prod.nombre}</td><td>${Number(it.prod.precio || 0).toLocaleString()}</td><td><input type="number" min="1" value={it.qty} onChange={e => setFacItems(prev => ({ ...prev, [it.prod.id]: { ...prev[it.prod.id], qty: Number(e.target.value) || 1 } }))} style={{ width: 60, background: '#fff', border: '1px solid #dde1ea', borderRadius: 4, padding: '4px 6px', textAlign: 'center' }} /></td><td>${((it.prod.precio || 0) * it.qty).toLocaleString()}</td><td><button onClick={() => setFacItems(prev => { const n = { ...prev }; delete n[it.prod.id]; return n })} style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer' }}>✕</button></td></tr>))}</tbody></table><div style={{ textAlign: 'right', fontWeight: 700, fontSize: 15, color: '#1a56db' }}>Total: ${Object.values(facItems).reduce((s, i) => s + (i.prod.precio || 0) * i.qty, 0).toLocaleString()}</div></div>}<div className="modal-footer"><button className="btn" onClick={closeModal}>Cancelar</button><button className="btn btn-accent" onClick={saveFactura}>{loading ? 'Guardando...' : 'Guardar factura'}</button></div></div>)}

            {modal === 'movimiento' && (<div><div className="form-row"><div className="field"><label>Fecha</label><input type="date" value={form.fecha || ''} onChange={e => setF('fecha', e.target.value)} /></div><div className="field"><label>Tipo</label><select value={form.tipo || 'ingreso'} onChange={e => setF('tipo', e.target.value)}><option value="ingreso">Ingreso</option><option value="egreso">Egreso</option></select></div></div><div className="form-row"><div className="field" style={{ gridColumn: '1/-1' }}><label>Concepto</label><input value={form.concepto || ''} onChange={e => setF('concepto', e.target.value)} /></div></div><div className="form-row"><div className="field"><label>Valor</label><input type="number" value={form.valor || ''} onChange={e => setF('valor', e.target.value)} /></div></div><div className="modal-footer"><button className="btn" onClick={closeModal}>Cancelar</button><button className="btn btn-accent" onClick={saveMovimiento}>{loading ? 'Guardando...' : 'Registrar'}</button></div></div>)}

          </div>
        </div>
      )}

      {modal === 'pdfpreview' && pdfPreview && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && closeModal()}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 20, width: '90vw', height: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ fontWeight: 600, fontSize: 15 }}>Vista previa — Remisión</div>
              <button className="modal-close" onClick={closeModal}>✕</button>
            </div>
            <iframe src={pdfPreview} style={{ flex: 1, border: 'none', borderRadius: 8, width: '100%' }} />
          </div>
        </div>
      )}

      <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js" async></script>
    </div>
  )
}
