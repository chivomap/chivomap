import React, { useEffect } from 'react';
import { Source, Layer, Marker } from 'react-map-gl/maplibre';
import { useTripPlannerStore } from '../../../store/tripPlannerStore';
import { useRutasStore } from '../../../store/rutasStore';

export const TripRouteLayer: React.FC<{ selectedOptionIndex: number | null }> = ({ selectedOptionIndex }) => {
  const { tripPlan, origin, destination } = useTripPlannerStore();
  const { selectRoute, clearSelectedRoute } = useRutasStore();

  const option = tripPlan && selectedOptionIndex !== null ? tripPlan.options[selectedOptionIndex] : null;

  // Cargar la primera ruta de bus cuando se selecciona una opción
  useEffect(() => {
    if (option) {
      const firstBusLeg = option.legs.find(leg => leg.type === 'bus' && leg.route_code);
      if (firstBusLeg && firstBusLeg.route_code) {
        selectRoute(firstBusLeg.route_code);
      }
    } else {
      clearSelectedRoute();
    }
  }, [option, selectRoute, clearSelectedRoute]);

  if (!tripPlan || selectedOptionIndex === null || !option) return null;

  // Crear GeoJSON para las rutas a pie
  const walkRoutes = option.legs
    .filter(leg => leg.type === 'walk')
    .map((leg, idx) => ({
      type: 'Feature' as const,
      id: `walk-${idx}`,
      properties: {},
      geometry: {
        type: 'LineString' as const,
        coordinates: [[leg.from.lng, leg.from.lat], [leg.to.lng, leg.to.lat]]
      }
    }));

  const walkFeatureCollection = {
    type: 'FeatureCollection' as const,
    features: walkRoutes
  };

  // Paradas de transbordo
  const transferStops = option.legs
    .slice(1)
    .filter((leg, idx) => option.legs[idx].type !== leg.type)
    .map(leg => leg.from);

  return (
    <>
      {/* La ruta de bus se muestra a través de RouteLayer usando selectedRoute */}
      
      {/* Rutas a pie (punteadas) */}
      {walkRoutes.length > 0 && (
        <Source id="trip-walk-routes" type="geojson" data={walkFeatureCollection}>
          <Layer
            id="trip-walk-routes-line"
            type="line"
            paint={{
              'line-color': '#60a5fa',
              'line-width': 3,
              'line-opacity': 0.6,
              'line-dasharray': [2, 2]
            }}
            layout={{
              'line-cap': 'round',
              'line-join': 'round'
            }}
          />
        </Source>
      )}

      {/* Marcador de origen */}
      {origin && (
        <Marker longitude={origin.lng} latitude={origin.lat}>
          <div className="relative">
            <div className="w-8 h-8 bg-secondary rounded-full border-4 border-white shadow-lg flex items-center justify-center">
              <div className="w-3 h-3 bg-white rounded-full" />
            </div>
          </div>
        </Marker>
      )}

      {/* Marcador de destino */}
      {destination && (
        <Marker longitude={destination.lng} latitude={destination.lat}>
          <div className="relative">
            <div className="w-8 h-8 bg-red-500 rounded-full border-4 border-white shadow-lg flex items-center justify-center">
              <div className="w-3 h-3 bg-white rounded-full" />
            </div>
          </div>
        </Marker>
      )}

      {/* Marcadores de transbordo */}
      {transferStops.map((stop, idx) => (
        <Marker key={idx} longitude={stop.lng} latitude={stop.lat}>
          <div className="relative">
            <div className="w-6 h-6 bg-yellow-500 rounded-full border-3 border-white shadow-lg" />
          </div>
        </Marker>
      ))}
    </>
  );
};
