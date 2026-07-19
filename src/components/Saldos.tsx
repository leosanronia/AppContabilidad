import { useEffect, useState } from 'react'
import type { Agrupador, ItemBalance, Semana } from '../types'
import { etiquetaTipo } from '../types'
import { listarAgrupadores } from '../api/agrupadores'
import { listarItems } from '../api/items'
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
  // itemId -> monto guardado
  const [saldos, setSaldos] = useState<Record<number, number>>({})
  // itemId -> lo que el usuario esta escribiendo (puede ser una operacion)
  const [textos, setTextos] = useState<Record<number, string>>({})
  const [errores, setErrores] = useState<Record<number, string>>({})
  // Agrupadores contraidos (por defecto se ven expandidos para poder capturar).
  const [contraidos, setContraidos] = useState<Set<number>>(new Set())
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)

  useEffect(() => {
    void cargar()
  }, [semana.id])

  async function cargar() {
    setCargando(true)
    setError(null)
    try {
      const [ags, its, sal] = await Promise.all([
        listarAgrupadores(),
        listarItems(),
        listarSaldosDeSemana(semana.id),
      ])
      setAgrupadores(ags)
      setItems(its)

      const mapa: Record<number, number> = {}
      for (const s of sal) mapa[s.item_id] = s.monto
      setSaldos(mapa)

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
          const total = susItems.reduce(
            (acc, it) => acc + (saldos[it.id] ?? 0),
            0,
          )
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
                  <div className="saldo-fila" key={it.id}>
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
                    {errores[it.id] && (
                      <span className="saldo-error">{errores[it.id]}</span>
                    )}
                  </div>
                ))}
            </div>
          )
        })}
    </div>
  )
}
