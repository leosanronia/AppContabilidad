import { supabase } from '../supabaseClient'
import type { Categoria } from '../types'

const COLS = 'id, nombre, grupo, monto_default, orden, activo, usa_reconciliacion'

function normalizar(c: Categoria): Categoria {
  return { ...c, monto_default: Number(c.monto_default) }
}

export async function listarCategorias(): Promise<Categoria[]> {
  const { data, error } = await supabase
    .from('categorias')
    .select(COLS)
    .order('orden', { ascending: true })
    .order('id', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []).map(normalizar)
}

export async function crearCategoria(
  nombre: string,
  grupo: string | null,
  montoDefault: number,
  orden: number,
): Promise<Categoria> {
  const { data, error } = await supabase
    .from('categorias')
    .insert({ nombre, grupo, monto_default: montoDefault, orden })
    .select(COLS)
    .single()
  if (error) throw new Error(error.message)
  return normalizar(data as Categoria)
}

export async function actualizarCategoria(
  id: number,
  cambios: Partial<
    Pick<
      Categoria,
      | 'nombre'
      | 'grupo'
      | 'monto_default'
      | 'orden'
      | 'activo'
      | 'usa_reconciliacion'
    >
  >,
): Promise<void> {
  const { error } = await supabase.from('categorias').update(cambios).eq('id', id)
  if (error) throw new Error(error.message)
}

// Se borra solo si nunca se uso; si tiene historia, conviene desactivarla.
export async function eliminarCategoria(id: number): Promise<void> {
  const { error } = await supabase.from('categorias').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
