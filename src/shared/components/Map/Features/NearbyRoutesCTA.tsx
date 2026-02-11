import React, { useState } from 'react';
import { BiBus, BiCurrentLocation } from 'react-icons/bi';
import { useRutasStore } from '../../../store/rutasStore';
import { useParadasStore } from '../../../store/paradasStore';
import { useMapStore } from '../../../store/mapStore';

export const NearbyRoutesCTA: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { fetchNearbyRoutes, nearbyRoutes, clearSelectedRoute } = useRutasStore();
  const { fetchNearbyParadas } = useParadasStore();
  const { updateConfig } = useMapStore();

  const handleFindNearby = () => {
    const startTime = Date.now();
    console.log(`[${new Date().toISOString()}] 🚌 CTA "Buscar rutas cercanas" clicked`);
    
    if ('geolocation' in navigator) {
      setIsLoading(true);
      clearSelectedRoute();
      
      console.log(`[${new Date().toISOString()}] 📡 Requesting geolocation...`);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const geoTime = Date.now();
          const { latitude, longitude } = position.coords;
          console.log(`[${new Date().toISOString()}] ✅ Location received (took ${geoTime - startTime}ms):`, { lat: latitude, lng: longitude });
          
          console.log(`[${new Date().toISOString()}] 🗺️ Updating map center...`);
          updateConfig({ center: { lat: latitude, lng: longitude }, zoom: 14 });
          const mapTime = Date.now();
          console.log(`[${new Date().toISOString()}] ✅ Map updated (took ${mapTime - geoTime}ms)`);
          
          console.log(`[${new Date().toISOString()}] 🔍 Fetching routes and paradas in parallel...`);
          Promise.all([
            fetchNearbyRoutes(latitude, longitude), // Sin radio = búsqueda automática
            fetchNearbyParadas(latitude, longitude) // Sin radio = búsqueda automática
          ]).finally(() => {
            const totalTime = Date.now();
            console.log(`[${new Date().toISOString()}] ⏱️ Total time: ${totalTime - startTime}ms`);
            setIsLoading(false);
          });
        },
        (error) => {
          console.error(`[${new Date().toISOString()}] ❌ Location error (took ${Date.now() - startTime}ms):`, error);
          setIsLoading(false);
          alert('No se pudo obtener tu ubicación. Verifica los permisos.');
        },
        {
          enableHighAccuracy: false,
          timeout: 5000,  // Reducido de 10s a 5s
          maximumAge: 30000  // Acepta ubicación de hasta 30s
        }
      );
    }
  };

  // Hide if already showing nearby routes
  if (nearbyRoutes && nearbyRoutes.length > 0) return null;

  return (
    <button
      onClick={handleFindNearby}
      disabled={isLoading}
      className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-primary backdrop-blur-sm border border-secondary/30 text-secondary px-5 py-2.5 rounded-xl shadow-lg flex items-center gap-2 transition-all hover:border-secondary/50 disabled:opacity-50 disabled:cursor-not-allowed"
      style={{ zIndex: 50 }}
    >
      {isLoading ? (
        <>
          <BiCurrentLocation className="text-lg animate-spin" />
          <span className="text-sm font-medium">Buscando...</span>
        </>
      ) : (
        <>
          <BiBus className="text-lg" />
          <span className="text-sm font-medium">Buscar rutas cercanas</span>
        </>
      )}
    </button>
  );
};
