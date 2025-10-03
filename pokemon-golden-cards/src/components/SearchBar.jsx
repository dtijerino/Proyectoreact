/**
 * SearchBar Component
 * Provides search functionality with modern UI
 */
import { useState, useEffect } from 'react';
import './SearchBar.css';

const SearchBar = ({ 
  searchTerm = '', 
  onSearchChange
}) => {
  const [query, setQuery] = useState(searchTerm);

  useEffect(() => {
    setQuery(searchTerm);
  }, [searchTerm]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSearchChange) {
      onSearchChange(query.trim());
    }
  };

  const handleClear = () => {
    setQuery('');
    if (onSearchChange) onSearchChange('');
  };

  const handleChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    // Si el usuario borra todo, notificar al padre para recargar iniciales
    if (value.trim() === '') {
      onSearchChange && onSearchChange('');
    }
  };

  const handleRandomSearch = () => {
    const randomPokemon = Math.floor(Math.random() * 1010) + 1;
    const randomQuery = randomPokemon.toString();
    setQuery(randomQuery);
    if (onSearchChange) onSearchChange(randomQuery);
  };

  return (
    <div className="search-bar">
      <form className="search-form" onSubmit={handleSubmit}>
        <div className="search-input-container">
          <input
            type="text"
            className="search-input"
            placeholder="Buscar Pokémon por nombre o número..."
            value={query}
            onChange={handleChange}
          />
          <button 
            type="submit" 
            className="search-button"
            disabled={!query.trim()}
          >
            🔍
          </button>
        </div>
      </form>

      <div className="search-controls">
        <button 
          type="button"
          className="random-button"
          onClick={handleRandomSearch}
          title="Pokémon aleatorio"
        >
          🎲 Aleatorio
        </button>

        {query && (
          <button 
            type="button"
            className="clear-button"
            onClick={handleClear}
            title="Limpiar"
          >
            ❌ Limpiar
          </button>
        )}
      </div>
    </div>
  );
};

export default SearchBar;
