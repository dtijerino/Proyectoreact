// PokéAPI service for fetching Pokémon data
// Following PokéAPI documentation: https://pokeapi.co/docs/v2
const BASE_URL = 'https://pokeapi.co/api/v2';

// Cache to store API responses and avoid redundant requests (Fair Use Policy)
const apiCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

class PokemonApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'PokemonApiError';
    this.status = status;
  }
}

const pokemonApi = {
  // Base fetch function with caching and error handling
  async fetchFromApi(endpoint) {
    const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`;
    
    // Check cache first (Fair Use Policy: Locally cache resources)
    const cached = apiCache.get(url);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }
    
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new PokemonApiError(
          `HTTP error! status: ${response.status}`,
          response.status
        );
      }
      
      const data = await response.json();
      
      // Cache the response
      apiCache.set(url, {
        data,
        timestamp: Date.now()
      });
      
      return data;
    } catch (error) {
      if (error instanceof PokemonApiError) {
        throw error;
      }
      throw new PokemonApiError(`Network error: ${error.message}`, 0);
    }
  },

  // Get a single Pokémon by ID or name
  async getPokemon(idOrName) {
    const pokemon = await this.fetchFromApi(`/pokemon/${idOrName.toString().toLowerCase()}`);
    
    // Fetch additional species data for better information
    try {
      const species = await this.getPokemonSpecies(pokemon.id);
      return {
        ...pokemon,
        species_data: species
      };
    } catch (error) {
      console.warn('Could not fetch species data:', error);
      return pokemon;
    }
  },

  // Get Pokémon species data (for descriptions, evolution chain, etc.)
  async getPokemonSpecies(idOrName) {
    return this.fetchFromApi(`/pokemon-species/${idOrName.toString().toLowerCase()}`);
  },

  // Get list of Pokémon with pagination
  async getPokemonList(limit = 151, offset = 0) {
    const response = await this.fetchFromApi(`/pokemon?limit=${limit}&offset=${offset}`);
    
    // Fetch basic data for each Pokémon in parallel (but limit concurrent requests)
    const batchSize = 10;
    const results = [];
    
    for (let i = 0; i < response.results.length; i += batchSize) {
      const batch = response.results.slice(i, i + batchSize);
      const pokemonPromises = batch.map(async (pokemon) => {
        try {
          const pokemonData = await this.getPokemon(pokemon.name);
          return pokemonData;
        } catch (error) {
          console.warn(`Could not fetch data for ${pokemon.name}:`, error);
          return null;
        }
      });
      
      const batchResults = await Promise.all(pokemonPromises);
      results.push(...batchResults.filter(pokemon => pokemon !== null));
    }
    
    return {
      ...response,
      results
    };
  },

  // Get first generation Pokémon (1-151) - most iconic ones
  async getFirstGeneration() {
    return this.getPokemonList(151, 0);
  },

  // Get evolution chain
  async getEvolutionChain(id) {
    return this.fetchFromApi(`/evolution-chain/${id}`);
  },

  // Get type information with damage relations
  async getType(idOrName) {
    return this.fetchFromApi(`/type/${idOrName.toString().toLowerCase()}`);
  },

  // Get all types
  async getAllTypes() {
    const response = await this.fetchFromApi('/type');
    // Filter out unknown and shadow types
    return response.results.filter(type => 
      !['unknown', 'shadow'].includes(type.name)
    );
  },

  // Search Pokémon by name (local filtering for better UX)
  async searchPokemon(query, pokemonList = null) {
    if (!pokemonList) {
      const response = await this.getFirstGeneration();
      pokemonList = response.results;
    }
    
    const searchTerm = query.toLowerCase();
    return pokemonList.filter(pokemon => 
      pokemon.name.toLowerCase().includes(searchTerm) ||
      pokemon.id.toString() === searchTerm ||
      (pokemon.species_data?.names && 
       pokemon.species_data.names.some(name => 
         name.name.toLowerCase().includes(searchTerm)
       ))
    );
  },

  // Get random Pokémon from first generation
  async getRandomPokemon() {
    const randomId = Math.floor(Math.random() * 151) + 1;
    return this.getPokemon(randomId);
  },

  // Get Pokémon by type (filtered to first generation)
  async getPokemonByType(typeName) {
    const typeData = await this.getType(typeName);
    const firstGenPokemon = typeData.pokemon
      .filter(p => {
        const id = this.extractIdFromUrl(p.pokemon.url);
        return id <= 151; // Only first generation
      })
      .slice(0, 20); // Limit to avoid too many requests
    
    const pokemonPromises = firstGenPokemon.map(p => 
      this.getPokemon(p.pokemon.name)
    );
    
    return Promise.all(pokemonPromises);
  },

  // Get Pokémon encounters (where they can be found)
  async getPokemonEncounters(idOrName) {
    const url = `/pokemon/${idOrName.toString().toLowerCase()}/encounters`;
    return this.fetchFromApi(url);
  },

  // Get Pokémon abilities
  async getAbility(idOrName) {
    return this.fetchFromApi(`/ability/${idOrName.toString().toLowerCase()}`);
  },

  // Get move information
  async getMove(idOrName) {
    return this.fetchFromApi(`/move/${idOrName.toString().toLowerCase()}`);
  },

  // Get generation information
  async getGeneration(idOrName) {
    return this.fetchFromApi(`/generation/${idOrName.toString().toLowerCase()}`);
  },

  // Helper function to extract ID from URL
  extractIdFromUrl(url) {
    const parts = url.split('/');
    return parseInt(parts[parts.length - 2]);
  },

  // Get formatted Pokémon data for display
  formatPokemonForDisplay(pokemon) {
    const description = pokemon.species_data?.flavor_text_entries
      ?.find(entry => entry.language.name === 'en')?.flavor_text
      ?.replace(/\f/g, ' ') || 'No description available';

    const genus = pokemon.species_data?.genera
      ?.find(genus => genus.language.name === 'en')?.genus || 'Unknown';

    return {
      id: pokemon.id,
      name: pokemon.name,
      height: pokemon.height,
      weight: pokemon.weight,
      base_experience: pokemon.base_experience,
      sprites: pokemon.sprites,
      cries: pokemon.cries,
      types: pokemon.types,
      abilities: pokemon.abilities,
      stats: pokemon.stats,
      moves: pokemon.moves?.slice(0, 4) || [], // Limit moves for display
      description,
      genus,
      is_legendary: pokemon.species_data?.is_legendary || false,
      is_mythical: pokemon.species_data?.is_mythical || false,
      capture_rate: pokemon.species_data?.capture_rate || 0,
      habitat: pokemon.species_data?.habitat?.name || 'unknown'
    };
  },

  // Clear cache (useful for development)
  clearCache() {
    apiCache.clear();
  },

  // Get cache info
  getCacheInfo() {
    return {
      size: apiCache.size,
      entries: Array.from(apiCache.keys()),
      totalMemory: Array.from(apiCache.values()).reduce((acc, entry) => 
        acc + JSON.stringify(entry).length, 0
      )
    };
  }
};

// Export individual functions for backwards compatibility
export const getPokemonList = pokemonApi.getPokemonList.bind(pokemonApi);
export const getPokemonDetails = pokemonApi.getPokemon.bind(pokemonApi);
export const getPokemonSpecies = pokemonApi.getPokemonSpecies.bind(pokemonApi);
export const searchPokemon = pokemonApi.searchPokemon.bind(pokemonApi);
export const getRandomPokemon = pokemonApi.getRandomPokemon.bind(pokemonApi);

// Export service object
export const pokemonApiService = pokemonApi;

// Default export
export default pokemonApi;
