import { useState } from 'react';
import './PackOpener.css';
import { pokemonApi } from '../services/pokemonApi.js';

const PackOpener = ({ onAddToBoard, packSize = 5 }) => {
  const [isOpening, setIsOpening] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [pulled, setPulled] = useState([]);
  const [error, setError] = useState(null);

  const playChime = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.type = 'triangle';
      o.frequency.setValueAtTime(660, ctx.currentTime);
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.01);
      o.start();
      o.frequency.exponentialRampToValueAtTime(990, ctx.currentTime + 0.25);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
      o.stop(ctx.currentTime + 0.36);
    } catch {
      // ignore
    }
  };

  const openPack = async () => {
    if (isOpening) return;
    setIsOpening(true);
    setError(null);
    try {
      // Espera breve para que se vea la animación
      const delay = (ms) => new Promise(r => setTimeout(r, ms));
      await delay(300);
      const results = await pokemonApi.getRandomPokemon(packSize);
      setPulled(results);
      playChime();
      // Mostrar modal tras animación
      await delay(800);
      setShowModal(true);
    } catch {
      setError('No se pudo abrir el sobre. Intenta de nuevo.');
    } finally {
      setIsOpening(false);
    }
  };

  const handleAdd = () => {
    if (onAddToBoard) onAddToBoard(pulled);
    setShowModal(false);
  };

  return (
    <div className="pack-opener">
      <div className={`pack-card ${isOpening ? 'opening' : ''}`} onClick={openPack} role="button" aria-label="Abrir sobre de cartas">
        <div className="pack-shine" />
        <div className="pack-label">Sobre Dorado</div>
        <div className="pack-sub">Haz clic para abrir {packSize}</div>
      </div>

      {isOpening && (
        <div className="pack-confetti" aria-hidden="true">
          {Array.from({ length: 24 }).map((_, i) => (
            <span key={i} className={`confetti c${(i % 6) + 1}`} />
          ))}
        </div>
      )}

      {showModal && (
        <div className="pack-modal" role="dialog" aria-modal="true">
          <div className="pack-modal-backdrop" onClick={() => setShowModal(false)} />
          <div className="pack-modal-content">
            <h3>¡Cartas obtenidas!</h3>
            {error && <div className="pack-error">{error}</div>}
            <div className="pack-results">
              {pulled.map(p => (
                <div key={p.id} className="pack-result-card">
                  <img src={p.imageUrl} alt={p.name} />
                  <div className="pack-result-name">{p.name}</div>
                </div>
              ))}
            </div>
            <div className="pack-actions">
              <button className="pack-btn" onClick={() => setShowModal(false)}>Cerrar</button>
              <button className="pack-btn primary" onClick={handleAdd}>Añadir al tablero</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PackOpener;
