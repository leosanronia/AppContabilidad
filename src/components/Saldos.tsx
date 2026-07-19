import { useEffect, useState } from 'react'
import type { Agrupador, ItemBalance, Semana } from '../types'
import { etiquetaTipo } from '../types'
import { listarAgrupadores } from '../api/agrupadores'
import { actualizarItem, listarItems } from '../api/items'
import { copiarSaldos, guardarSaldo, listarSaldosDeSemana } from '../api/saldos'
import { evaluarMonto } from '../utils/calculadora'
import { formatearCOP } from '../utils/moneda'

interface Props {
  semana: Semana
  semanaAnterior: Semana | null
}

export function Saldos({ semana, semanaAnterior }: Props) {
  const [agrupadores, setAgrupadores] = useState<Agrupador[]>([])
  const [items, setItems] = useState<ItemBalance[]>([])
  // itemId -> monto guardado en la semana activa
  const [saldos, setSaldos] = useState<Record<number, number>>({})
  // itemId -> monto de la semana anterior (para el gasto por reconciliacion)
  const [saldosAnterior, setSaldosAnterior] = useState<Record<number, number>>(
    {},
  )
  // itemId -> lo que el usuario esta escribiendo (puede ser una operacion)
  const [textos, setTextos] = useState<Record<number, string>>({})
  const [errores, setErrores] = useState<Record<number, string>>({})
  // Agrupadores contraidos (por defecto se ven expandidos para poder capturar).
  const [contraidos, setContraidos] = useState<Set<number>>(new Set())
  // Nota abierta: solo una a la vez, y nunca visible por defecto.
  const [notaAbierta, setNotaAbierta] = useState<number | null>(null)
  const [notaTexto, setNotaTexto] = useState('')
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)

  useEffect(() => {
    void cargar()
  }, [semana.id, semanaAnterior?.id])

  async function cargar() {
    setCargando(true)
    setError(null)
    try {
      const [ags, its, sal, salAnt] = await Promise.all([
        listarAgrupadores(),
        listarItems(),
        listarSaldosDeSemana(semana.id),
        semanaAnterior
          ? listarSaldosDeSemana(semanaAnterior.id)
          : Promise.resolve([]),
      ])
      setAgrupadores(ags)
      setItems(its)

      const mapa: Record<number, number> = {}
      for (const s of sal) mapa[s.item_id] = s.monto
      setSaldos(mapa)

      const mapaAnt: Record<number, number> = {}
      for (const s of salAnt) mapaAnt[s.item_id] = s.monto
      setSaldosAnterior(mapaAnt)

      const txt: Record<number, string> = {}
      for (const it of its) {
        txt[it.id] = mapa[it.id] !== undefined ? String(mapa[it.id]) : ''
      }
      setTextos(txt)
      setErrores({})
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setCargando(false)
    }
  }

  function alternarContraido(id: number) {
    setContraidos((prev) => {
      const siguiente = new Set(prev)
      if (siguiente.has(id)) siguiente.delete(id)
      else siguiente.add(id)
      return siguiente
    })
  }

  const todosContraidos =
    agrupadores.length > 0 && contraidos.size === agrupadores.length

  function alternarTodos() {
    setContraidos(
      todosContraidos ? new Set() : new Set(agrupadores.map((a) => a.id)),
    )
  }

  // Al salir del campo (o con Enter) se evalua la operacion y se guarda.
  function confirmar(itemId: number) {
    const texto = (textos[itemId] ?? '').trim()
    if (texto === '') {
      setErrores((p) => ({ ...p, [itemId]: '' }))
      return
    }

    let valor: number
    try {
      valor = evaluarMonto(texto)
    } catch (e) {
      // Error claro y se conserva lo escrito para poder corregirlo.
      setErrores((p) => ({
        ...p,
        [itemId]: e instanceof Error ? e.message : String(e),
      }))
      return
    }

    setErrores((p) => ({ ...p, [itemId]: '' }))
    setOcupado(true)
    void (async () => {
      try {
        await guardarSaldo(itemId, semana.id, valor)
        setSaldos((p) => ({ ...p, [itemId]: valor }))
        setTextos((p) => ({ ...p, [itemId]: String(valor) }))
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      } finally {
        setOcupado(false)
      }
    })()
  }

  function alternarNota(item: ItemBalance) {
    if (notaAbierta === item.id) {
      setNotaAbierta(null)
      return
    }
    setNotaAbierta(item.id)
    setNotaTexto(item.nota ?? '')
  }

  // El texto se recibe explicito: setNotaTexto no se refleja de inmediato,
  // asi que "Borrar nota" pasa '' directamente en vez de depender del estado.
  function guardarNota(itemId: number, texto: string) {
    const limpio = texto.trim()
    const valor = limpio === '' ? null : limpio
    setOcupado(true)
    setError(null)
    void (async () => {
      try {
        await actualizarItem(itemId, { nota: valor })
        setItems((prev) =>
          prev.map((i) => (i.id === itemId ? { ...i, nota: valor } : i)),
        )
        setNotaAbierta(null)
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      } finally {
        setOcupado(false)
      }
    })()
  }

  function precargar() {
    if (!semanaAnterior) return
    setOcupado(true)
    setError(null)
    void (async () => {
      try {
        const copiados = await copiarSaldos(semanaAnterior.id, semana.id)
        if (copiados === 0) {
          setError('La semana anterior todavía no tiene saldos para copiar.')
        }
        await cargar()
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      } finally {
        setOcupado(false)
      }
    })()
  }

  const sinSaldos = Object.keys(saldos).length === 0

  function totalDeAgrupador(
    agrupadorId: number,
    mapa: Record<number, number> = saldos,
  ): number {
    return items
      .filter((i) => i.agrupador_id === agrupadorId)
      .reduce((acc, it) => acc + (mapa[it.id] ?? 0), 0)
  }

  // Patrimonio neto = liquidez + patrimonio − deudas.
  // Nunca se guarda en la base: siempre se calcula desde los saldos.
  function calcularNeto(mapa: Record<number, number>) {
    const t = { liquidez: 0, patrimonio: 0, deuda: 0 }
    for (const a of agrupadores) t[a.tipo] += totalDeAgrupador(a.id, mapa)
    const tengo = t.liquidez + t.patrimonio
    return { ...t, tengo, debo: t.deuda, neto: tengo - t.deuda }
  }

  const actual = calcularNeto(saldos)

  // Gasto por reconciliacion = neto(semana anterior) − neto(semana actual).
  // Cuando existan los ingresos (HU-011) la formula sumara los de la semana.
  const anteriorTieneSaldos = Object.keys(saldosAnterior).length > 0
  const netoAnterior = anteriorTieneSaldos
    ? calcularNeto(saldosAnterior).neto
    : null
  const gasto = netoAnterior !== null ? netoAnterior - actual.neto : null

  return (
    <div className="saldos">
      <div className="saldos-cabecera">
        <h3 className="saldos-titulo">Saldos de {semana.rango}</h3>
        <div className="saldos-acciones">
          <span className="saldos-ayuda">
            Puedes escribir operaciones: <code>60000 + 20000</code>
          </span>
          {agrupadores.length > 0 && (
            <button className="btn btn-sm btn-ghost" onClick={alternarTodos}>
              {todosContraidos ? 'Expandir todo' : 'Contraer todo'}
            </button>
          )}
        </div>
      </div>

      {!cargando && agrupadores.length > 0 && (
        <div className="resumen-neto">
          <div className="resumen-linea">
            <span className="resumen-etiqueta">Tengo</span>
            <span className="resumen-detalle">
              liquidez {formatearCOP(actual.liquidez)} · patrimonio{' '}
              {formatearCOP(actual.patrimonio)}
            </span>
            <span className="resumen-valor">{formatearCOP(actual.tengo)}</span>
          </div>
          <div className="resumen-linea">
            <span className="resumen-etiqueta">Debo</span>
            <span className="resumen-detalle">deudas</span>
            <span className="resumen-valor resumen-negativo">
              − {formatearCOP(actual.debo)}
            </span>
          </div>
          <div className="resumen-linea resumen-total">
            <span className="resumen-etiqueta">Patrimonio neto</span>
            <span className="resumen-valor">{formatearCOP(actual.neto)}</span>
          </div>

          <div className="resumen-gasto">
            {!semanaAnterior && (
              <p className="resumen-nota">
                Es tu primera semana registrada: todavía no hay con qué
                comparar.
              </p>
            )}

            {semanaAnterior && !anteriorTieneSaldos && (
              <p className="resumen-nota">
                La semana anterior ({semanaAnterior.rango}) no tiene saldos, así
                que no se puede calcular el gasto.
              </p>
            )}

            {semanaAnterior && anteriorTieneSaldos && gasto !== null && (
              <>
                <div className="resumen-linea">
                  <span className="resumen-etiqueta">
                    {gasto >= 0 ? 'Gasto de la semana' : 'Tu patrimonio creció'}
                  </span>
                  <span className="resumen-detalle">
                    vs {semanaAnterior.rango} ({formatearCOP(netoAnterior ?? 0)})
                  </span>
                  <span className="resumen-valor resumen-gasto-valor">
                    {formatearCOP(Math.abs(gasto))}
                  </span>
                </div>
                {gasto < 0 && (
                  <p className="resumen-nota">
                    El neto subió en vez de bajar. Normalmente significa que
                    entró un ingreso; cuando registremos ingresos (HU-011) la
                    fórmula los tendrá en cuenta.
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {!cargando && sinSaldos && semanaAnterior && (
        <div className="precarga">
          <span>
            Esta semana aún no tiene saldos. Puedes partir de los de{' '}
            <strong>{semanaAnterior.rango}</strong>.
          </span>
          <button
            className="btn btn-sm btn-primario"
            onClick={precargar}
            disabled={ocupado}
          >
            Precargar semana anterior
          </button>
        </div>
      )}

      {error && <div className="aviso aviso-error">{error}</div>}
      {cargando && <p className="aviso">Cargando saldos…</p>}

      {!cargando && agrupadores.length === 0 && (
        <p className="vacio">Primero crea tus agrupadores en Configuración.</p>
      )}

      {!cargando &&
        agrupadores.map((a) => {
          const susItems = items.filter((i) => i.agrupador_id === a.id)
          const total = totalDeAgrupador(a.id)
          const abierto = !contraidos.has(a.id)
          return (
            <div className="grupo-saldo" key={a.id}>
              <div
                className={`grupo-cabecera grupo-cabecera-clic ${
                  abierto ? '' : 'grupo-cabecera-cerrada'
                }`}
                onClick={() => alternarContraido(a.id)}
              >
                <button
                  type="button"
                  className="expandir"
                  title={abierto ? 'Contraer' : 'Expandir'}
                  aria-expanded={abierto}
                >
                  {abierto ? '▾' : '▸'}
                </button>
                <span className="fila-nombre">{a.nombre}</span>
                <span className="item-count">
                  {susItems.length} ítem{susItems.length === 1 ? '' : 's'}
                </span>
                <span className={`badge badge-${a.tipo}`}>
                  {etiquetaTipo(a.tipo)}
                </span>
                <strong className="grupo-total">{formatearCOP(total)}</strong>
              </div>

              {abierto && susItems.length === 0 && (
                <p className="items-vacio">
                  Sin ítems. Agrégalos en Configuración.
                </p>
              )}

              {abierto &&
                susItems.map((it) => (
                  <div className="saldo-bloque" key={it.id}>
                    <div className="saldo-fila">
                      <label className="saldo-nombre" htmlFor={`item-${it.id}`}>
                        {it.nombre}
                      </label>
                      <input
                        id={`item-${it.id}`}
                        className={`input input-sm saldo-input ${
                          errores[it.id] ? 'input-error' : ''
                        }`}
                        placeholder="0"
                        value={textos[it.id] ?? ''}
                        onChange={(e) =>
                          setTextos((p) => ({ ...p, [it.id]: e.target.value }))
                        }
                        onBlur={() => confirmar(it.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') e.currentTarget.blur()
                        }}
                      />
                      <span className="saldo-formateado">
                        {saldos[it.id] !== undefined
                          ? formatearCOP(saldos[it.id])
                          : '—'}
                      </span>
                      <button
                        type="button"
                        className={`btn-nota ${it.nota ? 'btn-nota-con' : ''}`}
                        onClick={() => alternarNota(it)}
                        aria-expanded={notaAbierta === it.id}
                        title={it.nota ? 'Ver o editar la nota' : 'Agregar una nota'}
                      >
                        📝
                      </button>
                      {errores[it.id] && (
                        <span className="saldo-error">{errores[it.id]}</span>
                      )}
                    </div>

                    {notaAbierta === it.id && (
                      <div className="nota-panel">
                        <textarea
                          className="nota-texto"
                          rows={3}
                          placeholder="Escribe una nota para recordar algo de este ítem…"
                          value={notaTexto}
                          onChange={(e) => setNotaTexto(e.target.value)}
                        />
                        <div className="nota-acciones">
                          <button
                            className="btn btn-sm btn-primario"
                            onClick={() => guardarNota(it.id, notaTexto)}
                            disabled={ocupado}
                          >
                            Guardar nota
                          </button>
                          <button
                            className="btn btn-sm btn-ghost"
                            onClick={() => setNotaAbierta(null)}
                          >
                            Cancelar
                          </button>
                          {it.nota && (
                            <button
                              className="btn btn-sm btn-peligro"
                              onClick={() => guardarNota(it.id, '')}
                              disabled={ocupado}
                            >
                              Borrar nota
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          )
        })}
    </div>
  )
}
