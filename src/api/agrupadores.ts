import { supabase } from '../supabaseClient'
import type { Agrupador, TipoAgrupador } from '../types'

const COLUMNAS = 'id, nombre, tipo, orden'

// Lista los agrupadores en el orden definido por el usuario.
export async function listarAgrupadores(): Promise<Agrupador[]> {
  const { data, error } = await supabase
    .from('agrupadores')
    .select(COLUMNAS)
    .order('orden', { ascending: true })
    .order('id', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []) as Agrupador[]
}

export async function crearAgrupador(
  nombre: string,
  tipo: TipoAgrupador,
  orden: number,
): Promise<Agrupador> {
  const { data, error } = await supabase
    .from('agrupadores')
    .insert({ nombre, tipo, orden })
    .select(COLUMNAS)
    .single()
  if (error) throw new Error(error.message)
  return data as Agrupador
}

export async function actualizarAgrupador(
  id: number,
  cambios: Partial<Pick<Agrupador, 'nombre' | 'tipo' | 'orden'>>,
): Promise<void> {
  const { error } = await supabase.from('agrupadores').update(cambios).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function eliminarAgrupador(id: number): Promise<void> {
  const { error } = await supabase.from('agrupadores').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
