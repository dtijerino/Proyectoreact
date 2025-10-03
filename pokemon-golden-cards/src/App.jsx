import React, { useState, useEffect } from 'react';
import './App.css';
import SearchBar from './components/SearchBar';
import PokemonGrid from './components/PokemonGrid';
import { Pokemon } from './models/Pokemon.js';
import PackOpener from './components/PackOpener.jsx';

function App() {
  const [searchTerm, setSearchTerm] = useState('');
  const [pokemons, setPokemons] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [highlightIds, setHighlightIds] = useState([]);

  const INITIAL_POKEMON = ['pikachu', 'charizard', 'blastoise', 'venusaur', 'lucario', 'eevee'];

  // Cargar algunos Pokémon iniciales (lista base)
  const loadInitialPokemons = async () => {
    setLoading(true);
    setError(null);
    try {
      const results = await Promise.all(
        INITIAL_POKEMON.map(async (name) => {
          const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${name}`);
          if (!response.ok) throw new Error('Error cargando Pokémon iniciales');
          const data = await response.json();
          return new Pokemon(data);
        })
      );
      setPokemons(results);
    } catch (err) {
      setError(err.message || 'Error cargando Pokémon');
      setPokemons([]);
    } finally {
      setLoading(false);
    }
  };

  // Función para buscar Pokémon en la API (con opción de reemplazar o agregar)
  const searchPokemon = async (query, { append = false } = {}) => {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${query.toLowerCase()}`);
      if (!response.ok) throw new Error('Pokémon no encontrado');
      const data = await response.json();
      const pokemon = new Pokemon(data);
      if (append) {
        setPokemons(prev => {
          const exists = prev.find(p => p.id === pokemon.id);
          if (exists) return prev;
          return [...prev, pokemon];
        });
      } else {
        setPokemons([pokemon]);
      }
    } catch (err) {
      setError(err.message);
      setPokemons([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialPokemons();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = (term) => {
    setSearchTerm(term);
    if (!term || !term.trim()) {
      // Si se limpia la búsqueda, mostrar la lista inicial nuevamente
      loadInitialPokemons();
      return;
    }
    // Al buscar, mostrar solo el Pokémon buscado
    searchPokemon(term, { append: false });
  };

  // Funciones para favoritos
  const handleFavorite = (pokemonId) => {
    setFavorites(prev => 
      prev.includes(pokemonId) 
        ? prev.filter(id => id !== pokemonId)
        : [...prev, pokemonId]
    );
  };

  const isFavorite = (pokemonId) => favorites.includes(pokemonId);

  const handleAddPulled = (pulledPokemon) => {
    setPokemons(prev => {
      const ids = new Set(prev.map(p => p.id));
      const merged = [...prev];
      pulledPokemon.forEach(p => { if (!ids.has(p.id)) merged.push(p); });
      return merged;
    });
  };

  // Rotación automática de cartas más dinámica: cada 8s, 2 cartas
  useEffect(() => {
    if (searchTerm.trim()) return; // no rotar si el usuario está buscando
    let cancelled = false;

    const tick = async () => {
      try {
        const getRandom = async () => {
          const id = Math.floor(Math.random() * 1010) + 1;
          const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
          if (!res.ok) return null;
          const data = await res.json();
          return new Pokemon(data);
        };
        const [p1, p2] = await Promise.all([getRandom(), getRandom()]);
        const newcomers = [p1, p2].filter(Boolean);
        if (cancelled || newcomers.length === 0) return;

        setPokemons(prev => {
          let next = [...prev];
          const toHighlight = [];
          newcomers.forEach(p => {
            if (!p) return;
            const exists = next.find(x => x.id === p.id);
            if (exists) return;
            if (next.length >= 18) {
              // Reemplazar en índice aleatorio para dinamismo
              const idx = Math.floor(Math.random() * next.length);
              next.splice(idx, 1, p);
            } else {
              next.push(p);
            }
            toHighlight.push(p.id);
          });
          // Actualizar highlight ids fuera del setter
          if (toHighlight.length) {
            setHighlightIds(toHighlight);
            setTimeout(() => setHighlightIds([]), 2000);
          }
          return next;
        });
      } catch {
        // ignorar fallos puntuales
      }
    };

    const interval = setInterval(tick, 8000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [searchTerm]);

  return (
    <div className="App">
      <div className="top-gold-bar" />
      <div className="poke-watermark" aria-hidden="true" />
      <div className="pokemon-silhouettes" aria-hidden="true" />

      <header className="app-header">
        <h1 className="app-title">Cartas Doradas Pokémon</h1>
        <p className="app-subtitle">Descubre y colecciona cartas doradas de Pokémon</p>
      </header>
      
      <main className="app-main">
        <PackOpener onAddToBoard={handleAddPulled} packSize={5} />
        <SearchBar 
          searchTerm={searchTerm}
          onSearchChange={handleSearch}
        />
        
        <PokemonGrid 
          pokemon={pokemons}
          loading={loading}
          error={error}
          onFavorite={handleFavorite}
          isFavorite={isFavorite}
          highlightIds={highlightIds}
        />
      </main>

      <footer className="app-footer">© {new Date().getFullYear()} Cartas Doradas Pokémon — ¡Atrápalos ya!</footer>
    </div>
  );
}

export default App;
