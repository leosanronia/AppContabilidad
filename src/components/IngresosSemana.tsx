import { useState, type FormEvent } from 'react'
import type { Ingreso } from '../types'
import {
  actualizarIngreso,
  crearIngreso,
  eliminarIngreso,
} from '../api/ingresos'
import { evaluarMonto } from '../utils/calculadora'
import { formatearCOP } from '../utils/moneda'

interface Props {
  semanaId: number
  ingresos: Ingreso[]
  onCambio: () => Promise<void>
}

// Ingresos que cayeron en UNA semana (INT, Prima, Arriendo...). La suma
// alimenta la reconciliacion del gasto (HU-008).
export function IngresosSemana({ semanaId, ingresos, onCambio }: Props) {
  const [nombre, setNombre] = useState('')
  const [monto, setMonto] = useState('')
  const [editandoId, setEditandoId] = useState<number | null>(null)
  const [eNombre, setENombre] = useState('')
  const [eMonto, setEMonto] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const total = ingresos.reduce((acc, i) => acc + i.monto, 0)

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
    const n = nombre.trim()
    if (!n) return
    let valor: number
    try {
      valor = evaluarMonto(monto)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      return
    }
    correr(async () => {
      await crearIngreso(semanaId, n, valor)
      setNombre('')
      setMonto('')
    })
  }

  function guardarEdicion(id: number) {
    const n = eNombre.trim()
    if (!n) return
    let valor: number
    try {
      valor = evaluarMonto(eMonto)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      return
    }
    correr(async () => {
      await actualizarIngreso(id, { nombre: n, monto: valor })
      setEditandoId(null)
    })
  }

  function borrar(i: Ingreso) {
    if (!confirm(`¿Eliminar el ingreso "${i.nombre}" de ${formatearCOP(i.monto)}?`))
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
                  <input
                    className="input input-sm"
                    value={eNombre}
                    onChange={(e) => setENombre(e.target.value)}
                  />
                  <input
                    className="input input-sm saldo-input"
                    value={eMonto}
                    onChange={(e) => setEMonto(e.target.value)}
                  />
                  <button
                    className="btn btn-sm btn-primario"
                    onClick={() => guardarEdicion(i.id)}
                    disabled={ocupado || !eNombre.trim()}
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
                  <span className="ingreso-nombre">{i.nombre}</span>
                  <span className="ingreso-monto">{formatearCOP(i.monto)}</span>
                  <div className="fila-acciones">
                    <button
                      className="btn btn-sm btn-ghost"
                      onClick={() => {
                        setEditandoId(i.id)
                        setENombre(i.nombre)
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

      <form className="ingreso-form" onSubmit={agregar}>
        <input
          className="input input-sm"
          placeholder="Nombre (ej. INT, Prima, Arriendo)"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
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
          disabled={ocupado || !nombre.trim() || monto.trim() === ''}
        >
          Agregar ingreso
        </button>
      </form>

      {error && <div className="aviso aviso-error">{error}</div>}
    </div>
  )
}
