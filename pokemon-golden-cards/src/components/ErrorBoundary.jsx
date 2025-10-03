import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '2rem',
          textAlign: 'center',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          minHeight: '100vh',
          color: 'white',
          fontFamily: 'Arial, sans-serif'
        }}>
          <h1>¡Oops! Algo salió mal</h1>
          <p>Ha ocurrido un error inesperado en la aplicación Pokémon.</p>
          <button 
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 20px',
              background: '#ffd700',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '16px',
              margin: '10px'
            }}
          >
            🔄 Recargar Aplicación
          </button>
          
          <details style={{ marginTop: '20px', textAlign: 'left' }}>
            <summary>Detalles del error</summary>
            <pre style={{ 
              background: 'rgba(0,0,0,0.2)', 
              padding: '10px', 
              borderRadius: '5px',
              overflow: 'auto'
            }}>
              {this.state.error && this.state.error.toString()}
              <br />
              {this.state.errorInfo?.componentStack}
            </pre>
          </details>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
