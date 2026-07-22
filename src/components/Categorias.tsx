import { useEffect, useState, type FormEvent } from 'react'
import type { Categoria } from '../types'
import { GRUPOS, etiquetaGrupo } from '../types'
import {
  actualizarCategoria,
  crearCategoria,
  eliminarCategoria,
  listarCategorias,
} from '../api/categorias'
import { evaluarMonto } from '../utils/calculadora'
import { formatearCOP } from '../utils/moneda'

export function Categorias() {
  const [lista, setLista] = useState<Categoria[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)

  const [nuevoNombre, setNuevoNombre] = useState('')
  const [nuevoGrupo, setNuevoGrupo] = useState('fijos')
  const [nuevoMonto, setNuevoMonto] = useState('')

  const [editandoId, setEditandoId] = useState<number | null>(null)
  const [editNombre, setEditNombre] = useState('')
  const [editGrupo, setEditGrupo] = useState('fijos')
  const [editMonto, setEditMonto] = useState('')

  useEffect(() => {
    void (async () => {
      try {
        setLista(await listarCategorias())
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      } finally {
        setCargando(false)
      }
    })()
  }, [])

  async function cargar() {
    setLista(await listarCategorias())
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

  // Los montos aceptan operaciones, igual que los saldos.
  function montoDe(texto: string): number | null {
    if (texto.trim() === '') return 0
    try {
      return evaluarMonto(texto)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      return null
    }
  }

  function agregar(e: FormEvent) {
    e.preventDefault()
    const nombre = nuevoNombre.trim()
    if (!nombre) return
    const monto = montoDe(nuevoMonto)
    if (monto === null) return
    ejecutar(async () => {
      await crearCategoria(nombre, nuevoGrupo || null, monto, lista.length)
      setNuevoNombre('')
      setNuevoMonto('')
      await cargar()
    })
  }

  function iniciarEdicion(c: Categoria) {
    setEditandoId(c.id)
    setEditNombre(c.nombre)
    setEditGrupo(c.grupo ?? '')
    setEditMonto(String(c.monto_default))
  }

  function guardarEdicion() {
    const nombre = editNombre.trim()
    if (!nombre || editandoId === null) return
    const monto = montoDe(editMonto)
    if (monto === null) return
    const id = editandoId
    ejecutar(async () => {
      await actualizarCategoria(id, {
        nombre,
        grupo: editGrupo || null,
        monto_default: monto,
      })
      setEditandoId(null)
      await cargar()
    })
  }

  function alternarActivo(c: Categoria) {
    ejecutar(async () => {
      await actualizarCategoria(c.id, { activo: !c.activo })
      await cargar()
    })
  }

  function eliminar(c: Categoria) {
    if (
      !confirm(
        `¿Eliminar la categoría "${c.nombre}"? Si ya la usaste en algún gasto, es mejor desactivarla para no perder la historia.`,
      )
    )
      return
    ejecutar(async () => {
      await eliminarCategoria(c.id)
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
          .map(({ c, i }) => actualizarCategoria(c.id, { orden: i })),
      )
      await cargar()
    })
  }

  // La plantilla es la base del presupuesto: su suma debe cuadrar con los
  // ingresos del mes (eso se valida en la HU-013).
  const totalPlantilla = lista
    .filter((c) => c.activo)
    .reduce((acc, c) => acc + c.monto_default, 0)

  return (
    <section className="panel" style={{ marginTop: '1.25rem' }}>
      <h2 className="panel-titulo">Mis categorías</h2>
      <p className="panel-sub">
        Las categorías de tu presupuesto, con el monto que sueles asignarles.
        Ese monto es la <strong>plantilla</strong>: con él arrancará cada mes,
        y luego lo ajustas sin tocar la plantilla.
      </p>

      <form className="form-nuevo" onSubmit={agregar}>
        <input
          className="input"
          placeholder="Nombre (ej. Mercado, Cel, Salud)"
          value={nuevoNombre}
          onChange={(e) => setNuevoNombre(e.target.value)}
        />
        <select
          className="input"
          value={nuevoGrupo}
          onChange={(e) => setNuevoGrupo(e.target.value)}
        >
          {GRUPOS.map((g) => (
            <option key={g.valor} value={g.valor}>
              {g.etiqueta}
            </option>
          ))}
          <option value="">Sin grupo</option>
        </select>
        <input
          className="input saldo-input"
          placeholder="Monto usual"
          value={nuevoMonto}
          onChange={(e) => setNuevoMonto(e.target.value)}
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
      {cargando && <p className="aviso">Cargando categorías…</p>}

      {!cargando && lista.length === 0 && (
        <p className="vacio">
          Aún no tienes categorías. Crea las de tu presupuesto arriba.
        </p>
      )}

      {lista.length > 0 && (
        <>
          <ul className="lista">
            {lista.map((c, i) => (
              <li
                className={`fila ${c.activo ? '' : 'fila-inactiva'}`}
                key={c.id}
              >
                {editandoId === c.id ? (
                  <div className="fila-edicion">
                    <input
                      className="input input-sm"
                      value={editNombre}
                      onChange={(e) => setEditNombre(e.target.value)}
                    />
                    <select
                      className="input input-sm"
                      value={editGrupo}
                      onChange={(e) => setEditGrupo(e.target.value)}
                    >
                      {GRUPOS.map((g) => (
                        <option key={g.valor} value={g.valor}>
                          {g.etiqueta}
                        </option>
                      ))}
                      <option value="">Sin grupo</option>
                    </select>
                    <input
                      className="input input-sm saldo-input"
                      value={editMonto}
                      onChange={(e) => setEditMonto(e.target.value)}
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
                    <span className="badge badge-grupo">
                      {etiquetaGrupo(c.grupo)}
                    </span>
                    <span className="cat-monto">
                      {formatearCOP(c.monto_default)}
                    </span>
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
                        title={
                          c.activo
                            ? 'Desactivar (no se borra la historia)'
                            : 'Volver a activar'
                        }
                      >
                        {c.activo ? 'Desactivar' : 'Activar'}
                      </button>
                      <button
                        className="btn btn-sm btn-ghost"
                        onClick={() => iniciarEdicion(c)}
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

          <div className="cat-total">
            <span>Total de la plantilla (categorías activas)</span>
            <strong>{formatearCOP(totalPlantilla)}</strong>
          </div>
        </>
      )}
    </section>
  )
}
