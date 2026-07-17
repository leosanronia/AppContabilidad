import { useEffect, useState, type FormEvent } from 'react'
import type { Agrupador, ItemBalance, TipoAgrupador } from '../types'
import { TIPOS } from '../types'
import {
  actualizarAgrupador,
  crearAgrupador,
  eliminarAgrupador,
  listarAgrupadores,
} from '../api/agrupadores'
import { listarItems } from '../api/items'
import { ItemsAgrupador } from './ItemsAgrupador'

function etiquetaTipo(tipo: TipoAgrupador): string {
  return TIPOS.find((t) => t.valor === tipo)?.etiqueta ?? tipo
}

export function Agrupadores() {
  const [lista, setLista] = useState<Agrupador[]>([])
  const [items, setItems] = useState<ItemBalance[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [expandidos, setExpandidos] = useState<Set<number>>(new Set())

  const [nuevoNombre, setNuevoNombre] = useState('')
  const [nuevoTipo, setNuevoTipo] = useState<TipoAgrupador>('liquidez')

  const [editandoId, setEditandoId] = useState<number | null>(null)
  const [editNombre, setEditNombre] = useState('')
  const [editTipo, setEditTipo] = useState<TipoAgrupador>('liquidez')

  useEffect(() => {
    void (async () => {
      try {
        const [ags, its] = await Promise.all([listarAgrupadores(), listarItems()])
        setLista(ags)
        setItems(its)
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      } finally {
        setCargando(false)
      }
    })()
  }, [])

  async function cargar() {
    const [ags, its] = await Promise.all([listarAgrupadores(), listarItems()])
    setLista(ags)
    setItems(its)
  }

  async function recargarItems() {
    setItems(await listarItems())
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

  function itemsDe(agrupadorId: number): ItemBalance[] {
    return items.filter((it) => it.agrupador_id === agrupadorId)
  }

  function alternarExpandir(id: number) {
    setExpandidos((prev) => {
      const siguiente = new Set(prev)
      if (siguiente.has(id)) siguiente.delete(id)
      else siguiente.add(id)
      return siguiente
    })
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
    const n = itemsDe(a.id).length
    const aviso =
      n > 0
        ? `¿Eliminar "${a.nombre}" y sus ${n} ítem(s)?`
        : `¿Eliminar el agrupador "${a.nombre}"?`
    if (!confirm(aviso)) return
    ejecutar(async () => {
      await eliminarAgrupador(a.id)
      await cargar()
    })
  }

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
        Las cuentas de tu balance, con su tipo. Expande cada una para ver y
        editar sus ítems. El orden es el que verás en el balance semanal.
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
      {cargando && <p className="aviso">Cargando…</p>}

      {!cargando && lista.length === 0 && (
        <p className="vacio">Aún no tienes agrupadores. Crea el primero arriba.</p>
      )}

      {lista.length > 0 && (
        <ul className="lista">
          {lista.map((a, i) => {
            const susItems = itemsDe(a.id)
            const abierto = expandidos.has(a.id)
            return (
              <li className="agrup-card" key={a.id}>
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
                  <div className="agrup-header">
                    <button
                      className="expandir"
                      onClick={() => alternarExpandir(a.id)}
                      title={abierto ? 'Contraer' : 'Expandir'}
                      aria-expanded={abierto}
                    >
                      {abierto ? '▾' : '▸'}
                    </button>
                    <span
                      className="fila-nombre nombre-clic"
                      onClick={() => alternarExpandir(a.id)}
                    >
                      {a.nombre}
                    </span>
                    <span className="item-count">
                      {susItems.length} ítem{susItems.length === 1 ? '' : 's'}
                    </span>
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
                  </div>
                )}

                {abierto && editandoId !== a.id && (
                  <ItemsAgrupador
                    agrupadorId={a.id}
                    items={susItems}
                    onCambio={recargarItems}
                  />
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
