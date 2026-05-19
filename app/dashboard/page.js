'use client'
import { useState, useEffect, useCallback } from 'react'
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

mkdir -p ~/insumos-app/app/dashboard && cat > ~/insumos-app/app/dashboard/page.js << 'EOF'
'use client'
import { useState, useEffect, useCallback } from 'react'
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

  useEffect(() => {
    const t = localStorage.getItem('token')
    if (!t) { router.push('/login'); return }
    setToken(t)
  }, [router])

  const api = useCallback(async (url, method = 'GET', body = null) => {
    const t = localStorage.getItem('token')
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${t}` },
      body: body ? JSON.stringify(body) : null
    })
    if (res.status === 401) { router.push('/login'); return null }
    return res.json()
  }, [router])

  const loadAll = useCallback(async () => {
    const [p, c, r, rem, fac] = await Promise.all([
      api('/api/productos'), api('/api/clientes'), api('/api/remitentes'),
      api('/api/remisiones'), api('/api/facturas')
    ])
    if (p) setProductos(p)
    if (c) setClientes(c)
    if (r) setRemitentes(r)
    if (rem) setRemisiones(rem)
    if (fac) setFacturas(fac)
  }, [api])

  const loadCaja = useCallback(async (caja) => {
    const data = await api(`/api/caja?caja=${caja}`)
    if (data) setCajaMovs(data)
  }, [api])

  useEffect(() => { if (token) { loadAll(); loadCaja(currentCaja) } }, [token, loadAll, loadCaja, currentCaja])

  function logout() { localStorage.removeItem('token'); router.push('/login') }
  function openModal(name, obj = null) { setModal(name); setEditObj(obj); setForm(obj || {}); setRemItems({}); setFacItems({}) }
  function closeModal() { setModal(null); setEditObj(null); setForm({}) }
  function setF(k, v) { setForm(f => ({ ...f, [k]: v })) }

  // PRODUCTOS
  async function saveProducto() {
    setLoading(true)
    if (editObj) await api(`/api/productos/${editObj.id}`, 'PUT', form)
    else await api('/api/productos', 'POST', form)
    await loadAll(); closeModal(); setLoading(false)
  }
  async function delProducto(id) {
    if (!confirm('¿Eliminar producto?')) return
    await api(`/api/productos/${id}`, 'DELETE'); loadAll()
  }

  // CLIENTES
  async function saveCliente() {
    setLoading(true)
    if (editObj) await api(`/api/clientes/${editObj.id}`, 'PUT', form)
    else await api('/api/clientes', 'POST', form)
    await loadAll(); closeModal(); setLoading(false)
  }
  async function delCliente(id) {
    if (!confirm('¿Eliminar cliente?')) return
    await api(`/api/clientes/${id}`, 'DELETE'); loadAll()
  }

  // REMITENTES
  async function saveRemitente() {
    setLoading(true)
    if (editObj) await api(`/api/remitentes/${editObj.id}`, 'PUT', form)
    else await api('/api/remitentes', 'POST', form)
    await loadAll(); closeModal(); setLoading(false)
  }
  async function delRemitente(id) {
    if (!confirm('¿Eliminar remitente?')) return
    await api(`/api/remitentes/${id}`, 'DELETE'); loadAll()
  }

  // REMISIONES
  function toggleProdRem(p) {
    setRemItems(prev => {
      const n = { ...prev }
      if (n[p.id]) delete n[p.id]
      else n[p.id] = { prod: p, qty: 1 }
      return n
    })
  }
  async function saveRemision() {
    setLoading(true)
    const items = Object.values(remItems).map(i => ({
      producto_nombre: i.prod.nombre, producto_ref: i.prod.ref,
      producto_unidad: i.prod.unidad, cantidad: i.qty
    }))
    await api('/api/remisiones', 'POST', {
      fecha: form.fecha, cliente_nombre: form.cliente_nombre,
      remitente_nombre: form.remitente_nombre, items
    })
    await loadAll(); closeModal(); setLoading(false)
  }
  async function delRemision(id) {
    if (!confirm('¿Eliminar remisión?')) return
    await api(`/api/remisiones/${id}`, 'DELETE'); loadAll()
  }

  // FACTURAS
  function toggleProdFac(p) {
    setFacItems(prev => {
      const n = { ...prev }
      if (n[p.id]) delete n[p.id]
      else n[p.id] = { prod: p, qty: 1 }
      return n
    })
  }
  async function saveFactura() {
    setLoading(true)
    const items = Object.values(facItems).map(i => ({
      producto_nombre: i.prod.nombre, precio_unitario: i.prod.precio,
      cantidad: i.qty, subtotal: i.prod.precio * i.qty
    }))
    const total = items.reduce((s, i) => s + i.subtotal, 0)
    const numero = `FAC-${String(facturas.length + 1).padStart(3, '0')}`
    await api('/api/facturas', 'POST', {
      fecha: form.fecha, cliente_nombre: form.cliente_nombre, numero, total, items
    })
    await loadAll(); closeModal(); setLoading(false)
  }
  async function delFactura(id) {
    if (!confirm('¿Eliminar factura?')) return
    await api(`/api/facturas/${id}`, 'DELETE'); loadAll()
  }

  // CAJA
  async function saveMovimiento() {
    setLoading(true)
    await api('/api/caja', 'POST', { ...form, caja: currentCaja })
    await loadCaja(currentCaja); closeModal(); setLoading(false)
  }
  async function delMovimiento(id) {
    if (!confirm('¿Eliminar movimiento?')) return
    await api(`/api/caja/${id}`, 'DELETE'); loadCaja(currentCaja)
  }

  // PDF REMISION
  function pdfRemision(r) {
    const jsPDF = window.jspdf?.jsPDF
    if (!jsPDF) { alert('Cargando librería PDF, intenta de nuevo'); return }
    const doc = new jsPDF({ unit: 'mm', format: 'a4' })
    const pw = doc.internal.pageSize.getWidth()
    const ml = 20, usable = pw - 40
    let y = 20
    doc.setFont('helvetica', 'bold'); doc.setFontSize(14)
    doc.text('REMISION DE ENTREGA', pw / 2, y, { align: 'center' }); y += 14
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold'); doc.text('Fecha:', ml, y)
    doc.setFont('helvetica', 'normal'); doc.text(r.fecha, ml + 32, y); y += 7
    doc.setFont('helvetica', 'bold'); doc.text('Destinatario:', ml, y)
    doc.setFont('helvetica', 'normal'); doc.text(r.cliente_nombre, ml + 32, y); y += 10
    const colItem = 18, colProd = usable - 46, colCant = 28, headerH = 8
    doc.setFillColor(30, 58, 95); doc.rect(ml, y, usable, headerH, 'F')
    doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(9)
    doc.text('Ítem', ml + colItem / 2, y + 5.5, { align: 'center' })
    doc.text('Producto', ml + colItem + colProd / 2, y + 5.5, { align: 'center' })
    doc.text('Cantidad', ml + colItem + colProd + colCant / 2, y + 5.5, { align: 'center' })
    y += headerH
    doc.setTextColor(0, 0, 0); doc.setFont('helvetica', 'normal'); doc.setFontSize(9)
    const rowH = 7
    const items = r.remision_items || []
    items.forEach((item, idx) => {
      if (idx % 2 === 0) { doc.setFillColor(245, 247, 250); doc.rect(ml, y, usable, rowH, 'F') }
      doc.setDrawColor(208, 213, 221); doc.setLineWidth(0.3)
      doc.line(ml, y, ml + usable, y)
      doc.line(ml + colItem, y, ml + colItem, y + rowH)
      doc.line(ml + colItem + colProd, y, ml + colItem + colProd, y + rowH)
      doc.text(String(idx + 1), ml + colItem / 2, y + 5, { align: 'center' })
      doc.text(item.producto_nombre || '', ml + colItem + 2, y + 5)
      doc.text(String(item.cantidad), ml + colItem + colProd + colCant / 2, y + 5, { align: 'center' })
      y += rowH
    })
    doc.line(ml, y, ml + usable, y)
    doc.setDrawColor(30, 58, 95); doc.setLineWidth(0.5)
    doc.rect(ml, y - rowH * items.length - headerH, usable, headerH + rowH * items.length, 'S')
    y += 14
    doc.setFontSize(10); doc.setFont('helvetica', 'normal')
    doc.text('Observaciones:', ml, y); doc.setLineWidth(0.3)
    doc.line(ml + 42, y, ml + usable, y); y += 16
    doc.text('Remitente:', ml, y); doc.text(r.remitente_nombre, ml + 32, y); y += 14
    doc.text('Recibido por:', ml, y); doc.line(ml + 42, y, ml + usable * 0.65, y); y += 14
    doc.text('Firma:', ml, y); doc.line(ml + 42, y, ml + usable * 0.65, y)
    doc.save(`Remision_${String(r.id).padStart(3, '0')}_${r.cliente_nombre.replace(/\s+/g, '_')}.pdf`)
  }

  // SALDO CAJA
  const saldoCaja = cajaMovs.reduce((s, m) => m.tipo === 'ingreso' ? s + Number(m.valor) : s - Number(m.valor), 0)

  const navItems = [
    { id: 'dashboard', icon: '🏠', label: 'Dashboard' },
    { id: 'remisiones', icon: '📋', label: 'Remisiones' },
    { id: 'facturas', icon: '🧾', label: 'Facturas' },
    { id: 'caja', icon: '💰', label: 'Caja' },
    { id: 'productos', icon: '📦', label: 'Productos' },
    { id: 'clientes', icon: '👤', label: 'Clientes' },
    { id: 'remitentes', icon: '🏷️', label: 'Remitentes' },
  ]

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      {/* SIDEBAR */}
      <aside style={{ width: 240, background: 'var(--surface)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '20px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, background: 'linear-gradient(135deg, #4f7cff, #7c5cff)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>⚙️</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Insumos</div>
            <div style={{ fontSize: 10, color: 'var(--text2)' }}>Sistema de gestión</div>
          </div>
        </div>
        <nav style={{ flex: 1, padding: '12px 8px' }}>
          {navItems.map(n => (
            <div key={n.id} onClick={() => { setPage(n.id); if (n.id === 'caja') loadCaja(currentCaja) }}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 6, cursor: 'pointer', marginBottom: 2, fontSize: 13, fontWeight: 500, background: page === n.id ? 'rgba(79,124,255,0.15)' : 'transparent', color: page === n.id ? 'var(--accent)' : 'var(--text2)' }}>
              <span>{n.icon}</span>{n.label}
            </div>
          ))}
        </nav>
        <div style={{ padding: '12px 8px', borderTop: '1px solid var(--border)' }}>
          <div onClick={logout} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 6, cursor: 'pointer' }}>
            <div style={{ width: 30, height: 30, background: 'linear-gradient(135deg, #4f7cff, #7c5cff)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600 }}>A</div>
            <div><div style={{ fontSize: 13, fontWeight: 500 }}>Admin</div><div style={{ fontSize: 11, color: 'var(--text2)' }}>Cerrar sesión</div></div>
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ height: 56, borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', padding: '0 24px' }}>
          <div style={{ fontSize: 16, fontWeight: 600 }}>{navItems.find(n => n.id === page)?.label}</div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>

          {/* DASHBOARD */}
          {page === 'dashboard' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 16, marginBottom: 20 }}>
                {[{ icon: '📋', label: 'Remisiones', val: remisiones.length }, { icon: '🧾', label: 'Facturas', val: facturas.length }, { icon: '📦', label: 'Productos', val: productos.length }, { icon: '👤', label: 'Clientes', val: clientes.length }].map(s => (
                  <div key={s.label} className="card">
                    <div style={{ fontSize: 22, marginBottom: 10 }}>{s.icon}</div>
                    <div style={{ fontSize: 11, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>{s.label}</div>
                    <div style={{ fontSize: 28, fontWeight: 700, margin: '6px 0 2px' }}>{s.val}</div>
                  </div>
                ))}
              </div>
              <div className="card">
                <div className="card-header"><div><div className="card-title">Actividad reciente</div></div></div>
                {remisiones.length === 0 && facturas.length === 0 ? <div className="empty-state"><div className="icon">📊</div><p>No hay actividad aún</p></div> : (
                  <table><thead><tr><th>Tipo</th><th>Descripción</th><th>Fecha</th></tr></thead>
                    <tbody>
                      {[...remisiones.slice(0, 5).map(r => ({ tipo: '📋', desc: `Remisión #${r.id} — ${r.cliente_nombre}`, fecha: r.fecha })), ...facturas.slice(0, 5).map(f => ({ tipo: '🧾', desc: `Factura ${f.numero} — ${f.cliente_nombre}`, fecha: f.fecha }))].sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 8).map((a, i) => (
                        <tr key={i}><td>{a.tipo}</td><td>{a.desc}</td><td>{a.fecha}</td></tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* REMISIONES */}
          {page === 'remisiones' && (
            <div className="card">
              <div className="card-header">
                <div><div className="card-title">Remisiones</div><div className="card-subtitle">Lista de remisiones generadas</div></div>
                <button className="btn btn-accent" onClick={() => openModal('remision')}>+ Nueva remisión</button>
              </div>
              {remisiones.length === 0 ? <div className="empty-state"><div className="icon">📋</div><p>No hay remisiones creadas</p></div> : (
                <div style={{ overflowX: 'auto' }}>
                  <table><thead><tr><th>#</th><th>Fecha</th><th>Cliente</th><th>Remitente</th><th>Productos</th><th>Estado</th><th>Acciones</th></tr></thead>
                    <tbody>{remisiones.map(r => (
                      <tr key={r.id}>
                        <td><span className="tag">#{r.id}</span></td>
                        <td>{r.fecha}</td><td>{r.cliente_nombre}</td><td>{r.remitente_nombre}</td>
                        <td>{(r.remision_items || []).length} producto(s)</td>
                        <td><span className="badge badge-blue">Emitida</span></td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <button className="btn btn-sm btn-success" onClick={() => pdfRemision(r)} style={{ marginRight: 4 }}>⬇️ PDF</button>
                          <button className="btn btn-sm btn-danger" onClick={() => delRemision(r.id)}>🗑️</button>
                        </td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* FACTURAS */}
          {page === 'facturas' && (
            <div className="card">
              <div className="card-header">
                <div><div className="card-title">Facturas</div><div className="card-subtitle">Registro de facturas</div></div>
                <button className="btn btn-accent" onClick={() => openModal('factura')}>+ Nueva factura</button>
              </div>
              {facturas.length === 0 ? <div className="empty-state"><div className="icon">🧾</div><p>No hay facturas creadas</p></div> : (
                <div style={{ overflowX: 'auto' }}>
                  <table><thead><tr><th>#</th><th>Fecha</th><th>Cliente</th><th>Productos</th><th>Total</th><th>Estado</th><th>Acciones</th></tr></thead>
                    <tbody>{facturas.map(f => (
                      <tr key={f.id}>
                        <td><span className="tag">{f.numero}</span></td>
                        <td>{f.fecha}</td><td>{f.cliente_nombre}</td>
                        <td>{(f.factura_items || []).length} producto(s)</td>
                        <td style={{ fontFamily: 'monospace', color: 'var(--success)' }}>${Number(f.total).toLocaleString()}</td>
                        <td><span className="badge badge-green">Emitida</span></td>
                        <td><button className="btn btn-sm btn-danger" onClick={() => delFactura(f.id)}>🗑️</button></td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* CAJA */}
          {page === 'caja' && (
            <div>
              <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
                {['Alejandro', 'Mincha', 'Santiago'].map(c => (
                  <button key={c} onClick={() => { setCurrentCaja(c); loadCaja(c) }}
                    style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid', cursor: 'pointer', fontSize: 13, fontWeight: 500, background: currentCaja === c ? 'rgba(79,124,255,0.15)' : 'var(--surface)', borderColor: currentCaja === c ? 'var(--accent)' : 'var(--border)', color: currentCaja === c ? 'var(--accent)' : 'var(--text2)' }}>
                    💼 Caja {c}
                  </button>
                ))}
              </div>
              <div style={{ background: 'linear-gradient(135deg,rgba(79,124,255,0.15),rgba(124,92,255,0.1))', border: '1px solid rgba(79,124,255,0.3)', borderRadius: 10, padding: '20px 24px', marginBottom: 16, display: 'flex', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 500 }}>Saldo actual — Caja {currentCaja}</div>
                  <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--accent)', fontFamily: 'monospace' }}>${saldoCaja.toLocaleString()}</div>
                </div>
                <button className="btn btn-accent" style={{ marginLeft: 'auto' }} onClick={() => openModal('movimiento')}>+ Movimiento</button>
              </div>
              <div className="card">
                <div className="card-header"><div className="card-title">Movimientos</div></div>
                {cajaMovs.length === 0 ? <div className="empty-state"><div className="icon">💰</div><p>No hay movimientos</p></div> : (
                  <table><thead><tr><th>Fecha</th><th>Concepto</th><th>Tipo</th><th>Valor</th><th>Saldo</th><th></th></tr></thead>
                    <tbody>
                      {(() => { let acum = 0; return [...cajaMovs].map(m => { acum += m.tipo === 'ingreso' ? Number(m.valor) : -Number(m.valor); return (
                        <tr key={m.id}>
                          <td>{m.fecha}</td><td>{m.concepto}</td>
                          <td style={{ color: m.tipo === 'ingreso' ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>{m.tipo === 'ingreso' ? '↑ Ingreso' : '↓ Egreso'}</td>
                          <td style={{ fontFamily: 'monospace', color: m.tipo === 'ingreso' ? 'var(--success)' : 'var(--danger)' }}>{m.tipo === 'ingreso' ? '+' : '-'}${Number(m.valor).toLocaleString()}</td>
                          <td style={{ fontFamily: 'monospace' }}>${acum.toLocaleString()}</td>
                          <td><button className="btn btn-sm btn-danger" onClick={() => delMovimiento(m.id)}>🗑️</button></td>
                        </tr>
                      )})})()}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* PRODUCTOS */}
          {page === 'productos' && (
            <div className="card">
              <div className="card-header">
                <div><div className="card-title">Productos</div><div className="card-subtitle">Catálogo de productos</div></div>
                <button className="btn btn-accent" onClick={() => openModal('producto')}>+ Nuevo producto</button>
              </div>
              {productos.length === 0 ? <div className="empty-state"><div className="icon">📦</div><p>No hay productos</p></div> : (
                <table><thead><tr><th>Ref.</th><th>Nombre</th><th>Descripción</th><th>Unidad</th><th>Precio</th><th>Acciones</th></tr></thead>
                  <tbody>{productos.map(p => (
                    <tr key={p.id}>
                      <td><span className="tag">{p.ref}</span></td>
                      <td>{p.nombre}</td>
                      <td style={{ color: 'var(--text2)' }}>{p.descripcion || '—'}</td>
                      <td>{p.unidad || '—'}</td>
                      <td style={{ fontFamily: 'monospace' }}>${Number(p.precio || 0).toLocaleString()}</td>
                      <td>
                        <button className="btn btn-sm" style={{ marginRight: 4 }} onClick={() => openModal('producto', p)}>✏️ Editar</button>
                        <button className="btn btn-sm btn-danger" onClick={() => delProducto(p.id)}>🗑️</button>
                      </td>
                    </tr>
                  ))}</tbody>
                </table>
              )}
            </div>
          )}

          {/* CLIENTES */}
          {page === 'clientes' && (
            <div className="card">
              <div className="card-header">
                <div><div className="card-title">Clientes</div><div className="card-subtitle">Directorio de clientes</div></div>
                <button className="btn btn-accent" onClick={() => openModal('cliente')}>+ Nuevo cliente</button>
              </div>
              {clientes.length === 0 ? <div className="empty-state"><div className="icon">👤</div><p>No hay clientes</p></div> : (
                <table><thead><tr><th>Nombre</th><th>NIT / CC</th><th>Teléfono</th><th>Email</th><th>Acciones</th></tr></thead>
                  <tbody>{clientes.map(c => (
                    <tr key={c.id}>
                      <td>{c.nombre}</td><td style={{ fontFamily: 'monospace' }}>{c.nit || '—'}</td>
                      <td>{c.telefono || '—'}</td><td>{c.email || '—'}</td>
                      <td>
                        <button className="btn btn-sm" style={{ marginRight: 4 }} onClick={() => openModal('cliente', c)}>✏️ Editar</button>
                        <button className="btn btn-sm btn-danger" onClick={() => delCliente(c.id)}>🗑️</button>
                      </td>
                    </tr>
                  ))}</tbody>
                </table>
              )}
            </div>
          )}

          {/* REMITENTES */}
          {page === 'remitentes' && (
            <div className="card">
              <div className="card-header">
                <div><div className="card-title">Remitentes</div><div className="card-subtitle">Personas que emiten remisiones</div></div>
                <button className="btn btn-accent" onClick={() => openModal('remitente')}>+ Nuevo remitente</button>
              </div>
              {remitentes.length === 0 ? <div className="empty-state"><div className="icon">🏷️</div><p>No hay remitentes</p></div> : (
                <table><thead><tr><th>Nombre</th><th>Cargo</th><th>Teléfono</th><th>Acciones</th></tr></thead>
                  <tbody>{remitentes.map(r => (
                    <tr key={r.id}>
                      <td>{r.nombre}</td><td>{r.cargo || '—'}</td><td>{r.telefono || '—'}</td>
                      <td>
                        <button className="btn btn-sm" style={{ marginRight: 4 }} onClick={() => openModal('remitente', r)}>✏️ Editar</button>
                        <button className="btn btn-sm btn-danger" onClick={() => delRemitente(r.id)}>🗑️</button>
                      </td>
                    </tr>
                  ))}</tbody>
                </table>
              )}
            </div>
          )}

        </div>
      </div>

      {/* MODALES */}
      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="modal" style={{ width: ['remision','factura'].includes(modal) ? 680 : 560 }}>
            <div className="modal-header">
              <div className="modal-title">
                {modal === 'producto' && (editObj ? 'Editar Producto' : 'Nuevo Producto')}
                {modal === 'cliente' && (editObj ? 'Editar Cliente' : 'Nuevo Cliente')}
                {modal === 'remitente' && (editObj ? 'Editar Remitente' : 'Nuevo Remitente')}
                {modal === 'remision' && 'Nueva Remisión'}
                {modal === 'factura' && 'Nueva Factura'}
                {modal === 'movimiento' && `Nuevo Movimiento — Caja ${currentCaja}`}
              </div>
              <button className="modal-close" onClick={closeModal}>✕</button>
            </div>

            {/* MODAL PRODUCTO */}
            {modal === 'producto' && (
              <div>
                <div className="form-row">
                  <div className="field"><label>Referencia</label><input value={form.ref||''} onChange={e=>setF('ref',e.target.value)} placeholder="REF-001"/></div>
                  <div className="field"><label>Unidad</label><input value={form.unidad||''} onChange={e=>setF('unidad',e.target.value)} placeholder="Und, Kg, Lt..."/></div>
                </div>
                <div className="form-row">
                  <div className="field" style={{gridColumn:'1/-1'}}><label>Nombre</label><input value={form.nombre||''} onChange={e=>setF('nombre',e.target.value)} placeholder="Nombre del producto"/></div>
                </div>
                <div className="form-row">
                  <div className="field" style={{gridColumn:'1/-1'}}><label>Descripción</label><textarea value={form.descripcion||''} onChange={e=>setF('descripcion',e.target.value)} style={{width:'100%',background:'var(--bg)',border:'1px solid var(--border)',borderRadius:6,padding:'9px 12px',color:'var(--text)',fontFamily:'inherit',fontSize:13,minHeight:80,resize:'vertical'}}/></div>
                </div>
                <div className="form-row">
                  <div className="field"><label>Precio unitario</label><input type="number" value={form.precio||''} onChange={e=>setF('precio',e.target.value)} placeholder="0"/></div>
                </div>
                <div className="modal-footer">
                  <button className="btn" onClick={closeModal}>Cancelar</button>
                  <button className="btn btn-accent" onClick={saveProducto} disabled={loading}>{loading?'Guardando...':'Guardar'}</button>
                </div>
              </div>
            )}

            {/* MODAL CLIENTE */}
            {modal === 'cliente' && (
              <div>
                <div className="form-row"><div className="field" style={{gridColumn:'1/-1'}}><label>Nombre / Razón Social</label><input value={form.nombre||''} onChange={e=>setF('nombre',e.target.value)} placeholder="Nombre completo"/></div></div>
                <div className="form-row">
                  <div className="field"><label>NIT / Cédula</label><input value={form.nit||''} onChange={e=>setF('nit',e.target.value)} placeholder="000-0"/></div>
                  <div className="field"><label>Teléfono</label><input value={form.telefono||''} onChange={e=>setF('telefono',e.target.value)} placeholder="300 000 0000"/></div>
                </div>
                <div className="form-row"><div className="field" style={{gridColumn:'1/-1'}}><label>Email</label><input type="email" value={form.email||''} onChange={e=>setF('email',e.target.value)} placeholder="correo@ejemplo.com"/></div></div>
                <div className="form-row"><div className="field" style={{gridColumn:'1/-1'}}><label>Dirección</label><input value={form.direccion||''} onChange={e=>setF('direccion',e.target.value)} placeholder="Dirección"/></div></div>
                <div className="modal-footer">
                  <button className="btn" onClick={closeModal}>Cancelar</button>
                  <button className="btn btn-accent" onClick={saveCliente} disabled={loading}>{loading?'Guardando...':'Guardar'}</button>
                </div>
              </div>
            )}

            {/* MODAL REMITENTE */}
            {modal === 'remitente' && (
              <div>
                <div className="form-row"><div className="field" style={{gridColumn:'1/-1'}}><label>Nombre completo</label><input value={form.nombre||''} onChange={e=>setF('nombre',e.target.value)} placeholder="Nombre"/></div></div>
                <div className="form-row">
                  <div className="field"><label>Cargo</label><input value={form.cargo||''} onChange={e=>setF('cargo',e.target.value)} placeholder="Cargo o rol"/></div>
                  <div className="field"><label>Teléfono</label><input value={form.telefono||''} onChange={e=>setF('telefono',e.target.value)} placeholder="300 000 0000"/></div>
                </div>
                <div className="modal-footer">
                  <button className="btn" onClick={closeModal}>Cancelar</button>
                  <button className="btn btn-accent" onClick={saveRemitente} disabled={loading}>{loading?'Guardando...':'Guardar'}</button>
                </div>
              </div>
            )}

            {/* MODAL REMISION */}
            {modal === 'remision' && (
              <div>
                <div className="form-row">
                  <div className="field"><label>Fecha</label><input type="date" value={form.fecha||''} onChange={e=>setF('fecha',e.target.value)}/></div>
                  <div className="field"><label>Cliente</label>
                    <select value={form.cliente_nombre||''} onChange={e=>setF('cliente_nombre',e.target.value)}>
                      <option value="">Seleccionar...</option>
                      {clientes.map(c=><option key={c.id} value={c.nombre}>{c.nombre}</option>)}
                    </select>
                  </div>
                  <div className="field"><label>Remitente</label>
                    <select value={form.remitente_nombre||''} onChange={e=>setF('remitente_nombre',e.target.value)}>
                      <option value="">Seleccionar...</option>
                      {remitentes.map(r=><option key={r.id} value={r.nombre}>{r.nombre}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{marginBottom:10}}>
                  <label style={{fontSize:11,fontWeight:600,color:'var(--text2)',textTransform:'uppercase',letterSpacing:'.5px',display:'block',marginBottom:8}}>Seleccionar productos</label>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))',gap:8,marginBottom:12}}>
                    {productos.map(p=>(
                      <div key={p.id} onClick={()=>toggleProdRem(p)} style={{background:'var(--bg)',border:`1px solid ${remItems[p.id]?'var(--accent)':'var(--border)'}`,borderRadius:6,padding:10,cursor:'pointer',textAlign:'center',background:remItems[p.id]?'rgba(79,124,255,0.1)':'var(--bg)'}}>
                        <div style={{fontSize:13,fontWeight:500}}>{p.nombre}</div>
                        <div style={{fontSize:11,color:'var(--text2)'}}>{p.ref}</div>
                      </div>
                    ))}
                  </div>
                  {Object.values(remItems).length > 0 && (
                    <table style={{background:'var(--bg)',border:'1px solid var(--border)',borderRadius:6,overflow:'hidden'}}>
                      <thead><tr><th>Producto</th><th>Unidad</th><th>Cantidad</th><th></th></tr></thead>
                      <tbody>{Object.values(remItems).map(it=>(
                        <tr key={it.prod.id}>
                          <td>{it.prod.nombre}</td><td>{it.prod.unidad||'—'}</td>
                          <td><input type="number" min="1" value={it.qty} onChange={e=>setRemItems(prev=>({...prev,[it.prod.id]:{...prev[it.prod.id],qty:Number(e.target.value)||1}}))} style={{width:70,background:'var(--surface)',border:'1px solid var(--border)',borderRadius:4,padding:'4px 8px',color:'var(--text)',textAlign:'center'}}/></td>
                          <td><button onClick={()=>setRemItems(prev=>{const n={...prev};delete n[it.prod.id];return n})} style={{background:'none',border:'none',color:'var(--text3)',cursor:'pointer'}}>✕</button></td>
                        </tr>
                      ))}</tbody>
                    </table>
                  )}
                </div>
                <div className="modal-footer">
                  <button className="btn" onClick={closeModal}>Cancelar</button>
                  <button className="btn btn-accent" onClick={saveRemision} disabled={loading}>{loading?'Guardando...':'Guardar remisión'}</button>
                </div>
              </div>
            )}

            {/* MODAL FACTURA */}
            {modal === 'factura' && (
              <div>
                <div className="form-row">
                  <div className="field"><label>Fecha</label><input type="date" value={form.fecha||''} onChange={e=>setF('fecha',e.target.value)}/></div>
                  <div className="field"><label>Cliente</label>
                    <select value={form.cliente_nombre||''} onChange={e=>setF('cliente_nombre',e.target.value)}>
                      <option value="">Seleccionar...</option>
                      {clientes.map(c=><option key={c.id} value={c.nombre}>{c.nombre}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{marginBottom:10}}>
                  <label style={{fontSize:11,fontWeight:600,color:'var(--text2)',textTransform:'uppercase',letterSpacing:'.5px',display:'block',marginBottom:8}}>Seleccionar productos</label>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))',gap:8,marginBottom:12}}>
                    {productos.map(p=>(
                      <div key={p.id} onClick={()=>toggleProdFac(p)} style={{background:facItems[p.id]?'rgba(79,124,255,0.1)':'var(--bg)',border:`1px solid ${facItems[p.id]?'var(--accent)':'var(--border)'}`,borderRadius:6,padding:10,cursor:'pointer',textAlign:'center'}}>
                        <div style={{fontSize:13,fontWeight:500}}>{p.nombre}</div>
                        <div style={{fontSize:11,color:'var(--text2)'}}>${Number(p.precio||0).toLocaleString()}</div>
                      </div>
                    ))}
                  </div>
                  {Object.values(facItems).length > 0 && (
                    <div>
                      <table style={{background:'var(--bg)',border:'1px solid var(--border)',borderRadius:6,overflow:'hidden'}}>
                        <thead><tr><th>Producto</th><th>Precio</th><th>Cantidad</th><th>Subtotal</th><th></th></tr></thead>
                        <tbody>{Object.values(facItems).map(it=>(
                          <tr key={it.prod.id}>
                            <td>{it.prod.nombre}</td>
                            <td style={{fontFamily:'monospace'}}>${Number(it.prod.precio||0).toLocaleString()}</td>
                            <td><input type="number" min="1" value={it.qty} onChange={e=>setFacItems(prev=>({...prev,[it.prod.id]:{...prev[it.prod.id],qty:Number(e.target.value)||1}}))} style={{width:70,background:'var(--surface)',border:'1px solid var(--border)',borderRadius:4,padding:'4px 8px',color:'var(--text)',textAlign:'center'}}/></td>
                            <td style={{fontFamily:'monospace'}}>${((it.prod.precio||0)*it.qty).toLocaleString()}</td>
                            <td><button onClick={()=>setFacItems(prev=>{const n={...prev};delete n[it.prod.id];return n})} style={{background:'none',border:'none',color:'var(--text3)',cursor:'pointer'}}>✕</button></td>
                          </tr>
                        ))}</tbody>
                      </table>
                      <div style={{textAlign:'right',padding:12,fontSize:16,fontWeight:700}}>Total: <span style={{color:'var(--accent)'}}>${Object.values(facItems).reduce((s,i)=>s+(i.prod.precio||0)*i.qty,0).toLocaleString()}</span></div>
                    </div>
                  )}
                </div>
                <div className="modal-footer">
                  <button className="btn" onClick={closeModal}>Cancelar</button>
                  <button className="btn btn-accent" onClick={saveFactura} disabled={loading}>{loading?'Guardando...':'Guardar factura'}</button>
                </div>
              </div>
            )}

            {/* MODAL MOVIMIENTO */}
            {modal === 'movimiento' && (
              <div>
                <div className="form-row">
                  <div className="field"><label>Fecha</label><input type="date" value={form.fecha||''} onChange={e=>setF('fecha',e.target.value)}/></div>
                  <div className="field"><label>Tipo</label>
                    <select value={form.tipo||'ingreso'} onChange={e=>setF('tipo',e.target.value)}>
                      <option value="ingreso">Ingreso</option>
                      <option value="egreso">Egreso</option>
                    </select>
                  </div>
                </div>
                <div className="form-row"><div className="field" style={{gridColumn:'1/-1'}}><label>Concepto</label><input value={form.concepto||''} onChange={e=>setF('concepto',e.target.value)} placeholder="Descripción del movimiento"/></div></div>
                <div className="form-row"><div className="field"><label>Valor</label><input type="number" value={form.valor||''} onChange={e=>setF('valor',e.target.value)} placeholder="0"/></div></div>
                <div className="modal-footer">
                  <button className="btn" onClick={closeModal}>Cancelar</button>
                  <button className="btn btn-accent" onClick={saveMovimiento} disabled={loading}>{loading?'Guardando...':'Registrar'}</button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js" async></script>
    </div>
  )
}
