/**
 * Pokemon Golden Cards App
 * Main application component implementing MVC architecture
 */
import { useState } from 'react';
import usePokemon from './hooks/usePokemon';
import SearchBar from './components/SearchBar';
import PokemonGrid from './components/PokemonGrid';
import NotificationSystem from './components/NotificationSystem';
import './App.css';

function App() {
  const {
    pokemon,
    loading,
    error,
    searchQuery,
    selectedTypes,
    sortBy,
    sortOrder,
    hasMore,
    isEmpty,
    isSearching,
    notifications,
    soundEnabled,
    searchPokemon,
    loadMorePokemon,
    filterByType,
    setSorting,
    toggleFavorite,
    isFavorite,
    loadFavoritePokemon,
    getRandomPokemon,
    clearSearch,
    reset,
    toggleSound,
    getStats,
    removeNotification
  } = usePokemon();

  const [showFavorites, setShowFavorites] = useState(false);
  const [showStats, setShowStats] = useState(false);

  const handleSearch = async (query) => {
    await searchPokemon(query);
  };

  const handleTypeFilter = async (types) => {
    await filterByType(types);
  };

  const handleClear = () => {
    clearSearch();
    setShowFavorites(false);
  };

  const handleShowFavorites = async () => {
    setShowFavorites(true);
    await loadFavoritePokemon();
  };

  const handleRandomPokemon = async () => {
    await getRandomPokemon(6);
  };

  const handlePokemonClick = (pokemon) => {
    console.log('Pokemon clicked:', pokemon);
    // Future: Open pokemon detail modal
  };

  const stats = getStats();

  return (
    <div className="app">
      <div className="app-background"></div>
      
      <header className="app-header">
        <div className="header-content">
          <h1 className="app-title">
            <span className="title-icon">⚡</span>
            Pokémon Golden Cards
            <span className="title-sparkle">✨</span>
          </h1>
          
          <div className="header-controls">
            <button
              className={`control-button ${showFavorites ? 'active' : ''}`}
              onClick={handleShowFavorites}
              title="Show Favorites"
            >
              ❤️ Favorites
            </button>
            
            <button
              className="control-button"
              onClick={handleRandomPokemon}
              disabled={loading}
              title="Get Random Pokemon"
            >
              🎲 Random
            </button>
            
            <button
              className={`control-button ${showStats ? 'active' : ''}`}
              onClick={() => setShowStats(!showStats)}
              title="Show Statistics"
            >
              📊 Stats
            </button>
            
            <button
              className={`control-button ${soundEnabled ? 'active' : ''}`}
              onClick={toggleSound}
              title="Toggle Sound"
            >
              {soundEnabled ? '🔊' : '🔇'}
            </button>
          </div>
        </div>
      </header>

      <main className="app-main">
        <div className="main-content">
          <SearchBar
            onSearch={handleSearch}
            onTypeFilter={handleTypeFilter}
            onClear={handleClear}
            searchQuery={searchQuery}
            selectedTypes={selectedTypes}
            loading={loading}
          />

          {showStats && stats && (
            <div className="stats-panel">
              <h3>📊 Collection Statistics</h3>
              <div className="stats-grid">
                <div className="stat-item">
                  <span className="stat-label">Total Pokémon</span>
                  <span className="stat-value">{stats.totalPokemon}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Favorites</span>
                  <span className="stat-value">{stats.favorites}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Average Stats</span>
                  <span className="stat-value">{Math.round(stats.averageStats)}</span>
                </div>
                {stats.strongestPokemon && (
                  <div className="stat-item">
                    <span className="stat-label">Strongest</span>
                    <span className="stat-value">{stats.strongestPokemon.name}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="sorting-controls">
            <label className="sort-label">Sort by:</label>
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [newSortBy, newSortOrder] = e.target.value.split('-');
                setSorting(newSortBy, newSortOrder);
              }}
              className="sort-select"
              disabled={loading}
            >
              <option value="id-asc">ID (Low to High)</option>
              <option value="id-desc">ID (High to Low)</option>
              <option value="name-asc">Name (A to Z)</option>
              <option value="name-desc">Name (Z to A)</option>
              <option value="stats-asc">Stats (Low to High)</option>
              <option value="stats-desc">Stats (High to Low)</option>
              <option value="type-asc">Type (A to Z)</option>
            </select>
          </div>

          <PokemonGrid
            pokemon={pokemon}
            loading={loading}
            error={error}
            onFavorite={toggleFavorite}
            isFavorite={isFavorite}
            onPokemonClick={handlePokemonClick}
            onLoadMore={loadMorePokemon}
            hasMore={hasMore && !showFavorites}
          />

          {loading && pokemon.length === 0 && (
            <div className="loading-message">
              <div className="loading-spinner-large"></div>
              <p>Loading amazing Pokémon...</p>
            </div>
          )}

          {isEmpty && !loading && (
            <div className="empty-message">
              <h3>Ready to discover Pokémon?</h3>
              <p>Use the search above or try these quick actions:</p>
              <div className="quick-actions">
                <button
                  className="quick-action-button"
                  onClick={handleRandomPokemon}
                >
                  🎲 Get Random Pokémon
                </button>
                <button
                  className="quick-action-button"
                  onClick={() => filterByType(['fire'])}
                >
                  🔥 Fire Types
                </button>
                <button
                  className="quick-action-button"
                  onClick={() => filterByType(['water'])}
                >
                  💧 Water Types
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="app-footer">
        <div className="footer-content">
          <p>
            Made with ❤️ using <a href="https://pokeapi.co" target="_blank" rel="noopener noreferrer">PokéAPI</a>
          </p>
          <div className="footer-links">
            {isSearching && (
              <button className="footer-link" onClick={handleClear}>
                🏠 Home
              </button>
            )}
            <button className="footer-link" onClick={reset}>
              🔄 Reset
            </button>
          </div>
        </div>
      </footer>

      <NotificationSystem
        notifications={notifications}
        onRemove={removeNotification}
      />
    </div>
  );
}

export default App;
