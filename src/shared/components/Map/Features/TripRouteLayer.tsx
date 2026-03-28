import React, { useEffect, useRef, useState } from 'react';
import { Source, Layer, Marker, Popup, useMap } from 'react-map-gl/maplibre';
import type { FeatureCollection, Geometry } from 'geojson';
import { useTripPlannerStore } from '../../../store/tripPlannerStore';
import { getRouteByCode } from '../../../services/GetRutasData';
import { getWalkRoute, type WalkRouteResponse } from '../../../api/routing';
import type { RutaDetailResponse, RutaFeature } from '../../../types/rutas';
import type { TripLeg } from '../../../types/trip';
import { env } from '../../../config/env';
import { MdDirectionsBus, MdSwapHoriz } from 'react-icons/md';

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

// Proyección sobre polilínea: devuelve distancia acumulada (metros) y punto proyectado
const projectAlongLine = (coords: [number, number][], point: { lat: number; lng: number }): { along: number; coord: [number, number] } | null => {
  if (coords.length < 2) return null;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const cosLat = Math.cos(toRad(point.lat));
  const px = (point.lng * cosLat * 111320);
  const py = (point.lat * 111320);

  let bestDist = Infinity;
  let bestAlong = 0;
  let bestCoord: [number, number] = coords[0];
  let cumulative = 0;

  for (let i = 0; i < coords.length - 1; i++) {
    const ax = coords[i][0] * cosLat * 111320;
    const ay = coords[i][1] * 111320;
    const bx = coords[i + 1][0] * cosLat * 111320;
    const by = coords[i + 1][1] * 111320;
    const dx = bx - ax;
    const dy = by - ay;
    const segLen = Math.hypot(dx, dy);
    if (segLen === 0) { cumulative += segLen; continue; }

    let t = ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy);
    t = Math.max(0, Math.min(1, t));

    const cx = ax + t * dx;
    const cy = ay + t * dy;
    const dist = Math.hypot(px - cx, py - cy);

    if (dist < bestDist) {
      bestDist = dist;
      bestAlong = cumulative + t * segLen;
      bestCoord = [
        coords[i][0] + t * (coords[i + 1][0] - coords[i][0]),
        coords[i][1] + t * (coords[i + 1][1] - coords[i][1]),
      ];
    }
    cumulative += segLen;
  }

  return { along: bestAlong, coord: bestCoord };
};

// Corta una polilínea entre dos distancias (metros), interpolando extremos
const cutLineByDistance = (coords: [number, number][], startM: number, endM: number): [number, number][] => {
  if (coords.length < 2) return [];
  const toRad = (d: number) => (d * Math.PI) / 180;
  const cosLat = Math.cos(toRad(coords[0][1]));

  const result: [number, number][] = [];
  let cumulative = 0;

  for (let i = 0; i < coords.length - 1; i++) {
    const dx = (coords[i + 1][0] - coords[i][0]) * cosLat * 111320;
    const dy = (coords[i + 1][1] - coords[i][1]) * 111320;
    const segLen = Math.hypot(dx, dy);
    const nextCumulative = cumulative + segLen;

    if (nextCumulative <= startM) { cumulative = nextCumulative; continue; }
    if (cumulative >= endM) break;

    if (result.length === 0) {
      if (cumulative < startM && segLen > 0) {
        const t = (startM - cumulative) / segLen;
        result.push([
          coords[i][0] + t * (coords[i + 1][0] - coords[i][0]),
          coords[i][1] + t * (coords[i + 1][1] - coords[i][1]),
        ]);
      } else {
        result.push(coords[i]);
      }
    }

    if (nextCumulative >= endM && segLen > 0) {
      const t = (endM - cumulative) / segLen;
      result.push([
        coords[i][0] + t * (coords[i + 1][0] - coords[i][0]),
        coords[i][1] + t * (coords[i + 1][1] - coords[i][1]),
      ]);
      break;
    }

    result.push(coords[i + 1]);
    cumulative = nextCumulative;
  }

  return result;
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

  const fromProj = projectAlongLine(coords, leg.from);
  const toProj = projectAlongLine(coords, leg.to);
  if (!fromProj || !toProj) return geometry;

  if (fromProj.along <= toProj.along) return geometry;
  return reverseGeometry(geometry);
};

interface SplitSegments {
  active: Geometry;
  inactiveBefore: Geometry | null;
  inactiveAfter: Geometry | null;
}

