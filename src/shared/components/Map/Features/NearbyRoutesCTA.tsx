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
      setOrigin({ lat: location.lat, lng: location.lng, name: 'Tu ubicación' });
      setDestination({ 
        lat: pin.lat, 
        lng: pin.lng, 
        name: selectedResult?.name || 'Destino seleccionado' 
      });
      
      // Abrir trip planner y esperar a que se monte
      openTripPlanner();
      
      // Ejecutar búsqueda automáticamente
      await new Promise(resolve => setTimeout(resolve, 100));
      
      try {
        const { planTrip } = await import('../../../api/trip');
        const plan = await planTrip({ 
          origin: { lat: location.lat, lng: location.lng, name: 'Tu ubicación' },
          destination: { lat: pin.lat, lng: pin.lng, name: selectedResult?.name || 'Destino seleccionado' }
        });
        
        // Verificar que el planner sigue abierto antes de aplicar resultado
        if (contentType === 'tripPlanner') {
          const { setTripPlan, setSelectedOptionIndex } = useTripPlannerStore.getState();
          setTripPlan(plan);
          setSelectedOptionIndex(plan.options.length > 0 ? 0 : null);
        }
      } catch (error) {
        console.error('Error planning trip:', error);
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Error obteniendo ubicación');
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
  
  // Contar botones secundarios
  const secondaryCount = [
    primaryAction !== 'nearby' && showNearby,
    primaryAction !== 'planner' && showTripPlanner
  ].filter(Boolean).length;

  return (
    <div
      className="fixed bottom-4 left-4 right-4 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 flex gap-2"
      style={{ zIndex: 50 }}
    >
      {/* Botón primario - flex-1 para ocupar espacio disponible */}
      {primaryAction === 'directions' && (
        <button
          onClick={handleGetDirections}
          disabled={isLoading}
          className="flex-1 sm:flex-none bg-secondary text-primary px-5 py-3 sm:py-2.5 rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all hover:bg-secondary/90 disabled:opacity-50 disabled:cursor-not-allowed"
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
          className="flex-1 sm:flex-none bg-secondary text-primary px-5 py-3 sm:py-2.5 rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all hover:bg-secondary/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <BiCurrentLocation className="text-xl sm:text-lg animate-spin" />
              <span className="text-base sm:text-sm font-medium">Buscando...</span>
            </>
          ) : (
            <>
              <BiBus className="text-xl sm:text-lg" />
              <span className="text-base sm:text-sm font-medium">Rutas cercanas</span>
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
          className="flex-1 sm:flex-none bg-secondary text-primary px-5 py-3 sm:py-2.5 rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all hover:bg-secondary/90"
        >
          <MdDirections className="text-xl sm:text-lg" />
          <span className="text-base sm:text-sm font-medium">Planificar viaje</span>
        </button>
      )}

      {/* Botones secundarios - más grandes en mobile si hay espacio */}
      {primaryAction !== 'nearby' && showNearby && (
        <button
          onClick={handleFindNearby}
          disabled={isLoading}
          title="Rutas cercanas"
          className={`bg-primary backdrop-blur-sm border border-secondary/30 text-secondary rounded-xl shadow-lg flex items-center justify-center transition-all hover:border-secondary/50 disabled:opacity-50 disabled:cursor-not-allowed ${
            secondaryCount === 1 ? 'w-14 h-14 sm:w-11 sm:h-11' : 'w-12 h-12 sm:w-11 sm:h-11'
          }`}
        >
          <BiBus className={secondaryCount === 1 ? 'text-2xl sm:text-xl' : 'text-xl'} />
        </button>
      )}
      
      {primaryAction !== 'planner' && showTripPlanner && (
        <button
          onClick={() => {
            reset();
            openTripPlanner();
          }}
          title="Planificar viaje"
          className={`bg-primary backdrop-blur-sm border border-secondary/30 text-secondary rounded-xl shadow-lg flex items-center justify-center transition-all hover:border-secondary/50 ${
            secondaryCount === 1 ? 'w-14 h-14 sm:w-11 sm:h-11' : 'w-12 h-12 sm:w-11 sm:h-11'
          }`}
        >
          <MdDirections className={secondaryCount === 1 ? 'text-2xl sm:text-xl' : 'text-xl'} />
        </button>
      )}
    </div>
  );
};
