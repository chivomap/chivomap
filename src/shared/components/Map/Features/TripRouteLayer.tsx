import React, { useEffect, useRef, useState } from 'react';
import { Source, Layer, Marker } from 'react-map-gl/maplibre';
import type { FeatureCollection, Geometry } from 'geojson';
import { useTripPlannerStore } from '../../../store/tripPlannerStore';
import { getRouteByCode } from '../../../services/GetRutasData';
import { getWalkRoute, type WalkRouteResponse } from '../../../api/routing';
import type { RutaDetailResponse, RutaFeature } from '../../../types/rutas';
import type { TripLeg } from '../../../types/trip';

// Feature flag: Ocultar flechas (ver docs/FEATURE_FLAGS.md)
const SHOW_TRIP_ROUTE_ARROWS = false;

const pointDistanceMeters = (a: { lat: number; lng: number }, b: [number, number]) => {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371000;
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b[1]);
  const dLat = toRad(b[1] - a.lat);
  const dLng = toRad(b[0] - a.lng);

  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

  return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
};

const getGeometryEndpoints = (geometry: Geometry): { start: [number, number]; end: [number, number] } | null => {
  if (geometry.type === 'LineString') {
    const coords = geometry.coordinates as [number, number][];
    if (coords.length < 2) return null;
    return { start: coords[0], end: coords[coords.length - 1] };
  }

  if (geometry.type === 'MultiLineString') {
    const lines = geometry.coordinates as [number, number][][];
    const nonEmpty = lines.filter((line) => line.length > 0);
    if (nonEmpty.length === 0) return null;
    const first = nonEmpty[0];
    const last = nonEmpty[nonEmpty.length - 1];
    return { start: first[0], end: last[last.length - 1] };
  }

  return null;
};

const flattenGeometryCoords = (geometry: Geometry): [number, number][] => {
  if (geometry.type === 'LineString') {
    return geometry.coordinates as [number, number][];
  }
  if (geometry.type === 'MultiLineString') {
    const lines = geometry.coordinates as [number, number][][];
    return lines.flat();
  }
  return [];
};

const closestCoordIndex = (coords: [number, number][], point: { lat: number; lng: number }) => {
  let bestIdx = 0;
  let bestDist = Number.MAX_SAFE_INTEGER;
  coords.forEach((coord, idx) => {
    const d = pointDistanceMeters(point, coord);
    if (d < bestDist) {
      bestDist = d;
      bestIdx = idx;
    }
  });
  return bestIdx;
};

const reverseGeometry = (geometry: Geometry): Geometry => {
  if (geometry.type === 'LineString') {
    return {
      ...geometry,
      coordinates: [...geometry.coordinates].reverse(),
    } as Geometry;
  }

  if (geometry.type === 'MultiLineString') {
    const lines = geometry.coordinates as [number, number][][];
    return {
      ...geometry,
      coordinates: [...lines].reverse().map((line) => [...line].reverse()),
    } as Geometry;
  }

  return geometry;
};

const orientedScore = (geometry: Geometry, leg: TripLeg) => {
  const endpoints = getGeometryEndpoints(geometry);
  if (!endpoints) return Number.MAX_SAFE_INTEGER;
  return pointDistanceMeters(leg.from, endpoints.start) + pointDistanceMeters(leg.to, endpoints.end);
};

const orientGeometryToLeg = (geometry: Geometry, leg: TripLeg): Geometry => {
  const coords = flattenGeometryCoords(geometry);
  if (coords.length < 2) return geometry;

  const fromIdx = closestCoordIndex(coords, leg.from);
  const toIdx = closestCoordIndex(coords, leg.to);

  if (fromIdx <= toIdx) return geometry;

  return reverseGeometry(geometry);
};

const selectBestVariant = (routes: RutaFeature[], leg: TripLeg, direction: 'IDA' | 'REGRESO' | null) => {
  let best = routes[0];
  let bestScore = Number.MAX_SAFE_INTEGER;

  routes.forEach((route) => {
    const geometry = route.geometry as unknown as Geometry;
    let score = Math.min(orientedScore(geometry, leg), orientedScore(reverseGeometry(geometry), leg));
    if (direction) {
      const sentido = route.properties.SENTIDO?.toUpperCase();
      if (sentido && sentido !== direction) {
        score += 250;
      }
    }
    if (score < bestScore) {
      bestScore = score;
      best = route;
    }
  });

  return best;
};

