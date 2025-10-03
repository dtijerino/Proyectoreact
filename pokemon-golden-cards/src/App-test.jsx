import './App.css'

function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1>🔥 Pokémon Golden Cards</h1>
        <p>Aplicación funcionando correctamente!</p>
      </header>
      
      <main className="app-main">
        <div className="test-card">
          <h2>Prueba de Funcionalidad</h2>
          <p>Si ves este mensaje, la aplicación React está funcionando.</p>
          <button onClick={() => alert('¡Botón funcional!')}>
            Hacer click aquí
          </button>
        </div>
      </main>
    </div>
  )
}

export default App
