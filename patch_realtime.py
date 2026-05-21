with open('app/dashboard/page.js', 'r') as f:
    c = f.read()

OLD = "  useEffect(() => { if (token) { loadAll(); loadCaja(currentCaja) } }, [token, loadAll, loadCaja, currentCaja])"
NEW = """  useEffect(() => { if (token) { loadAll(); loadCaja(currentCaja) } }, [token, loadAll, loadCaja, currentCaja])

  useEffect(() => {
    if (!token) return
    let ch
    import('@supabase/supabase-js').then(({ createClient: cc }) => {
      const sb = cc(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
      ch = sb.channel('rt-insumos')
        .on('postgres_changes',{event:'*',schema:'public',table:'facturas'},()=>loadAll())
        .on('postgres_changes',{event:'*',schema:'public',table:'cotizaciones'},()=>loadAll())
        .on('postgres_changes',{event:'*',schema:'public',table:'remisiones'},()=>loadAll())
        .on('postgres_changes',{event:'*',schema:'public',table:'productos'},()=>loadAll())
        .on('postgres_changes',{event:'*',schema:'public',table:'clientes'},()=>loadAll())
        .on('postgres_changes',{event:'*',schema:'public',table:'remitentes'},()=>loadAll())
        .on('postgres_changes',{event:'*',schema:'public',table:'caja_movimientos'},()=>loadCaja(currentCaja))
        .subscribe()
    })
    return () => { if (ch) ch.unsubscribe() }
  }, [token, loadAll, loadCaja, currentCaja])"""

if OLD in c:
    c = c.replace(OLD, NEW)
    with open('app/dashboard/page.js', 'w') as f:
        f.write(c)
    print("patch_realtime OK")
else:
    print("ERROR")
