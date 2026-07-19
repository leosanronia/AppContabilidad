import { supabase } from '../supabaseClient'
import type { Mes, Semana } from '../types'

const COLS = 'id, mes_id, rango, numero, gasto_semana, fecha_inicio, fecha_fin'

// Semanas en orden cronologico (la ultima del arreglo es la mas reciente).
export async function listarSemanas(): Promise<Semana[]> {
  const { data, error } = await supabase
    .from('semanas')
    .select(COLS)
    .order('fecha_inicio', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []) as Semana[]
}

export async function listarMeses(): Promise<Mes[]> {
  const { data, error } = await supabase
    .from('meses')
    .select('id, nombre, anio')
    .order('anio', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []) as Mes[]
}

// Busca el mes por (nombre, anio) y lo crea si no existe: el usuario nunca
// tiene que crear meses a mano.
export async function obtenerOCrearMes(nombre: string, anio: number): Promise<Mes> {
  const { data: existente, error: eBuscar } = await supabase
    .from('meses')
    .select('id, nombre, anio')
    .eq('nombre', nombre)
    .eq('anio', anio)
    .maybeSingle()
  if (eBuscar) throw new Error(eBuscar.message)
  if (existente) return existente as Mes

  const { data, error } = await supabase
    .from('meses')
    .insert({ nombre, anio })
    .select('id, nombre, anio')
    .single()
  if (error) throw new Error(error.message)
  return data as Mes
}

// El mes se recibe explicitamente: la app lo propone, pero el usuario decide
// (una semana que cruza de mes puede ir en cualquiera de los dos).
export async function crearSemana(
  fechaInicio: string,
  fechaFin: string,
  rango: string,
  mesNombre: string,
  mesAnio: number,
): Promise<Semana> {
  const mes = await obtenerOCrearMes(mesNombre, mesAnio)

  // numero = posicion de la semana dentro de su mes.
  const { count } = await supabase
    .from('semanas')
    .select('*', { count: 'exact', head: true })
    .eq('mes_id', mes.id)

  const { data, error } = await supabase
    .from('semanas')
    .insert({
      mes_id: mes.id,
      rango,
      numero: (count ?? 0) + 1,
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin,
    })
    .select(COLS)
    .single()

  if (error) {
    // 23505 = violacion de unicidad -> ya hay una semana que empieza ese dia.
    if (error.code === '23505') {
      throw new Error('Ya existe una semana que empieza en esa fecha.')
    }
    throw new Error(error.message)
  }
  return data as Semana
}

// Reasigna una semana existente a otro mes (creandolo si hace falta) y
// recalcula su numero dentro de ese mes.
export async function cambiarMesDeSemana(
  semanaId: number,
  mesNombre: string,
  mesAnio: number,
): Promise<void> {
  const mes = await obtenerOCrearMes(mesNombre, mesAnio)

  // Cuenta las otras semanas del mes destino (excluye la que se esta moviendo).
  const { count } = await supabase
    .from('semanas')
    .select('*', { count: 'exact', head: true })
    .eq('mes_id', mes.id)
    .neq('id', semanaId)

  const { error } = await supabase
    .from('semanas')
    .update({ mes_id: mes.id, numero: (count ?? 0) + 1 })
    .eq('id', semanaId)
  if (error) throw new Error(error.message)
}

export async function eliminarSemana(id: number): Promise<void> {
  const { error } = await supabase.from('semanas').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
