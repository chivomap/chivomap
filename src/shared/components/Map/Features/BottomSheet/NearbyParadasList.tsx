import React from 'react';
import { useParadasStore } from '../../../../store/paradasStore';
import { useRutasStore } from '../../../../store/rutasStore';
import { CloseButton } from '../../../ui/CloseButton';
import type { Parada } from '../../../../types/paradas';

export const NearbyParadasList: React.FC = () => {
  const { nearbyParadas, searchLocation, isLoading, setSelectedParada, clearNearbyParadas } = useParadasStore();
  const searchRadius = useRutasStore(state => state.searchRadius);

  if (!searchLocation && (!nearbyParadas || nearbyParadas.length === 0)) return null;

  const paradasCount = nearbyParadas?.length || 0;

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-white text-lg">Paradas cercanas</h3>
          <p className="text-xs text-white/50">
            {paradasCount > 0
              ? `${paradasCount} ${paradasCount === 1 ? 'parada encontrada' : 'paradas encontradas'}`
              : 'No se encontraron paradas en esta área'}
          </p>
        </div>
        <CloseButton onClick={clearNearbyParadas} title="Limpiar" />
      </div>

      {searchLocation && (
        <div className="text-xs text-white/60">
          Radio de búsqueda: <span className="text-white font-medium">{searchRadius.toFixed(1)} km</span>
        </div>
      )}

      {isLoading && (
        <div className="text-center py-4 text-white/60">
          Buscando paradas...
        </div>
      )}

      {nearbyParadas && nearbyParadas.length > 0 && (
        <div className="space-y-2 pr-1 max-h-[300px] sm:max-h-[400px] overflow-y-auto custom-scrollbar">
          {nearbyParadas.map((parada) => (
            <ParadaCard key={parada.fid} parada={parada} onSelect={setSelectedParada} />
          ))}
        </div>
      )}
    </div>
  );
};

const ParadaCard: React.FC<{ parada: Parada; onSelect: (parada: Parada) => void }> = ({ parada, onSelect }) => (
  <button
    onClick={() => onSelect(parada)}
    className="w-full text-left p-3 bg-white/5 hover:bg-blue-500/10 rounded-lg border border-white/10 hover:border-blue-400/30 transition-all group"
  >
    <div className="flex items-start gap-3">
      <div className="flex-shrink-0 mt-0.5">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-blue-400">
          <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.2" />
          <rect x="8" y="7" width="8" height="10" rx="1" fill="currentColor" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-white text-sm group-hover:text-blue-400 transition-colors leading-snug">
          {parada.nombre}
        </p>
        <div className="flex items-center gap-2 mt-1.5 text-xs">
          <span className="text-white/50">Ruta {parada.ruta}</span>
          <span className="text-white/30">•</span>
          <span className="text-white/50 bg-white/5 px-2 py-0.5 rounded">
            {parada.codigo === 'I' ? 'Ida' : 'Regreso'}
          </span>
        </div>
      </div>
    </div>
  </button>
);
