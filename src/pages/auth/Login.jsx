import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [modo, setModo]         = useState('login') // 'login' | 'recovery'
  const [recoveryMsg, setRecoveryMsg] = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Correo o contraseña incorrectos. Verifica tus datos.')
    } else {
      navigate('/dashboard')
    }
    setLoading(false)
  }

  const handleRecovery = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/mi-cuenta`,
    })
    if (error) {
      setError('No se pudo enviar el correo. Verifica la dirección.')
    } else {
      setRecoveryMsg('Revisa tu correo — te enviamos un enlace para restablecer tu contraseña.')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#02106c' }}>
      <div className="w-full max-w-md px-4">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold" style={{ fontFamily: 'Archivo, sans-serif' }}>
            <span className="text-white">FINCO</span>
            <span style={{ color: '#ff7900' }}> ARCOS</span>
          </h1>
          <p className="text-blue-300 mt-2 text-sm">Plataforma de Administración de Créditos</p>
        </div>

        {/* Card */}
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">
            {modo === 'login' ? 'Iniciar sesión' : 'Restablecer contraseña'}
          </h2>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm mb-4">
              {error}
            </div>
          )}

          {recoveryMsg ? (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 text-sm">
                {recoveryMsg}
              </div>
              <button onClick={() => { setModo('login'); setRecoveryMsg('') }} className="btn-secondary w-full">
                Volver al inicio de sesión
              </button>
            </div>
          ) : modo === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="label">Correo electrónico</label>
                <input
                  type="email"
                  className="input"
                  placeholder="correo@empresa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="label">Contraseña</label>
                <input
                  type="password"
                  className="input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className="btn-primary w-full mt-2" disabled={loading}>
                {loading ? 'Ingresando...' : 'Entrar'}
              </button>
              <button type="button" onClick={() => { setModo('recovery'); setError('') }}
                className="w-full text-center text-sm text-gray-400 hover:text-primary transition-colors mt-1">
                Olvidé mi contraseña
              </button>
            </form>
          ) : (
            <form onSubmit={handleRecovery} className="space-y-4">
              <p className="text-sm text-gray-500">Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.</p>
              <div>
                <label className="label">Correo electrónico</label>
                <input
                  type="email"
                  className="input"
                  placeholder="correo@empresa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className="btn-primary w-full" disabled={loading}>
                {loading ? 'Enviando...' : 'Enviar enlace'}
              </button>
              <button type="button" onClick={() => { setModo('login'); setError('') }}
                className="w-full text-center text-sm text-gray-400 hover:text-primary transition-colors">
                Volver al inicio de sesión
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-blue-300 text-xs mt-6 opacity-60">
          Finco Arcos S.A. de C.V. · Querétaro, México
        </p>
      </div>
    </div>
  )
}
