// Utilidades de fecha. Las fechas viajan como texto 'YYYY-MM-DD' (tipo date de
// Postgres).
//
// OJO: new Date('2026-04-27') se interpreta como UTC; en Colombia (UTC-5) eso
// devolveria el dia ANTERIOR. Por eso aqui se parsea a mano, componente por
// componente, y siempre en hora local.

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

const MESES_ABREV = [
  'ene', 'feb', 'mar', 'abr', 'may', 'jun',
  'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
]

export function aFecha(iso: string): Date {
  const [anio, mes, dia] = iso.split('-').map(Number)
  return new Date(anio, mes - 1, dia)
}

export function aISO(fecha: Date): string {
  const anio = fecha.getFullYear()
  const mes = String(fecha.getMonth() + 1).padStart(2, '0')
  const dia = String(fecha.getDate()).padStart(2, '0')
  return `${anio}-${mes}-${dia}`
}

export function sumarDias(iso: string, dias: number): string {
  const f = aFecha(iso)
  f.setDate(f.getDate() + dias)
  return aISO(f)
}

export function hoyISO(): string {
  return aISO(new Date())
}

export function nombreMes(iso: string): string {
  return MESES[aFecha(iso).getMonth()]
}

export function anioDe(iso: string): number {
  return aFecha(iso).getFullYear()
}

// Etiqueta como en el Excel: "1 - 7 dic" dentro del mismo mes,
// "27 abr - 3 may" cuando la semana cruza de mes.
export function formatearRango(inicio: string, fin: string): string {
  const fi = aFecha(inicio)
  const ff = aFecha(fin)
  const mismoMes =
    fi.getMonth() === ff.getMonth() && fi.getFullYear() === ff.getFullYear()
  return mismoMes
    ? `${fi.getDate()} - ${ff.getDate()} ${MESES_ABREV[ff.getMonth()]}`
    : `${fi.getDate()} ${MESES_ABREV[fi.getMonth()]} - ${ff.getDate()} ${MESES_ABREV[ff.getMonth()]}`
}
