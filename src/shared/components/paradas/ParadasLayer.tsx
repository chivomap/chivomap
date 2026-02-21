import React, { useEffect } from 'react';
import { Marker } from 'react-map-gl/maplibre';
import { useMap } from 'react-map-gl/maplibre';
import { useParadasStore } from '../../store/paradasStore';
import { useRutasStore } from '../../store/rutasStore';
import { useMapFocus } from '../../../hooks/useMapFocus';

export const ParadasLayer: React.FC = () => {
  const { current: map } = useMap();
  const { nearbyParadas, paradasByRuta, showParadasOnMap, selectedParada, setSelectedParada } = useParadasStore();
  const { selectedRouteDirection } = useRutasStore();
  const { focusPoint } = useMapFocus();

  // Centrar mapa cuando se selecciona una parada
  useEffect(() => {
    if (selectedParada) {
      focusPoint(
        { lat: selectedParada.latitud, lng: selectedParada.longitud },
        { zoom: 16, sheetWillBeHalf: true }
      );
    }
  }, [selectedParada, focusPoint]);

  // Obtener zoom actual
  const zoom = map?.getZoom() || 14;
  
  // Ocultar paradas si zoom < 13 (aproximadamente 2km de vista)
  const shouldShowParadas = zoom >= 13;

  const filteredParadasByRuta = selectedRouteDirection
    ? paradasByRuta.filter((parada) => parada.codigo === (selectedRouteDirection === 'IDA' ? 'I' : 'R'))
    : paradasByRuta;

  // Combinar paradas cercanas y paradas de ruta seleccionada (con validación null)
  const allParadas = [...(nearbyParadas || [])];
  
  // Agregar paradas de ruta si no están ya en nearbyParadas
  if (filteredParadasByRuta) {
    filteredParadasByRuta.forEach(parada => {
      if (!allParadas.find(p => p.fid === parada.fid)) {
        allParadas.push(parada);
      }
    });
  }

  if (!showParadasOnMap || allParadas.length === 0 || !shouldShowParadas) return null;

  return (
    <>
      {allParadas.map((parada) => {
        const isSelected = selectedParada?.fid === parada.fid;
        
        return (
        <Marker
          key={parada.fid}
          longitude={parada.longitud}
          latitude={parada.latitud}
          anchor="bottom"
          onClick={(e) => {
            e.originalEvent.stopPropagation();
            setSelectedParada(parada);
          }}
        >
          <div className="relative group cursor-pointer">
            {/* Parada marker */}
            <svg
              width={isSelected ? "32" : "24"}
              height={isSelected ? "32" : "24"}
              viewBox="0 0 24 24"
              fill="none"
              className={`drop-shadow-lg transition-all ${isSelected ? 'scale-125' : 'group-hover:scale-110'}`}
            >
              {/* Circle background */}
              <circle cx="12" cy="12" r="10" fill={isSelected ? "#f59e0b" : "#3b82f6"} opacity="0.9" />
              <circle cx="12" cy="12" r="8" fill="white" />
              
              {/* Bus stop icon */}
              <rect x="8" y="7" width="8" height="10" rx="1" fill={isSelected ? "#f59e0b" : "#3b82f6"} />
              <rect x="9" y="9" width="2" height="2" fill="white" />
              <rect x="13" y="9" width="2" height="2" fill="white" />
              <rect x="9" y="13" width="6" height="2" fill="white" />
            </svg>
            
            {/* Hover tooltip */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-blue-600 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              Parada
            </div>
          </div>
        </Marker>
        );
      })}
    </>
  );
};
