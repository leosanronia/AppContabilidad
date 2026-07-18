import { supabase } from '../supabaseClient'
import type { Mes, Semana } from '../types'
import { anioDe, nombreMes } from '../utils/fechas'

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

export async function crearSemana(
  fechaInicio: string,
  fechaFin: string,
  rango: string,
): Promise<Semana> {
  const mes = await obtenerOCrearMes(nombreMes(fechaInicio), anioDe(fechaInicio))

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

export async function eliminarSemana(id: number): Promise<void> {
  const { error } = await supabase.from('semanas').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
