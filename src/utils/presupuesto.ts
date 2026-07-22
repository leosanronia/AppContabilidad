import type { Categoria, Mes, Movimiento, Semana } from '../types'
import { numeroMes } from './fechas.ts'

// Calculo del presupuesto mensual: las 4 columnas del Excel
//   Plan · Plan + mes anterior · Gasto · Por pagar
// El "Por pagar" de un mes se arrastra como saldo inicial del siguiente,
// por eso los meses deben recorrerse en orden cronologico.

export interface FilaPresupuesto {
  categoriaId: number
  nombre: string
  grupo: string | null
  plan: number
  saldoAnterior: number
  planMasAnterior: number
  gasto: number
  porPagar: number
  usaReconciliacion: boolean
}

export interface EntradaCalculo {
  mesesOrdenados: Mes[]
  categorias: Categoria[]
  /** `${mesId}:${categoriaId}` -> plan guardado. Si falta, se usa la plantilla. */
  planPorMesCat: Map<string, number>
  /** `${mesId}:${categoriaId}` -> gasto de los movimientos anotados. */
  gastoPorMesCat: Map<string, number>
  /** mesId -> gasto por reconciliacion (alimenta la linea "Semanas"). */
  reconciliacionPorMes: Map<number, number>
}

export function clave(mesId: number, categoriaId: number): string {
  return `${mesId}:${categoriaId}`
}

export function ordenarMeses(meses: Mes[]): Mes[] {
  return [...meses].sort(
    (a, b) => a.anio - b.anio || numeroMes(a.nombre) - numeroMes(b.nombre),
  )
}

// Agrupa los gastos anotados por (mes, categoria). Un movimiento pertenece
// al mes de su semana.
export function gastoPorMesCategoria(
  movimientos: Movimiento[],
  semanas: Semana[],
): Map<string, number> {
  const mesDeSemana = new Map(semanas.map((s) => [s.id, s.mes_id]))
  const mapa = new Map<string, number>()
  for (const m of movimientos) {
    if (m.tipo !== 'gasto' || m.categoria_id === null) continue
    const mesId = mesDeSemana.get(m.semana_id)
    if (mesId === undefined) continue
    const k = clave(mesId, m.categoria_id)
    mapa.set(k, (mapa.get(k) ?? 0) + m.monto)
  }
  return mapa
}

export function calcularPresupuesto(
  e: EntradaCalculo,
): Map<number, FilaPresupuesto[]> {
  const resultado = new Map<number, FilaPresupuesto[]>()
  // categoriaId -> "Por pagar" del mes anterior (el arrastre).
  const arrastre = new Map<number, number>()

  for (const mes of e.mesesOrdenados) {
    const filas: FilaPresupuesto[] = []
    for (const cat of e.categorias) {
      const k = clave(mes.id, cat.id)
      // Si el mes no tiene plan propio, arranca con la plantilla (HU-012).
      const plan = e.planPorMesCat.get(k) ?? cat.monto_default
      const saldoAnterior = arrastre.get(cat.id) ?? 0
      const planMasAnterior = plan + saldoAnterior
      const gasto = cat.usa_reconciliacion
        ? (e.reconciliacionPorMes.get(mes.id) ?? 0)
        : (e.gastoPorMesCat.get(k) ?? 0)
      const porPagar = planMasAnterior - gasto

      filas.push({
        categoriaId: cat.id,
        nombre: cat.nombre,
        grupo: cat.grupo,
        plan,
        saldoAnterior,
        planMasAnterior,
        gasto,
        porPagar,
        usaReconciliacion: cat.usa_reconciliacion,
      })
      arrastre.set(cat.id, porPagar)
    }
    resultado.set(mes.id, filas)
  }
  return resultado
}

export interface TotalesMes {
  plan: number
  planMasAnterior: number
  gasto: number
  porPagar: number
}

export function totalesDeMes(filas: FilaPresupuesto[]): TotalesMes {
  return filas.reduce(
    (acc, f) => ({
      plan: acc.plan + f.plan,
      planMasAnterior: acc.planMasAnterior + f.planMasAnterior,
      gasto: acc.gasto + f.gasto,
      porPagar: acc.porPagar + f.porPagar,
    }),
    { plan: 0, planMasAnterior: 0, gasto: 0, porPagar: 0 },
  )
}
