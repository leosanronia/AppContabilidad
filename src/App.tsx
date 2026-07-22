import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabaseClient'
import { Agrupadores } from './components/Agrupadores'
import { Categorias } from './components/Categorias'
import { Gastos } from './components/Gastos'
import { Login } from './components/Login'
import { Semanas } from './components/Semanas'

type Vista = 'semanas' | 'gastos' | 'configuracion'

const TITULOS: Record<Vista, string> = {
  semanas: 'Semanas',
  gastos: 'Gastos',
  configuracion: 'Configuración',
}

function App() {
  const [vista, setVista] = useState<Vista>('semanas')
  const [sesion, setSesion] = useState<Session | null>(null)
  const [cargandoSesion, setCargandoSesion] = useState(true)

  useEffect(() => {
    // Sesion actual al cargar + suscripcion a cambios (login / logout).
    void supabase.auth.getSession().then(({ data }) => {
      setSesion(data.session)
      setCargandoSesion(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_evento, s) => {
      setSesion(s)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  if (cargandoSesion) {
    return (
      <div className="app">
        <p className="aviso">Cargando…</p>
      </div>
    )
  }

  if (!sesion) {
    return <Login />
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header-top">
          <p className="eyebrow">App de finanzas personales</p>
          <button
            className="btn btn-sm btn-ghost"
            onClick={() => void supabase.auth.signOut()}
          >
            Salir
          </button>
        </div>
        <h1 className="app-titulo">{TITULOS[vista]}</h1>
      </header>

      <nav className="tabs">
        <button
          className={`tab ${vista === 'semanas' ? 'tab-activa' : ''}`}
          onClick={() => setVista('semanas')}
        >
          Semanas
        </button>
        <button
          className={`tab ${vista === 'gastos' ? 'tab-activa' : ''}`}
          onClick={() => setVista('gastos')}
        >
          Gastos
        </button>
        <button
          className={`tab ${vista === 'configuracion' ? 'tab-activa' : ''}`}
          onClick={() => setVista('configuracion')}
        >
          Configuración
        </button>
      </nav>

      {vista === 'semanas' && <Semanas />}
      {vista === 'gastos' && <Gastos />}
      {vista === 'configuracion' && (
        <>
          <Agrupadores />
          <Categorias />
        </>
      )}
    </div>
  )
}

export default App
