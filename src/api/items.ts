import { supabase } from '../supabaseClient'
import type { ItemBalance } from '../types'

const COLUMNAS = 'id, agrupador_id, nombre, orden'

// Lista todos los items de todos los agrupadores, ordenados.
export async function listarItems(): Promise<ItemBalance[]> {
  const { data, error } = await supabase
    .from('items_balance')
    .select(COLUMNAS)
    .order('agrupador_id', { ascending: true })
    .order('orden', { ascending: true })
    .order('id', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []) as ItemBalance[]
}

export async function crearItem(
  agrupadorId: number,
  nombre: string,
  orden: number,
): Promise<ItemBalance> {
  const { data, error } = await supabase
    .from('items_balance')
    .insert({ agrupador_id: agrupadorId, nombre, orden })
    .select(COLUMNAS)
    .single()
  if (error) throw new Error(error.message)
  return data as ItemBalance
}

export async function actualizarItem(
  id: number,
  cambios: Partial<Pick<ItemBalance, 'nombre' | 'orden'>>,
): Promise<void> {
  const { error } = await supabase.from('items_balance').update(cambios).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function eliminarItem(id: number): Promise<void> {
  const { error } = await supabase.from('items_balance').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