const splitGeometryByLeg = (geometry: Geometry, leg: TripLeg): SplitSegments => {
  const oriented = orientGeometryToLeg(geometry, leg);

  // MultiLineString tiene sub-líneas desconectadas — splitearlas produce artefactos visuales
  if (oriented.type !== 'LineString') {
    return { active: oriented, inactiveBefore: null, inactiveAfter: null };
  }

  const coords = oriented.coordinates as [number, number][];
  if (coords.length < 2) return { active: oriented, inactiveBefore: null, inactiveAfter: null };

  const fromProj = projectAlongLine(coords, leg.from);
  const toProj = projectAlongLine(coords, leg.to);
  if (!fromProj || !toProj) return { active: oriented, inactiveBefore: null, inactiveAfter: null };

  const startM = Math.min(fromProj.along, toProj.along);
  const endM = Math.max(fromProj.along, toProj.along);

  // Calcular distancia total de la línea para los cortes inactivos
  const toRad = (d: number) => (d * Math.PI) / 180;
  const cosLat = Math.cos(toRad(coords[0][1]));
  let totalLen = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    const dx = (coords[i + 1][0] - coords[i][0]) * cosLat * 111320;
    const dy = (coords[i + 1][1] - coords[i][1]) * 111320;
    totalLen += Math.hypot(dx, dy);
  }

  const activeCoords = cutLineByDistance(coords, startM, endM);
  const beforeCoords = startM > 0 ? cutLineByDistance(coords, 0, startM) : null;
  const afterCoords = endM < totalLen ? cutLineByDistance(coords, endM, totalLen) : null;

  return {
    active: activeCoords.length >= 2 ? { type: 'LineString', coordinates: activeCoords } : oriented,
    inactiveBefore: beforeCoords && beforeCoords.length >= 2 ? { type: 'LineString', coordinates: beforeCoords } : null,
    inactiveAfter: afterCoords && afterCoords.length >= 2 ? { type: 'LineString', coordinates: afterCoords } : null,
  };
};

