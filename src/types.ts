// Tipos del dominio de la app de finanzas.

export type TipoAgrupador = 'liquidez' | 'patrimonio' | 'deuda'

export interface Agrupador {
  id: number
  nombre: string
  tipo: TipoAgrupador
  orden: number
}

export interface ItemBalance {
  id: number
  agrupador_id: number
  nombre: string
  orden: number
  // Nota libre del usuario (como las notas de celda del Excel). null = sin nota.
  nota: string | null
}

export interface Mes {
  id: number
  nombre: string
  anio: number
}

export interface SaldoSemana {
  id: number
  item_id: number
  semana_id: number
  monto: number
}

export interface Categoria {
  id: number
  nombre: string
  grupo: string | null
  // Monto usual: la plantilla con la que arranca el presupuesto del mes.
  monto_default: number
  orden: number
  activo: boolean
  // true = su Gasto viene de la reconciliacion semanal, no de movimientos
  // anotados. Es la linea "Semanas" del Excel.
  usa_reconciliacion: boolean
}

// El Plan de una categoria en un mes. gasto y por_pagar son derivados.
export interface LineaPresupuesto {
  id: number
  mes_id: number
  categoria_id: number
  plan: number
}

export interface Ingreso {
  id: number
  semana_id: number
  nombre: string
  monto: number
}

export type TipoMovimiento = 'gasto' | 'ingreso'

export interface Movimiento {
  id: number
  semana_id: number
  categoria_id: number | null
  monto: number
  tipo: TipoMovimiento
  descripcion: string | null
  fecha: string | null
}

export const GRUPOS: { valor: string; etiqueta: string }[] = [
  { valor: 'fijos', etiqueta: 'Fijos' },
  { valor: 'inversion', etiqueta: 'Inversión' },
  { valor: 'otros', etiqueta: 'Otros' },
]

export function etiquetaGrupo(grupo: string | null): string {
  if (!grupo) return 'Sin grupo'
  return GRUPOS.find((g) => g.valor === grupo)?.etiqueta ?? grupo
}

export interface Semana {
  id: number
  mes_id: number
  rango: string
  numero: number | null
  gasto_semana: number | null
  // Fechas reales en formato 'YYYY-MM-DD'.
  fecha_inicio: string
  fecha_fin: string
}

// Etiquetas legibles para mostrar en la interfaz.
export const TIPOS: { valor: TipoAgrupador; etiqueta: string }[] = [
  { valor: 'liquidez', etiqueta: 'Liquidez' },
  { valor: 'patrimonio', etiqueta: 'Patrimonio' },
  { valor: 'deuda', etiqueta: 'Deuda' },
]

export function etiquetaTipo(tipo: TipoAgrupador): string {
  return TIPOS.find((t) => t.valor === tipo)?.etiqueta ?? tipo
}
