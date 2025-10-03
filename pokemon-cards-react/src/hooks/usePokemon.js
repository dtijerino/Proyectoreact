// Custom hook para manejar el estado de Pokémon
import { useState, useEffect, useCallback } from 'react';
import pokemonController from '../controllers/PokemonController.js';

export const usePokemon = () => {
  const [pokemonList, setPokemonList] = useState([]);
  const [filteredList, setFilteredList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [sortBy, setSortBy] = useState('id');
  const [sortOrder, setSortOrder] = useState('asc');
  const [stats, setStats] = useState({});

  // Cargar lista inicial de Pokémon
  const loadPokemon = useCallback(async (limit = 151) => {
    try {
      setLoading(true);
      setError(null);
      
      const pokemon = await pokemonController.fetchPokemonList(limit);
      setPokemonList(pokemon);
      setFilteredList(pokemon);
      setStats(pokemonController.getListStats());
    } catch (err) {
      setError(err.message);
      console.error('Error loading Pokemon:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Buscar Pokémon
  const searchPokemon = useCallback(async (query) => {
    try {
      setLoading(true);
      setError(null);
      setSearchTerm(query);

      const results = await pokemonController.searchPokemon(query);
      setFilteredList(results);
      setStats(pokemonController.getListStats());
    } catch (err) {
      setError(err.message);
      console.error('Error searching Pokemon:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Filtrar por tipo
  const filterByType = useCallback(async (type) => {
    try {
      setLoading(true);
      setError(null);
      setSelectedType(type);

      const results = await pokemonController.filterByType(type);
      setFilteredList(results);
      setStats(pokemonController.getListStats());
    } catch (err) {
      setError(err.message);
      console.error('Error filtering Pokemon:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Ordenar lista
  const sortPokemon = useCallback((criteria, order) => {
    try {
      setSortBy(criteria);
      setSortOrder(order);

      const sorted = pokemonController.sortPokemonList(criteria, order);
      setFilteredList(sorted);
      setStats(pokemonController.getListStats());
    } catch (err) {
      setError(err.message);
      console.error('Error sorting Pokemon:', err);
    }
  }, []);

  // Obtener Pokémon aleatorio
  const getRandomPokemon = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const randomPokemon = await pokemonController.getRandomPokemon();
      return randomPokemon;
    } catch (err) {
      setError(err.message);
      console.error('Error getting random Pokemon:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Reproducir sonido de Pokémon
  const playSound = useCallback(async (pokemon) => {
    try {
      await pokemonController.playPokemonSound(pokemon);
    } catch (err) {
      console.warn('Could not play sound:', err);
    }
  }, []);

  // Limpiar filtros
  const clearFilters = useCallback(() => {
    const clearedList = pokemonController.clearFilters();
    setFilteredList(clearedList);
    setSearchTerm('');
    setSelectedType('all');
    setSortBy('id');
    setSortOrder('asc');
    setStats(pokemonController.getListStats());
  }, []);

  // Obtener detalles de Pokémon
  const getPokemonDetails = useCallback(async (idOrName) => {
    try {
      return await pokemonController.getPokemonDetails(idOrName);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  // Obtener todos los tipos
  const getAllTypes = useCallback(async () => {
    try {
      return await pokemonController.getAllTypes();
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  // Limpiar caché
  const clearCache = useCallback(() => {
    pokemonController.clearCache();
    setStats(pokemonController.getListStats());
  }, []);

  // Event listeners para el controlador
  useEffect(() => {
    const handleLoadingStart = () => setLoading(true);
    const handleLoadingEnd = ({ success, error: loadError }) => {
      setLoading(false);
      if (!success && loadError) {
        setError(loadError);
      }
    };
    const handleSearchComplete = () => setLoading(false);
    const handleError = ({ error: errorMsg }) => {
      setError(errorMsg);
      setLoading(false);
    };

    // Registrar event listeners
    pokemonController.addEventListener('loadingStart', handleLoadingStart);
    pokemonController.addEventListener('loadingEnd', handleLoadingEnd);
    pokemonController.addEventListener('searchComplete', handleSearchComplete);
    pokemonController.addEventListener('searchError', handleError);
    pokemonController.addEventListener('filterError', handleError);
    pokemonController.addEventListener('randomError', handleError);

    // Cleanup
    return () => {
      pokemonController.removeEventListener('loadingStart', handleLoadingStart);
      pokemonController.removeEventListener('loadingEnd', handleLoadingEnd);
      pokemonController.removeEventListener('searchComplete', handleSearchComplete);
      pokemonController.removeEventListener('searchError', handleError);
      pokemonController.removeEventListener('filterError', handleError);
      pokemonController.removeEventListener('randomError', handleError);
    };
  }, []);

  // Cargar Pokémon inicial al montar el componente
  useEffect(() => {
    if (pokemonList.length === 0) {
      loadPokemon();
    }
  }, [loadPokemon, pokemonList.length]);

  return {
    // State
    pokemonList,
    filteredList,
    loading,
    error,
    searchTerm,
    selectedType,
    sortBy,
    sortOrder,
    stats,

    // Actions
    loadPokemon,
    searchPokemon,
    filterByType,
    sortPokemon,
    getRandomPokemon,
    playSound,
    clearFilters,
    getPokemonDetails,
    getAllTypes,
    clearCache,

    // Computed values
    isEmpty: filteredList.length === 0,
    hasError: error !== null,
    isFiltered: searchTerm !== '' || selectedType !== 'all',
    totalCount: pokemonList.length,
    filteredCount: filteredList.length
  };
};
