import { useMemo } from 'react';
import { Source, Layer } from 'react-map-gl/maplibre';
import type { FeatureCollection, Geometry } from 'geojson';
import { useRutasStore } from '../../store/rutasStore';
import { RUTA_COLORS, type SubtipoRuta } from '../../types/rutas';
import type { LineLayerSpecification, SymbolLayerSpecification } from 'maplibre-gl';

const getDirectionalGeometry = (geometry: Geometry, sentido?: string) => {
    const direction = sentido?.toUpperCase();
    if (direction !== 'REGRESO') return geometry;

    if (geometry.type === 'LineString') {
        return {
            ...geometry,
            coordinates: [...geometry.coordinates].reverse(),
        } as Geometry;
    }

    if (geometry.type === 'MultiLineString') {
        return {
            ...geometry,
            coordinates: geometry.coordinates.map((line) => [...line].reverse()),
        } as Geometry;
    }

    return geometry;
};

export const RouteLayer = () => {
    const { selectedRoute, selectedRouteVariants } = useRutasStore();

    const geojsonData = useMemo<FeatureCollection | null>(() => {
        const routes = selectedRouteVariants.length > 0
            ? selectedRouteVariants
            : selectedRoute
                ? [selectedRoute]
                : [];

        if (routes.length === 0) return null;

        const activeSentido = selectedRoute?.properties.SENTIDO?.toUpperCase();
        const fallbackSentido = routes[0]?.properties.SENTIDO?.toUpperCase();
        const activeKey = activeSentido || fallbackSentido;

        return {
            type: 'FeatureCollection' as const,
            features: routes.map((route, index) => {
                const subtipo = route.properties.SUBTIPO as SubtipoRuta;
                const color = RUTA_COLORS[subtipo] || '#3b82f6';
                const sentido = route.properties.SENTIDO?.toUpperCase();

                return {
                    type: 'Feature' as const,
                    geometry: getDirectionalGeometry(route.geometry as unknown as Geometry, route.properties.SENTIDO),
                    properties: {
                        ...route.properties,
                        color,
                        isActive: activeKey ? sentido === activeKey : index === 0,
                    }
                };
            })
        } as FeatureCollection;
    }, [selectedRoute, selectedRouteVariants]);

    if (!geojsonData) return null;

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
            'symbol-spacing': 80,        // Más frecuentes (antes: 100)
            'icon-image': 'arrow',
            'icon-size': 0.6,            // Más grandes (antes: 0.5)
            'icon-rotate': 90,
            'icon-rotation-alignment': 'map',
            'icon-keep-upright': false,
            'icon-allow-overlap': true,
            'icon-ignore-placement': true,
        },
        paint: {
            'icon-opacity': 0.9,         // Más opacas (antes: 0.8)
        },
    };

    return (
        <Source id="selected-route" type="geojson" data={geojsonData}>
            <Layer {...baseLineStyle} />
            <Layer {...activeOutlineStyle} />
            <Layer {...activeLineStyle} />
            <Layer {...arrowStyle} />
        </Source>
    );
};

export default RouteLayer;
