import { useEffect, useState, type FormEvent } from 'react'
import type { CategoriaIngreso, Ingreso } from '../types'
import {
  actualizarIngreso,
  crearIngreso,
  eliminarIngreso,
} from '../api/ingresos'
import { listarCategoriasIngreso } from '../api/categoriasIngreso'
import { evaluarMonto } from '../utils/calculadora'
import { formatearCOP } from '../utils/moneda'

interface Props {
  semanaId: number
  ingresos: Ingreso[]
  onCambio: () => Promise<void>
}

// Ingresos que cayeron en UNA semana (INT, Prima, Arriendo...). La suma
// alimenta la reconciliacion del gasto (HU-008). El origen se elige de una
// lista fija para poder analizarlos despues (HU-024).
export function IngresosSemana({ semanaId, ingresos, onCambio }: Props) {
  const [categorias, setCategorias] = useState<CategoriaIngreso[]>([])
  const [categoriaId, setCategoriaId] = useState('')
  const [detalle, setDetalle] = useState('')
  const [monto, setMonto] = useState('')
  const [editandoId, setEditandoId] = useState<number | null>(null)
  const [eCategoria, setECategoria] = useState('')
  const [eDetalle, setEDetalle] = useState('')
  const [eMonto, setEMonto] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      try {
        setCategorias(await listarCategoriasIngreso())
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      }
    })()
  }, [])

  const activas = categorias.filter((c) => c.activo)
  const total = ingresos.reduce((acc, i) => acc + i.monto, 0)

  function nombreCategoria(id: number | null): string {
    if (id === null) return 'Sin categoría'
    return categorias.find((c) => c.id === id)?.nombre ?? 'Sin categoría'
  }

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
    let valor: number
    try {
      valor = evaluarMonto(monto)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      return
    }
    correr(async () => {
      await crearIngreso(
        semanaId,
        categoriaId === '' ? null : Number(categoriaId),
        valor,
        detalle.trim(),
      )
      setMonto('')
      setDetalle('')
      // La categoria se conserva: suele registrarse varias veces la misma.
    })
  }

  function guardarEdicion(id: number) {
    let valor: number
    try {
      valor = evaluarMonto(eMonto)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      return
    }
    correr(async () => {
      await actualizarIngreso(id, {
        categoria_ingreso_id: eCategoria === '' ? null : Number(eCategoria),
        nombre: eDetalle.trim(),
        monto: valor,
      })
      setEditandoId(null)
    })
  }

  function borrar(i: Ingreso) {
    const etiqueta = nombreCategoria(i.categoria_ingreso_id)
    if (!confirm(`¿Eliminar el ingreso "${etiqueta}" de ${formatearCOP(i.monto)}?`))
      return
    correr(async () => {
      await eliminarIngreso(i.id)
    })
  }

  return (
    <div className="ingresos-panel">
      <div className="ingresos-cabecera">
        <span className="ingresos-titulo">Ingresos de la semana</span>
        <strong className="ingresos-total">{formatearCOP(total)}</strong>
      </div>

      {ingresos.length > 0 && (
        <ul className="ingresos-lista">
          {ingresos.map((i) => (
            <li className="ingreso-fila" key={i.id}>
              {editandoId === i.id ? (
                <>
                  <select
                    className="input input-sm"
                    value={eCategoria}
                    onChange={(e) => setECategoria(e.target.value)}
                  >
                    <option value="">Sin categoría</option>
                    {activas.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre}
                      </option>
                    ))}
                  </select>
                  <input
                    className="input input-sm"
                    placeholder="Detalle (opcional)"
                    value={eDetalle}
                    onChange={(e) => setEDetalle(e.target.value)}
                  />
                  <input
                    className="input input-sm saldo-input"
                    value={eMonto}
                    onChange={(e) => setEMonto(e.target.value)}
                  />
                  <button
                    className="btn btn-sm btn-primario"
                    onClick={() => guardarEdicion(i.id)}
                    disabled={ocupado}
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
                  <span className="ingreso-nombre">
                    {nombreCategoria(i.categoria_ingreso_id)}
                    {i.nombre && (
                      <span className="ingreso-detalle"> · {i.nombre}</span>
                    )}
                  </span>
                  <span className="ingreso-monto">{formatearCOP(i.monto)}</span>
                  <div className="fila-acciones">
                    <button
                      className="btn btn-sm btn-ghost"
                      onClick={() => {
                        setEditandoId(i.id)
                        setECategoria(
                          i.categoria_ingreso_id === null
                            ? ''
                            : String(i.categoria_ingreso_id),
                        )
                        setEDetalle(i.nombre ?? '')
                        setEMonto(String(i.monto))
                      }}
                      disabled={ocupado}
                    >
                      Editar
                    </button>
                    <button
                      className="btn btn-sm btn-peligro"
                      onClick={() => borrar(i)}
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

      {activas.length === 0 && (
        <p className="items-vacio">
          Primero crea tus categorías de ingreso en Configuración.
        </p>
      )}

      <form className="ingreso-form" onSubmit={agregar}>
        <select
          className="input input-sm"
          value={categoriaId}
          onChange={(e) => setCategoriaId(e.target.value)}
          aria-label="Origen del ingreso"
        >
          <option value="">Sin categoría</option>
          {activas.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </select>
        <input
          className="input input-sm"
          placeholder="Detalle (opcional)"
          value={detalle}
          onChange={(e) => setDetalle(e.target.value)}
        />
        <input
          className="input input-sm saldo-input"
          placeholder="Monto"
          value={monto}
          onChange={(e) => setMonto(e.target.value)}
        />
        <button
          className="btn btn-sm btn-primario"
          type="submit"
          disabled={ocupado || monto.trim() === ''}
        >
          Agregar ingreso
        </button>
      </form>

      {error && <div className="aviso aviso-error">{error}</div>}
    </div>
  )
}
