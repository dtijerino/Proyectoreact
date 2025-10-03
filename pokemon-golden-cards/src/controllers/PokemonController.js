/**
 * Pokemon Controller
 * Implements MVC pattern and manages Pokemon data state
 */
import { pokemonApi } from '../services/pokemonApi.js';

export class PokemonController {
  constructor() {
    this.state = {
      pokemon: [],
      loading: false,
      error: null,
      searchQuery: '',
      selectedTypes: [],
      sortBy: 'id',
      sortOrder: 'asc',
      currentPage: 1,
      pageSize: 20,
      totalCount: 0,
      favorites: this.loadFavorites(),
      filters: {
        minStats: null,
        maxStats: null
      }
    };
    
    this.listeners = new Map();
    this.soundEnabled = true;
    this.initializeAudio();
  }

  // Event system
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  // Audio system
  initializeAudio() {
    this.sounds = {
      select: this.createAudioElement('/sounds/select.mp3'),
      search: this.createAudioElement('/sounds/search.mp3'),
      error: this.createAudioElement('/sounds/error.mp3'),
      success: this.createAudioElement('/sounds/success.mp3')
    };
  }

  createAudioElement(src) {
    const audio = new Audio();
    audio.src = src;
    audio.volume = 0.3;
    audio.preload = 'auto';
    
    // Gracefully handle audio loading errors
    audio.addEventListener('error', () => {
      console.warn(`Failed to load audio: ${src}`);
    });
    
    return audio;
  }

  playSound(soundName) {
    if (!this.soundEnabled || !this.sounds[soundName]) return;
    
    try {
      const audio = this.sounds[soundName];
      audio.currentTime = 0;
      audio.play().catch(() => {
        // Ignore audio play errors (user interaction required)
      });
    } catch (error) {
      console.warn(`Failed to play sound ${soundName}:`, error);
    }
  }

  toggleSound() {
    this.soundEnabled = !this.soundEnabled;
    this.emit('soundToggled', this.soundEnabled);
  }

  // State management
  setState(updates) {
    const previousState = { ...this.state };
    this.state = { ...this.state, ...updates };
    this.emit('stateChanged', { previous: previousState, current: this.state });
  }

  getState() {
    return { ...this.state };
  }

  // Loading and error handling
  setLoading(loading) {
    this.setState({ loading, error: loading ? null : this.state.error });
    this.emit('loadingChanged', loading);
  }

  setError(error) {
    this.setState({ error, loading: false });
    this.emit('error', error);
    this.playSound('error');
  }

  clearError() {
    this.setState({ error: null });
  }

  // Pokemon data operations
  async loadInitialPokemon() {
    try {
      this.setLoading(true);
      const pokemon = await pokemonApi.getRandomPokemon(this.state.pageSize);
      this.setState({ 
        pokemon,
        totalCount: pokemon.length,
        currentPage: 1
      });
      this.emit('pokemonLoaded', pokemon);
    } catch (error) {
      this.setError(`Failed to load Pokemon: ${error.message}`);
    } finally {
      this.setLoading(false);
    }
  }

  async loadMorePokemon() {
    if (this.state.loading) return;

    try {
      this.setLoading(true);
      const newPokemon = await pokemonApi.getRandomPokemon(this.state.pageSize);
      
      this.setState({
        pokemon: [...this.state.pokemon, ...newPokemon],
        currentPage: this.state.currentPage + 1,
        totalCount: this.state.totalCount + newPokemon.length
      });
      
      this.emit('pokemonLoaded', newPokemon);
    } catch (error) {
      this.setError(`Failed to load more Pokemon: ${error.message}`);
    } finally {
      this.setLoading(false);
    }
  }

  async searchPokemon(query) {
    if (!query || query.trim() === '') {
      return this.loadInitialPokemon();
    }

    try {
      this.setLoading(true);
      this.setState({ searchQuery: query });
      
      const results = await pokemonApi.searchPokemon(query, this.state.pageSize);
      
      this.setState({
        pokemon: results,
        totalCount: results.length,
        currentPage: 1
      });
      
      this.emit('searchCompleted', { query, results });
      this.playSound('search');
      
      if (results.length === 0) {
        this.emit('notification', {
          type: 'info',
          message: `No Pokemon found matching "${query}"`
        });
      }
    } catch (error) {
      this.setError(`Search failed: ${error.message}`);
    } finally {
      this.setLoading(false);
    }
  }

  async filterByType(types) {
    if (!Array.isArray(types)) {
      types = [types];
    }

    try {
      this.setLoading(true);
      this.setState({ selectedTypes: types });

      if (types.length === 0) {
        return this.loadInitialPokemon();
      }

      const allResults = [];
      for (const type of types) {
        const results = await pokemonApi.filterPokemon({
          type,
          limit: this.state.pageSize,
          sortBy: this.state.sortBy,
          sortOrder: this.state.sortOrder
        });
        allResults.push(...results);
      }

      // Remove duplicates
      const uniqueResults = allResults.filter((pokemon, index, self) =>
        index === self.findIndex(p => p.id === pokemon.id)
      );

      this.setState({
        pokemon: uniqueResults,
        totalCount: uniqueResults.length,
        currentPage: 1
      });

      this.emit('filterApplied', { types, results: uniqueResults });
    } catch (error) {
      this.setError(`Filter failed: ${error.message}`);
    } finally {
      this.setLoading(false);
    }
  }

