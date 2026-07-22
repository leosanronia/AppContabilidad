import { useEffect, useState, type FormEvent } from 'react'
import type { Categoria, Movimiento, Semana } from '../types'
import { listarSemanas } from '../api/semanas'
import { listarCategorias } from '../api/categorias'
import {
  actualizarMovimiento,
  crearMovimiento,
  eliminarMovimiento,
  listarMovimientosDeSemana,
} from '../api/movimientos'
import { evaluarMonto } from '../utils/calculadora'
import { formatearCOP } from '../utils/moneda'
import { hoyISO } from '../utils/fechas'

export function Gastos() {
  const [semanas, setSemanas] = useState<Semana[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [movs, setMovs] = useState<Movimiento[]>([])
  const [semanaId, setSemanaId] = useState<number | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)

  // Formulario de nuevo gasto.
  const [monto, setMonto] = useState('')
  const [categoriaId, setCategoriaId] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [fecha, setFecha] = useState(hoyISO())

  // Edicion en linea.
  const [editandoId, setEditandoId] = useState<number | null>(null)
  const [eMonto, setEMonto] = useState('')
  const [eCategoria, setECategoria] = useState('')
  const [eDescripcion, setEDescripcion] = useState('')
  const [eFecha, setEFecha] = useState('')

  useEffect(() => {
    void (async () => {
      try {
        const [ss, cs] = await Promise.all([listarSemanas(), listarCategorias()])
        setSemanas(ss)
        setCategorias(cs)
        if (ss.length > 0) setSemanaId(ss[ss.length - 1].id)
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      } finally {
        setCargando(false)
      }
    })()
  }, [])

  useEffect(() => {
    if (semanaId === null) {
      setMovs([])
      return
    }
    void (async () => {
      try {
        setMovs(await listarMovimientosDeSemana(semanaId))
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      }
    })()
  }, [semanaId])

  async function recargarMovs() {
    if (semanaId !== null) setMovs(await listarMovimientosDeSemana(semanaId))
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

  const categoriasActivas = categorias.filter((c) => c.activo)
  const nombreCategoria = (id: number | null) =>
    id === null ? 'Sin categoría' : (categorias.find((c) => c.id === id)?.nombre ?? 'Sin categoría')

  function agregar(e: FormEvent) {
    e.preventDefault()
    if (semanaId === null) return
    let valor: number
    try {
      valor = evaluarMonto(monto)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      return
    }
    ejecutar(async () => {
      await crearMovimiento({
        semanaId,
        categoriaId: categoriaId === '' ? null : Number(categoriaId),
        monto: valor,
        descripcion: descripcion.trim() === '' ? null : descripcion.trim(),
        fecha: fecha || null,
      })
      setMonto('')
      setDescripcion('')
      // La categoria y la fecha se conservan: suele anotarse varios seguidos.
      await recargarMovs()
    })
  }

  function iniciarEdicion(m: Movimiento) {
    setEditandoId(m.id)
    setEMonto(String(m.monto))
    setECategoria(m.categoria_id === null ? '' : String(m.categoria_id))
    setEDescripcion(m.descripcion ?? '')
    setEFecha(m.fecha ?? hoyISO())
  }

  function guardarEdicion(id: number) {
    let valor: number
    try {
      valor = evaluarMonto(eMonto)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      return
    }
    ejecutar(async () => {
      await actualizarMovimiento(id, {
        monto: valor,
        categoria_id: eCategoria === '' ? null : Number(eCategoria),
        descripcion: eDescripcion.trim() === '' ? null : eDescripcion.trim(),
        fecha: eFecha || null,
      })
      setEditandoId(null)
      await recargarMovs()
    })
  }

  function borrar(m: Movimiento) {
    if (!confirm(`¿Eliminar este gasto de ${formatearCOP(m.monto)}?`)) return
    ejecutar(async () => {
      await eliminarMovimiento(m.id)
      await recargarMovs()
    })
  }

  const total = movs.reduce((acc, m) => acc + m.monto, 0)
  const semanaActual = semanas.find((s) => s.id === semanaId) ?? null

  return (
    <section className="panel">
      <h2 className="panel-titulo">Gastos de la semana</h2>
      <p className="panel-sub">
        Anota aquí, en el momento, los gastos que tienen categoría del
        presupuesto (mercado, salud, Claude…). Los gastos sin categoría no se
        anotan: los captura la reconciliación del balance.
      </p>

      {!cargando && semanas.length === 0 && (
        <p className="vacio">
          Primero crea una semana en la pestaña Semanas.
        </p>
      )}

      {semanas.length > 0 && (
        <>
          <label className="campo campo-ancho">
            <span className="campo-etiqueta">Semana</span>
            <select
              className="input"
              value={semanaId ?? ''}
              onChange={(e) => setSemanaId(Number(e.target.value))}
            >
              {[...semanas].reverse().map((s) => (
                <option key={s.id} value={s.id}>
                  {s.rango}
                </option>
              ))}
            </select>
          </label>

          <form className="form-gasto" onSubmit={agregar}>
            <div className="form-gasto-fila">
              <input
                className="input saldo-input"
                inputMode="numeric"
                placeholder="Monto"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                aria-label="Monto"
              />
              <select
                className="input"
                value={categoriaId}
                onChange={(e) => setCategoriaId(e.target.value)}
                aria-label="Categoría"
              >
                <option value="">Sin categoría</option>
                {categoriasActivas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-gasto-fila">
              <input
                className="input"
                placeholder="Descripción (opcional)"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                aria-label="Descripción"
              />
              <input
                type="date"
                className="input"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                aria-label="Fecha"
              />
            </div>
            <button
              className="btn btn-primario btn-ancho"
              type="submit"
              disabled={ocupado || monto.trim() === ''}
            >
              Anotar gasto
            </button>
          </form>

          {error && <div className="aviso aviso-error">{error}</div>}

          <div className="gastos-total">
            <span>
              {semanaActual ? `Anotado en ${semanaActual.rango}` : 'Anotado'}
            </span>
            <strong>{formatearCOP(total)}</strong>
          </div>

          {movs.length === 0 && (
            <p className="items-vacio">Todavía no hay gastos anotados esta semana.</p>
          )}

          <ul className="lista">
            {movs.map((m) => (
              <li className="mov-fila" key={m.id}>
                {editandoId === m.id ? (
                  <div className="mov-edicion">
                    <input
                      className="input input-sm saldo-input"
                      value={eMonto}
                      onChange={(e) => setEMonto(e.target.value)}
                    />
                    <select
                      className="input input-sm"
                      value={eCategoria}
                      onChange={(e) => setECategoria(e.target.value)}
                    >
                      <option value="">Sin categoría</option>
                      {categoriasActivas.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nombre}
                        </option>
                      ))}
                    </select>
                    <input
                      className="input input-sm"
                      placeholder="Descripción"
                      value={eDescripcion}
                      onChange={(e) => setEDescripcion(e.target.value)}
                    />
                    <input
                      type="date"
                      className="input input-sm"
                      value={eFecha}
                      onChange={(e) => setEFecha(e.target.value)}
                    />
                    <div className="fila-acciones">
                      <button
                        className="btn btn-sm btn-primario"
                        onClick={() => guardarEdicion(m.id)}
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
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="mov-info">
                      <span className="mov-cat">{nombreCategoria(m.categoria_id)}</span>
                      {m.descripcion && (
                        <span className="mov-desc">{m.descripcion}</span>
                      )}
                      {m.fecha && <span className="mov-fecha">{m.fecha}</span>}
                    </div>
                    <span className="mov-monto">{formatearCOP(m.monto)}</span>
                    <div className="fila-acciones">
                      <button
                        className="btn btn-sm btn-ghost"
                        onClick={() => iniciarEdicion(m)}
                        disabled={ocupado}
                      >
                        Editar
                      </button>
                      <button
                        className="btn btn-sm btn-peligro"
                        onClick={() => borrar(m)}
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
        </>
      )}
    </section>
  )
}
