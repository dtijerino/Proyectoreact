/**
 * Custom React Hook for Pokemon data management
 * Integrates with PokemonController for state management
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { PokemonController } from '../controllers/PokemonController.js';

export function usePokemon() {
  const controllerRef = useRef(null);
  const [state, setState] = useState({
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
    favorites: [],
    filters: {
      minStats: null,
      maxStats: null
    }
  });

  const [notifications, setNotifications] = useState([]);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Initialize controller
  useEffect(() => {
    if (!controllerRef.current) {
      controllerRef.current = new PokemonController();
      
      // Set up event listeners
      const controller = controllerRef.current;
      
      controller.on('stateChanged', ({ current }) => {
        setState(current);
      });

      controller.on('notification', (notification) => {
        addNotification(notification);
      });

      controller.on('soundToggled', (enabled) => {
        setSoundEnabled(enabled);
      });

      controller.on('error', (error) => {
        addNotification({
          type: 'error',
          message: error,
          duration: 5000
        });
      });

      // Load initial data
      controller.loadInitialPokemon();
    }

    return () => {
      // Cleanup listeners when component unmounts
      if (controllerRef.current) {
        controllerRef.current.listeners.clear();
      }
    };
  }, [addNotification]);

  // Notification management
  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const addNotification = useCallback((notification) => {
    const id = Date.now() + Math.random();
    const newNotification = {
      id,
      type: 'info',
      duration: 3000,
      ...notification
    };

    setNotifications(prev => [...prev, newNotification]);

    // Auto-remove notification after duration
    if (newNotification.duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, newNotification.duration);
    }
  }, [removeNotification]);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // Pokemon operations
  const searchPokemon = useCallback(async (query) => {
    if (controllerRef.current) {
      await controllerRef.current.searchPokemon(query);
    }
  }, []);

  const loadMorePokemon = useCallback(async () => {
    if (controllerRef.current) {
      await controllerRef.current.loadMorePokemon();
    }
  }, []);

  const filterByType = useCallback(async (types) => {
    if (controllerRef.current) {
      await controllerRef.current.filterByType(types);
    }
  }, []);

  const setSorting = useCallback((sortBy, sortOrder = 'asc') => {
    if (controllerRef.current) {
      controllerRef.current.setSorting(sortBy, sortOrder);
    }
  }, []);

  const toggleFavorite = useCallback((pokemonId) => {
    if (controllerRef.current) {
      controllerRef.current.toggleFavorite(pokemonId);
    }
  }, []);

  const isFavorite = useCallback((pokemonId) => {
    return controllerRef.current ? controllerRef.current.isFavorite(pokemonId) : false;
  }, []);

  const loadFavoritePokemon = useCallback(async () => {
    if (controllerRef.current) {
      await controllerRef.current.loadFavoritePokemon();
    }
  }, []);

  const getRandomPokemon = useCallback(async (count = 1) => {
    if (controllerRef.current) {
      return await controllerRef.current.getRandomPokemon(count);
    }
    return null;
  }, []);

  const getPokemonById = useCallback(async (id) => {
    if (controllerRef.current) {
      return await controllerRef.current.getPokemonById(id);
    }
    return null;
  }, []);

  const clearSearch = useCallback(() => {
    if (controllerRef.current) {
      controllerRef.current.clearSearch();
    }
  }, []);

  const reset = useCallback(() => {
    if (controllerRef.current) {
      controllerRef.current.reset();
    }
  }, []);

  const toggleSound = useCallback(() => {
    if (controllerRef.current) {
      controllerRef.current.toggleSound();
    }
  }, []);

  const getStats = useCallback(() => {
    return controllerRef.current ? controllerRef.current.getStats() : null;
  }, []);

  // Derived state
  const hasMore = state.currentPage * state.pageSize < state.totalCount;
  const isEmpty = !state.loading && state.pokemon.length === 0;
  const isSearching = state.searchQuery.length > 0 || state.selectedTypes.length > 0;

  // Advanced filtering
  const filteredPokemon = state.pokemon.filter(pokemon => {
    // Apply stat filters
    if (state.filters.minStats && pokemon.getStatTotal() < state.filters.minStats) {
      return false;
    }
    if (state.filters.maxStats && pokemon.getStatTotal() > state.filters.maxStats) {
      return false;
    }
    return true;
  });

  return {
    // State
    pokemon: filteredPokemon,
    allPokemon: state.pokemon,
    loading: state.loading,
    error: state.error,
    searchQuery: state.searchQuery,
    selectedTypes: state.selectedTypes,
    sortBy: state.sortBy,
    sortOrder: state.sortOrder,
    currentPage: state.currentPage,
    pageSize: state.pageSize,
    totalCount: state.totalCount,
    favorites: state.favorites,
    filters: state.filters,
    
    // Derived state
    hasMore,
    isEmpty,
    isSearching,
    
    // Notifications
    notifications,
    
    // Audio
    soundEnabled,
    
    // Actions
    searchPokemon,
    loadMorePokemon,
    filterByType,
    setSorting,
    toggleFavorite,
    isFavorite,
    loadFavoritePokemon,
    getRandomPokemon,
    getPokemonById,
    clearSearch,
    reset,
    toggleSound,
    getStats,
    
    // Notification actions
    addNotification,
    removeNotification,
    clearNotifications,
    
    // Controller access (for advanced usage)
    controller: controllerRef.current
  };
}

export default usePokemon;
