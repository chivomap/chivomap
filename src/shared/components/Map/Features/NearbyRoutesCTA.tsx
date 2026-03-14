import React, { useState } from 'react';
import { BiBus, BiCurrentLocation, BiDirections } from 'react-icons/bi';
import { MdDirections } from 'react-icons/md';
import { useRutasStore } from '../../../store/rutasStore';
import { useParadasStore } from '../../../store/paradasStore';
import { usePinStore } from '../../../store/pinStore';
import { usePlaceSearchStore } from '../../../store/placeSearchStore';
import { useBottomSheet } from '../../../../hooks/useBottomSheet';
import { useTripPlannerStore } from '../../../store/tripPlannerStore';
import { useCurrentLocation } from '../../../../hooks/useGeolocation';
import { useMapFocus } from '../../../../hooks/useMapFocus';
import { env } from '../../../config/env';

export const NearbyRoutesCTA: React.FC = () => {
  const { fetchNearbyRoutes, nearbyRoutes, clearSelectedRoute } = useRutasStore();
  const { fetchNearbyParadas } = useParadasStore();
  const { pin } = usePinStore();
  const { selectedResult } = usePlaceSearchStore();
  const { openTripPlanner, contentType } = useBottomSheet();
  const { reset, setOrigin, setDestination } = useTripPlannerStore();
  const { getLocation } = useCurrentLocation();
  const { focusPoint } = useMapFocus();
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
      // Pequeño delay para asegurar que el mapa esté listo
      setTimeout(() => {
        focusPoint({ lat: location.lat, lng: location.lng }, { zoom: 14, sheetWillBeHalf: true });
      }, 100);
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

  const handleGetDirections = async () => {
    if (!pin) return;
    
    setIsLoading(true);
    try {
      const location = await getLocation();
      const origin = { lat: location.lat, lng: location.lng, name: 'Tu ubicación' };
      const destination = { 
        lat: pin.lat, 
        lng: pin.lng, 
        name: selectedResult?.name || 'Destino seleccionado' 
      };
      
      setOrigin(origin);
      setDestination(destination);
      
      // Abrir trip planner
      openTripPlanner();
      
      // Esperar a que se monte y ejecutar búsqueda automáticamente
      await new Promise(resolve => setTimeout(resolve, 150));
      
      const { planTrip } = await import('../../../api/trip');
      const plan = await planTrip({ origin, destination });
      
      // Verificar que el planner sigue abierto antes de aplicar resultado
      if (contentType === 'tripPlanner') {
        const { setTripPlan, setSelectedOptionIndex } = useTripPlannerStore.getState();
        setTripPlan(plan);
        setSelectedOptionIndex(plan.options.length > 0 ? 0 : null);
      }
    } catch (error) {
      console.error('Error planning trip:', error);
      alert(error instanceof Error ? error.message : 'Error obteniendo ubicación o planificando ruta');
    } finally {
      setIsLoading(false);
    }
  };

  const showNearby = (!pin || !env.FEATURE_TRIP_PLANNER) && !(nearbyRoutes?.length > 0);
  const showGetDirections = pin && env.FEATURE_TRIP_PLANNER;
  const showTripPlanner = env.FEATURE_TRIP_PLANNER;

  if (!showNearby && !showGetDirections && !showTripPlanner) return null;

  // Determinar botón primario según contexto
  const primaryAction = showGetDirections ? 'directions' : showNearby ? 'nearby' : 'planner';
  
  return (
    <div
      className="fixed bottom-4 left-4 right-4 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 flex flex-row gap-2"
      style={{ zIndex: 50 }}
    >
      {/* Botón primario - estilo CTA grande */}
      {primaryAction === 'directions' && (
        <button
          onClick={handleGetDirections}
          disabled={isLoading}
          className="flex-1 min-w-0 h-12 sm:h-11 bg-secondary text-primary border-2 border-primary/20 px-5 rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all hover:bg-secondary/90 hover:border-primary/30 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <BiCurrentLocation className="text-xl sm:text-lg animate-spin" />
              <span className="text-base sm:text-sm font-medium">Ubicando...</span>
            </>
          ) : (
            <>
              <BiDirections className="text-xl sm:text-lg" />
              <span className="text-base sm:text-sm font-medium">Cómo llegar</span>
            </>
          )}
        </button>
      )}
      
      {primaryAction === 'nearby' && (
        <button
          onClick={handleFindNearby}
          disabled={isLoading}
          className="flex-1 min-w-0 h-12 sm:h-11 bg-secondary text-primary border-2 border-primary/20 px-5 rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all hover:bg-secondary/90 hover:border-primary/30 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <BiCurrentLocation className="text-xl sm:text-lg animate-spin" />
              <span className="text-base sm:text-sm font-medium">Buscando...</span>
            </>
          ) : (
            <>
              <BiBus className="text-xl sm:text-lg" />
              <span className="text-base sm:text-sm font-medium whitespace-nowrap">Rutas cercanas</span>
            </>
          )}
        </button>
      )}
      
      {primaryAction === 'planner' && (
        <button
          onClick={() => {
            reset();
            openTripPlanner();
          }}
          className="flex-1 min-w-0 h-12 sm:h-11 bg-secondary text-primary border-2 border-primary/20 px-5 rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all hover:bg-secondary/90 hover:border-primary/30"
        >
          <MdDirections className="text-xl sm:text-lg" />
          <span className="text-base sm:text-sm font-medium">Planificar viaje</span>
        </button>
      )}

      {/* Botones secundarios - ahora también estilo CTA grande */}
      {primaryAction !== 'nearby' && showNearby && (
        <button
          onClick={handleFindNearby}
          disabled={isLoading}
          title="Rutas cercanas"
          className="flex-1 min-w-0 h-12 sm:h-11 bg-primary backdrop-blur-sm border border-secondary/30 text-secondary px-4 rounded-xl shadow-lg flex items-center justify-center gap-2 text-base sm:text-sm font-medium transition-all hover:border-secondary/50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <BiBus className="text-xl sm:text-lg" />
          <span className="whitespace-nowrap">Rutas cercanas</span>
        </button>
      )}
      
      {primaryAction !== 'planner' && showTripPlanner && (
        <button
          onClick={() => {
            reset();
            openTripPlanner();
          }}
          title="Planificar viaje"
          className="flex-1 min-w-0 h-12 sm:h-11 bg-primary backdrop-blur-sm border border-secondary/30 text-secondary px-4 rounded-xl shadow-lg flex items-center justify-center gap-2 text-base sm:text-sm font-medium transition-all hover:border-secondary/50"
        >
          <MdDirections className="text-xl sm:text-lg" />
          <span>Planificar viaje</span>
        </button>
      )}
    </div>
  );
};
