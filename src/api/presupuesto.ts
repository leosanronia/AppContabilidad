import { supabase } from '../supabaseClient'
import type { LineaPresupuesto } from '../types'

const COLS = 'id, mes_id, categoria_id, plan'

// Todas las lineas de todos los meses: el arrastre necesita la historia
// completa para calcular el "Por pagar" que viene del mes anterior.
export async function listarPresupuesto(): Promise<LineaPresupuesto[]> {
  const { data, error } = await supabase.from('presupuesto').select(COLS)
  if (error) throw new Error(error.message)
  return (data ?? []).map((l: LineaPresupuesto) => ({
    ...l,
    plan: Number(l.plan),
  }))
}

// Crea o actualiza el Plan de una categoria en un mes.
export async function guardarPlan(
  mesId: number,
  categoriaId: number,
  plan: number,
): Promise<void> {
  const { error } = await supabase
    .from('presupuesto')
    .upsert(
      { mes_id: mesId, categoria_id: categoriaId, plan },
      { onConflict: 'mes_id,categoria_id' },
    )
  if (error) throw new Error(error.message)
}
