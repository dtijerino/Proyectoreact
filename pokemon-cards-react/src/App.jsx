import React, { useState, useEffect } from 'react';
import './App.css';
import SearchBar from './components/SearchBar';
import PokemonGrid from './components/PokemonGrid';
import { usePokemon } from './hooks/usePokemon';

function App() {
  const {
    filteredList,
    loading,
    error,
    searchTerm,
    selectedType,
    stats,
    searchPokemon,
    filterByType,
    sortPokemon,
    getRandomPokemon,
    playSound,
    clearFilters,
    getAllTypes,
    isEmpty,
    hasError,
    isFiltered,
    totalCount,
    filteredCount
  } = usePokemon();

  const [selectedPokemon, setSelectedPokemon] = useState(null);
  const [availableTypes, setAvailableTypes] = useState([]);
  const [notification, setNotification] = useState(null);

  // Cargar tipos disponibles
  useEffect(() => {
    const loadTypes = async () => {
      try {
        const types = await getAllTypes();
        setAvailableTypes(types);
      } catch (err) {
        console.warn('Could not load types:', err);
      }
    };
    loadTypes();
  }, [getAllTypes]);

  // Mostrar notificaciones
  const showNotification = (message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // Manejar búsqueda
  const handleSearch = async (query) => {
    try {
      await searchPokemon(query);
      if (query && filteredCount === 0) {
        showNotification(`No se encontraron resultados para "${query}"`, 'warning');
      }
    } catch (err) {
      showNotification('Error en la búsqueda', 'error');
    }
  };

  // Manejar reset/limpiar
  const handleReset = () => {
    clearFilters();
    setSelectedPokemon(null);
    showNotification('Filtros limpiados', 'success');
  };

  // Manejar carta aleatoria
  const handleRandomCard = async () => {
    try {
      const randomPokemon = await getRandomPokemon();
      setSelectedPokemon(randomPokemon);
      showNotification(`¡${randomPokemon.name} apareció!`, 'success');
    } catch (err) {
      showNotification('Error al obtener Pokémon aleatorio', 'error');
    }
  };

  // Manejar clic en carta
  const handleCardClick = async (pokemon) => {
    setSelectedPokemon(pokemon);
    await playSound(pokemon);
    showNotification(`Seleccionaste a ${pokemon.name}`, 'info');
  };

  // Manejar filtro por tipo
  const handleTypeFilter = async (type) => {
    try {
      await filterByType(type);
      if (type !== 'all') {
        showNotification(`Filtrando por tipo: ${type}`, 'info');
      }
    } catch (err) {
      showNotification('Error al filtrar por tipo', 'error');
    }
  };

  // Manejar ordenamiento
  const handleSort = (criteria, order) => {
    sortPokemon(criteria, order);
    showNotification(`Ordenado por ${criteria} (${order})`, 'info');
  };

  return (
    <div className="App">
      {/* Header */}
      <header className="app-header">
        <div className="header-content">
          <h1 className="app-title">
            <span className="title-pokemon">Pokémon</span>
            <span className="title-golden">Golden Cards</span>
          </h1>
          <p className="app-subtitle">
            Colección de cartas doradas de la primera generación
          </p>
        </div>
      </header>

      {/* Notification */}
      {notification && (
        <div className={`notification notification-${notification.type}`}>
          {notification.message}
        </div>
      )}

      {/* Controls */}
      <div className="app-controls">
        <SearchBar
          onSearch={handleSearch}
          onReset={handleReset}
          onRandomCard={handleRandomCard}
          loading={loading}
          placeholder="Buscar Pokémon por nombre o número..."
        />

        {/* Filters */}
        <div className="filters-section">
          <div className="filter-group">
            <label htmlFor="type-filter">Filtrar por tipo:</label>
            <select
              id="type-filter"
              value={selectedType}
              onChange={(e) => handleTypeFilter(e.target.value)}
              className="type-filter"
            >
              <option value="all">Todos los tipos</option>
              {availableTypes.map(type => (
                <option key={type.name} value={type.name}>
                  {type.name.charAt(0).toUpperCase() + type.name.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="sort-filter">Ordenar por:</label>
            <select
              id="sort-filter"
              onChange={(e) => {
                const [criteria, order] = e.target.value.split('-');
                handleSort(criteria, order);
              }}
              className="sort-filter"
            >
              <option value="id-asc">Número (Ascendente)</option>
              <option value="id-desc">Número (Descendente)</option>
              <option value="name-asc">Nombre (A-Z)</option>
              <option value="name-desc">Nombre (Z-A)</option>
              <option value="height-asc">Altura (Menor)</option>
              <option value="height-desc">Altura (Mayor)</option>
              <option value="weight-asc">Peso (Menor)</option>
              <option value="weight-desc">Peso (Mayor)</option>
            </select>
          </div>
        </div>

        {/* Stats */}
        <div className="stats-section">
          <div className="stats-info">
            <span className="stat-item">
              Total: <strong>{totalCount}</strong>
            </span>
            <span className="stat-item">
              Mostrando: <strong>{filteredCount}</strong>
            </span>
            {isFiltered && (
              <span className="stat-item filtered">
                (Filtrado)
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="app-main">
        {/* Selected Pokemon Details */}
        {selectedPokemon && (
          <div className="selected-pokemon">
            <h2>Pokémon Seleccionado</h2>
            <div className="pokemon-details">
              <img
                src={selectedPokemon.sprites?.front_default}
                alt={selectedPokemon.name}
                className="selected-pokemon-image"
              />
              <div className="pokemon-info">
                <h3>{selectedPokemon.name.charAt(0).toUpperCase() + selectedPokemon.name.slice(1)}</h3>
                <p><strong>Número:</strong> #{selectedPokemon.id.toString().padStart(3, '0')}</p>
                <p><strong>Altura:</strong> {selectedPokemon.height / 10} m</p>
                <p><strong>Peso:</strong> {selectedPokemon.weight / 10} kg</p>
                <div className="pokemon-types">
                  {selectedPokemon.types?.map(typeInfo => (
                    <span key={typeInfo.type.name} className={`type-badge type-${typeInfo.type.name}`}>
                      {typeInfo.type.name}
                    </span>
                  ))}
                </div>
                {selectedPokemon.description && (
                  <p className="pokemon-description">{selectedPokemon.description}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Error State */}
        {hasError && (
          <div className="error-state">
            <h2>¡Oops! Algo salió mal</h2>
            <p>{error}</p>
            <button onClick={handleReset} className="retry-button">
              Reintentar
            </button>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="loading-state">
            <div className="pokeball-loader">
              <div className="pokeball">
                <div className="pokeball-top"></div>
                <div className="pokeball-middle"></div>
                <div className="pokeball-bottom"></div>
              </div>
            </div>
            <p>Cargando Pokémon...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && isEmpty && !hasError && (
          <div className="empty-state">
            <h2>No se encontraron Pokémon</h2>
            <p>
              {isFiltered 
                ? 'Intenta ajustar tus filtros de búsqueda.'
                : 'No hay Pokémon disponibles en este momento.'
              }
            </p>
            {isFiltered && (
              <button onClick={handleReset} className="clear-filters-button">
                Limpiar filtros
              </button>
            )}
          </div>
        )}

        {/* Pokemon Grid */}
        {!loading && !isEmpty && !hasError && (
          <PokemonGrid
            pokemon={filteredList}
            onCardClick={handleCardClick}
            selectedPokemon={selectedPokemon}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="app-footer">
        <p>
          Datos proporcionados por{' '}
          <a href="https://pokeapi.co/" target="_blank" rel="noopener noreferrer">
            PokéAPI
          </a>
          {' '}• Pokémon Golden Cards © 2024
        </p>
      </footer>
    </div>
  );
}

export default App;
