import React from 'react';
import { Marker } from 'react-map-gl/maplibre';
import { useGeolocation } from '../../../../hooks/useGeolocation';

export const UserLocationMarker: React.FC = () => {
  const { location, permissionState } = useGeolocation({
    watch: true,
    enableHighAccuracy: false,
    timeout: 10000,
    maximumAge: 30000,
  });

  // Solo mostrar si hay ubicación y permisos concedidos
  if (!location || permissionState !== 'granted') return null;

  return (
    <Marker
      longitude={location.lng}
      latitude={location.lat}
      anchor="center"
    >
      <div className="relative">
        {/* Pulso exterior */}
        <div className="absolute inset-0 -m-3">
          <div className="w-12 h-12 bg-purple-500/30 rounded-full animate-ping" />
        </div>
        
        {/* Círculo exterior */}
        <div className="relative w-6 h-6 bg-purple-500/20 rounded-full flex items-center justify-center">
          {/* Punto central */}
          <div className="w-3 h-3 bg-purple-500 rounded-full border-2 border-white shadow-lg" />
        </div>
      </div>
    </Marker>
  );
};
