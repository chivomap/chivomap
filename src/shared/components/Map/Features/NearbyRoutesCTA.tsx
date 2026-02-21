import React, { useState } from 'react';
import { BiBus, BiCurrentLocation } from 'react-icons/bi';
import { MdDirections } from 'react-icons/md';
import { useRutasStore } from '../../../store/rutasStore';
import { useParadasStore } from '../../../store/paradasStore';
import { useMapStore } from '../../../store/mapStore';
import { useBottomSheet } from '../../../../hooks/useBottomSheet';
import { useTripPlannerStore } from '../../../store/tripPlannerStore';
import { useCurrentLocation } from '../../../../hooks/useGeolocation';
import { env } from '../../../config/env';

export const NearbyRoutesCTA: React.FC = () => {
  const { fetchNearbyRoutes, nearbyRoutes, clearSelectedRoute } = useRutasStore();
  const { fetchNearbyParadas } = useParadasStore();
  const { updateConfig } = useMapStore();
  const { openTripPlanner } = useBottomSheet();
  const { reset } = useTripPlannerStore();
  const { getLocation } = useCurrentLocation();
  const [isLoading, setIsLoading] = useState(false);

  const handleFindNearby = async () => {
    const startTime = Date.now();
    console.log(`[${new Date().toISOString()}] 🚌 CTA "Buscar rutas cercanas" clicked`);
    
    clearSelectedRoute();
    setIsLoading(true);
    
    try {
      console.log(`[${new Date().toISOString()}] 📡 Requesting geolocation...`);
      const location = await getLocation();
      
      const geoTime = Date.now();
      console.log(`[${new Date().toISOString()}] ✅ Location received (took ${geoTime - startTime}ms):`, location);
      
      console.log(`[${new Date().toISOString()}] 🗺️ Updating map center...`);
      updateConfig({ center: { lat: location.lat, lng: location.lng }, zoom: 14 });
      const mapTime = Date.now();
      console.log(`[${new Date().toISOString()}] ✅ Map updated (took ${mapTime - geoTime}ms)`);
      
      console.log(`[${new Date().toISOString()}] 🔍 Fetching routes and paradas in parallel...`);
      await Promise.all([
        fetchNearbyRoutes(location.lat, location.lng),
        fetchNearbyParadas(location.lat, location.lng)
      ]);
      
      const totalTime = Date.now();
      console.log(`[${new Date().toISOString()}] ⏱️ Total time: ${totalTime - startTime}ms`);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ Error (took ${Date.now() - startTime}ms):`, error);
      alert(error instanceof Error ? error.message : 'Error obteniendo ubicación');
    } finally {
      setIsLoading(false);
    }
  };

  const showNearbyCTA = !(nearbyRoutes && nearbyRoutes.length > 0);
  const showTripPlannerCTA = env.FEATURE_TRIP_PLANNER;

  if (!showNearbyCTA && !showTripPlannerCTA) return null;

  return (
    <div
      className="fixed bottom-4 left-1/2 -translate-x-1/2 flex flex-col sm:flex-row gap-2"
      style={{ zIndex: 50 }}
    >
      {showNearbyCTA && (
        <button
          onClick={handleFindNearby}
          disabled={isLoading}
          className="bg-primary backdrop-blur-sm border border-secondary/30 text-secondary px-5 py-2.5 rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all hover:border-secondary/50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <BiCurrentLocation className="text-lg animate-spin" />
              <span className="text-sm font-medium">Buscando...</span>
            </>
          ) : (
            <>
              <BiBus className="text-lg" />
              <span className="text-sm font-medium">Rutas cercanas</span>
            </>
          )}
        </button>
      )}
      {showTripPlannerCTA && (
        <button
          onClick={() => {
            reset();
            openTripPlanner();
          }}
          className="bg-secondary text-primary px-5 py-2.5 rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all hover:bg-secondary/90"
        >
          <MdDirections className="text-lg" />
          <span className="text-sm font-medium">Planificar viaje</span>
        </button>
      )}
    </div>
  );
};
