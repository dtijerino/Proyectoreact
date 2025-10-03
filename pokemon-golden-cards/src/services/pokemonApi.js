/**
 * Pokemon API Service
 * Handles all interactions with the PokéAPI
 * Implements caching, error handling, and security best practices
 */
import { Pokemon } from '../models/Pokemon.js';

class PokemonApiService {
  constructor() {
    this.baseUrl = 'https://pokeapi.co/api/v2';
    this.cache = new Map();
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
    this.requestQueue = [];
    this.isProcessingQueue = false;
    this.maxRetries = 3;
    this.retryDelay = 1000;
    // Caché de nombres de habilidades en español
    this.abilityNameEsCache = new Map();
  }

  // Rate limiting and queue management
  async queueRequest(requestFn) {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({ requestFn, resolve, reject });
      this.processQueue();
    });
  }

  async processQueue() {
    if (this.isProcessingQueue || this.requestQueue.length === 0) return;
    
    this.isProcessingQueue = true;
    
    while (this.requestQueue.length > 0) {
      const { requestFn, resolve, reject } = this.requestQueue.shift();
      
      try {
        const result = await requestFn();
        resolve(result);
      } catch (error) {
        reject(error);
      }
      
      // Rate limiting: wait 100ms between requests
      await this.delay(100);
    }
    
    this.isProcessingQueue = false;
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Cache management
  getCacheKey(url, params = {}) {
    return `${url}_${JSON.stringify(params)}`;
  }

  getFromCache(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  setCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  clearCache() {
    this.cache.clear();
  }

  // HTTP request wrapper with retry logic
  async makeRequest(url, retries = 0) {
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      if (retries < this.maxRetries) {
        await this.delay(this.retryDelay * Math.pow(2, retries));
        return this.makeRequest(url, retries + 1);
      }
      throw new Error(`Failed to fetch ${url} after ${this.maxRetries} retries: ${error.message}`);
    }
  }

  // Core API methods
  async getPokemonById(id) {
    if (!id || (typeof id !== 'number' && typeof id !== 'string')) {
      throw new Error('Invalid Pokemon ID provided');
    }

    const cacheKey = this.getCacheKey(`pokemon/${id}`);
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    return this.queueRequest(async () => {
      const data = await this.makeRequest(`${this.baseUrl}/pokemon/${id}`);
      const pokemon = Pokemon.fromAPI(data);
      this.setCache(cacheKey, pokemon);
      return pokemon;
    });
  }

  async getPokemonByName(name) {
    if (!name || typeof name !== 'string') {
      throw new Error('Invalid Pokemon name provided');
    }

    const sanitizedName = name.toLowerCase().trim();
    return this.getPokemonById(sanitizedName);
  }

  async getPokemonList(limit = 20, offset = 0) {
    if (limit < 1 || limit > 1000) {
      throw new Error('Limit must be between 1 and 1000');
    }
    if (offset < 0) {
      throw new Error('Offset must be non-negative');
    }

    const cacheKey = this.getCacheKey('pokemon-list', { limit, offset });
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    return this.queueRequest(async () => {
      const data = await this.makeRequest(`${this.baseUrl}/pokemon?limit=${limit}&offset=${offset}`);
      this.setCache(cacheKey, data);
      return data;
    });
  }

  async getPokemonBatch(ids) {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new Error('IDs must be a non-empty array');
    }

    const promises = ids.map(id => this.getPokemonById(id));
    const results = await Promise.allSettled(promises);
    
    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        console.error(`Failed to fetch Pokemon ${ids[index]}:`, result.reason);
        return null;
      }
    }).filter(Boolean);
  }

  async getRandomPokemon(count = 1) {
    if (count < 1 || count > 50) {
      throw new Error('Count must be between 1 and 50');
    }

    const maxPokemonId = 1010; // Current max in API
    const randomIds = [];
    
    for (let i = 0; i < count; i++) {
      let randomId;
      do {
        randomId = Math.floor(Math.random() * maxPokemonId) + 1;
      } while (randomIds.includes(randomId));
      randomIds.push(randomId);
    }

    return this.getPokemonBatch(randomIds);
  }

  async searchPokemon(query, limit = 20) {
    if (!query || typeof query !== 'string') {
      throw new Error('Search query must be a non-empty string');
    }

    const sanitizedQuery = query.toLowerCase().trim();
    
    // First try direct name match
    try {
      const directMatch = await this.getPokemonByName(sanitizedQuery);
      return [directMatch];
    } catch {
      // If direct match fails, search through list
    }

    const list = await this.getPokemonList(1000, 0);
    const matches = list.results
      .filter(pokemon => pokemon.name.includes(sanitizedQuery))
      .slice(0, limit);

    if (matches.length === 0) {
      return [];
    }

    const pokemonPromises = matches.map(match => this.getPokemonByName(match.name));
    const results = await Promise.allSettled(pokemonPromises);
    
    return results
      .filter(result => result.status === 'fulfilled')
      .map(result => result.value);
  }

  async getPokemonByType(type) {
    if (!type || typeof type !== 'string') {
      throw new Error('Type must be a non-empty string');
    }

    const cacheKey = this.getCacheKey(`type/${type}`);
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    return this.queueRequest(async () => {
      const data = await this.makeRequest(`${this.baseUrl}/type/${type.toLowerCase()}`);
      this.setCache(cacheKey, data);
      return data;
    });
  }

  async getAllTypes() {
    const cacheKey = this.getCacheKey('types');
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    return this.queueRequest(async () => {
      const data = await this.makeRequest(`${this.baseUrl}/type`);
      this.setCache(cacheKey, data);
      return data;
    });
  }

  // Habilidades en español
  async getAbilityNameEs(nameOrUrl) {
    try {
      if (!nameOrUrl) return null;
      const key = typeof nameOrUrl === 'string' ? nameOrUrl : nameOrUrl?.ability?.name || nameOrUrl?.ability?.url;
      if (!key) return null;
      if (this.abilityNameEsCache.has(key)) return this.abilityNameEsCache.get(key);

      const url = key.startsWith('http') ? key : `${this.baseUrl}/ability/${key}`;
      const data = await this.queueRequest(() => this.makeRequest(url));
      const esName = (data.names || []).find(n => n.language?.name === 'es')?.name
        || data.name
        || null;
      if (esName) this.abilityNameEsCache.set(key, esName);
      return esName;
    } catch {
      return null;
    }
  }

  async getAbilitiesEs(abilities = []) {
    try {
      const tasks = abilities.map(ab => this.getAbilityNameEs(ab?.ability?.name || ab?.ability?.url || ab));
      const results = await Promise.allSettled(tasks);
      return results.map((r, i) => {
        if (r.status === 'fulfilled' && r.value) return r.value;
        const fallback = abilities[i];
        const name = typeof fallback === 'string' ? fallback : fallback?.ability?.name;
        return (name || '').replace(/-/g, ' ');
      });
    } catch {
      return abilities.map(ab => (typeof ab === 'string' ? ab : ab?.ability?.name || '').replace(/-/g, ' '));
    }
  }

  // Utility methods
  async getPokemonEvolutionChain(pokemonId) {
    try {
      const species = await this.makeRequest(`${this.baseUrl}/pokemon-species/${pokemonId}`);
      const evolutionChain = await this.makeRequest(species.evolution_chain.url);
      return evolutionChain;
    } catch (error) {
      console.error('Failed to fetch evolution chain:', error);
      return null;
    }
  }

  async getPokemonMoves(pokemonId, limit = 10) {
    try {
      const pokemon = await this.getPokemonById(pokemonId);
      const moves = pokemon.moves?.slice(0, limit) || [];
      return moves;
    } catch (error) {
      console.error('Failed to fetch Pokemon moves:', error);
      return [];
    }
  }

  // Advanced filtering
  async filterPokemon(filters = {}) {
    const {
      type,
      minStats,
      maxStats,
      sortBy = 'id',
      sortOrder = 'asc',
      limit = 20,
      offset = 0
    } = filters;

    let results = [];

    if (type) {
      const typeData = await this.getPokemonByType(type);
      const pokemonList = typeData.pokemon.slice(offset, offset + limit);
      const pokemonPromises = pokemonList.map(entry => 
        this.getPokemonByName(entry.pokemon.name)
      );
      results = await Promise.allSettled(pokemonPromises);
      results = results
        .filter(result => result.status === 'fulfilled')
        .map(result => result.value);
    } else {
      const list = await this.getPokemonList(limit, offset);
      const pokemonPromises = list.results.map(entry => 
        this.getPokemonByName(entry.name)
      );
      results = await Promise.allSettled(pokemonPromises);
      results = results
        .filter(result => result.status === 'fulfilled')
        .map(result => result.value);
    }

    // Apply stat filters
    if (minStats || maxStats) {
      results = results.filter(pokemon => {
        const total = pokemon.getStatTotal();
        if (minStats && total < minStats) return false;
        if (maxStats && total > maxStats) return false;
        return true;
      });
    }

    // Sort results
    results.sort((a, b) => {
      let valueA, valueB;
      
      switch (sortBy) {
        case 'name':
          valueA = a.name;
          valueB = b.name;
          break;
        case 'stats':
          valueA = a.getStatTotal();
          valueB = b.getStatTotal();
          break;
        case 'id':
        default:
          valueA = a.id;
          valueB = b.id;
          break;
      }

      if (sortOrder === 'desc') {
        return valueB > valueA ? 1 : -1;
      }
      return valueA > valueB ? 1 : -1;
    });

    return results;
  }
}

// Export singleton instance
export const pokemonApi = new PokemonApiService();
export default pokemonApi;
