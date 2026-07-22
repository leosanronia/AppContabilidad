import { useEffect, useState } from 'react'
import type { Categoria, Mes } from '../types'
import { listarCategorias } from '../api/categorias'
import { listarMeses, listarSemanas } from '../api/semanas'
import { listarAgrupadores } from '../api/agrupadores'
import { listarItems } from '../api/items'
import { listarTodosLosSaldos } from '../api/saldos'
import { listarTodosLosIngresos } from '../api/ingresos'
import { listarMovimientos } from '../api/movimientos'
import { guardarPlan, listarPresupuesto } from '../api/presupuesto'
import {
  calcularPresupuesto,
  clave,
  gastoPorMesCategoria,
  ordenarMeses,
  totalesDeMes,
  type FilaPresupuesto,
} from '../utils/presupuesto'
import {
  gastoPorSemana,
  ingresosPorMes,
  reconciliacionPorMes,
  resumenPorSemana,
  tipoPorItem,
} from '../utils/reconciliacion'
import { evaluarMonto } from '../utils/calculadora'
import { formatearCOP } from '../utils/moneda'

export function Presupuesto() {
  const [meses, setMeses] = useState<Mes[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [filasPorMes, setFilasPorMes] = useState<Map<number, FilaPresupuesto[]>>(
    new Map(),
  )
  const [ingresosMes, setIngresosMes] = useState<Map<number, number>>(new Map())
  const [mesId, setMesId] = useState<number | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)

  // categoriaId -> texto que se esta editando en la columna Plan
  const [planes, setPlanes] = useState<Record<number, string>>({})

  useEffect(() => {
    void cargar(true)
  }, [])

  async function cargar(primeraVez = false) {
    if (primeraVez) setCargando(true)
    setError(null)
    try {
      const [ms, cats, sems, ags, its, sal, ings, movs, pres] =
        await Promise.all([
          listarMeses(),
          listarCategorias(),
          listarSemanas(),
          listarAgrupadores(),
          listarItems(),
          listarTodosLosSaldos(),
          listarTodosLosIngresos(),
          listarMovimientos(),
          listarPresupuesto(),
        ])

      const mesesOrdenados = ordenarMeses(ms)
      const activas = cats.filter((c) => c.activo)

      // Gasto de la linea "Semanas": viene de la reconciliacion, no de
      // movimientos anotados.
      const tipos = tipoPorItem(ags, its)
      const resumen = resumenPorSemana(sems, sal, ings, tipos)
      const gastosSem = gastoPorSemana(sems, resumen)

      const planPorMesCat = new Map<string, number>()
      for (const l of pres) planPorMesCat.set(clave(l.mes_id, l.categoria_id), l.plan)

      const calc = calcularPresupuesto({
        mesesOrdenados,
        categorias: activas,
        planPorMesCat,
        gastoPorMesCat: gastoPorMesCategoria(movs, sems),
        reconciliacionPorMes: reconciliacionPorMes(sems, gastosSem),
      })

      setMeses(mesesOrdenados)
      setCategorias(activas)
      setFilasPorMes(calc)
      setIngresosMes(ingresosPorMes(sems, ings))

      // Por defecto, el mes mas reciente.
      const actual =
        mesId !== null && mesesOrdenados.some((m) => m.id === mesId)
          ? mesId
          : (mesesOrdenados[mesesOrdenados.length - 1]?.id ?? null)
      setMesId(actual)

      const filas = actual !== null ? (calc.get(actual) ?? []) : []
      const txt: Record<number, string> = {}
      for (const f of filas) txt[f.categoriaId] = String(f.plan)
      setPlanes(txt)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      if (primeraVez) setCargando(false)
    }
  }

  function cambiarMes(nuevo: number) {
    setMesId(nuevo)
    const filas = filasPorMes.get(nuevo) ?? []
    const txt: Record<number, string> = {}
    for (const f of filas) txt[f.categoriaId] = String(f.plan)
    setPlanes(txt)
  }

  // Guarda el Plan al salir del campo. Recalcula todo (el arrastre afecta
  // a los meses siguientes).
  function confirmarPlan(categoriaId: number) {
    if (mesId === null) return
    const texto = (planes[categoriaId] ?? '').trim()
    if (texto === '') return
    let valor: number
    try {
      valor = evaluarMonto(texto)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      return
    }
    setOcupado(true)
    void (async () => {
      try {
        await guardarPlan(mesId, categoriaId, valor)
        await cargar()
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      } finally {
        setOcupado(false)
      }
    })()
  }

  const filas = mesId !== null ? (filasPorMes.get(mesId) ?? []) : []
  const totales = totalesDeMes(filas)
  const ingresosDelMes = mesId !== null ? (ingresosMes.get(mesId) ?? 0) : 0
  const porAsignar = ingresosDelMes - totales.plan
  const mesActual = meses.find((m) => m.id === mesId) ?? null

  return (
    <section className="panel">
      <h2 className="panel-titulo">Presupuesto del mes</h2>
      <p className="panel-sub">
        Asigna el Plan de cada categoría hasta cuadrarlo con tus ingresos. El
        «Por pagar» de un mes se arrastra solo al siguiente.
      </p>

      {cargando && <p className="aviso">Cargando presupuesto…</p>}
      {error && <div className="aviso aviso-error">{error}</div>}

      {!cargando && meses.length === 0 && (
        <p className="vacio">
          Aún no hay meses. Crea una semana en la pestaña Semanas y el mes se
          crea solo.
        </p>
      )}

      {!cargando && meses.length > 0 && categorias.length === 0 && (
        <p className="vacio">
          Primero crea tus categorías en Configuración.
        </p>
      )}

      {!cargando && meses.length > 0 && categorias.length > 0 && (
        <>
          <label className="campo campo-ancho">
            <span className="campo-etiqueta">Mes</span>
            <select
              className="input"
              value={mesId ?? ''}
              onChange={(e) => cambiarMes(Number(e.target.value))}
            >
              {[...meses].reverse().map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nombre} {m.anio}
                </option>
              ))}
            </select>
          </label>

          {/* Cuadre: la suma de los planes deberia igualar los ingresos. */}
          <div
            className={`cuadre ${
              porAsignar === 0
                ? 'cuadre-ok'
                : porAsignar > 0
                  ? 'cuadre-sobra'
                  : 'cuadre-falta'
            }`}
          >
            <div className="cuadre-linea">
              <span>Ingresos de {mesActual?.nombre}</span>
              <strong>{formatearCOP(ingresosDelMes)}</strong>
            </div>
            <div className="cuadre-linea">
              <span>Suma de los planes</span>
              <strong>{formatearCOP(totales.plan)}</strong>
            </div>
            <div className="cuadre-linea cuadre-destacado">
              <span>
                {porAsignar === 0
                  ? 'Cuadrado'
                  : porAsignar > 0
                    ? 'Falta por asignar'
                    : 'Te pasaste del ingreso'}
              </span>
              <strong>{formatearCOP(Math.abs(porAsignar))}</strong>
            </div>
            {ingresosDelMes === 0 && (
              <p className="cuadre-nota">
                Este mes no tiene ingresos registrados. Anótalos en la pestaña
                Semanas para poder cuadrar el presupuesto.
              </p>
            )}
          </div>

          <div className="tabla-scroll">
            <table className="tabla-presupuesto">
              <thead>
                <tr>
                  <th>Categoría</th>
                  <th className="num">Plan</th>
                  <th className="num">Plan + mes ant.</th>
                  <th className="num">Gasto</th>
                  <th className="num">Por pagar</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((f) => (
                  <tr key={f.categoriaId}>
                    <td>
                      {f.nombre}
                      {f.usaReconciliacion && (
                        <span
                          className="marca-recon"
                          title="El gasto de esta línea viene de la reconciliación semanal, no de gastos anotados"
                        >
                          auto
                        </span>
                      )}
                    </td>
                    <td className="num">
                      <input
                        className="input input-sm plan-input"
                        value={planes[f.categoriaId] ?? ''}
                        onChange={(e) =>
                          setPlanes((p) => ({
                            ...p,
                            [f.categoriaId]: e.target.value,
                          }))
                        }
                        onBlur={() => confirmarPlan(f.categoriaId)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') e.currentTarget.blur()
                        }}
                        disabled={ocupado}
                      />
                    </td>
                    <td className="num">
                      {formatearCOP(f.planMasAnterior)}
                      {f.saldoAnterior !== 0 && (
                        <span className="arrastre">
                          {f.saldoAnterior > 0 ? '+' : '−'}
                          {formatearCOP(Math.abs(f.saldoAnterior))} del mes ant.
                        </span>
                      )}
                    </td>
                    <td className="num">{formatearCOP(f.gasto)}</td>
                    <td
                      className={`num ${f.porPagar < 0 ? 'negativo' : ''}`}
                    >
                      {formatearCOP(f.porPagar)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td>Total</td>
                  <td className="num">{formatearCOP(totales.plan)}</td>
                  <td className="num">
                    {formatearCOP(totales.planMasAnterior)}
                  </td>
                  <td className="num">{formatearCOP(totales.gasto)}</td>
                  <td
                    className={`num ${totales.porPagar < 0 ? 'negativo' : ''}`}
                  >
                    {formatearCOP(totales.porPagar)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
    </section>
  )
}
