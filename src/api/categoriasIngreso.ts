import { supabase } from '../supabaseClient'
import type { CategoriaIngreso } from '../types'

const COLS = 'id, nombre, orden, activo'

export async function listarCategoriasIngreso(): Promise<CategoriaIngreso[]> {
  const { data, error } = await supabase
    .from('categorias_ingreso')
    .select(COLS)
    .order('orden', { ascending: true })
    .order('id', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []) as CategoriaIngreso[]
}

export async function crearCategoriaIngreso(
  nombre: string,
  orden: number,
): Promise<CategoriaIngreso> {
  const { data, error } = await supabase
    .from('categorias_ingreso')
    .insert({ nombre, orden })
    .select(COLS)
    .single()
  if (error) {
    // 23505 = unique violation: el nombre ya existe.
    if (error.code === '23505') {
      throw new Error(`Ya existe una categoría de ingreso llamada "${nombre}".`)
    }
    throw new Error(error.message)
  }
  return data as CategoriaIngreso
}

export async function actualizarCategoriaIngreso(
  id: number,
  cambios: Partial<Pick<CategoriaIngreso, 'nombre' | 'orden' | 'activo'>>,
): Promise<void> {
  const { error } = await supabase
    .from('categorias_ingreso')
    .update(cambios)
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export async function eliminarCategoriaIngreso(id: number): Promise<void> {
  const { error } = await supabase
    .from('categorias_ingreso')
    .delete()
    .eq('id', id)
  if (error) throw new Error(error.message)
}
