import { supabase } from '../supabaseClient'
import type { SaldoSemana } from '../types'

const COLS = 'id, item_id, semana_id, monto'

export async function listarSaldosDeSemana(
  semanaId: number,
): Promise<SaldoSemana[]> {
  const { data, error } = await supabase
    .from('saldos_semana')
    .select(COLS)
    .eq('semana_id', semanaId)
  if (error) throw new Error(error.message)
  // numeric de Postgres puede llegar como texto; se normaliza a number.
  return (data ?? []).map((s: SaldoSemana) => ({ ...s, monto: Number(s.monto) }))
}

// Todos los saldos de todas las semanas, para calcular el historial
// (neto y gasto de cada semana) en una sola consulta.
export async function listarTodosLosSaldos(): Promise<SaldoSemana[]> {
  const { data, error } = await supabase.from('saldos_semana').select(COLS)
  if (error) throw new Error(error.message)
  return (data ?? []).map((s: SaldoSemana) => ({ ...s, monto: Number(s.monto) }))
}

// Crea o actualiza el saldo de un item en una semana.
// La tabla tiene unique(item_id, semana_id), asi que upsert no duplica.
export async function guardarSaldo(
  itemId: number,
  semanaId: number,
  monto: number,
): Promise<void> {
  const { error } = await supabase
    .from('saldos_semana')
    .upsert(
      { item_id: itemId, semana_id: semanaId, monto },
      { onConflict: 'item_id,semana_id' },
    )
  if (error) throw new Error(error.message)
}

// Copia los saldos de una semana a otra: el punto de partida de la semana
// nueva (la mayoria de cuentas cambia poco de una semana a otra).
export async function copiarSaldos(
  desdeSemanaId: number,
  haciaSemanaId: number,
): Promise<number> {
  const origen = await listarSaldosDeSemana(desdeSemanaId)
  if (origen.length === 0) return 0

  const filas = origen.map((s) => ({
    item_id: s.item_id,
    semana_id: haciaSemanaId,
    monto: s.monto,
  }))
  const { error } = await supabase
    .from('saldos_semana')
    .upsert(filas, { onConflict: 'item_id,semana_id' })
  if (error) throw new Error(error.message)
  return filas.length
}
