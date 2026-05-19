'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    })
    const data = await res.json()
    if (data.token) {
      localStorage.setItem('token', data.token)
      router.push('/dashboard')
    } else {
      setError('Usuario o contraseña incorrectos')
    }
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'radial-gradient(ellipse at 30% 20%, #1a2050 0%, #0f1117 60%)'
    }}>
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16,
        padding: '48px 40px', width: 380, boxShadow: '0 30px 80px rgba(0,0,0,0.6)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 56, height: 56, background: 'linear-gradient(135deg, #4f7cff, #7c5cff)',
            borderRadius: 14, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24, marginBottom: 12
          }}>⚙️</div>
          <h1 style={{ fontSize: 18, fontWeight: 600 }}>Automatización de Insumos</h1>
          <p style={{ fontSize: 12, color: 'var(--text2)', marginTop: 4 }}>Sistema de gestión interno</p>
        </div>
        <form onSubmit={handleLogin}>
          <div className="field" style={{ marginBottom: 16 }}>
            <label>Usuario</label>
            <input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="admin" required />
          </div>
          <div className="field" style={{ marginBottom: 16 }}>
            <label>Contraseña</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
          </div>
          {error && (
            <div style={{
              background: 'rgba(231,76,60,0.15)', border: '1px solid rgba(231,76,60,0.3)',
              borderRadius: 6, padding: '10px 14px', fontSize: 13, color: '#e74c3c', marginBottom: 12
            }}>{error}</div>
          )}
          <button type="submit" disabled={loading} style={{
            width: '100%', background: 'linear-gradient(135deg, #4f7cff, #7c5cff)',
            border: 'none', borderRadius: 6, padding: 12, color: '#fff',
            fontSize: 14, fontWeight: 600, cursor: 'pointer', marginTop: 8
          }}>
            {loading ? 'Ingresando...' : 'Ingresar al sistema'}
          </button>
        </form>
      </div>
    </div>
  )
}
