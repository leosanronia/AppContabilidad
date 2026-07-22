import { useEffect, useState, type FormEvent } from 'react'
import type { CategoriaIngreso } from '../types'
import {
  actualizarCategoriaIngreso,
  crearCategoriaIngreso,
  eliminarCategoriaIngreso,
  listarCategoriasIngreso,
} from '../api/categoriasIngreso'

export function CategoriasIngreso() {
  const [lista, setLista] = useState<CategoriaIngreso[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)

  const [nuevoNombre, setNuevoNombre] = useState('')
  const [editandoId, setEditandoId] = useState<number | null>(null)
  const [editNombre, setEditNombre] = useState('')

  useEffect(() => {
    void (async () => {
      try {
        setLista(await listarCategoriasIngreso())
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      } finally {
        setCargando(false)
      }
    })()
  }, [])

  async function cargar() {
    setLista(await listarCategoriasIngreso())
  }

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
      await crearCategoriaIngreso(nombre, lista.length)
      setNuevoNombre('')
      await cargar()
    })
  }

  function guardarEdicion() {
    const nombre = editNombre.trim()
    if (!nombre || editandoId === null) return
    const id = editandoId
    ejecutar(async () => {
      await actualizarCategoriaIngreso(id, { nombre })
      setEditandoId(null)
      await cargar()
    })
  }

  function alternarActivo(c: CategoriaIngreso) {
    ejecutar(async () => {
      await actualizarCategoriaIngreso(c.id, { activo: !c.activo })
      await cargar()
    })
  }

  function eliminar(c: CategoriaIngreso) {
    if (
      !confirm(
        `¿Eliminar "${c.nombre}"? Los ingresos que la usaban quedarán sin categoría. Si ya la usaste, es mejor desactivarla.`,
      )
    )
      return
    ejecutar(async () => {
      await eliminarCategoriaIngreso(c.id)
      await cargar()
    })
  }

  function mover(id: number, dir: 'arriba' | 'abajo') {
    const idx = lista.findIndex((c) => c.id === id)
    const destino = dir === 'arriba' ? idx - 1 : idx + 1
    if (idx < 0 || destino < 0 || destino >= lista.length) return
    const nueva = [...lista]
    ;[nueva[idx], nueva[destino]] = [nueva[destino], nueva[idx]]
    ejecutar(async () => {
      await Promise.all(
        nueva
          .map((c, i) => ({ c, i }))
          .filter(({ c, i }) => c.orden !== i)
          .map(({ c, i }) => actualizarCategoriaIngreso(c.id, { orden: i })),
      )
      await cargar()
    })
  }

  return (
    <section className="panel" style={{ marginTop: '1.25rem' }}>
      <h2 className="panel-titulo">Categorías de ingreso</h2>
      <p className="panel-sub">
        De dónde viene tu plata (INT, Arriendo, Prima…). Al registrar un ingreso
        eliges de esta lista, para que después puedas analizarlos sin que queden
        variantes del mismo nombre.
      </p>

      <form className="form-nuevo" onSubmit={agregar}>
        <input
          className="input"
          placeholder="Nombre (ej. INT, Arriendo, Prima)"
          value={nuevoNombre}
          onChange={(e) => setNuevoNombre(e.target.value)}
        />
        <button
          className="btn btn-primario"
          type="submit"
          disabled={ocupado || !nuevoNombre.trim()}
        >
          Agregar
        </button>
      </form>

      {error && <div className="aviso aviso-error">{error}</div>}
      {cargando && <p className="aviso">Cargando…</p>}

      {!cargando && lista.length === 0 && (
        <p className="vacio">
          Aún no tienes categorías de ingreso. Crea las tuyas arriba.
        </p>
      )}

      {lista.length > 0 && (
        <ul className="lista">
          {lista.map((c, i) => (
            <li className={`fila ${c.activo ? '' : 'fila-inactiva'}`} key={c.id}>
              {editandoId === c.id ? (
                <div className="fila-edicion">
                  <input
                    className="input input-sm"
                    value={editNombre}
                    onChange={(e) => setEditNombre(e.target.value)}
                  />
                  <button
                    className="btn btn-sm btn-primario"
                    onClick={guardarEdicion}
                    disabled={ocupado || !editNombre.trim()}
                  >
                    Guardar
                  </button>
                  <button
                    className="btn btn-sm btn-ghost"
                    onClick={() => setEditandoId(null)}
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <>
                  <span className="fila-nombre">{c.nombre}</span>
                  <div className="fila-acciones">
                    <button
                      className="btn-icono btn-icono-sm"
                      onClick={() => mover(c.id, 'arriba')}
                      disabled={ocupado || i === 0}
                      title="Subir"
                    >
                      ↑
                    </button>
                    <button
                      className="btn-icono btn-icono-sm"
                      onClick={() => mover(c.id, 'abajo')}
                      disabled={ocupado || i === lista.length - 1}
                      title="Bajar"
                    >
                      ↓
                    </button>
                    <button
                      className="btn btn-sm btn-ghost"
                      onClick={() => alternarActivo(c)}
                      disabled={ocupado}
                    >
                      {c.activo ? 'Desactivar' : 'Activar'}
                    </button>
                    <button
                      className="btn btn-sm btn-ghost"
                      onClick={() => {
                        setEditandoId(c.id)
                        setEditNombre(c.nombre)
                      }}
                      disabled={ocupado}
                    >
                      Editar
                    </button>
                    <button
                      className="btn btn-sm btn-peligro"
                      onClick={() => eliminar(c)}
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
