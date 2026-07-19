import { useState, type FormEvent } from 'react'
import type { ItemBalance } from '../types'
import { actualizarItem, crearItem, eliminarItem } from '../api/items'

interface Props {
  agrupadorId: number
  items: ItemBalance[]
  onCambio: () => Promise<void>
}

// Maneja los items de UN agrupador. Los items llegan por props (fuente de
// verdad en el padre); tras cada operacion se avisa con onCambio para recargar.
export function ItemsAgrupador({ agrupadorId, items, onCambio }: Props) {
  const [nuevoNombre, setNuevoNombre] = useState('')
  const [editandoId, setEditandoId] = useState<number | null>(null)
  const [editNombre, setEditNombre] = useState('')
  const [editNota, setEditNota] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function correr(fn: () => Promise<void>) {
    setError(null)
    setOcupado(true)
    void (async () => {
      try {
        await fn()
        await onCambio()
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
    correr(async () => {
      await crearItem(agrupadorId, nombre, items.length)
      setNuevoNombre('')
    })
  }

  function guardarEdicion() {
    const nombre = editNombre.trim()
    if (!nombre || editandoId === null) return
    const id = editandoId
    const nota = editNota.trim() === '' ? null : editNota.trim()
    correr(async () => {
      await actualizarItem(id, { nombre, nota })
      setEditandoId(null)
    })
  }

  function eliminar(item: ItemBalance) {
    if (!confirm(`¿Eliminar el ítem "${item.nombre}"?`)) return
    correr(async () => {
      await eliminarItem(item.id)
    })
  }

  function mover(id: number, dir: 'arriba' | 'abajo') {
    const idx = items.findIndex((it) => it.id === id)
    const destino = dir === 'arriba' ? idx - 1 : idx + 1
    if (idx < 0 || destino < 0 || destino >= items.length) return
    const nueva = [...items]
    ;[nueva[idx], nueva[destino]] = [nueva[destino], nueva[idx]]
    correr(async () => {
      await Promise.all(
        nueva
          .map((it, i) => ({ it, i }))
          .filter(({ it, i }) => it.orden !== i)
          .map(({ it, i }) => actualizarItem(it.id, { orden: i })),
      )
    })
  }

  return (
    <div className="items-panel">
      {items.length === 0 && (
        <p className="items-vacio">Sin ítems todavía. Agrega el primero abajo.</p>
      )}

      {items.length > 0 && (
        <ul className="items-lista">
          {items.map((it, i) => (
            <li className="item-fila" key={it.id}>
              {editandoId === it.id ? (
                <>
                  <input
                    className="input input-sm"
                    value={editNombre}
                    onChange={(e) => setEditNombre(e.target.value)}
                  />
                  <input
                    className="input input-sm nota-edit"
                    placeholder="Nota (opcional)"
                    value={editNota}
                    onChange={(e) => setEditNota(e.target.value)}
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
                </>
              ) : (
                <>
                  <span className="item-nombre">
                    {it.nombre}
                    {it.nota && (
                      <span className="marca-nota" title={it.nota}>
                        📝
                      </span>
                    )}
                  </span>
                  <div className="fila-acciones">
                    <button
                      className="btn-icono btn-icono-sm"
                      onClick={() => mover(it.id, 'arriba')}
                      disabled={ocupado || i === 0}
                      title="Subir"
                    >
                      ↑
                    </button>
                    <button
                      className="btn-icono btn-icono-sm"
                      onClick={() => mover(it.id, 'abajo')}
                      disabled={ocupado || i === items.length - 1}
                      title="Bajar"
                    >
                      ↓
                    </button>
                    <button
                      className="btn btn-sm btn-ghost"
                      onClick={() => {
                        setEditandoId(it.id)
                        setEditNombre(it.nombre)
                        setEditNota(it.nota ?? '')
                      }}
                      disabled={ocupado}
                    >
                      Editar
                    </button>
                    <button
                      className="btn btn-sm btn-peligro"
                      onClick={() => eliminar(it)}
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

      <form className="item-form" onSubmit={agregar}>
        <input
          className="input input-sm"
          placeholder="Nuevo ítem (ej. Débito Bancolombia)"
          value={nuevoNombre}
          onChange={(e) => setNuevoNombre(e.target.value)}
        />
        <button
          className="btn btn-sm btn-primario"
          type="submit"
          disabled={ocupado || !nuevoNombre.trim()}
        >
          Agregar ítem
        </button>
      </form>

      {error && <div className="aviso aviso-error">{error}</div>}
    </div>
  )
}
