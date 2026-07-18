import { useEffect, useState, type FormEvent } from 'react'
import type { Mes, Semana } from '../types'
import {
  crearSemana,
  eliminarSemana,
  listarMeses,
  listarSemanas,
} from '../api/semanas'
import { formatearRango, hoyISO, sumarDias } from '../utils/fechas'

export function Semanas() {
  const [semanas, setSemanas] = useState<Semana[]>([])
  const [meses, setMeses] = useState<Mes[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [activaId, setActivaId] = useState<number | null>(null)

  const [inicio, setInicio] = useState(hoyISO())
  const [fin, setFin] = useState(sumarDias(hoyISO(), 6))

  useEffect(() => {
    void (async () => {
      try {
        const [ss, ms] = await Promise.all([listarSemanas(), listarMeses()])
        setSemanas(ss)
        setMeses(ms)
        if (ss.length > 0) setActivaId(ss[ss.length - 1].id)
        aplicarSugerencia(ss)
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      } finally {
        setCargando(false)
      }
    })()
  }, [])

  // Sugiere la semana siguiente: arranca el dia despues del fin de la ultima.
  function aplicarSugerencia(lista: Semana[]) {
    const ultima = lista[lista.length - 1]
    const nuevoInicio = ultima?.fecha_fin
      ? sumarDias(ultima.fecha_fin, 1)
      : hoyISO()
    setInicio(nuevoInicio)
    setFin(sumarDias(nuevoInicio, 6))
  }

  async function recargar(): Promise<Semana[]> {
    const [ss, ms] = await Promise.all([listarSemanas(), listarMeses()])
    setSemanas(ss)
    setMeses(ms)
    return ss
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

  // Al mover el inicio, la semana propuesta sigue siendo de 7 dias.
  function cambiarInicio(valor: string) {
    setInicio(valor)
    if (valor) setFin(sumarDias(valor, 6))
  }

  const rangoValido = Boolean(inicio && fin && fin >= inicio)
  const etiqueta = rangoValido ? formatearRango(inicio, fin) : ''

  function crear(e: FormEvent) {
    e.preventDefault()
    if (!rangoValido) return
    ejecutar(async () => {
      const nueva = await crearSemana(inicio, fin, formatearRango(inicio, fin))
      const ss = await recargar()
      setActivaId(nueva.id)
      aplicarSugerencia(ss)
    })
  }

  function borrar(s: Semana) {
    if (!confirm(`¿Eliminar la semana "${s.rango}"? También se borran sus saldos.`))
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

  const activa = semanas.find((s) => s.id === activaId) ?? null
  const recientesPrimero = [...semanas].reverse()

  return (
    <section className="panel">
      <h2 className="panel-titulo">Semanas</h2>
      <p className="panel-sub">
        Cada semana es una foto de tu balance. El mes se crea solo a partir de la
        fecha que elijas.
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
        </p>
      )}
      {inicio && fin && !rangoValido && (
        <div className="aviso aviso-error">
          La fecha final no puede ser anterior a la inicial.
        </div>
      )}

      {error && <div className="aviso aviso-error">{error}</div>}
      {cargando && <p className="aviso">Cargando semanas…</p>}

      {!cargando && semanas.length === 0 && (
        <p className="vacio">Aún no tienes semanas. Crea la primera arriba.</p>
      )}

      {semanas.length > 0 && (
        <ul className="lista">
          {recientesPrimero.map((s) => (
            <li
              key={s.id}
              className={`semana-fila ${s.id === activaId ? 'semana-activa' : ''}`}
            >
              <button
                className="semana-selector"
                onClick={() => setActivaId(s.id)}
                title="Seleccionar esta semana"
              >
                {s.id === activaId ? '●' : '○'}
              </button>
              <span className="fila-nombre">{s.rango}</span>
              <span className="item-count">
                {nombreDelMes(s.mes_id)}
                {s.numero ? ` · sem. ${s.numero}` : ''}
              </span>
              <div className="fila-acciones">
                <button
                  className="btn btn-sm btn-peligro"
                  onClick={() => borrar(s)}
                  disabled={ocupado}
                >
                  Eliminar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
