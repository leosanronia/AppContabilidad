import { supabase } from '../supabaseClient'
import type { Ingreso } from '../types'

const COLS = 'id, semana_id, nombre, monto'

function normalizar(i: Ingreso): Ingreso {
  return { ...i, monto: Number(i.monto) }
}

export async function listarIngresosDeSemana(
  semanaId: number,
): Promise<Ingreso[]> {
  const { data, error } = await supabase
    .from('ingresos')
    .select(COLS)
    .eq('semana_id', semanaId)
    .order('id', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []).map(normalizar)
}

// Todos los ingresos, para el historial (el gasto de cada semana usa los
// ingresos de esa semana) y para los totales por mes.
export async function listarTodosLosIngresos(): Promise<Ingreso[]> {
  const { data, error } = await supabase.from('ingresos').select(COLS)
  if (error) throw new Error(error.message)
  return (data ?? []).map(normalizar)
}

export async function crearIngreso(
  semanaId: number,
  nombre: string,
  monto: number,
): Promise<Ingreso> {
  const { data, error } = await supabase
    .from('ingresos')
    .insert({ semana_id: semanaId, nombre, monto })
    .select(COLS)
    .single()
  if (error) throw new Error(error.message)
  return normalizar(data as Ingreso)
}

export async function actualizarIngreso(
  id: number,
  cambios: Partial<Pick<Ingreso, 'nombre' | 'monto'>>,
): Promise<void> {
  const { error } = await supabase.from('ingresos').update(cambios).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function eliminarIngreso(id: number): Promise<void> {
  const { error } = await supabase.from('ingresos').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
