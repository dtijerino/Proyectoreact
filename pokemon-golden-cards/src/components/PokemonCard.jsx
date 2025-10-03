/**
 * PokemonCard Component - Tarjetas con efectos 3D, giro y sonidos
 * Displays individual Pokemon with flip animation and Spanish data
 */
import { useState, useRef, useEffect } from 'react';
import './PokemonCard.css';
import { pokemonApi } from '../services/pokemonApi.js';

const PokemonCard = ({ 
  pokemon, 
  onFavorite, 
  isFavorite = false, 
  onClick 
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [flipped, setFlipped] = useState(false);
  const cryAudioRef = useRef(null);

  // Imagen mostrada (para alternar evoluciones en hover)
  const [displayImageUrl, setDisplayImageUrl] = useState(pokemon.imageUrl);
  const [evolutionCycle, setEvolutionCycle] = useState({ images: [], ready: false, loading: false });
  const evoIntervalRef = useRef(null);
  const [abilitiesEs, setAbilitiesEs] = useState([]);
  const [sparkling, setSparkling] = useState(false);
  const sparkleTimeoutRef = useRef(null);

  useEffect(() => {
    cryAudioRef.current = new Audio();
    cryAudioRef.current.preload = 'none';
    cryAudioRef.current.volume = 0.6;
    return () => {
      if (cryAudioRef.current) { cryAudioRef.current.pause(); cryAudioRef.current.src = ''; }
      if (evoIntervalRef.current) { clearInterval(evoIntervalRef.current); }
      if (sparkleTimeoutRef.current) { clearTimeout(sparkleTimeoutRef.current); }
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const es = await pokemonApi.getAbilitiesEs(pokemon.abilities || []);
        if (mounted) setAbilitiesEs(es);
      } catch {
        if (mounted) setAbilitiesEs([]);
      }
    })();
    return () => { mounted = false; };
  }, [pokemon.id, pokemon.abilities]);

  const playCry = async () => {
    try {
      const url = pokemon.getCryUrl?.();
      if (!url || !cryAudioRef.current) return;
      if (!cryAudioRef.current.paused) cryAudioRef.current.pause();
      cryAudioRef.current.currentTime = 0;
      cryAudioRef.current.src = url;
      await cryAudioRef.current.play();
    } catch (e) {
      void e; // noop
    }
  };

  // Helpers evoluciones
  const flattenEvolutionChain = (node) => {
    const out = [];
    const dfs = (n) => {
      if (!n) return;
      if (n.species?.name) out.push(n.species.name);
      (n.evolves_to || []).forEach(dfs);
    };
    dfs(node);
    return out;
  };

  const prepareEvolutionImages = async () => {
    if (evolutionCycle.ready && evolutionCycle.images.length > 1) return evolutionCycle.images;
    if (evolutionCycle.loading) return [];
    setEvolutionCycle(prev => ({ ...prev, loading: true }));
    try {
      const chainData = await pokemonApi.getPokemonEvolutionChain(pokemon.id);
      const names = chainData?.chain ? flattenEvolutionChain(chainData.chain) : [];
      // Asegurar que incluimos al actual y quitar duplicados
      const unique = Array.from(new Set([pokemon.name, ...names]));
      const results = await Promise.allSettled(unique.map(name => pokemonApi.getPokemonByName(name)));
      const images = results
        .filter(r => r.status === 'fulfilled')
        .map(r => r.value?.imageUrl)
        .filter(Boolean);
      const ready = images.length > 1;
      setEvolutionCycle({ images, ready, loading: false });
      return images;
    } catch {
      setEvolutionCycle({ images: [], ready: false, loading: false });
      return [];
    }
  };

  const startEvolutionCycle = async () => {
    const imgs = await prepareEvolutionImages();
    if (!imgs || imgs.length <= 1) return;
    let i = 0;
    setDisplayImageUrl(imgs[i]);
    if (evoIntervalRef.current) clearInterval(evoIntervalRef.current);
    evoIntervalRef.current = setInterval(() => {
      i = (i + 1) % imgs.length;
      setDisplayImageUrl(imgs[i]);
    }, 1000);
  };

  const stopEvolutionCycle = () => {
    if (evoIntervalRef.current) clearInterval(evoIntervalRef.current);
    evoIntervalRef.current = null;
    setDisplayImageUrl(pokemon.imageUrl);
  };

  const handleImageLoad = () => setImageLoaded(true);
  const handleImageError = () => { setImageError(true); setImageLoaded(true); };

  const handleFavoriteClick = (e) => {
    e.stopPropagation();
    if (onFavorite) onFavorite(pokemon.id);
  };

  const handleCardClick = () => {
    setFlipped(prev => !prev);
    // Sparkle burst on click
    setSparkling(true);
    if (sparkleTimeoutRef.current) clearTimeout(sparkleTimeoutRef.current);
    sparkleTimeoutRef.current = setTimeout(() => setSparkling(false), 800);
    playCry();
    if (onClick) onClick(pokemon);
  };

  const translateType = (type) => {
    const map = { normal: 'Normal', fire: 'Fuego', water: 'Agua', electric: 'Eléctrico', grass: 'Planta', ice: 'Hielo', fighting: 'Lucha', poison: 'Veneno', ground: 'Tierra', flying: 'Volador', psychic: 'Psíquico', bug: 'Bicho', rock: 'Roca', ghost: 'Fantasma', dragon: 'Dragón', dark: 'Siniestro', steel: 'Acero', fairy: 'Hada' };
    return map[type] || type;
  };
  const translateStat = (k) => { const map = { hp:'Vida', attack:'Ataque', defense:'Defensa', 'special-attack':'At. Esp', 'special-defense':'Def. Esp', speed:'Velocidad' }; return map[k] || k; };
  const formatId = (id) => `#${id.toString().padStart(3, '0')}`;
  const formatHeight = (h) => `${(h / 10).toFixed(1)} m`;
  const formatWeight = (w) => `${(w / 10).toFixed(1)} kg`;
  const getRarityClass = () => `rarity-${pokemon.getRarity()}`;
  const getStatBarWidth = (v) => Math.min((v / 255) * 100, 100);
  const abilityIcon = (name) => {
    if (name.toLowerCase().includes('fuego')) return '🔥';
    if (name.toLowerCase().includes('agua')) return '💧';
    if (name.toLowerCase().includes('eléct') || name.toLowerCase().includes('elect')) return '⚡';
    if (name.toLowerCase().includes('veneno')) return '☠️';
    if (name.toLowerCase().includes('acero')) return '🔩';
    if (name.toLowerCase().includes('hada')) return '✨';
    if (name.toLowerCase().includes('psíqu') || name.toLowerCase().includes('psiqu')) return '🔮';
    if (name.toLowerCase().includes('fant')) return '👻';
    if (name.toLowerCase().includes('roca')) return '🪨';
    if (name.toLowerCase().includes('planta')) return '🌿';
    if (name.toLowerCase().includes('hielo')) return '❄️';
    if (name.toLowerCase().includes('lucha')) return '🥊';
    if (name.toLowerCase().includes('tierra')) return '🌋';
    if (name.toLowerCase().includes('volador')) return '🪽';
    return '⭐';
  };

  // Determinar si la carta es dorada (legendarios o ~5% por id)
  const isGolden = pokemon.getRarity?.() === 'legendary' || ((Number(pokemon.id) + 7) % 20 === 0);

  return (
    <div 
      className={`pokemon-card ${getRarityClass()} ${flipped ? 'flipped' : ''} ${isGolden ? 'golden' : ''}`}
      onClick={handleCardClick}
      style={{ '--primary-color': pokemon.getTypeColor(), '--back-watermark-opacity': 0.35 }}
      role="button"
      data-golden={isGolden ? 'true' : 'false'}
      aria-label={`Carta de ${pokemon.name}. Pulsa para ver más detalles`}
    >
      <div className="pokemon-card-inner">
        <div className="pokemon-card-front">
          <div className="card-header">
            <span className="pokemon-id">{formatId(pokemon.id)}</span>
            {/* Removed visible golden text badge; the card itself will be styled as golden */}
            <button className={`favorite-button ${isFavorite ? 'favorited' : ''}`}
              onClick={handleFavoriteClick}
              aria-label={isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
              title={isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}>
              {isFavorite ? '❤️' : '🤍'}
            </button>
          </div>

          <div className="pokemon-image-container" onMouseEnter={startEvolutionCycle} onMouseLeave={stopEvolutionCycle}>
            {!imageLoaded && !imageError && (
              <div className="image-loading"><div className="loading-spinner"></div></div>
            )}
            {imageError ? (
              <div className="image-placeholder"><span className="placeholder-text">Sin imagen</span></div>
            ) : (
              <img
                src={displayImageUrl}
                alt={pokemon.name}
                className={`pokemon-image ${imageLoaded ? 'loaded' : ''}`}
                onLoad={handleImageLoad}
                onError={handleImageError}
                loading="lazy"
              />
            )}

            <div className="pokemon-types">
              {pokemon.getTypeNames().map(type => (
                <span key={type} className={`type-badge type-${type}`}>{translateType(type)}</span>
              ))}
            </div>
          </div>

          <div className="pokemon-info">
            <h3 className="pokemon-name">{pokemon.name}</h3>
            <div className="pokemon-details">
              <div className="detail-row"><span className="detail-label">Altura:</span><span className="detail-value">{formatHeight(pokemon.height)}</span></div>
              <div className="detail-row"><span className="detail-label">Peso:</span><span className="detail-value">{formatWeight(pokemon.weight)}</span></div>
            </div>

            <div className="pokemon-stats">
              <div className="stats-header"><span>Estadísticas</span><span className="stat-total">{pokemon.getStatTotal()}</span></div>
              <div className="stats-grid">
                {pokemon.stats.slice(0, 6).map((stat, i) => (
                  <div key={i} className="stat-item">
                    <div className="stat-info"><span className="stat-name">{translateStat(stat.stat.name)}</span><span className="stat-value">{stat.base_stat}</span></div>
                    <div className="stat-bar"><div className="stat-fill" style={{ width: `${getStatBarWidth(stat.base_stat)}%` }}></div></div>
                  </div>
                ))}
              </div>
            </div>
            {/* Habilidades en el frente eliminadas para moverlas al reverso */}
          </div>
        </div>

        <div className="pokemon-card-back">
          <div className="holo-bg"></div>
          <div className="back-content">
            <div className="back-header"><h3 className="back-title">{pokemon.name}</h3><span className="back-id">{formatId(pokemon.id)}</span></div>
            <div className="back-panel">
              <div className="back-row"><span className="back-label">Altura</span><span className="back-value">{formatHeight(pokemon.height)}</span></div>
              <div className="back-row"><span className="back-label">Peso</span><span className="back-value">{formatWeight(pokemon.weight)}</span></div>
              <div className="back-row"><span className="back-label">Total de estadísticas</span><span className="back-value">{pokemon.getStatTotal()}</span></div>
            </div>

            <div className="back-abilities">
              <div className="back-abilities-title">Habilidades</div>
              <div className="abilities-list scrollable">
                {(abilitiesEs.length ? abilitiesEs : pokemon.getAbilityNames()).map((ability, idx) => (
                  <span key={idx} className="ability-badge">
                    {abilityIcon(ability)} {ability}
                  </span>
                ))}
              </div>
            </div>

            <div className="back-types">
              {pokemon.getTypeNames().map(type => (
                <span key={type} className={`type-badge type-${type}`}>{translateType(type)}</span>
              ))}
            </div>
            <div className="back-actions"><button className="cry-button" onClick={(e) => { e.stopPropagation(); playCry(); }}>🔊 Reproducir grito</button></div>
          </div>
        </div>
      </div>
      {/* Sparkle overlay for click burst (only for golden cards) */}
      {isGolden && (
        <div className={`sparkle-layer ${sparkling ? 'active' : ''}`} aria-hidden="true" role="presentation">
          {Array.from({ length: 14 }).map((_, i) => (
            <span key={i} style={{ '--angle': `${(i * 360) / 14}deg` }} />
          ))}
        </div>
      )}
    </div>
  );
};

export default PokemonCard;
