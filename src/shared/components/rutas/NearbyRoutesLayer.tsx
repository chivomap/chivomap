import React, { useEffect, useMemo } from 'react';
import { Source, Layer, useMap } from 'react-map-gl/maplibre';
import { useRutasStore } from '../../store/rutasStore';
import { RUTA_COLORS, type SubtipoRuta } from '../../types/rutas';
import { getRoutesBatch } from '../../services/GetRutasData';
import { useMapStore } from '../../store/mapStore';
import * as turf from '@turf/turf';

export const NearbyRoutesLayer: React.FC = () => {
  const { nearbyRoutes, showNearbyOnMap, selectedRoute, hoveredRoute } = useRutasStore();
  const { config } = useMapStore();
  const { current: map } = useMap();
  const [loadedRoutes, setLoadedRoutes] = React.useState<Map<string, any>>(new Map());

  // Cargar geometrías de rutas cercanas en lotes
  useEffect(() => {
    if (!showNearbyOnMap || !nearbyRoutes || nearbyRoutes.length === 0) {
      setLoadedRoutes(new Map());
      return;
    }

    let cancelled = false;

    const loadRoutes = async () => {
      const newRoutes = new Map<string, any>();
      const BATCH_SIZE = 50;
      
      for (let i = 0; i < nearbyRoutes.length; i += BATCH_SIZE) {
        if (cancelled) break;
        
        const batch = nearbyRoutes.slice(i, i + BATCH_SIZE);
        const codes = batch.map(r => r.codigo);
        
        const results = await getRoutesBatch(codes);
        
        if (!cancelled) {
          Object.entries(results).forEach(([code, route]) => {
            newRoutes.set(code, route);
          });
          setLoadedRoutes(new Map(newRoutes));
        }
      }
    };

    loadRoutes();

    return () => {
      cancelled = true;
    };
  }, [nearbyRoutes, showNearbyOnMap]);

  // Filtrar rutas por zoom para mejorar rendimiento (ANTES del return condicional)
  const visibleRoutes = useMemo(() => {
    if (!nearbyRoutes || nearbyRoutes.length === 0) return [];
    
    const zoom = config.zoom;
    if (zoom < 11) {
      // Zoom bajo: solo mostrar las 15 más cercanas
      return nearbyRoutes.slice(0, 15);
    } else if (zoom < 13) {
      // Zoom medio: mostrar las 25 más cercanas
      return nearbyRoutes.slice(0, 25);
    }
    // Zoom alto: mostrar máximo 35 rutas
    return nearbyRoutes.slice(0, 35);
  }, [nearbyRoutes, config.zoom]);

  // Ordenar rutas: la que tiene hover al final para que se pinte encima
  const sortedRoutes = useMemo(() => {
    return [...visibleRoutes].sort((a, b) => {
      if (a.codigo === hoveredRoute) return 1;
      if (b.codigo === hoveredRoute) return -1;
      return 0;
    });
  }, [visibleRoutes, hoveredRoute]);

  // Clip geometrías al viewport actual para mejorar rendimiento
  const clippedRoutes = useMemo(() => {
    if (!map) return new Map();
    
    const bounds = map.getBounds();
    const bbox: [number, number, number, number] = [
      bounds.getWest(),
      bounds.getSouth(),
      bounds.getEast(),
      bounds.getNorth()
    ];

    const zoom = config.zoom;
    // Tolerancia de simplificación basada en zoom (valores más conservadores)
    // Valores más bajos = menos simplificación = más suave
    const tolerance = zoom < 11 ? 0.0003 : zoom < 13 ? 0.0001 : 0.00005;

    const clipped = new Map<string, any>();
    let totalPointsBefore = 0;
    let totalPointsAfter = 0;
    
    loadedRoutes.forEach((route, code) => {
      try {
        // Contar puntos originales
        const originalPoints = route.geometry?.coordinates?.length || 0;
        totalPointsBefore += originalPoints;
        
        // Expandir bbox un 20% para incluir rutas que entran/salen del viewport
        const bboxPoly = turf.bboxPolygon(bbox);
        const buffered = turf.buffer(bboxPoly, 0.5, { units: 'kilometers' });
        if (!buffered) {
          clipped.set(code, route);
          totalPointsAfter += originalPoints;
          return;
        }
        const bufferedBbox = turf.bbox(buffered) as [number, number, number, number];
        
        // Clip la geometría al bbox expandido
        let clippedGeometry = turf.bboxClip(route, bufferedBbox);
        
        // Simplificar la geometría para reducir puntos
        clippedGeometry = turf.simplify(clippedGeometry, { 
          tolerance, 
          highQuality: false // false = más rápido
        });
        
        // Contar puntos después
        const finalPoints = clippedGeometry.geometry?.coordinates?.length || 0;
        totalPointsAfter += finalPoints;
        
        clipped.set(code, clippedGeometry);
      } catch (error) {
        // Si falla el clipping, usar geometría completa
        const originalPoints = route.geometry?.coordinates?.length || 0;
        totalPointsAfter += originalPoints;
        clipped.set(code, route);
      }
    });
    
    // Log de optimización
    if (totalPointsBefore > 0) {
      const reduction = ((1 - totalPointsAfter / totalPointsBefore) * 100).toFixed(1);
      console.log(`🎨 Geometry optimization: ${totalPointsBefore} → ${totalPointsAfter} points (${reduction}% reduction)`);
    }
    return clipped;
  }, [loadedRoutes, map, config.center, config.zoom]);

  // Ocultar rutas cercanas cuando hay una ruta seleccionada
  if (!showNearbyOnMap || !nearbyRoutes || nearbyRoutes.length === 0 || selectedRoute) return null;

  const zoom = config.zoom;
  const showHitbox = zoom >= 12; // Solo mostrar hitbox en zoom cercano

  return (
    <>
      {sortedRoutes.map((ruta) => {
        const clippedRoute = clippedRoutes.get(ruta.codigo);
        if (!clippedRoute) return null;

        const subtipo = ruta.subtipo as SubtipoRuta;
        const color = RUTA_COLORS[subtipo] || '#6b7280';
        const isHovered = hoveredRoute === ruta.codigo;
        const isDimmed = hoveredRoute && hoveredRoute !== ruta.codigo;

        return (
          <Source
            key={`nearby-${ruta.codigo}`}
            id={`nearby-route-${ruta.codigo}`}
            type="geojson"
            data={clippedRoute}
          >
            {/* Capa invisible más ancha para interacción - solo en zoom cercano */}
            {showHitbox && (
              <Layer
                id={`nearby-route-hitbox-${ruta.codigo}`}
                type="line"
                paint={{
                  'line-color': color,
                  'line-width': 12,
                  'line-opacity': 0,
                }}
              />
            )}
            {/* Capa visual */}
            <Layer
              id={`nearby-route-line-${ruta.codigo}`}
              type="line"
              paint={{
                'line-color': color,
                'line-width': isHovered ? 5 : 3,
                'line-opacity': isDimmed ? 0.15 : (isHovered ? 1 : 0.6),
              }}
              layout={{
                'line-cap': 'round',
                'line-join': 'round',
              }}
            />
          </Source>
        );
      })}
    </>
  );
};
