import { useState } from 'react'
import { Agrupadores } from './components/Agrupadores'
import { Categorias } from './components/Categorias'
import { Semanas } from './components/Semanas'

type Vista = 'semanas' | 'configuracion'

function App() {
  const [vista, setVista] = useState<Vista>('semanas')

  return (
    <div className="app">
      <header className="app-header">
        <p className="eyebrow">App de finanzas personales</p>
        <h1 className="app-titulo">
          {vista === 'semanas' ? 'Semanas' : 'Configuración'}
        </h1>
      </header>

      <nav className="tabs">
        <button
          className={`tab ${vista === 'semanas' ? 'tab-activa' : ''}`}
          onClick={() => setVista('semanas')}
        >
          Semanas
        </button>
        <button
          className={`tab ${vista === 'configuracion' ? 'tab-activa' : ''}`}
          onClick={() => setVista('configuracion')}
        >
          Configuración
        </button>
      </nav>

      {vista === 'semanas' ? (
        <Semanas />
      ) : (
        <>
          <Agrupadores />
          <Categorias />
        </>
      )}
    </div>
  )
}

export default App
