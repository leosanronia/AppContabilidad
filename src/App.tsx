import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

type Estado =
  | { tipo: 'cargando' }
  | { tipo: 'ok'; agrupadores: number }
  | { tipo: 'error'; mensaje: string }

function App() {
  const [estado, setEstado] = useState<Estado>({ tipo: 'cargando' })

  useEffect(() => {
    async function comprobar() {
      // Cuenta las filas de agrupadores sin traerlas (head: true).
      // Si responde sin error, la app quedo conectada a Supabase.
      const { error, count } = await supabase
        .from('agrupadores')
        .select('*', { count: 'exact', head: true })

      if (error) {
        setEstado({ tipo: 'error', mensaje: error.message })
      } else {
        setEstado({ tipo: 'ok', agrupadores: count ?? 0 })
      }
    }
    comprobar()
  }, [])

  return (
    <main
      style={{
        maxWidth: 640,
        margin: '4rem auto',
        padding: '0 1.25rem',
        lineHeight: 1.6,
      }}
    >
      <p
        style={{
          fontSize: 12,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: '#005A9C',
          fontWeight: 700,
          margin: 0,
        }}
      >
        HU-001 · Conexion con la base de datos
      </p>
      <h1 style={{ fontSize: '1.8rem', margin: '0.25rem 0 1.25rem' }}>
        App de finanzas personales
      </h1>

      {estado.tipo === 'cargando' && (
        <p style={{ color: '#4A5568' }}>Conectando a la base de datos…</p>
      )}

      {estado.tipo === 'ok' && (
        <div
          style={{
            padding: '1rem 1.25rem',
            borderRadius: 8,
            background: '#E6F4EC',
            border: '1px solid #A3D9B8',
            color: '#1A7A4A',
          }}
        >
          <strong>✓ Conectado a Supabase.</strong>
          <br />
          La tabla <code>agrupadores</code> respondio — {estado.agrupadores}{' '}
          agrupador(es) registrados.
        </div>
      )}

      {estado.tipo === 'error' && (
        <div
          style={{
            padding: '1rem 1.25rem',
            borderRadius: 8,
            background: '#FDECEA',
            border: '1px solid #FFCDD2',
            color: '#B71C1C',
          }}
        >
          <strong>✗ No se pudo conectar.</strong>
          <br />
          {estado.mensaje}
        </div>
      )}
    </main>
  )
}

export default App
