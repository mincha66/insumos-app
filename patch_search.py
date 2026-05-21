with open('app/dashboard/page.js', 'r') as f:
    c = f.read()

# Estado facSearch
c = c.replace(
    "  const [facRemitente, setFacRemitente] = useState(null)",
    "  const [facRemitente, setFacRemitente] = useState(null)\n  const [facSearch, setFacSearch] = useState('')\n  const [prodSearch, setProdSearch] = useState('')"
)

# Reset en openModal
c = c.replace(
    "    setRemSearch('')",
    "    setRemSearch(''); setFacSearch(''); setProdSearch('')"
)

# Reset en closeModal
c = c.replace(
    "  setRemSearch('') }",
    "  setRemSearch(''); setFacSearch(''); setProdSearch('') }"
)

# Facturas: reemplazar select por buscador
OLD_FAC = """                  <div className="field" style={{marginBottom:8}}><label>Agregar producto</label>
                    <select onChange={e=>{if(e.target.value){addProductoFac(productos.find(x=>x.id==e.target.value));e.target.value=''}}} style={inS}>
                      <option value="">Seleccionar producto...</option>
                      {productos.map(p=><option key={p.id} value={p.id}>{p.nombre}</option>)}
                    </select>
                  </div>"""
NEW_FAC = """                  <div className="field" style={{marginBottom:8,position:'relative'}}><label>Agregar producto</label>
                    <input type="text" value={facSearch} onChange={e=>setFacSearch(e.target.value)} placeholder="Buscar producto..." style={inS}/>
                    {facSearch && (
                      <div style={{position:'absolute',top:'100%',left:0,right:0,background:'#fff',border:'1px solid #dde1ea',borderRadius:'0 0 6px 6px',maxHeight:200,overflowY:'auto',zIndex:100,boxShadow:'0 4px 12px rgba(0,0,0,0.1)'}}>
                        {productos.filter(p=>(p.nombre||'').toLowerCase().includes(facSearch.toLowerCase())).slice(0,12).map(p=>(
                          <div key={p.id} onClick={()=>{addProductoFac(p);setFacSearch('')}} style={{padding:'8px 12px',cursor:'pointer',borderBottom:'1px solid #f0f0f0',fontSize:13}}>
                            {p.nombre} {p.ref?<span style={{color:'#6b7280',fontSize:11}}>({p.ref})</span>:''}
                          </div>
                        ))}
                        {productos.filter(p=>(p.nombre||'').toLowerCase().includes(facSearch.toLowerCase())).length===0 && (
                          <div style={{padding:'10px 12px',color:'#9ca3af',fontSize:13}}>Sin resultados</div>
                        )}
                      </div>
                    )}
                  </div>"""
c = c.replace(OLD_FAC, NEW_FAC)

# Productos: agregar buscador encima de la tabla
OLD_PROD = """              {productos.length === 0 ? <div className="empty-state"><div className="icon">📦</div><p>No hay productos</p></div> : (
                <table><thead><tr><th>Ref.</th><th>Nombre</th><th>Unidad</th><th>Acciones</th></tr></thead>
                  <tbody>{productos.map(p => ("""
NEW_PROD = """              <div style={{marginBottom:12}}>
                <input type="text" value={prodSearch} onChange={e=>setProdSearch(e.target.value)} placeholder="Buscar por nombre o referencia..." style={{width:'100%',background:'#fff',border:'1px solid #dde1ea',borderRadius:6,padding:'9px 12px',fontSize:13,color:'#111928'}}/>
              </div>
              {productos.length === 0 ? <div className="empty-state"><div className="icon">📦</div><p>No hay productos</p></div> : (
                <table><thead><tr><th>Ref.</th><th>Nombre</th><th>Unidad</th><th>Acciones</th></tr></thead>
                  <tbody>{productos.filter(p=>!prodSearch||(p.nombre||'').toLowerCase().includes(prodSearch.toLowerCase())||(p.ref||'').toLowerCase().includes(prodSearch.toLowerCase())).map(p => ("""
c = c.replace(OLD_PROD, NEW_PROD)

with open('app/dashboard/page.js', 'w') as f:
    f.write(c)
print("patch_search OK" if "facSearch" in c and "prodSearch" in c else "ERROR")
