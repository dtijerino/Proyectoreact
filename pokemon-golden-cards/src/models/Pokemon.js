/**
 * Pokemon Model Class
 * Implements SOLID principles and OWASP security guidelines
 */
export class Pokemon {
  constructor(data = {}) {
    this.validateAndSet(data);
  }

  validateAndSet(data) {
    // Input validation following OWASP guidelines
    this.id = this.validateNumber(data.id, 'ID');
    this.name = this.validateString(data.name, 'Name');
    this.height = this.validateNumber(data.height, 'Height', false);
    this.weight = this.validateNumber(data.weight, 'Weight', false);
    this.base_experience = this.validateNumber(data.base_experience, 'Base Experience', false);
    
    this.types = this.validateArray(data.types, 'Types');
    this.abilities = this.validateArray(data.abilities, 'Abilities');
    this.stats = this.validateArray(data.stats, 'Stats');
    this.sprites = this.validateObject(data.sprites, 'Sprites');
    this.cries = this.validateObject(data.cries, 'Cries', false);
    
    // Additional computed properties
    this.imageUrl = this.getImageUrl();
    this.typeNames = this.getTypeNames();
    this.abilityNames = this.getAbilityNames();
    this.primaryType = this.getPrimaryType();
    this.statTotal = this.getStatTotal();
  }

  validateString(value, fieldName, required = true) {
    if (required && (!value || typeof value !== 'string' || value.trim() === '')) {
      throw new Error(`${fieldName} is required and must be a non-empty string`);
    }
    return typeof value === 'string' ? value.trim() : '';
  }

  validateNumber(value, fieldName, required = true) {
    if (required && (value === null || value === undefined || isNaN(value))) {
      throw new Error(`${fieldName} is required and must be a valid number`);
    }
    return Number(value) || 0;
  }

  validateArray(value, fieldName, required = false) {
    if (required && (!Array.isArray(value) || value.length === 0)) {
      throw new Error(`${fieldName} is required and must be a non-empty array`);
    }
    return Array.isArray(value) ? value : [];
  }

  validateObject(value, fieldName, required = false) {
    if (required && (!value || typeof value !== 'object' || Array.isArray(value))) {
      throw new Error(`${fieldName} is required and must be an object`);
    }
    return (value && typeof value === 'object' && !Array.isArray(value)) ? value : {};
  }

  getImageUrl() {
    if (this.sprites?.other?.['official-artwork']?.front_default) {
      return this.sprites.other['official-artwork'].front_default;
    }
    if (this.sprites?.other?.dream_world?.front_default) {
      return this.sprites.other.dream_world.front_default;
    }
    if (this.sprites?.front_default) {
      return this.sprites.front_default;
    }
    return '/placeholder-pokemon.png';
  }

  getCryUrl() {
    if (this.cries && (this.cries.latest || this.cries.legacy)) {
      return this.cries.latest || this.cries.legacy;
    }
    // Fallback repo with cries by ID
    return `https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/latest/${this.id}.ogg`;
  }

  getTypeNames() {
    return this.types.map(type => 
      typeof type === 'object' && type.type ? type.type.name : type
    ).filter(Boolean);
  }

  getAbilityNames() {
    return this.abilities.map(ability => 
      typeof ability === 'object' && ability.ability ? ability.ability.name : ability
    ).filter(Boolean);
  }

  getPrimaryType() {
    return this.typeNames[0] || 'unknown';
  }

  getStatTotal() {
    return this.stats.reduce((total, stat) => {
      const value = typeof stat === 'object' && stat.base_stat ? stat.base_stat : 0;
      return total + value;
    }, 0);
  }

  getStatByName(statName) {
    const stat = this.stats.find(s => 
      typeof s === 'object' && s.stat && s.stat.name === statName
    );
    return stat ? stat.base_stat : 0;
  }

  // Utility methods
  isShiny() {
    return Math.random() < 0.001; // 0.1% chance for shiny
  }

  getRarity() {
    const total = this.statTotal;
    if (total >= 600) return 'legendary';
    if (total >= 500) return 'rare';
    if (total >= 400) return 'uncommon';
    return 'common';
  }

  getTypeColor() {
    const typeColors = {
      normal: '#A8A878',
      fire: '#F08030',
      water: '#6890F0',
      electric: '#F8D030',
      grass: '#78C850',
      ice: '#98D8D8',
      fighting: '#C03028',
      poison: '#A040A0',
      ground: '#E0C068',
      flying: '#A890F0',
      psychic: '#F85888',
      bug: '#A8B820',
      rock: '#B8A038',
      ghost: '#705898',
      dragon: '#7038F8',
      dark: '#705848',
      steel: '#B8B8D0',
      fairy: '#EE99AC'
    };
    return typeColors[this.primaryType] || '#68A090';
  }

  // Serialization methods
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      height: this.height,
      weight: this.weight,
      base_experience: this.base_experience,
      types: this.types,
      abilities: this.abilities,
      stats: this.stats,
      sprites: this.sprites,
      cries: this.cries,
      imageUrl: this.imageUrl,
      typeNames: this.typeNames,
      abilityNames: this.abilityNames,
      primaryType: this.primaryType,
      statTotal: this.statTotal
    };
  }

  static fromAPI(apiData) {
    try {
      return new Pokemon(apiData);
    } catch (error) {
      console.error('Error creating Pokemon from API data:', error);
      throw error;
    }
  }
}

export default Pokemon;
