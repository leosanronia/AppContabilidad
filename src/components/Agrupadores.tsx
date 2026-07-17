import { useEffect, useState, type FormEvent } from 'react'
import type { Agrupador, TipoAgrupador } from '../types'
import { TIPOS } from '../types'
import {
  actualizarAgrupador,
  crearAgrupador,
  eliminarAgrupador,
  listarAgrupadores,
} from '../api/agrupadores'

function etiquetaTipo(tipo: TipoAgrupador): string {
  return TIPOS.find((t) => t.valor === tipo)?.etiqueta ?? tipo
}

export function Agrupadores() {
  const [lista, setLista] = useState<Agrupador[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)

  const [nuevoNombre, setNuevoNombre] = useState('')
  const [nuevoTipo, setNuevoTipo] = useState<TipoAgrupador>('liquidez')

  const [editandoId, setEditandoId] = useState<number | null>(null)
  const [editNombre, setEditNombre] = useState('')
  const [editTipo, setEditTipo] = useState<TipoAgrupador>('liquidez')

  useEffect(() => {
    void (async () => {
      try {
        setLista(await listarAgrupadores())
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      } finally {
        setCargando(false)
      }
    })()
  }, [])

  async function cargar() {
    setLista(await listarAgrupadores())
  }

  // Ejecuta una operacion contra la base, manejando error y estado ocupado.
  function ejecutar(fn: () => Promise<void>) {
    setError(null)
    setOcupado(true)
    void (async () => {
      try {
        await fn()
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      } finally {
        setOcupado(false)
      }
    })()
  }

  function agregar(e: FormEvent) {
    e.preventDefault()
    const nombre = nuevoNombre.trim()
    if (!nombre) return
    ejecutar(async () => {
      await crearAgrupador(nombre, nuevoTipo, lista.length)
      setNuevoNombre('')
      setNuevoTipo('liquidez')
      await cargar()
    })
  }

  function iniciarEdicion(a: Agrupador) {
    setEditandoId(a.id)
    setEditNombre(a.nombre)
    setEditTipo(a.tipo)
  }

  function guardarEdicion() {
    const nombre = editNombre.trim()
    if (!nombre || editandoId === null) return
    const id = editandoId
    ejecutar(async () => {
      await actualizarAgrupador(id, { nombre, tipo: editTipo })
      setEditandoId(null)
      await cargar()
    })
  }

  function eliminar(a: Agrupador) {
    if (!confirm(`¿Eliminar el agrupador "${a.nombre}"?`)) return
    ejecutar(async () => {
      await eliminarAgrupador(a.id)
      await cargar()
    })
  }

  // Sube o baja un agrupador intercambiando su posicion con el vecino.
  // Normaliza el campo "orden" a la posicion (0..n-1) y persiste los cambios.
  function mover(id: number, dir: 'arriba' | 'abajo') {
    const idx = lista.findIndex((a) => a.id === id)
    const destino = dir === 'arriba' ? idx - 1 : idx + 1
    if (idx < 0 || destino < 0 || destino >= lista.length) return
    const nueva = [...lista]
    ;[nueva[idx], nueva[destino]] = [nueva[destino], nueva[idx]]
    ejecutar(async () => {
      await Promise.all(
        nueva
          .map((a, i) => ({ a, i }))
          .filter(({ a, i }) => a.orden !== i)
          .map(({ a, i }) => actualizarAgrupador(a.id, { orden: i })),
      )
      await cargar()
    })
  }

  return (
    <section className="panel">
      <h2 className="panel-titulo">Mis agrupadores</h2>
      <p className="panel-sub">
        Las cuentas de tu balance, con su tipo. El orden es el que verás en el
        balance semanal.
      </p>

      <form className="form-nuevo" onSubmit={agregar}>
        <input
          className="input"
          placeholder="Nombre (ej. Tarjeta, Apto, Rappi)"
          value={nuevoNombre}
          onChange={(e) => setNuevoNombre(e.target.value)}
        />
        <select
          className="input"
          value={nuevoTipo}
          onChange={(e) => setNuevoTipo(e.target.value as TipoAgrupador)}
        >
          {TIPOS.map((t) => (
            <option key={t.valor} value={t.valor}>
              {t.etiqueta}
            </option>
          ))}
        </select>
        <button
          className="btn btn-primario"
          type="submit"
          disabled={ocupado || !nuevoNombre.trim()}
        >
          Agregar
        </button>
      </form>

      {error && <div className="aviso aviso-error">{error}</div>}
      {cargando && <p className="aviso">Cargando agrupadores…</p>}

      {!cargando && lista.length === 0 && (
        <p className="vacio">Aún no tienes agrupadores. Crea el primero arriba.</p>
      )}

      {lista.length > 0 && (
        <ul className="lista">
          {lista.map((a, i) => (
            <li className="fila" key={a.id}>
              {editandoId === a.id ? (
                <div className="fila-edicion">
                  <input
                    className="input"
                    value={editNombre}
                    onChange={(e) => setEditNombre(e.target.value)}
                  />
                  <select
                    className="input"
                    value={editTipo}
                    onChange={(e) => setEditTipo(e.target.value as TipoAgrupador)}
                  >
                    {TIPOS.map((t) => (
                      <option key={t.valor} value={t.valor}>
                        {t.etiqueta}
                      </option>
                    ))}
                  </select>
                  <button
                    className="btn btn-primario"
                    onClick={guardarEdicion}
                    disabled={ocupado || !editNombre.trim()}
                  >
                    Guardar
                  </button>
                  <button
                    className="btn btn-ghost"
                    onClick={() => setEditandoId(null)}
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <>
                  <span className="fila-nombre">{a.nombre}</span>
                  <span className={`badge badge-${a.tipo}`}>
                    {etiquetaTipo(a.tipo)}
                  </span>
                  <div className="fila-acciones">
                    <button
                      className="btn-icono"
                      onClick={() => mover(a.id, 'arriba')}
                      disabled={ocupado || i === 0}
                      title="Subir"
                    >
                      ↑
                    </button>
                    <button
                      className="btn-icono"
                      onClick={() => mover(a.id, 'abajo')}
                      disabled={ocupado || i === lista.length - 1}
                      title="Bajar"
                    >
                      ↓
                    </button>
                    <button
                      className="btn btn-ghost"
                      onClick={() => iniciarEdicion(a)}
                      disabled={ocupado}
                    >
                      Editar
                    </button>
                    <button
                      className="btn btn-peligro"
                      onClick={() => eliminar(a)}
                      disabled={ocupado}
                    >
                      Eliminar
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
