import React, { useEffect, useRef, useState } from 'react';
import { Source, Layer, Marker } from 'react-map-gl/maplibre';
import type { FeatureCollection, Geometry } from 'geojson';
import { useTripPlannerStore } from '../../../store/tripPlannerStore';
import { getRouteByCode } from '../../../services/GetRutasData';
import { getWalkRoute, type WalkRouteResponse } from '../../../api/routing';
import type { RutaDetailResponse } from '../../../types/rutas';
import type { TripLeg } from '../../../types/trip';

export const TripRouteLayer: React.FC<{ selectedOptionIndex: number | null }> = ({ selectedOptionIndex }) => {
  const { tripPlan, origin, destination } = useTripPlannerStore();

  const option = tripPlan && selectedOptionIndex !== null ? tripPlan.options[selectedOptionIndex] : null;
  const [busFeatures, setBusFeatures] = useState<FeatureCollection | null>(null);
  const [walkFeatures, setWalkFeatures] = useState<FeatureCollection | null>(null);
  const routeCacheRef = useRef<Map<string, RutaDetailResponse>>(new Map());
  const walkCacheRef = useRef<Map<string, WalkRouteResponse>>(new Map());

  const normalizeDirection = (value?: string) => {
    if (!value) return null;
    const upper = value.toUpperCase();
    if (upper === 'IDA' || upper === 'REGRESO') return upper as 'IDA' | 'REGRESO';
    return null;
  };

  const resolveDirection = (leg: TripLeg) => {
    if (leg.direction) return normalizeDirection(leg.direction);
    const fromCode = leg.from_stop?.codigo;
    const toCode = leg.to_stop?.codigo;
    if (fromCode) return fromCode.toUpperCase() === 'I' ? 'IDA' : fromCode.toUpperCase() === 'R' ? 'REGRESO' : null;
    if (toCode) return toCode.toUpperCase() === 'I' ? 'IDA' : toCode.toUpperCase() === 'R' ? 'REGRESO' : null;
    return null;
  };

  const busPalette = ['#10b981', '#f59e0b', '#3b82f6', '#ef4444'];

  const walkPalette = ['#60a5fa', '#38bdf8'];

  useEffect(() => {
    let cancelled = false;

    const loadBusRoutes = async () => {
      if (!option) {
        setBusFeatures(null);
        return;
      }

      const busLegs = option.legs
        .filter((leg) => leg.type === 'bus' && leg.route_code)
        .map((leg, index) => ({ ...leg, _index: index }));

      if (busLegs.length === 0) {
        setBusFeatures(null);
        return;
      }

      const uniqueCodes = Array.from(new Set(busLegs.map((leg) => leg.route_code as string)));

      const details = await Promise.all(
        uniqueCodes.map(async (code) => {
          const cached = routeCacheRef.current.get(code);
          if (cached) return [code, cached] as const;
          const fetched = await getRouteByCode(code);
          if (fetched) {
            routeCacheRef.current.set(code, fetched);
          }
          return [code, fetched] as const;
        })
      );

      const detailMap = new Map(details.filter(([, detail]) => detail) as Array<[string, RutaDetailResponse]>);

      const features = busLegs.map((leg) => {
        const detail = detailMap.get(leg.route_code as string);
        const direction = resolveDirection(leg);
        const color = busPalette[leg._index % busPalette.length];

        if (detail && detail.routes.length > 0) {
          const selected = direction
            ? detail.routes.find((route) => normalizeDirection(route.properties.SENTIDO) === direction) || detail.routes[0]
            : detail.routes[0];

          return {
            type: 'Feature' as const,
            geometry: selected.geometry as unknown as Geometry,
            properties: {
              ...selected.properties,
              color,
              routeCode: leg.route_code,
              direction,
            },
          };
        }

        return {
          type: 'Feature' as const,
          geometry: {
            type: 'LineString' as const,
            coordinates: [
              [leg.from.lng, leg.from.lat],
              [leg.to.lng, leg.to.lat],
            ],
          },
          properties: {
            color,
            routeCode: leg.route_code,
            direction,
          },
        };
      });

      if (!cancelled) {
        setBusFeatures({
          type: 'FeatureCollection',
          features,
        });
      }
    };

    loadBusRoutes();

    return () => {
      cancelled = true;
    };
  }, [option]);

  const hasOption = Boolean(option);

  useEffect(() => {
    let cancelled = false;

    if (!option) {
      setWalkFeatures(null);
      return;
    }

    const walkLegs = option.legs
      .filter((leg) => leg.type === 'walk')
      .map((leg, idx) => ({ ...leg, _index: idx }));

    if (walkLegs.length === 0) {
      setWalkFeatures(null);
      return;
    }

    const baseFeatures = walkLegs.map((leg) => ({
      type: 'Feature' as const,
      id: `walk-${leg._index}`,
      properties: {
        color: walkPalette[leg._index % walkPalette.length],
      },
      geometry: {
        type: 'LineString' as const,
        coordinates: [[leg.from.lng, leg.from.lat], [leg.to.lng, leg.to.lat]],
      },
    }));

    setWalkFeatures({
      type: 'FeatureCollection',
      features: baseFeatures,
    });

    const updateFeature = (index: number, coordinates: [number, number][]) => {
      setWalkFeatures((prev) => {
        if (!prev) return prev;
        const features = prev.features.map((feature, featureIndex) => {
          if (featureIndex !== index) return feature;
          return {
            ...feature,
            geometry: {
              type: 'LineString',
              coordinates,
            },
          } as typeof feature;
        });
        return {
          type: 'FeatureCollection',
          features,
        };
      });
    };

    walkLegs.forEach(async (leg) => {
      const cacheKey = `${leg.from.lat},${leg.from.lng}:${leg.to.lat},${leg.to.lng}`;
      const cached = walkCacheRef.current.get(cacheKey);
      if (cached) {
        if (!cancelled) {
          updateFeature(leg._index, cached.geometry.coordinates);
        }
        return;
      }

      try {
        const response = await getWalkRoute(leg.from, leg.to);
        walkCacheRef.current.set(cacheKey, response);
        if (!cancelled) {
          updateFeature(leg._index, response.geometry.coordinates);
        }
      } catch (error) {
        // Mantener la linea recta en caso de error
      }
    });

    return () => {
      cancelled = true;
    };
  }, [option]);

  // Paradas de transbordo
  const transferStops = option
    ? option.legs
        .slice(1)
        .filter((leg, idx) => option.legs[idx].type !== leg.type)
        .map(leg => leg.from)
    : [];

  return (
    <>
      {/* Rutas de bus */}
      {hasOption && busFeatures && busFeatures.features.length > 0 && (
        <Source id="trip-bus-routes" type="geojson" data={busFeatures}>
          <Layer
            id="trip-bus-routes-outline"
            type="line"
            paint={{
              'line-color': '#ffffff',
              'line-width': 6,
              'line-opacity': 0.5,
            }}
            layout={{
              'line-cap': 'round',
              'line-join': 'round',
            }}
          />
          <Layer
            id="trip-bus-routes-line"
            type="line"
            paint={{
              'line-color': ['get', 'color'],
              'line-width': 4,
              'line-opacity': 0.9,
            }}
            layout={{
              'line-cap': 'round',
              'line-join': 'round',
            }}
          />
        </Source>
      )}

      {/* Rutas a pie (punteadas) */}
      {hasOption && walkFeatures && walkFeatures.features.length > 0 && (
        <Source id="trip-walk-routes" type="geojson" data={walkFeatures}>
          <Layer
            id="trip-walk-routes-line"
            type="line"
            paint={{
              'line-color': ['get', 'color'],
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
      {hasOption && transferStops.map((stop, idx) => (
        <Marker key={idx} longitude={stop.lng} latitude={stop.lat}>
          <div className="relative">
            <div className="w-6 h-6 bg-yellow-500 rounded-full border-3 border-white shadow-lg" />
          </div>
        </Marker>
      ))}
    </>
  );
};