  setSorting(sortBy, sortOrder = 'asc') {
    this.setState({ sortBy, sortOrder });
    this.sortCurrentPokemon();
  }

  sortCurrentPokemon() {
    const sorted = [...this.state.pokemon].sort((a, b) => {
      let valueA, valueB;

      switch (this.state.sortBy) {
        case 'name':
          valueA = a.name.toLowerCase();
          valueB = b.name.toLowerCase();
          break;
        case 'stats':
          valueA = a.getStatTotal();
          valueB = b.getStatTotal();
          break;
        case 'type':
          valueA = a.getPrimaryType();
          valueB = b.getPrimaryType();
          break;
        case 'id':
        default:
          valueA = a.id;
          valueB = b.id;
          break;
      }

      if (this.state.sortOrder === 'desc') {
        return valueB > valueA ? 1 : valueB < valueA ? -1 : 0;
      }
      return valueA > valueB ? 1 : valueA < valueB ? -1 : 0;
    });

    this.setState({ pokemon: sorted });
    this.emit('pokemonSorted', sorted);
  }

  // Favorites management
  loadFavorites() {
    try {
      const saved = localStorage.getItem('pokemon-favorites');
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.error('Failed to load favorites:', error);
      return [];
    }
  }

  saveFavorites() {
    try {
      localStorage.setItem('pokemon-favorites', JSON.stringify(this.state.favorites));
    } catch (error) {
      console.error('Failed to save favorites:', error);
    }
  }

  toggleFavorite(pokemonId) {
    const favorites = [...this.state.favorites];
    const index = favorites.indexOf(pokemonId);

    if (index > -1) {
      favorites.splice(index, 1);
      this.emit('notification', {
        type: 'info',
        message: 'Removed from favorites'
      });
    } else {
      favorites.push(pokemonId);
      this.emit('notification', {
        type: 'success',
        message: 'Added to favorites'
      });
      this.playSound('success');
    }

    this.setState({ favorites });
    this.saveFavorites();
    this.emit('favoritesChanged', favorites);
  }

  isFavorite(pokemonId) {
    return this.state.favorites.includes(pokemonId);
  }

  async loadFavoritePokemon() {
    const favoriteIds = this.state.favorites;
    if (favoriteIds.length === 0) {
      this.setState({ pokemon: [] });
      return;
    }

    try {
      this.setLoading(true);
      const favorites = await pokemonApi.getPokemonBatch(favoriteIds);
      this.setState({ 
        pokemon: favorites,
        totalCount: favorites.length
      });
      this.emit('favoritesLoaded', favorites);
    } catch (error) {
      this.setError(`Failed to load favorites: ${error.message}`);
    } finally {
      this.setLoading(false);
    }
  }

  // Utility methods
  async getPokemonById(id) {
    try {
      return await pokemonApi.getPokemonById(id);
    } catch (error) {
      this.setError(`Failed to load Pokemon ${id}: ${error.message}`);
      return null;
    }
  }

  async getRandomPokemon(count = 1) {
    try {
      this.setLoading(true);
      const pokemon = await pokemonApi.getRandomPokemon(count);
      
      if (count === 1) {
        this.emit('pokemonSelected', pokemon[0]);
        this.playSound('select');
        return pokemon[0];
      }
      
      return pokemon;
    } catch (error) {
      this.setError(`Failed to get random Pokemon: ${error.message}`);
      return null;
    } finally {
      this.setLoading(false);
    }
  }

  clearSearch() {
    this.setState({ searchQuery: '', selectedTypes: [] });
    this.loadInitialPokemon();
  }

  reset() {
    this.setState({
      pokemon: [],
      loading: false,
      error: null,
      searchQuery: '',
      selectedTypes: [],
      currentPage: 1,
      filters: {
        minStats: null,
        maxStats: null
      }
    });
    this.loadInitialPokemon();
  }

  // Statistics
  getStats() {
    const pokemon = this.state.pokemon;
    if (pokemon.length === 0) return null;

    const types = {};
    let totalStats = 0;
    let highestStat = 0;
    let strongestPokemon = null;

    pokemon.forEach(p => {
      // Count types
      p.getTypeNames().forEach(type => {
        types[type] = (types[type] || 0) + 1;
      });

      // Track stats
      const statTotal = p.getStatTotal();
      totalStats += statTotal;
      
      if (statTotal > highestStat) {
        highestStat = statTotal;
        strongestPokemon = p;
      }
    });

    return {
      totalPokemon: pokemon.length,
      averageStats: totalStats / pokemon.length,
      strongestPokemon,
      typeDistribution: types,
      favorites: this.state.favorites.length
    };
  }
}

export default PokemonController;