export const TripRouteLayer: React.FC<{ selectedOptionIndex: number | null }> = ({ selectedOptionIndex }) => {
  const { tripPlan, origin, destination, focusedLegIndex } = useTripPlannerStore();

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
      // Limpiar render anterior al cambiar de opcion para evitar solapamiento visual
      setBusFeatures(null);

      if (!option) {
        return;
      }

      const busLegs = option.legs
        .map((leg, index) => ({ ...leg, _index: index }))
        .filter((leg) => leg.type === 'bus' && leg.route_code);

      if (busLegs.length === 0) {
        setBusFeatures(null);
        return;
      }

      const uniqueCodes = Array.from(new Set(busLegs.map((leg) => leg.route_code as string)));

      const detailMap = new Map<string, RutaDetailResponse>();
      await Promise.all(
        uniqueCodes.map(async (code) => {
          const cached = routeCacheRef.current.get(code);
          if (cached) {
            detailMap.set(code, cached);
            return;
          }
          try {
            const fetched = await getRouteByCode(code);
            if (fetched) {
              routeCacheRef.current.set(code, fetched);
              detailMap.set(code, fetched);
            }
          } catch {
            // Ignorar error individual para no romper el render de otras rutas
          }
        })
      );

      const features = busLegs.map((leg) => {
        const detail = detailMap.get(leg.route_code as string);
        const direction = resolveDirection(leg);
        const color = busPalette[leg._index % busPalette.length];
        const isActive = focusedLegIndex === null || focusedLegIndex === leg._index;

        if (detail && detail.routes.length > 0) {
          const selected = selectBestVariant(detail.routes, leg, direction);
          const rawGeometry = selected.geometry as unknown as Geometry;
          const orientedGeometry = orientGeometryToLeg(rawGeometry, leg);

          return {
            type: 'Feature' as const,
            geometry: orientedGeometry,
            properties: {
              ...selected.properties,
              color,
              routeCode: leg.route_code,
              direction,
              isActive,
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
            isActive,
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
  }, [option, focusedLegIndex]);

  const hasOption = Boolean(option);

  useEffect(() => {
    let cancelled = false;

    if (!option) {
      setWalkFeatures(null);
      return;
    }

    const walkLegs = option.legs
      .map((leg, legIndex) => ({ ...leg, _legIndex: legIndex }))
      .filter((leg) => leg.type === 'walk')
      .map((leg, walkIndex) => ({ ...leg, _walkIndex: walkIndex }));

    if (walkLegs.length === 0) {
      setWalkFeatures(null);
      return;
    }

    const baseFeatures = walkLegs.map((leg) => ({
      type: 'Feature' as const,
      id: `walk-${leg._legIndex}`,
      properties: {
        legIndex: leg._legIndex,
        color: walkPalette[leg._walkIndex % walkPalette.length],
        isActive: focusedLegIndex === null || focusedLegIndex === leg._legIndex,
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

    const updateFeature = (legIndex: number, coordinates: [number, number][]) => {
      setWalkFeatures((prev) => {
        if (!prev) return prev;
        const features = prev.features.map((feature) => {
          if (feature.properties?.legIndex !== legIndex) return feature;
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
          updateFeature(leg._legIndex, cached.geometry.coordinates);
        }
        return;
      }

      try {
        const response = await getWalkRoute(leg.from, leg.to);
        walkCacheRef.current.set(cacheKey, response);
        if (!cancelled) {
          updateFeature(leg._legIndex, response.geometry.coordinates);
        }
      } catch (error) {
        // Mantener la linea recta en caso de error
      }
    });

    return () => {
      cancelled = true;
    };
  }, [option, focusedLegIndex]);

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
              'line-width': [
                'case',
                ['==', ['get', 'isActive'], true],
                6,
                4,
              ],
              'line-opacity': [
                'case',
                ['==', ['get', 'isActive'], true],
                0.5,
                0.2,
              ],
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
              'line-width': [
                'case',
                ['==', ['get', 'isActive'], true],
                4,
                2,
              ],
              'line-opacity': [
                'case',
                ['==', ['get', 'isActive'], true],
                0.95,
                0.25,
              ],
            }}
            layout={{
              'line-cap': 'round',
              'line-join': 'round',
            }}
          />
          {SHOW_TRIP_ROUTE_ARROWS && (
            <Layer
              id="trip-bus-routes-arrows"
              type="symbol"
              layout={{
                'symbol-placement': 'line',
                'symbol-spacing': 100,
                'icon-image': 'arrow',
                'icon-size': 0.5,
                'icon-rotate': 90,
                'icon-rotation-alignment': 'map',
                'icon-keep-upright': false,
                'icon-allow-overlap': true,
                'icon-ignore-placement': true,
              }}
              filter={['==', ['get', 'isActive'], true]}
              paint={{
                'icon-opacity': 0.95,
                'icon-color': '#0f172a',
              }}
            />
          )}
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
              'line-width': [
                'case',
                ['==', ['get', 'isActive'], true],
                3,
                2,
              ],
              'line-opacity': [
                'case',
                ['==', ['get', 'isActive'], true],
                0.75,
                0.25,
              ],
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
            <div className="w-7 h-7 bg-yellow-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-[11px] font-bold text-slate-900">
              {idx + 1}
            </div>
          </div>
        </Marker>
      ))}
    </>
  );
};
