import type {
  Agrupador,
  Ingreso,
  ItemBalance,
  SaldoSemana,
  Semana,
  TipoAgrupador,
} from '../types'

// Logica de la reconciliacion semanal, en un solo lugar para que la pantalla
// de semanas y la del presupuesto usen exactamente la misma formula.

export interface ResumenSemana {
  neto: number
  ingresos: number
  tieneSaldos: boolean
}

export function tipoPorItem(
  agrupadores: Agrupador[],
  items: ItemBalance[],
): Map<number, TipoAgrupador> {
  const porAgrupador = new Map(agrupadores.map((a) => [a.id, a.tipo]))
  const mapa = new Map<number, TipoAgrupador>()
  for (const it of items) {
    const tipo = porAgrupador.get(it.agrupador_id)
    if (tipo) mapa.set(it.id, tipo)
  }
  return mapa
}

// neto = liquidez + patrimonio − deudas, por semana.
export function resumenPorSemana(
  semanas: Semana[],
  saldos: SaldoSemana[],
  ingresos: Ingreso[],
  tipoItem: Map<number, TipoAgrupador>,
): Map<number, ResumenSemana> {
  const porSemana = new Map<number, SaldoSemana[]>()
  for (const s of saldos) {
    const arr = porSemana.get(s.semana_id) ?? []
    arr.push(s)
    porSemana.set(s.semana_id, arr)
  }

  const ingPorSemana = new Map<number, number>()
  for (const i of ingresos) {
    ingPorSemana.set(i.semana_id, (ingPorSemana.get(i.semana_id) ?? 0) + i.monto)
  }

  const resumen = new Map<number, ResumenSemana>()
  for (const s of semanas) {
    const propios = porSemana.get(s.id) ?? []
    const t = { liquidez: 0, patrimonio: 0, deuda: 0 }
    for (const sal of propios) {
      const tipo = tipoItem.get(sal.item_id)
      if (tipo) t[tipo] += sal.monto
    }
    resumen.set(s.id, {
      neto: t.liquidez + t.patrimonio - t.deuda,
      ingresos: ingPorSemana.get(s.id) ?? 0,
      tieneSaldos: propios.length > 0,
    })
  }
  return resumen
}

// gasto(semana) = neto(anterior) + ingresos(semana) − neto(semana).
// null cuando no se puede calcular (primera semana o alguna sin saldos).
export function gastoPorSemana(
  semanasOrdenadas: Semana[],
  resumen: Map<number, ResumenSemana>,
): Map<number, number | null> {
  const gastos = new Map<number, number | null>()
  semanasOrdenadas.forEach((s, i) => {
    const r = resumen.get(s.id)
    const previa = i > 0 ? semanasOrdenadas[i - 1] : null
    const rp = previa ? resumen.get(previa.id) : null
    if (!r?.tieneSaldos || !rp?.tieneSaldos) gastos.set(s.id, null)
    else gastos.set(s.id, rp.neto + r.ingresos - r.neto)
  })
  return gastos
}

// Suma, por mes, el gasto por reconciliacion de sus semanas. Es lo que
// alimenta la linea "Semanas" del presupuesto.
export function reconciliacionPorMes(
  semanasOrdenadas: Semana[],
  gastos: Map<number, number | null>,
): Map<number, number> {
  const porMes = new Map<number, number>()
  for (const s of semanasOrdenadas) {
    const g = gastos.get(s.id)
    if (g === null || g === undefined) continue
    porMes.set(s.mes_id, (porMes.get(s.mes_id) ?? 0) + g)
  }
  return porMes
}

// Total de ingresos de cada mes (suma de los de sus semanas).
export function ingresosPorMes(
  semanas: Semana[],
  ingresos: Ingreso[],
): Map<number, number> {
  const mesDeSemana = new Map(semanas.map((s) => [s.id, s.mes_id]))
  const porMes = new Map<number, number>()
  for (const i of ingresos) {
    const mesId = mesDeSemana.get(i.semana_id)
    if (mesId === undefined) continue
    porMes.set(mesId, (porMes.get(mesId) ?? 0) + i.monto)
  }
  return porMes
}
