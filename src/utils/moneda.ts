// Formato de pesos colombianos, con separador de miles y sin centavos
// (en la practica los saldos se llevan en pesos enteros).
const FORMATO_COP = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

export function formatearCOP(valor: number): string {
  return FORMATO_COP.format(valor)
}
