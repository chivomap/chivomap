'use client';
import { create } from 'zustand';
// Optimization: Use named imports to enable tree-shaking and reduce bundle size
import { bbox as calcBbox, bboxPolygon as calcBboxPolygon, center as calcCenter, distance, point } from '@turf/turf';
import { LngLat } from 'maplibre-gl';
import { FeatureCollection, MultiPolygon } from 'geojson';
import { FeatureProperties } from '../types/feature-propoerties';
import { env, isDevelopment } from '../config/env';

interface MapState {
  config: MapConfigOptions;
  updateConfig: (newConfig: MapConfigOptions) => void;
  geojson: FeatureCollection<MultiPolygon, FeatureProperties> | null;
  updateGeojson: (newGeojson: FeatureCollection<MultiPolygon, FeatureProperties> | null) => void;
  polygon: LngLat[];
  updatePolygon: (newPolygon: LngLat[]) => void;
  selectedInfo: { type: string; name: string; data?: any } | null;
  setSelectedInfo: (info: { type: string; name: string; data?: any } | null) => void;
  currentLevel: 'departamento' | 'municipio' | 'distrito';
  setCurrentLevel: (level: 'departamento' | 'municipio' | 'distrito') => void;
  parentInfo: { departamento?: string; municipio?: string } | null;
  setParentInfo: (info: { departamento?: string; municipio?: string } | null) => void;
  previousGeojson: FeatureCollection<MultiPolygon, FeatureProperties> | null;
  setPreviousGeojson: (geojson: FeatureCollection<MultiPolygon, FeatureProperties> | null) => void;
  departamentoGeojson: FeatureCollection<MultiPolygon, FeatureProperties> | null;
  setDepartamentoGeojson: (geojson: FeatureCollection<MultiPolygon, FeatureProperties> | null) => void;
}

interface MapConfigOptions {
  center: { lat: number; lng: number };
  zoom: number;
}

export const useMapStore = create<MapState>((set) => ({
  config: {
    center: { lat: env.MAP_DEFAULT_LAT, lng: env.MAP_DEFAULT_LNG },
    zoom: env.MAP_DEFAULT_ZOOM,
  },
  updateConfig: (newConfig) => set(() => ({ config: newConfig })),

  geojson: null,
  updateGeojson: (newGeojson) => {
    try {
      if (!newGeojson) {
        set(() => ({ geojson: null }));
        return;
      }
      
      if (newGeojson && Array.isArray(newGeojson.features) && newGeojson.features.length > 0) {
        // Validate GeoJSON features before processing
        const validFeatures = newGeojson.features.filter(feature => 
          feature && 
          feature.geometry && 
          feature.geometry.coordinates &&
          Array.isArray(feature.geometry.coordinates)
        );

        if (validFeatures.length === 0) {
          if (isDevelopment && env.ENABLE_CONSOLE_LOGS) {
            console.warn('No valid features found in GeoJSON');
          }
          return;
        }

        // Create a clean GeoJSON with only valid features
        const cleanGeojson = {
          ...newGeojson,
          features: validFeatures
        };

        // Set geojson first
        set(() => ({ geojson: cleanGeojson }));

        // Calculate zoom asynchronously to avoid blocking
        requestAnimationFrame(() => {
          try {
            const bbox = calcBbox(cleanGeojson);
            const bboxPolygon = calcBboxPolygon(bbox);
            const center = calcCenter(bboxPolygon);
            const centerCoords = center.geometry.coordinates as [number, number];
            
            const diagonal = distance(
              point([bbox[0], bbox[1]]),
              point([bbox[2], bbox[3]]),
              { units: 'kilometers' }
            );
            
            const worldWidthKm = 40075;
            const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 1024;
            const screenHeight = typeof window !== 'undefined' ? window.innerHeight : 768;
            const mapWidthInKmAtZoom0 = worldWidthKm / Math.pow(2, 0);
            const aspectRatio = screenWidth / screenHeight;
            const zoom = Math.log2((mapWidthInKmAtZoom0 * aspectRatio) / diagonal);
            
            // Validate calculated values
            if (isNaN(centerCoords[0]) || isNaN(centerCoords[1]) || isNaN(zoom)) {
              throw new Error('Invalid coordinates or zoom calculation');
            }
            
            if (isDevelopment && env.ENABLE_CONSOLE_LOGS) {
              console.log(`Calculated zoom: ${zoom}`);
            }
            
            set(() => ({
              config: {
                center: { lat: centerCoords[1], lng: centerCoords[0] },
                zoom: Math.max(env.MAP_MIN_ZOOM, Math.min(18, Math.round(zoom))),
              },
            }));
          } catch (error) {
            if (isDevelopment && env.ENABLE_CONSOLE_LOGS) {
              console.error('Error calculating zoom:', error);
            }
          }
        });
        
      } else {
        if (isDevelopment && env.ENABLE_CONSOLE_LOGS) {
          console.warn('GeoJSON inválido o vacío proporcionado');
        }
      }
    } catch (error) {
      if (isDevelopment && env.ENABLE_CONSOLE_LOGS) {
        console.error('Error procesando GeoJSON:', error);
      }
      // Reset to default config on error
      set(() => ({
        config: {
          center: { lat: env.MAP_DEFAULT_LAT, lng: env.MAP_DEFAULT_LNG },
          zoom: env.MAP_DEFAULT_ZOOM,
        },
      }));
    }
  },

  polygon: [],
  updatePolygon: (newPolygon) => set(() => ({ polygon: newPolygon })),

  selectedInfo: null,
  setSelectedInfo: (info) => set(() => ({ selectedInfo: info })),

  currentLevel: 'departamento',
  setCurrentLevel: (level) => set(() => ({ currentLevel: level })),

  parentInfo: null,
  setParentInfo: (info) => set(() => ({ parentInfo: info })),

  previousGeojson: null,
  setPreviousGeojson: (geojson) => set(() => ({ previousGeojson: geojson })),

  departamentoGeojson: null,
  setDepartamentoGeojson: (geojson) => set(() => ({ departamentoGeojson: geojson })),
}));
