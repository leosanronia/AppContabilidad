import { useState } from 'react'
import { Agrupadores } from './components/Agrupadores'
import { Categorias } from './components/Categorias'
import { Gastos } from './components/Gastos'
import { Semanas } from './components/Semanas'

type Vista = 'semanas' | 'gastos' | 'configuracion'

const TITULOS: Record<Vista, string> = {
  semanas: 'Semanas',
  gastos: 'Gastos',
  configuracion: 'Configuración',
}

function App() {
  const [vista, setVista] = useState<Vista>('semanas')

  return (
    <div className="app">
      <header className="app-header">
        <p className="eyebrow">App de finanzas personales</p>
        <h1 className="app-titulo">{TITULOS[vista]}</h1>
      </header>

      <nav className="tabs">
        <button
          className={`tab ${vista === 'semanas' ? 'tab-activa' : ''}`}
          onClick={() => setVista('semanas')}
        >
          Semanas
        </button>
        <button
          className={`tab ${vista === 'gastos' ? 'tab-activa' : ''}`}
          onClick={() => setVista('gastos')}
        >
          Gastos
        </button>
        <button
          className={`tab ${vista === 'configuracion' ? 'tab-activa' : ''}`}
          onClick={() => setVista('configuracion')}
        >
          Configuración
        </button>
      </nav>

      {vista === 'semanas' && <Semanas />}
      {vista === 'gastos' && <Gastos />}
      {vista === 'configuracion' && (
        <>
          <Agrupadores />
          <Categorias />
        </>
      )}
    </div>
  )
}

export default App