const createFadeSegments = (
  coords: [number, number][],
  direction: 'fadeIn' | 'fadeOut',
  baseProps: Record<string, any>,
  steps = 5,
): any[] => {
  if (coords.length < 2) return [];
  const features: any[] = [];
  const segLen = Math.max(2, Math.ceil(coords.length / steps));

  for (let i = 0; i < steps; i++) {
    const start = i * segLen;
    const end = Math.min(start + segLen + 1, coords.length);
    const slice = coords.slice(start, end);
    if (slice.length < 2) continue;

    const t = i / Math.max(1, steps - 1);
    const opacity = direction === 'fadeOut'
      ? 0.55 * (1 - t)
      : 0.55 * t;

    features.push({
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: slice },
      properties: { ...baseProps, fadeOpacity: Math.max(0.05, opacity) },
    });
  }
  return features;
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
  const { current: mapRef } = useMap();
  const [routeLabels, setRouteLabels] = useState<Array<{ lng: number; lat: number; routeCode: string; color: string }>>([]);
  const [inactivePopup, setInactivePopup] = useState<{
    lng: number; lat: number; routeName: string;
  } | null>(null);

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

  const busPalette = ['#6366f1', '#0ea5e9', '#14b8a6', '#f59e0b'];

  const walkPalette = ['#94a3b8', '#94a3b8'];

  useEffect(() => {
    let cancelled = false;

    const loadBusRoutes = async () => {
      // Limpiar render anterior al cambiar de opcion para evitar solapamiento visual
      setBusFeatures(null);
      setRouteLabels([]);
      setInactivePopup(null);

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

      const features: any[] = [];
      const labels: typeof routeLabels = [];

      busLegs.forEach((leg) => {
        const detail = detailMap.get(leg.route_code as string);
        const direction = resolveDirection(leg);
        const color = busPalette[leg._index % busPalette.length];
        const isActive = focusedLegIndex === null || focusedLegIndex === leg._index;
        const routeName = leg.route_name || `Ruta ${leg.route_code}`;
        const labelText = routeName.startsWith('Ruta') ? routeName : `Ruta ${routeName}`;

        // Si el backend ya envió la geometría recortada, usarla directamente
        if (leg.geometry && leg.geometry.coordinates.length >= 2) {
          const backendGeom = {
            type: leg.geometry.type,
            coordinates: leg.geometry.coordinates,
          } as unknown as Geometry;

          features.push({
            type: 'Feature' as const,
            geometry: backendGeom,
            properties: { color, routeCode: leg.route_code, routeName, direction, isActive, segmentType: 'active' },
          });

          // Fade con la ruta completa si tenemos el detalle
          if (detail && detail.routes.length > 0) {
            const selected = selectBestVariant(detail.routes, leg, direction);
            const rawGeometry = selected.geometry as unknown as Geometry;
            const { inactiveBefore, inactiveAfter } = splitGeometryByLeg(rawGeometry, leg);
            const inactiveBase = { color, routeCode: leg.route_code, routeName, isActive, segmentType: 'inactive' };
            const maxHint = Math.max(15, Math.floor(leg.geometry.coordinates.length * 0.25));

            if (inactiveBefore) {
              const beforeCoords = flattenGeometryCoords(inactiveBefore);
              const trimmed = beforeCoords.length > maxHint ? beforeCoords.slice(-maxHint) : beforeCoords;
              features.push(...createFadeSegments(trimmed, 'fadeIn', inactiveBase));
            }
            if (inactiveAfter) {
              const afterCoords = flattenGeometryCoords(inactiveAfter);
              const trimmed = afterCoords.length > maxHint ? afterCoords.slice(0, maxHint) : afterCoords;
              features.push(...createFadeSegments(trimmed, 'fadeOut', inactiveBase));
            }
          }

          const mid = leg.geometry.coordinates[Math.floor(leg.geometry.coordinates.length / 2)];
          labels.push({ lng: mid[0], lat: mid[1], routeCode: labelText, color });

        } else if (detail && detail.routes.length > 0) {
          // Fallback: recortar en frontend (rutas sin geometría del backend)
          const selected = selectBestVariant(detail.routes, leg, direction);
          const rawGeometry = selected.geometry as unknown as Geometry;
          const { active, inactiveBefore, inactiveAfter } = splitGeometryByLeg(rawGeometry, leg);

          features.push({
            type: 'Feature' as const,
            geometry: active,
            properties: {
              ...selected.properties,
              color, routeCode: leg.route_code, routeName, direction, isActive,
              segmentType: 'active',
            },
          });

          const activeCoords = flattenGeometryCoords(active);
          const inactiveBase = { color, routeCode: leg.route_code, routeName, isActive, segmentType: 'inactive' };
          const maxHint = Math.max(15, Math.floor(activeCoords.length * 0.25));

          if (inactiveBefore) {
            const beforeCoords = flattenGeometryCoords(inactiveBefore);
            const trimmed = beforeCoords.length > maxHint ? beforeCoords.slice(-maxHint) : beforeCoords;
            features.push(...createFadeSegments(trimmed, 'fadeIn', inactiveBase));
          }
          if (inactiveAfter) {
            const afterCoords = flattenGeometryCoords(inactiveAfter);
            const trimmed = afterCoords.length > maxHint ? afterCoords.slice(0, maxHint) : afterCoords;
            features.push(...createFadeSegments(trimmed, 'fadeOut', inactiveBase));
          }
          if (activeCoords.length > 0) {
            const mid = activeCoords[Math.floor(activeCoords.length / 2)];
            labels.push({ lng: mid[0], lat: mid[1], routeCode: labelText, color });
          }
        } else {
          // Último fallback: línea recta
          features.push({
            type: 'Feature' as const,
            geometry: {
              type: 'LineString' as const,
              coordinates: [[leg.from.lng, leg.from.lat], [leg.to.lng, leg.to.lat]],
            },
            properties: { color, routeCode: leg.route_code, routeName, direction, isActive, segmentType: 'active' },
          });

          labels.push({
            lng: (leg.from.lng + leg.to.lng) / 2,
            lat: (leg.from.lat + leg.to.lat) / 2,
            routeCode: labelText,
            color,
          });
        }
      });

      if (!cancelled) {
        setBusFeatures({ type: 'FeatureCollection', features });
        setRouteLabels(labels);
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

  // Click handler para segmentos inactivos
  useEffect(() => {
    if (!mapRef) return;

    const handleInactiveClick = (e: any) => {
      const feature = e.features?.[0];
      if (feature?.properties) {
        setInactivePopup({
          lng: e.lngLat.lng,
          lat: e.lngLat.lat,
          routeName: feature.properties.routeName || `Ruta ${feature.properties.routeCode}`,
        });
      }
    };

    const setCursor = () => { mapRef.getCanvas().style.cursor = 'pointer'; };
    const resetCursor = () => { mapRef.getCanvas().style.cursor = ''; };

    mapRef.on('click', 'trip-bus-routes-inactive-line', handleInactiveClick);
    mapRef.on('mouseenter', 'trip-bus-routes-inactive-line', setCursor);
    mapRef.on('mouseleave', 'trip-bus-routes-inactive-line', resetCursor);

    return () => {
      mapRef.off('click', 'trip-bus-routes-inactive-line', handleInactiveClick);
      mapRef.off('mouseenter', 'trip-bus-routes-inactive-line', setCursor);
      mapRef.off('mouseleave', 'trip-bus-routes-inactive-line', resetCursor);
    };
  }, [mapRef]);

  // Puntos de acción: subir al bus, transbordo (bajar+subir)
  // El "bajar final" no necesita marcador — el destino rojo ya lo comunica
  const actionPoints = (() => {
    if (!option) return [];
    const busLegs = option.legs.filter(l => l.type === 'bus');
    const points: Array<{
      type: 'board' | 'transfer';
      lat: number; lng: number;
      routeName: string;
      color: string;
      nextRouteName?: string;
      nextColor?: string;
    }> = [];

    busLegs.forEach((leg, idx) => {
      const routeName = leg.route_name || `Ruta ${leg.route_code}`;
      const color = busPalette[option.legs.indexOf(leg) % busPalette.length];

      // Subir
      points.push({ type: 'board', lat: leg.from.lat, lng: leg.from.lng, routeName, color });

      // Transbordo (solo si hay otro bus después)
      if (idx < busLegs.length - 1) {
        const nextLeg = busLegs[idx + 1];
        const nextRouteName = nextLeg.route_name || `Ruta ${nextLeg.route_code}`;
        const nextColor = busPalette[option.legs.indexOf(nextLeg) % busPalette.length];
        points.push({
          type: 'transfer',
          lat: leg.to.lat, lng: leg.to.lng,
          routeName, color,
          nextRouteName, nextColor,
        });
      }
    });

    return points;
  })();

  return (
    <>
      {/* Rutas de bus */}
      {hasOption && busFeatures && busFeatures.features.length > 0 && (
        <Source id="trip-bus-routes" type="geojson" data={busFeatures}>
          {/* Segmentos ACTIVOS — tramo que el usuario toma (sólido) */}
          <Layer
            id="trip-bus-routes-outline"
            type="line"
            filter={['==', ['get', 'segmentType'], 'active']}
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
                0.35,
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
            filter={['==', ['get', 'segmentType'], 'active']}
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
                0.5,
              ],
            }}
            layout={{
              'line-cap': 'round',
              'line-join': 'round',
            }}
          />

          {/* Segmentos INACTIVOS — tramo que la ruta sigue, con degradado gradual */}
          <Layer
            id="trip-bus-routes-inactive-line"
            type="line"
            filter={['==', ['get', 'segmentType'], 'inactive']}
            paint={{
              'line-color': ['get', 'color'],
              'line-width': 3,
              'line-opacity': ['get', 'fadeOpacity'],
            }}
            layout={{
              'line-cap': 'round',
              'line-join': 'round',
            }}
          />

          {env.FEATURE_ROUTE_ARROWS && (
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
              filter={['all', ['==', ['get', 'segmentType'], 'active'], ['==', ['get', 'isActive'], true]]}
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
                0.45, // Menos transparente (antes 0.25)
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

      {/* Marcadores de acción: subir al bus / transbordo */}
      {hasOption && actionPoints.map((point, idx) => (
        <Marker key={`action-${idx}`} longitude={point.lng} latitude={point.lat} style={{ zIndex: point.type === 'transfer' ? 10 : 1 }}>
          <div className="relative group">
            {point.type === 'board' ? (
              <div
                className="w-8 h-8 rounded-full border-2 border-white shadow-lg flex items-center justify-center"
                style={{ backgroundColor: point.color }}
              >
                <MdDirectionsBus className="text-white text-base" />
              </div>
            ) : (
              <div className="w-9 h-9 rounded-full border-2 border-white shadow-lg flex items-center justify-center overflow-hidden"
                style={{
                  background: `linear-gradient(135deg, ${point.color} 50%, ${point.nextColor} 50%)`,
                }}
              >
                <MdSwapHoriz className="text-white text-lg drop-shadow-md" />
              </div>
            )}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-primary/95 text-white text-[10px] rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none border border-white/10 shadow-lg">
              {point.type === 'board'
                ? `Tomá ${point.routeName}`
                : `Bajá de ${point.routeName}, tomá ${point.nextRouteName}`}
            </div>
          </div>
        </Marker>
      ))}

      {/* Labels de ruta sobre el tramo activo */}
      {hasOption && routeLabels.map((label, idx) => (
        <Marker key={`label-${idx}`} longitude={label.lng} latitude={label.lat} anchor="center">
          <div
            className="px-2 py-0.5 rounded-full text-[11px] font-bold shadow-md pointer-events-none border border-white/30"
            style={{ backgroundColor: label.color, color: '#ffffff' }}
          >
            {label.routeCode}
          </div>
        </Marker>
      ))}

      {/* Popup al clickear tramo inactivo */}
      {inactivePopup && (
        <Popup
          longitude={inactivePopup.lng}
          latitude={inactivePopup.lat}
          anchor="bottom"
          onClose={() => setInactivePopup(null)}
          closeOnClick={false}
          offset={12}
        >
          <div className="text-sm p-1">
            <p className="font-semibold text-gray-800">{inactivePopup.routeName}</p>
            <p className="text-xs text-gray-500 mt-1">Este tramo no es parte de tu viaje</p>
          </div>
        </Popup>
      )}
    </>
  );
};
