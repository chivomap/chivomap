import React, { useEffect, useMemo } from 'react';
import { Source, Layer, useMap } from 'react-map-gl/maplibre';
import { useRutasStore } from '../../store/rutasStore';
import { RUTA_COLORS, type SubtipoRuta } from '../../types/rutas';
import { useMapStore } from '../../store/mapStore';

export const NearbyRoutesLayer: React.FC = () => {
  const { nearbyRoutes, showNearbyOnMap, selectedRoute, hoveredRoute, setHoveredRoute } = useRutasStore();
  const { config } = useMapStore();
  const { current: map } = useMap();

  // Filtrar rutas por zoom
  const visibleRoutes = useMemo(() => {
    if (!nearbyRoutes || nearbyRoutes.length === 0) return [];
    
    const zoom = config.zoom;
    if (zoom < 11) return nearbyRoutes.slice(0, 15);
    if (zoom < 13) return nearbyRoutes.slice(0, 25);
    return nearbyRoutes.slice(0, 35);
  }, [nearbyRoutes, config.zoom]);

  // Seleccionar LOD según zoom y crear FeatureCollection
  const routesFeatureCollection = useMemo(() => {
    const zoom = config.zoom;
    let lod: 'low' | 'med' | 'high' = 'high';
    if (zoom < 11) lod = 'low';
    else if (zoom < 13) lod = 'med';

    let totalPoints = 0;
    const features = visibleRoutes
      .filter(ruta => ruta.geometry)
      .map((ruta) => {
        const coords = ruta.geometry![lod];
        totalPoints += coords.length;
        
        const subtipo = ruta.subtipo as SubtipoRuta;
        const color = RUTA_COLORS[subtipo] || '#6b7280';

        return {
          type: 'Feature' as const,
          id: ruta.codigo,
          properties: {
            codigo: ruta.codigo,
            nombre: ruta.nombre,
            color: color,
            subtipo: subtipo,
          },
          geometry: {
            type: 'LineString' as const,
            coordinates: coords
          }
        };
      });

    console.log(`🎨 LOD ${lod}: ${features.length} routes, ${totalPoints} points`);

    return {
      type: 'FeatureCollection' as const,
      features: features
    };
  }, [visibleRoutes, config.zoom]);

  // Manejar hover con feature state
  useEffect(() => {
    if (!map) return;

    const handleMouseMove = (e: any) => {
      if (e.features && e.features.length > 0) {
        const feature = e.features[0];
        const codigo = feature.properties.codigo;
        
        if (hoveredRoute && hoveredRoute !== codigo) {
          map.setFeatureState(
            { source: 'nearby-routes-source', id: hoveredRoute },
            { hover: false }
          );
        }
        
        if (codigo) {
          map.setFeatureState(
            { source: 'nearby-routes-source', id: codigo },
            { hover: true }
          );
          setHoveredRoute(codigo);
        }
      }
    };

    const handleMouseLeave = () => {
      if (hoveredRoute) {
        map.setFeatureState(
          { source: 'nearby-routes-source', id: hoveredRoute },
          { hover: false }
        );
        setHoveredRoute(null);
      }
    };

    const handleMouseEnter = () => {
      if (map.getCanvas()) {
        map.getCanvas().style.cursor = 'pointer';
      }
    };

    const handleMouseLeaveCanvas = () => {
      if (map.getCanvas()) {
        map.getCanvas().style.cursor = '';
      }
    };

    map.on('mouseenter', 'nearby-routes-line', handleMouseEnter);
    map.on('mousemove', 'nearby-routes-line', handleMouseMove);
    map.on('mouseleave', 'nearby-routes-line', handleMouseLeave);
    map.on('mouseleave', 'nearby-routes-line', handleMouseLeaveCanvas);

    return () => {
      map.off('mouseenter', 'nearby-routes-line', handleMouseEnter);
      map.off('mousemove', 'nearby-routes-line', handleMouseMove);
      map.off('mouseleave', 'nearby-routes-line', handleMouseLeave);
      map.off('mouseleave', 'nearby-routes-line', handleMouseLeaveCanvas);
    };
  }, [map, hoveredRoute, setHoveredRoute]);

  // Return condicional DESPUÉS de todos los hooks
  if (!showNearbyOnMap || !nearbyRoutes || nearbyRoutes.length === 0 || selectedRoute) return null;

  const zoom = config.zoom;
  const showHitbox = zoom >= 12;

  return (
    <Source
      id="nearby-routes-source"
      type="geojson"
      data={routesFeatureCollection}
    >
      {showHitbox && (
        <Layer
          id="nearby-routes-hitbox"
          type="line"
          paint={{
            'line-color': ['get', 'color'],
            'line-width': 12,
            'line-opacity': 0,
          }}
        />
      )}
      <Layer
        id="nearby-routes-line"
        type="line"
        paint={{
          'line-color': ['get', 'color'],
          'line-width': [
            'case',
            ['boolean', ['feature-state', 'hover'], false],
            5,
            3
          ],
          'line-opacity': [
            'case',
            ['boolean', ['feature-state', 'hover'], false],
            1,
            0.6
          ],
        }}
        layout={{
          'line-cap': 'round',
          'line-join': 'round',
        }}
      />
    </Source>
  );
};
