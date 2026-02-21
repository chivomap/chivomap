import { useMemo } from 'react';
import { Source, Layer } from 'react-map-gl/maplibre';
import type { FeatureCollection } from 'geojson';
import { useRutasStore } from '../../store/rutasStore';
import { RUTA_COLORS, type SubtipoRuta } from '../../types/rutas';
import type { LineLayerSpecification, SymbolLayerSpecification } from 'maplibre-gl';
import { env } from '../../config/env';

export const RouteLayer = () => {
    const { selectedRoute, selectedRouteDirection } = useRutasStore();

    const geojsonData = useMemo<FeatureCollection | null>(() => {
        if (!selectedRoute) return null;

        return {
            type: 'FeatureCollection' as const,
            features: [{
                type: 'Feature' as const,
                geometry: selectedRoute.geometry,
                properties: {
                    ...selectedRoute.properties,
                    color: RUTA_COLORS[selectedRoute.properties.SUBTIPO as SubtipoRuta] || '#3b82f6',
                    isActive: true,
                }
            }]
        } as FeatureCollection;
    }, [selectedRoute, selectedRouteDirection]);

    if (!geojsonData || !selectedRoute) return null;

    // Key único para forzar re-render cuando cambia el sentido
    const sourceKey = `selected-route-${selectedRoute.properties.Código_de}-${selectedRoute.properties.SENTIDO}`;

    const baseLineStyle: LineLayerSpecification = {
        id: 'selected-route-base',
        type: 'line',
        source: 'selected-route',
        paint: {
            'line-color': ['get', 'color'],
            'line-width': 2.5,
            'line-opacity': 0.35,
            'line-dasharray': [1.5, 1.5],
        },
        layout: {
            'line-cap': 'round',
            'line-join': 'round',
        },
    };

    const activeLineStyle: LineLayerSpecification = {
        id: 'selected-route-line',
        type: 'line',
        source: 'selected-route',
        filter: ['==', ['get', 'isActive'], true],
        paint: {
            'line-color': ['get', 'color'],
            'line-width': 4,
            'line-opacity': 0.9,
        },
        layout: {
            'line-cap': 'round',
            'line-join': 'round',
        },
    };

    const activeOutlineStyle: LineLayerSpecification = {
        id: 'selected-route-outline',
        type: 'line',
        source: 'selected-route',
        filter: ['==', ['get', 'isActive'], true],
        paint: {
            'line-color': '#ffffff',
            'line-width': 6,
            'line-opacity': 0.5,
        },
        layout: {
            'line-cap': 'round',
            'line-join': 'round',
        },
    };

    const arrowStyle: SymbolLayerSpecification = {
        id: 'selected-route-arrows',
        type: 'symbol',
        source: 'selected-route',
        filter: ['==', ['get', 'isActive'], true],
        layout: {
            'symbol-placement': 'line',
            'symbol-spacing': 80,
            'icon-image': 'arrow',
            'icon-size': 0.6,
            'icon-rotate': 90,
            'icon-rotation-alignment': 'map',
            'icon-keep-upright': false,
            'icon-allow-overlap': true,
            'icon-ignore-placement': true,
        },
        paint: {
            'icon-opacity': 0.9,
        },
    };

    return (
        <Source key={sourceKey} id="selected-route" type="geojson" data={geojsonData}>
            <Layer {...baseLineStyle} />
            <Layer {...activeOutlineStyle} />
            <Layer {...activeLineStyle} />
            {env.FEATURE_ROUTE_ARROWS && <Layer {...arrowStyle} />}
        </Source>
    );
};

export default RouteLayer;
