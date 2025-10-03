// Controller para manejar la lógica de negocio de Pokémon
// Implementa el patrón MVC - Controller
import Pokemon from '../models/Pokemon.js';
import pokemonApi from '../services/pokemonApi.js';
import { playPokemonSound } from '../services/pokemonAudio.js';

class PokemonController {
  constructor() {
    this.cache = new Map();
    this.currentPokemonList = [];
    this.filteredList = [];
    this.sortBy = 'id';
    this.sortOrder = 'asc';
    this.currentFilter = null;
    this.loading = false;
    this.eventListeners = new Map();
  }

  // Método principal para obtener la lista de Pokémon de la primera generación
  async fetchPokemonList(limit = 151) {
    if (this.loading) return this.currentPokemonList;
    
    this.loading = true;
    this.notifyEvent('loadingStart', { message: 'Loading Pokémon...' });
    
    try {
      // Usar caché si está disponible
      const cacheKey = `pokemon-list-${limit}`;
      if (this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        this.currentPokemonList = cached;
        this.filteredList = [...cached];
        this.notifyEvent('loadingEnd', { success: true, fromCache: true });
        return cached;
      }

      // Obtener datos de la PokéAPI
      const response = await pokemonApi.getFirstGeneration();
      
      // Convertir datos de la API a modelos Pokemon validados
      const pokemonList = response.results.map(data => {
        const formattedData = pokemonApi.formatPokemonForDisplay(data);
        return new Pokemon(formattedData);
      });

      // Guardar en caché
      this.cache.set(cacheKey, pokemonList);
      this.currentPokemonList = pokemonList;
      this.filteredList = [...pokemonList];
      
      this.notifyEvent('loadingEnd', { 
        success: true, 
        fromCache: false, 
        count: pokemonList.length 
      });
      
      return pokemonList;
    } catch (error) {
      console.error('Error fetching Pokemon list:', error);
      this.notifyEvent('loadingEnd', { success: false, error: error.message });
      throw new Error(`Failed to fetch Pokemon: ${error.message}`);
    } finally {
      this.loading = false;
    }
  }

  // Buscar un Pokémon específico
  async searchPokemon(query) {
    if (!query || query.trim() === '') {
      this.filteredList = [...this.currentPokemonList];
      this.notifyEvent('searchComplete', { 
        query: '', 
        results: this.filteredList.length 
      });
      return this.filteredList;
    }

    try {
      this.notifyEvent('searchStart', { query });

      // Primero buscar en la lista actual (local search)
      const localResults = this.currentPokemonList.filter(pokemon =>
        pokemon.name.toLowerCase().includes(query.toLowerCase()) ||
        pokemon.id.toString() === query.toString()
      );

      if (localResults.length > 0) {
        this.filteredList = localResults;
        this.notifyEvent('searchComplete', { 
          query, 
          results: localResults.length, 
          source: 'local' 
        });
        return localResults;
      }

      // Si no se encuentra localmente, buscar en la API
      const apiResult = await pokemonApi.searchPokemon(query, this.currentPokemonList);
      
      if (apiResult && apiResult.length > 0) {
        const formattedResults = apiResult.map(data => {
          const formattedData = pokemonApi.formatPokemonForDisplay(data);
          return new Pokemon(formattedData);
        });
        
        this.filteredList = formattedResults;
        this.notifyEvent('searchComplete', { 
          query, 
          results: formattedResults.length, 
          source: 'api' 
        });
        return formattedResults;
      }

      // No se encontraron resultados
      this.filteredList = [];
      this.notifyEvent('searchComplete', { 
        query, 
        results: 0, 
        source: 'none' 
      });
      return [];
    } catch (error) {
      console.error('Error searching Pokemon:', error);
      this.notifyEvent('searchError', { query, error: error.message });
      throw new Error(`Search failed: ${error.message}`);
    }
  }

  // Obtener un Pokémon aleatorio
  async getRandomPokemon() {
    try {
      this.notifyEvent('randomStart');

      if (this.currentPokemonList.length > 0) {
        // Seleccionar de la lista actual si está disponible
        const randomIndex = Math.floor(Math.random() * this.currentPokemonList.length);
        const pokemon = this.currentPokemonList[randomIndex];
        this.notifyEvent('randomComplete', { pokemon, source: 'local' });
        return pokemon;
      }

      // Obtener uno aleatorio de la API
      const randomData = await pokemonApi.getRandomPokemon();
      const formattedData = pokemonApi.formatPokemonForDisplay(randomData);
      const pokemon = new Pokemon(formattedData);
      
      this.notifyEvent('randomComplete', { pokemon, source: 'api' });
      return pokemon;
    } catch (error) {
      console.error('Error getting random Pokemon:', error);
      this.notifyEvent('randomError', { error: error.message });
      throw new Error(`Failed to get random Pokemon: ${error.message}`);
    }
  }

