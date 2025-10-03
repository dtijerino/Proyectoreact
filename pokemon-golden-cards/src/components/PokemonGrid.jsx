/**
 * PokemonGrid Component
 * Displays a grid of Pokemon cards with loading and empty states
 */
import PokemonCard from './PokemonCard';
import './PokemonGrid.css';

const PokemonGrid = ({ 
  pokemon = [], 
  loading = false, 
  onFavorite, 
  isFavorite, 
  onPokemonClick,
  hasMore = false,
  error = null,
  highlightIds = []
}) => {
  if (error) {
    return (
      <div className="error-state">
        <div className="error-icon">⚠️</div>
        <h3>¡Ups! Algo salió mal</h3>
        <p>{error}</p>
        <button 
          className="retry-button"
          onClick={() => window.location.reload()}
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (!loading && pokemon.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">🔍</div>
        <h3>No se encontraron Pokémon</h3>
        <p>Prueba ajustando tu búsqueda o filtros para encontrar Pokémon.</p>
      </div>
    );
  }

  return (
    <div className="pokemon-grid-container">
      <div className="pokemon-grid">
        {pokemon.map((poke) => (
          <div key={poke.id} className={highlightIds.includes(poke.id) ? 'card-highlight' : ''}>
            <PokemonCard
              pokemon={poke}
              onFavorite={onFavorite}
              isFavorite={isFavorite(poke.id)}
              onClick={onPokemonClick}
            />
          </div>
        ))}
        
        {/* Loading placeholder cards */}
        {loading && (
          <>
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={`loading-${index}`} className="pokemon-card loading-card">
                <div className="loading-content">
                  <div className="loading-image">
                    <div className="loading-spinner"></div>
                  </div>
                  <div className="loading-text">
                    <div className="loading-line long"></div>
                    <div className="loading-line short"></div>
                    <div className="loading-line medium"></div>
                  </div>
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Results Info */}
      {pokemon.length > 0 && (
        <div className="results-info">
          <span>Mostrando {pokemon.length} Pokémon</span>
          {hasMore && <span> • Hay más disponibles</span>}
        </div>
      )}
    </div>
  );
};

export default PokemonGrid;
