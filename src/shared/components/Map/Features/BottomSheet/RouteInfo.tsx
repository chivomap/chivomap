import React, { useEffect, useRef } from 'react';
import { BiMap, BiRuler, BiRightArrowAlt, BiX, BiBus } from 'react-icons/bi';
import { useRutasStore } from '../../../../store/rutasStore';
import { useParadasStore } from '../../../../store/paradasStore';
import { useMapStore } from '../../../../store/mapStore';
import { RouteCodeBadge } from '../../../rutas/RouteCodeBadge';
import type { RutaFeature } from '../../../../types/rutas';
import * as turf from '@turf/turf';

interface RouteInfoProps {
  route: RutaFeature;
}

export const RouteInfo: React.FC<RouteInfoProps> = React.memo(({ route }) => {
  const clearSelectedRoute = useRutasStore(state => state.clearSelectedRoute);
  const paradasByRuta = useParadasStore(state => state.paradasByRuta);
  const setSelectedParada = useParadasStore(state => state.setSelectedParada);
  const { saveViewport, restoreViewport, updateConfig } = useMapStore();
  const props = route.properties;
  const hasZoomedRef = useRef(false);

  // Centrar mapa en la ruta cuando se monta el componente
  useEffect(() => {
    if (route && !hasZoomedRef.current) {
      try {
        const bbox = turf.bbox(route);
        const center = turf.center(turf.bboxPolygon(bbox));
        const [lng, lat] = center.geometry.coordinates;
        
        updateConfig({
          center: { lat, lng },
          zoom: 13
        });
        hasZoomedRef.current = true;
      } catch (error) {
        console.error('Error centering route:', error);
      }
    }
  }, [route, updateConfig]);

  const handleClose = () => {
    clearSelectedRoute();
    restoreViewport();
  };

  const handleParadaClick = (parada: any) => {
    saveViewport();
    setSelectedParada(parada);
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 p-4 space-y-3">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <RouteCodeBadge code={props.Nombre_de_} subtipo={props.SUBTIPO} />
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-lg leading-tight text-white truncate">
              Ruta {props.Nombre_de_}
            </h3>
            <p className="text-xs text-white/50">
              {props.TIPO === 'POR AUTOBUS' ? 'Autobús' : 'Microbús'}
            </p>
          </div>
        </div>
        <button
          onClick={handleClose}
          className="p-1.5 hover:bg-red-500/10 rounded-lg transition-colors text-red-400 hover:text-red-300"
          title="Cerrar"
        >
          <BiX className="text-2xl" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 flex items-center gap-2 text-sm bg-white/5 p-2 rounded-lg border border-white/5">
          <BiBus className="text-secondary text-lg flex-shrink-0" />
          <span className="text-white/80 font-medium">{props.SUBTIPO}</span>
        </div>

        <div className="flex items-center gap-2 text-sm bg-white/5 p-2 rounded-lg border border-white/5">
          <BiRuler className="text-secondary text-lg flex-shrink-0" />
          <span className="text-white/80">{parseFloat(props.Kilómetro).toFixed(1)} km</span>
        </div>
        
        <div className="flex items-center gap-2 text-sm bg-white/5 p-2 rounded-lg border border-white/5">
          <BiMap className="text-secondary text-lg flex-shrink-0" />
          <span className="text-white/80 truncate" title={props.DEPARTAMEN}>{props.DEPARTAMEN}</span>
        </div>

        <div className="col-span-2 flex items-center gap-2 text-sm bg-white/5 p-2 rounded-lg border border-white/5">
          <BiRightArrowAlt className="text-secondary text-lg flex-shrink-0" />
          <span className="text-white/80 text-xs break-words leading-tight" title={props.SENTIDO}>
            {props.SENTIDO}
          </span>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-white/30 px-1">
        <span>Código: <span className="font-mono">{props.Código_de}</span></span>
        <span>ID: {props.CANTIDAD_D}</span>
      </div>

      {paradasByRuta.length > 0 && (
        <div className="mt-4 pt-4 border-t border-white/10 space-y-3">
          <h4 className="font-semibold text-white text-sm flex items-center justify-between">
            <span className="flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-blue-400">
                <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.2" />
                <rect x="8" y="7" width="8" height="10" rx="1" fill="currentColor" />
              </svg>
              Paradas de esta ruta
            </span>
            <span className="text-xs text-white/50 font-normal">{paradasByRuta.length}</span>
          </h4>
          <div className="space-y-1.5 max-h-[300px] sm:max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
            {paradasByRuta.map((parada, idx) => (
              <button
                key={`${parada.fid}-${idx}`}
                onClick={() => handleParadaClick(parada)}
                className="w-full text-left p-3 bg-white/5 hover:bg-blue-500/10 rounded-lg border border-white/10 hover:border-blue-400/30 transition-all group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-white/80 text-sm group-hover:text-blue-400 transition-colors leading-snug">
                      {parada.nombre}
                    </p>
                    <p className="text-xs text-white/40 mt-1">
                      {parada.departamento}
                    </p>
                  </div>
                  <span className="text-xs text-white/50 bg-white/5 px-2 py-1 rounded flex-shrink-0">
                    {parada.codigo === 'I' ? 'Ida' : 'Regreso'}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

RouteInfo.displayName = 'RouteInfo';