  // Filtrar por tipo
  async filterByType(typeName) {
    if (!typeName || typeName === 'all') {
      this.currentFilter = null;
      this.filteredList = [...this.currentPokemonList];
      this.notifyEvent('filterComplete', { 
        type: 'clear', 
        results: this.filteredList.length 
      });
      return this.filteredList;
    }

    try {
      this.currentFilter = { type: 'type', value: typeName };
      
      // Filtrar desde la lista actual
      const filtered = this.currentPokemonList.filter(pokemon =>
        pokemon.types.some(type => type.type.name === typeName.toLowerCase())
      );

      this.filteredList = filtered;
      this.notifyEvent('filterComplete', { 
        type: typeName, 
        results: filtered.length 
      });
      return filtered;
    } catch (error) {
      console.error('Error filtering by type:', error);
      this.notifyEvent('filterError', { type: typeName, error: error.message });
      throw new Error(`Filter failed: ${error.message}`);
    }
  }

  // Ordenar lista
  sortPokemonList(sortBy = 'id', order = 'asc') {
    this.sortBy = sortBy;
    this.sortOrder = order;

    const sorted = [...this.filteredList].sort((a, b) => {
      let aValue, bValue;

      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'id':
          aValue = a.id;
          bValue = b.id;
          break;
        case 'height':
          aValue = a.height;
          bValue = b.height;
          break;
        case 'weight':
          aValue = a.weight;
          bValue = b.weight;
          break;
        case 'base_experience':
          aValue = a.base_experience || 0;
          bValue = b.base_experience || 0;
          break;
        default:
          aValue = a.id;
          bValue = b.id;
      }

      if (order === 'desc') {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      }
      return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
    });

    this.filteredList = sorted;
    this.notifyEvent('sortComplete', { sortBy, order, results: sorted.length });
    return sorted;
  }

  // Reproducir sonido del Pokémon
  async playPokemonSound(pokemon) {
    try {
      this.notifyEvent('soundStart', { pokemon: pokemon.name });
      await playPokemonSound(pokemon.name, pokemon.id);
      this.notifyEvent('soundComplete', { pokemon: pokemon.name });
    } catch (error) {
      console.warn('Could not play Pokemon sound:', error);
      this.notifyEvent('soundError', { 
        pokemon: pokemon.name, 
        error: error.message 
      });
    }
  }

  // Obtener detalles adicionales de un Pokémon
  async getPokemonDetails(idOrName) {
    try {
      const cacheKey = `pokemon-details-${idOrName}`;
      if (this.cache.has(cacheKey)) {
        return this.cache.get(cacheKey);
      }

      const data = await pokemonApi.getPokemon(idOrName);
      const formattedData = pokemonApi.formatPokemonForDisplay(data);
      const pokemon = new Pokemon(formattedData);

      this.cache.set(cacheKey, pokemon);
      return pokemon;
    } catch (error) {
      console.error('Error getting Pokemon details:', error);
      throw new Error(`Failed to get Pokemon details: ${error.message}`);
    }
  }

  // Obtener todos los tipos disponibles
  async getAllTypes() {
    try {
      const cacheKey = 'all-types';
      if (this.cache.has(cacheKey)) {
        return this.cache.get(cacheKey);
      }

      const types = await pokemonApi.getAllTypes();
      this.cache.set(cacheKey, types);
      return types;
    } catch (error) {
      console.error('Error getting types:', error);
      throw new Error(`Failed to get types: ${error.message}`);
    }
  }

  // Limpiar filtros
  clearFilters() {
    this.currentFilter = null;
    this.filteredList = [...this.currentPokemonList];
    this.notifyEvent('filterCleared');
    return this.filteredList;
  }

  // Obtener estadísticas de la lista actual
  getListStats() {
    return {
      total: this.currentPokemonList.length,
      filtered: this.filteredList.length,
      types: [...new Set(this.currentPokemonList.flatMap(p => 
        p.types.map(t => t.type.name)
      ))].sort(),
      cached: this.cache.size,
      currentFilter: this.currentFilter,
      sortBy: this.sortBy,
      sortOrder: this.sortOrder,
      isLoading: this.loading
    };
  }

  // Event listener management
  addEventListener(eventName, callback) {
    if (!this.eventListeners.has(eventName)) {
      this.eventListeners.set(eventName, []);
    }
    this.eventListeners.get(eventName).push(callback);
  }

  removeEventListener(eventName, callback) {
    if (this.eventListeners.has(eventName)) {
      const listeners = this.eventListeners.get(eventName);
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  notifyEvent(eventName, data = {}) {
    if (this.eventListeners.has(eventName)) {
      this.eventListeners.get(eventName).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in event listener:', error);
        }
      });
    }
  }

  // Limpiar caché
  clearCache() {
    this.cache.clear();
    pokemonApi.clearCache();
    this.notifyEvent('cacheCleared');
  }

  // Getters
  get isLoading() {
    return this.loading;
  }

  get currentList() {
    return this.filteredList;
  }

  get fullList() {
    return this.currentPokemonList;
  }
}

// Instancia única del controlador (Singleton)
const pokemonController = new PokemonController();

export default pokemonController;
