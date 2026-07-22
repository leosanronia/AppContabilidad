import { useEffect, useState, type FormEvent } from 'react'
import type {
  Agrupador,
  Ingreso,
  ItemBalance,
  Mes,
  SaldoSemana,
  Semana,
  TipoAgrupador,
} from '../types'
import {
  cambiarMesDeSemana,
  crearSemana,
  eliminarSemana,
  listarMeses,
  listarSemanas,
} from '../api/semanas'
import { listarAgrupadores } from '../api/agrupadores'
import { listarItems } from '../api/items'
import { listarTodosLosSaldos } from '../api/saldos'
import { listarTodosLosIngresos } from '../api/ingresos'
import {
  formatearRango,
  hoyISO,
  mesesCandidatos,
  sumarDias,
} from '../utils/fechas'
import { formatearCOP } from '../utils/moneda'
import { Saldos } from './Saldos'

interface ResumenSemana {
  neto: number
  tieneSaldos: boolean
}

export function Semanas() {
  const [semanas, setSemanas] = useState<Semana[]>([])
  const [meses, setMeses] = useState<Mes[]>([])
  const [agrupadores, setAgrupadores] = useState<Agrupador[]>([])
  const [items, setItems] = useState<ItemBalance[]>([])
  const [todosSaldos, setTodosSaldos] = useState<SaldoSemana[]>([])
  const [todosIngresos, setTodosIngresos] = useState<Ingreso[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [activaId, setActivaId] = useState<number | null>(null)

  const [inicio, setInicio] = useState(hoyISO())
  const [fin, setFin] = useState(sumarDias(hoyISO(), 6))
  const [mesElegido, setMesElegido] = useState('')

  const [editandoId, setEditandoId] = useState<number | null>(null)
  const [mesEdicion, setMesEdicion] = useState('')

  useEffect(() => {
    void (async () => {
      try {
        const ss = await recargar()
        if (ss.length > 0) setActivaId(ss[ss.length - 1].id)
        aplicarSugerencia(ss)
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      } finally {
        setCargando(false)
      }
    })()
  }, [])

  // Al cambiar las fechas, se propone el mes donde TERMINA la semana
  // (convencion del Excel). El usuario puede cambiarlo en el selector.
  useEffect(() => {
    if (!inicio || !fin || fin < inicio) return
    const cands = mesesCandidatos(inicio, fin)
    setMesElegido(cands[cands.length - 1].clave)
  }, [inicio, fin])

  function aplicarSugerencia(lista: Semana[]) {
    const ultima = lista[lista.length - 1]
    const nuevoInicio = ultima?.fecha_fin
      ? sumarDias(ultima.fecha_fin, 1)
      : hoyISO()
    setInicio(nuevoInicio)
    setFin(sumarDias(nuevoInicio, 6))
  }

  async function recargar(): Promise<Semana[]> {
    const [ss, ms, ags, its, sal, ings] = await Promise.all([
      listarSemanas(),
      listarMeses(),
      listarAgrupadores(),
      listarItems(),
      listarTodosLosSaldos(),
      listarTodosLosIngresos(),
    ])
    setSemanas(ss)
    setMeses(ms)
    setAgrupadores(ags)
    setItems(its)
    setTodosSaldos(sal)
    setTodosIngresos(ings)
    return ss
  }

  // Se llama cuando la pantalla de saldos guarda algo (saldo o ingreso), para
  // que el historial (neto y gasto de cada semana) quede al dia sin recargar.
  function refrescarSaldos() {
    void (async () => {
      try {
        const [sal, ings] = await Promise.all([
          listarTodosLosSaldos(),
          listarTodosLosIngresos(),
        ])
        setTodosSaldos(sal)
        setTodosIngresos(ings)
      } catch {
        // Un fallo al refrescar el historial no debe interrumpir la captura.
      }
    })()
  }

  function ejecutar(fn: () => Promise<void>) {
    setError(null)
    setOcupado(true)
    void (async () => {
      try {
        await fn()
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      } finally {
        setOcupado(false)
      }
    })()
  }

  function cambiarInicio(valor: string) {
    setInicio(valor)
    if (valor) setFin(sumarDias(valor, 6))
  }

  const rangoValido = Boolean(inicio && fin && fin >= inicio)
  const candidatos = rangoValido ? mesesCandidatos(inicio, fin) : []
  const etiqueta = rangoValido ? formatearRango(inicio, fin) : ''

  function crear(e: FormEvent) {
    e.preventDefault()
    if (!rangoValido || candidatos.length === 0) return
    const elegido =
      candidatos.find((m) => m.clave === mesElegido) ??
      candidatos[candidatos.length - 1]
    ejecutar(async () => {
      const nueva = await crearSemana(
        inicio,
        fin,
        formatearRango(inicio, fin),
        elegido.nombre,
        elegido.anio,
      )
      const ss = await recargar()
      setActivaId(nueva.id)
      aplicarSugerencia(ss)
    })
  }

  function iniciarEdicionMes(s: Semana) {
    setEditandoId(s.id)
    const actual = meses.find((m) => m.id === s.mes_id)
    setMesEdicion(actual ? `${actual.nombre}-${actual.anio}` : '')
  }

  function guardarMes(s: Semana) {
    const cands = mesesCandidatos(s.fecha_inicio, s.fecha_fin)
    const elegido = cands.find((m) => m.clave === mesEdicion)
    if (!elegido) return
    ejecutar(async () => {
      await cambiarMesDeSemana(s.id, elegido.nombre, elegido.anio)
      await recargar()
      setEditandoId(null)
    })
  }

  function borrar(s: Semana) {
    if (!confirm(`¿Eliminar la semana ${s.rango}? También se borran sus saldos.`))
      return
    ejecutar(async () => {
      await eliminarSemana(s.id)
      const ss = await recargar()
      if (activaId === s.id) setActivaId(ss.length ? ss[ss.length - 1].id : null)
      aplicarSugerencia(ss)
    })
  }

  function nombreDelMes(mesId: number): string {
    const m = meses.find((x) => x.id === mesId)
    return m ? `${m.nombre} ${m.anio}` : ''
  }

  // ---- Historial: neto y gasto de cada semana ----
  const tipoDeItem = new Map<number, TipoAgrupador>()
  for (const it of items) {
    const ag = agrupadores.find((a) => a.id === it.agrupador_id)
    if (ag) tipoDeItem.set(it.id, ag.tipo)
  }

  const saldosPorSemana = new Map<number, SaldoSemana[]>()
  for (const sal of todosSaldos) {
    const arr = saldosPorSemana.get(sal.semana_id) ?? []
    arr.push(sal)
    saldosPorSemana.set(sal.semana_id, arr)
  }

  const resumen = new Map<number, ResumenSemana>()
  for (const s of semanas) {
    const propios = saldosPorSemana.get(s.id) ?? []
    const t = { liquidez: 0, patrimonio: 0, deuda: 0 }
    for (const sal of propios) {
      const tipo = tipoDeItem.get(sal.item_id)
      if (tipo) t[tipo] += sal.monto
    }
    resumen.set(s.id, {
      neto: t.liquidez + t.patrimonio - t.deuda,
      tieneSaldos: propios.length > 0,
    })
  }

  // Ingresos de cada semana (suman en la formula del gasto).
  const ingresosPorSemana = new Map<number, number>()
  for (const ing of todosIngresos) {
    ingresosPorSemana.set(
      ing.semana_id,
      (ingresosPorSemana.get(ing.semana_id) ?? 0) + ing.monto,
    )
  }

  // gasto = neto(anterior) + ingresos(semana) − neto(semana); null si no se puede.
  const gastos = new Map<number, number | null>()
  semanas.forEach((s, i) => {
    const r = resumen.get(s.id)
    const previa = i > 0 ? semanas[i - 1] : null
    const rp = previa ? resumen.get(previa.id) : null
    if (!r?.tieneSaldos || !rp?.tieneSaldos) gastos.set(s.id, null)
    else gastos.set(s.id, rp.neto + (ingresosPorSemana.get(s.id) ?? 0) - r.neto)
  })

  const activa = semanas.find((s) => s.id === activaId) ?? null
  // La lista viene en orden cronologico: la anterior es la de justo antes.
  const indiceActiva = semanas.findIndex((s) => s.id === activaId)
  const semanaAnterior = indiceActiva > 0 ? semanas[indiceActiva - 1] : null
  const recientesPrimero = [...semanas].reverse()

  return (
    <section className="panel">
      <h2 className="panel-titulo">Semanas</h2>
      <p className="panel-sub">
        Cada semana es una foto de tu balance. El mes se propone solo, pero lo
        puedes cambiar: una semana que cruza de mes puede ir en cualquiera de los
        dos.
      </p>

      <div className={`banner-activa ${activa ? '' : 'banner-vacio'}`}>
        {activa ? (
          <>
            <span className="banner-etiqueta">Semana activa</span>
            <strong className="banner-rango">{activa.rango}</strong>
            <span className="banner-mes">{nombreDelMes(activa.mes_id)}</span>
          </>
        ) : (
          <span>No hay ninguna semana seleccionada.</span>
        )}
      </div>

      {activa && (
        <Saldos
          semana={activa}
          semanaAnterior={semanaAnterior}
          onSaldosCambiaron={refrescarSaldos}
        />
      )}

      <h3 className="seccion-titulo">Historial de semanas</h3>

      {error && <div className="aviso aviso-error">{error}</div>}
      {cargando && <p className="aviso">Cargando semanas…</p>}

      {!cargando && semanas.length === 0 && (
        <p className="vacio">Aún no tienes semanas. Crea la primera abajo.</p>
      )}

      {semanas.length > 0 && (
        <ul className="lista">
          {recientesPrimero.map((s) => {
            const cands = mesesCandidatos(s.fecha_inicio, s.fecha_fin)
            const cruzaDeMes = cands.length > 1
            const r = resumen.get(s.id)
            const g = gastos.get(s.id) ?? null
            return (
              <li
                key={s.id}
                className={`semana-fila ${s.id === activaId ? 'semana-activa' : ''}`}
              >
                <button
                  className="semana-selector"
                  onClick={() => setActivaId(s.id)}
                  title="Abrir esta semana"
                >
                  {s.id === activaId ? '●' : '○'}
                </button>
                <span className="fila-nombre">{s.rango}</span>

                {editandoId === s.id ? (
                  <>
                    <select
                      className="input input-sm"
                      value={mesEdicion}
                      onChange={(e) => setMesEdicion(e.target.value)}
                    >
                      {cands.map((m) => (
                        <option key={m.clave} value={m.clave}>
                          {m.etiqueta}
                        </option>
                      ))}
                    </select>
                    <div className="fila-acciones">
                      <button
                        className="btn btn-sm btn-primario"
                        onClick={() => guardarMes(s)}
                        disabled={ocupado}
                      >
                        Guardar
                      </button>
                      <button
                        className="btn btn-sm btn-ghost"
                        onClick={() => setEditandoId(null)}
                      >
                        Cancelar
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <span className="item-count">
                      {nombreDelMes(s.mes_id)}
                      {s.numero ? ` · sem. ${s.numero}` : ''}
                    </span>

                    <span className="hist-dato">
                      <span className="hist-etiqueta">Neto</span>
                      <span className="hist-valor">
                        {r?.tieneSaldos ? formatearCOP(r.neto) : '—'}
                      </span>
                    </span>

                    <span className="hist-dato">
                      <span className="hist-etiqueta">Gasto</span>
                      <span
                        className={`hist-valor ${
                          g !== null && g < 0 ? 'hist-crecio' : ''
                        }`}
                      >
                        {g === null
                          ? '—'
                          : g >= 0
                            ? formatearCOP(g)
                            : `+${formatearCOP(Math.abs(g))}`}
                      </span>
                    </span>

                    <div className="fila-acciones">
                      {cruzaDeMes && (
                        <button
                          className="btn btn-sm btn-ghost"
                          onClick={() => iniciarEdicionMes(s)}
                          disabled={ocupado}
                          title="Cambiar el mes al que aplica"
                        >
                          Cambiar mes
                        </button>
                      )}
                      <button
                        className="btn btn-sm btn-peligro"
                        onClick={() => borrar(s)}
                        disabled={ocupado}
                      >
                        Eliminar
                      </button>
                    </div>
                  </>
                )}
              </li>
            )
          })}
        </ul>
      )}

      <h3 className="seccion-titulo">Crear una semana</h3>

      <form className="form-semana" onSubmit={crear}>
        <label className="campo">
          <span className="campo-etiqueta">Desde</span>
          <input
            type="date"
            className="input"
            value={inicio}
            onChange={(e) => cambiarInicio(e.target.value)}
          />
        </label>
        <label className="campo">
          <span className="campo-etiqueta">Hasta</span>
          <input
            type="date"
            className="input"
            value={fin}
            min={inicio}
            onChange={(e) => setFin(e.target.value)}
          />
        </label>
        <label className="campo">
          <span className="campo-etiqueta">Aplica al mes</span>
          <select
            className="input"
            value={mesElegido}
            onChange={(e) => setMesElegido(e.target.value)}
            disabled={candidatos.length === 0}
          >
            {candidatos.map((m) => (
              <option key={m.clave} value={m.clave}>
                {m.etiqueta}
              </option>
            ))}
          </select>
        </label>
        <button
          className="btn btn-primario"
          type="submit"
          disabled={ocupado || !rangoValido}
        >
          Crear semana
        </button>
      </form>

      {etiqueta && (
        <p className="preview-rango">
          Se guardará como: <strong>{etiqueta}</strong>
          {candidatos.length > 1 && ' · cruza de mes, revisa a cuál aplica'}
        </p>
      )}
      {inicio && fin && !rangoValido && (
        <div className="aviso aviso-error">
          La fecha final no puede ser anterior a la inicial.
        </div>
      )}
    </section>
  )
}
