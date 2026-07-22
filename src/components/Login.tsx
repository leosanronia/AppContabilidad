import { useState, type FormEvent } from 'react'
import { supabase } from '../supabaseClient'

// Traduce los mensajes mas comunes de Supabase Auth a algo claro en espanol.
function traducir(mensaje: string): string {
  if (/invalid login credentials/i.test(mensaje)) {
    return 'Correo o contraseña incorrectos.'
  }
  if (/email not confirmed/i.test(mensaje)) {
    return 'La cuenta existe pero falta confirmarla.'
  }
  return mensaje
}

export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)

  function entrar(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setOcupado(true)
    void (async () => {
      // El cambio de sesion lo detecta App (onAuthStateChange) y muestra la app.
      const { error: err } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })
      if (err) setError(traducir(err.message))
      setOcupado(false)
    })()
  }

  return (
    <div className="login-fondo">
      <form className="login-caja" onSubmit={entrar}>
        <p className="eyebrow">App de finanzas personales</p>
        <h1 className="login-titulo">Iniciar sesión</h1>
        <p className="login-sub">Tus finanzas son privadas: ingresa para verlas.</p>

        <label className="campo campo-ancho">
          <span className="campo-etiqueta">Correo</span>
          <input
            type="email"
            className="input"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>

        <label className="campo campo-ancho">
          <span className="campo-etiqueta">Contraseña</span>
          <input
            type="password"
            className="input"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>

        {error && <div className="aviso aviso-error">{error}</div>}

        <button
          className="btn btn-primario btn-ancho"
          type="submit"
          disabled={ocupado || email.trim() === '' || password === ''}
        >
          {ocupado ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </div>
  )
}
