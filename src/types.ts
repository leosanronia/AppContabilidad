// Tipos del dominio de la app de finanzas.

export type TipoAgrupador = 'liquidez' | 'patrimonio' | 'deuda'

export interface Agrupador {
  id: number
  nombre: string
  tipo: TipoAgrupador
  orden: number
}

// Etiquetas legibles para mostrar en la interfaz.
export const TIPOS: { valor: TipoAgrupador; etiqueta: string }[] = [
  { valor: 'liquidez', etiqueta: 'Liquidez' },
  { valor: 'patrimonio', etiqueta: 'Patrimonio' },
  { valor: 'deuda', etiqueta: 'Deuda' },
]
