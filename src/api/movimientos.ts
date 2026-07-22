import { supabase } from '../supabaseClient'
import type { Movimiento, TipoMovimiento } from '../types'

const COLS = 'id, semana_id, categoria_id, monto, tipo, descripcion, fecha'

function normalizar(m: Movimiento): Movimiento {
  return { ...m, monto: Number(m.monto) }
}

export async function listarMovimientosDeSemana(
  semanaId: number,
): Promise<Movimiento[]> {
  const { data, error } = await supabase
    .from('movimientos')
    .select(COLS)
    .eq('semana_id', semanaId)
    .order('fecha', { ascending: true })
    .order('id', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []).map(normalizar)
}

export async function crearMovimiento(datos: {
  semanaId: number
  categoriaId: number | null
  monto: number
  descripcion: string | null
  fecha: string | null
  tipo?: TipoMovimiento
}): Promise<Movimiento> {
  const { data, error } = await supabase
    .from('movimientos')
    .insert({
      semana_id: datos.semanaId,
      categoria_id: datos.categoriaId,
      monto: datos.monto,
      descripcion: datos.descripcion,
      fecha: datos.fecha,
      tipo: datos.tipo ?? 'gasto',
    })
    .select(COLS)
    .single()
  if (error) throw new Error(error.message)
  return normalizar(data as Movimiento)
}

export async function actualizarMovimiento(
  id: number,
  cambios: Partial<
    Pick<Movimiento, 'categoria_id' | 'monto' | 'descripcion' | 'fecha'>
  >,
): Promise<void> {
  const { error } = await supabase.from('movimientos').update(cambios).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function eliminarMovimiento(id: number): Promise<void> {
  const { error } = await supabase.from('movimientos').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
