import React, { useState } from 'react';
import { BiBus, BiCurrentLocation } from 'react-icons/bi';
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
  const { openTripPlanner } = useBottomSheet();
  const { reset, setDestination } = useTripPlannerStore();
  const { getLocation } = useCurrentLocation();
  const { focusPoint } = useMapFocus();
  const [isLoading, setIsLoading] = useState(false);

  // Ubicación contextual: lugar buscado > pin > geolocalización
  const getContextLocation = async () => {
    if (selectedResult) {
      return { lat: selectedResult.lat, lng: selectedResult.lng };
    }
    if (pin) {
      return { lat: pin.lat, lng: pin.lng };
    }
    return await getLocation();
  };

  const handleFindNearby = async () => {
    clearSelectedRoute();
    setIsLoading(true);

    try {
      const location = await getContextLocation();

      setTimeout(() => {
        focusPoint({ lat: location.lat, lng: location.lng }, { zoom: 14, sheetWillBeHalf: true });
      }, 100);

      await Promise.all([
        fetchNearbyRoutes(location.lat, location.lng),
        fetchNearbyParadas(location.lat, location.lng)
      ]);
    } catch (error) {
      console.error('Error:', error);
      alert(error instanceof Error ? error.message : 'Error obteniendo ubicación');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlanTrip = () => {
    reset();

    // Si hay lugar buscado o pin, usarlo como destino
    if (selectedResult) {
      setDestination({ lat: selectedResult.lat, lng: selectedResult.lng, name: selectedResult.name });
    } else if (pin) {
      setDestination({ lat: pin.lat, lng: pin.lng, name: 'Destino seleccionado' });
    }

    openTripPlanner();
  };

  // Ocultar si ya hay rutas cercanas visibles y no hay trip planner
  if (nearbyRoutes?.length > 0 && !env.FEATURE_TRIP_PLANNER) return null;

  return (
    <div
      className="fixed bottom-4 left-4 right-4 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 flex flex-row gap-2"
      style={{ zIndex: 50 }}
    >
      {/* Rutas cercanas - siempre visible */}
      {!(nearbyRoutes?.length > 0) && (
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

      {/* Planificar viaje - siempre visible */}
      {env.FEATURE_TRIP_PLANNER && (
        <button
          onClick={handlePlanTrip}
          className={`flex-1 min-w-0 h-12 sm:h-11 px-4 rounded-xl shadow-lg flex items-center justify-center gap-2 text-base sm:text-sm font-medium transition-all ${
            nearbyRoutes?.length > 0
              ? 'bg-secondary text-primary border-2 border-primary/20 hover:bg-secondary/90 hover:border-primary/30'
              : 'bg-primary backdrop-blur-sm border border-secondary/30 text-secondary hover:border-secondary/50'
          }`}
        >
          <MdDirections className="text-xl sm:text-lg" />
          <span>Planificar viaje</span>
        </button>
      )}
    </div>
  );
};
