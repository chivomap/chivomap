import React, { useState, useCallback, useEffect } from 'react';
import { BiLoaderAlt } from 'react-icons/bi';
import { useRutasStore } from '../../../../store/rutasStore';
import { useParadasStore } from '../../../../store/paradasStore';
import { useBottomSheetStore } from '../../../../store/bottomSheetStore';
import { RouteCodeBadge } from '../../../rutas/RouteCodeBadge';
import type { RutaNearby } from '../../../../types/rutas';

export const NearbyRoutesList: React.FC = React.memo(() => {
  const nearbyRoutes = useRutasStore(state => state.nearbyRoutes);
  const searchLocation = useRutasStore(state => state.searchLocation);
  const searchRadius = useRutasStore(state => state.searchRadius);
  const isLoading = useRutasStore(state => state.isLoading);
  const selectRoute = useRutasStore(state => state.selectRoute);
  const clearNearbyRoutes = useRutasStore(state => state.clearNearbyRoutes);
  const setRadius = useRutasStore(state => state.setRadius);
  const fetchNearbyRoutes = useRutasStore(state => state.fetchNearbyRoutes);
  const setHoveredRoute = useRutasStore(state => state.setHoveredRoute);
  const overlappingRoutes = useRutasStore(state => state.overlappingRoutes);
  const setOverlappingRoutes = useRutasStore(state => state.setOverlappingRoutes);
  const fetchNearbyParadas = useParadasStore(state => state.fetchNearbyParadas);
  const setSheetState = useBottomSheetStore(state => state.setSheetState);

  const [radiusDebounce, setRadiusDebounce] = useState<ReturnType<typeof setTimeout> | null>(null);

  // Abrir drawer cuando hay rutas solapadas
  useEffect(() => {
    if (overlappingRoutes && overlappingRoutes.length > 1) {
      setSheetState('half');
    }
  }, [overlappingRoutes, setSheetState]);

  const handleRadiusChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newRadius = parseFloat(e.target.value);
    setRadius(newRadius);

    if (radiusDebounce) clearTimeout(radiusDebounce);

    const timeout = setTimeout(() => {
      if (searchLocation) {
        fetchNearbyRoutes(searchLocation.lat, searchLocation.lng, newRadius);
        fetchNearbyParadas(searchLocation.lat, searchLocation.lng, newRadius);
      }
    }, 500);

    setRadiusDebounce(timeout);
  }, [searchLocation, radiusDebounce, setRadius, fetchNearbyRoutes, fetchNearbyParadas]);

  if (!searchLocation && (!nearbyRoutes || nearbyRoutes.length === 0)) return null;

  return (
    <div className="p-4 space-y-3">
      {overlappingRoutes && overlappingRoutes.length > 1 && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 text-sm">
          <div className="font-bold text-yellow-400 mb-2 flex items-center gap-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            Aquí pasan {overlappingRoutes.length} rutas
          </div>
          <div className="text-white/80 mb-3">
            Varias rutas comparten esta ubicación. Selecciona la que necesitas:
          </div>
          <div className="space-y-2">
            {overlappingRoutes.map((codigo) => {
              const ruta = nearbyRoutes.find(r => r.codigo === codigo);
              if (!ruta) return null;
              
              return (
                <button
                  key={codigo}
                  onClick={() => {
                    selectRoute(codigo);
                    setOverlappingRoutes(null);
                  }}
                  className="w-full text-left p-2.5 bg-white/5 hover:bg-secondary/10 rounded-lg border border-white/10 hover:border-secondary/30 transition-all group"
                >
                  <div className="flex items-center gap-2.5">
                    <RouteCodeBadge code={ruta.nombre} subtipo={ruta.subtipo} />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white text-sm group-hover:text-secondary transition-colors">
                        Ruta {ruta.nombre}
                      </p>
                      <div className="text-xs text-white/50 truncate">{ruta.subtipo}</div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          <button
            onClick={() => setOverlappingRoutes(null)}
            className="mt-3 text-xs text-white/60 hover:text-white underline"
          >
            Ver todas las rutas cercanas
          </button>
        </div>
      )}
      
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-white text-lg">Rutas cercanas</h3>
          <p className="text-xs text-white/50">
            {nearbyRoutes && nearbyRoutes.length > 0
              ? `${nearbyRoutes.length} ${nearbyRoutes.length === 1 ? 'ruta encontrada' : 'rutas encontradas'}`
              : 'No se encontraron rutas en esta área'}
          </p>
        </div>
        <button
          onClick={clearNearbyRoutes}
          className="text-xs text-red-400 hover:text-red-300 px-3 py-1.5 hover:bg-red-500/10 rounded-lg transition-colors font-medium"
        >
          Limpiar
        </button>
      </div>

      {searchLocation && (
        <div className="flex items-center gap-2 text-xs">
          <span className="text-white/60">Radio:</span>
          <input
            type="range"
            min="0.005"
            max="5"
            step="0.1"
            value={Math.max(searchRadius, 0.005)}
            onChange={handleRadiusChange}
            className="flex-1 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer slider-thumb"
          />
          <span className="text-secondary font-semibold min-w-[3rem] text-right flex items-center gap-1">
            {isLoading && <BiLoaderAlt className="animate-spin" />}
            {searchRadius.toFixed(1)} km
          </span>
        </div>
      )}

      {nearbyRoutes && nearbyRoutes.length > 0 && (
        <div className="space-y-2 pr-2">
          {nearbyRoutes.map((ruta) => (
            <RouteCard 
              key={ruta.codigo} 
              ruta={ruta} 
              onSelect={selectRoute}
              onHover={setHoveredRoute}
            />
          ))}
        </div>
      )}
    </div>
  );
});

NearbyRoutesList.displayName = 'NearbyRoutesList';

const RouteCard: React.FC<{ 
  ruta: RutaNearby; 
  onSelect: (code: string) => void;
  onHover: (code: string | null) => void;
}> = ({ ruta, onSelect, onHover }) => {
  return (
    <button
      onClick={() => onSelect(ruta.codigo)}
      onMouseEnter={() => onHover(ruta.codigo)}
      onMouseLeave={() => onHover(null)}
      className="w-full text-left p-2.5 bg-white/5 hover:bg-secondary/10 rounded-lg border border-white/10 hover:border-secondary/30 transition-all group"
    >
      <div className="flex items-center gap-2.5">
        <RouteCodeBadge code={ruta.nombre} subtipo={ruta.subtipo} />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-white text-sm group-hover:text-secondary transition-colors">
            Ruta {ruta.nombre}
          </p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="text-xs text-white/50 truncate">{ruta.subtipo}</span>
            {ruta.departamento && (
              <span className="text-xs text-white/40">• {ruta.departamento}</span>
            )}
            <span className="text-xs text-secondary font-medium">
              {ruta.distancia_m < 1000 ? `${Math.round(ruta.distancia_m)}m` : `${(ruta.distancia_m / 1000).toFixed(1)}km`}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
};

RouteCard.displayName = 'RouteCard';
