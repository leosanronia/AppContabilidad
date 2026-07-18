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
}

export interface Mes {
  id: number
  nombre: string
  anio: number
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
