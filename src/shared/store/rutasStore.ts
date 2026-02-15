import { create } from 'zustand';
import type {
    RutaNearby,
    RutaFeature,
    RutasMetadataResponse,
    RutaMetadata
} from '../types/rutas';
import {
    getNearbyRoutes,
    getRouteByCode,
    getRoutesMetadata,
    listRoutes
} from '../services/GetRutasData';
import { useParadasStore } from './paradasStore';

interface RutasState {
    // Data
    allRoutes: RutaMetadata[];
    nearbyRoutes: RutaNearby[];
    selectedRoute: RutaFeature | null;
    selectedRouteVariants: RutaFeature[];
    selectedRouteDirection: 'IDA' | 'REGRESO' | null;
    metadata: RutasMetadataResponse | null;
    hoveredRoute: string | null;
    overlappingRoutes: string[] | null;

    // Location
    searchLocation: { lat: number; lng: number } | null;
    searchRadius: number;

    // UI State
    isLoading: boolean;
    showNearbyOnMap: boolean;
    error: string | null;

    // Actions
    fetchAllRoutes: () => Promise<void>;
    fetchNearbyRoutes: (lat: number, lng: number, radius?: number) => Promise<void>;
    selectRoute: (codigo: string) => Promise<void>;
    setSelectedRouteDirection: (direction: 'IDA' | 'REGRESO' | null) => void;
    clearSelectedRoute: () => void;
    clearNearbyRoutes: () => void;
    fetchMetadata: () => Promise<void>;
    setRadius: (radius: number) => void;
    setShowNearbyOnMap: (show: boolean) => void;
    setError: (error: string | null) => void;
    setHoveredRoute: (codigo: string | null) => void;
    setOverlappingRoutes: (routes: string[] | null) => void;
}

export const useRutasStore = create<RutasState>((set, get) => ({
    // Initial state
    allRoutes: [],
    nearbyRoutes: [],
    selectedRoute: null,
    selectedRouteVariants: [],
    selectedRouteDirection: null,
    metadata: null,
    hoveredRoute: null,
    overlappingRoutes: null,
    searchLocation: null,
    searchRadius: 0.5,
    isLoading: false,
    showNearbyOnMap: true, // Always show by default
    error: null,

    fetchAllRoutes: async () => {
        // Evitar recargar si ya hay datos
        if (get().allRoutes.length > 0) return;

        set({ isLoading: true });
        try {
            // Llamar sin filtros para traer todo
            const response = await listRoutes();
            set({ allRoutes: response.results, isLoading: false });
        } catch {
            console.error('Error fetching all routes for cache');
            set({ isLoading: false });
            // No seteamos error global para no interrumpir otras interacciones
        }
    },

    fetchNearbyRoutes: async (lat: number, lng: number, radius?: number) => {
        const startTime = Date.now();
        console.log(`[${new Date().toISOString()}] 🔄 fetchNearbyRoutes started`);
        
        // Si radius es undefined, usar undefined (búsqueda automática)
        // Si radius es un número, usarlo
        const r = radius;
        set({ isLoading: true, error: null, searchLocation: { lat, lng } });

        try {
            console.log(`[${new Date().toISOString()}] 📞 Calling API getNearbyRoutes...`);
            const response = await getNearbyRoutes(lat, lng, r);
            const apiTime = Date.now();
            console.log(`[${new Date().toISOString()}] ✅ API response received (took ${apiTime - startTime}ms):`, response?.routes?.length || 0, 'routes');
            console.log(`[${new Date().toISOString()}] 📏 Backend returned radius:`, response?.radius_km, 'km');
            
            set({
                nearbyRoutes: response?.routes || [], // Siempre actualizar, incluso si está vacío
                searchRadius: response?.radius_km || 0.5, // Actualizar con el radio devuelto por el backend
                isLoading: false
            });
            console.log(`[${new Date().toISOString()}] ✅ Store updated with radius:`, response?.radius_km || 0.5, 'km (total:', Date.now() - startTime, 'ms)');
        } catch (error) {
            console.error(`[${new Date().toISOString()}] ❌ fetchNearbyRoutes error (took ${Date.now() - startTime}ms):`, error);
            set({
                nearbyRoutes: [], // Limpiar rutas en caso de error
                error: 'Error al buscar rutas cercanas',
                isLoading: false
            });
        }
    },

    selectRoute: async (codigo: string) => {
        set({ isLoading: true, error: null });
        
        // Limpiar solo paradas de ruta anterior, mantener nearbyParadas si existen
        useParadasStore.getState().clearParadasByRuta();

        try {
            const routeDetail = await getRouteByCode(codigo);
            if (routeDetail && routeDetail.routes.length > 0) {
                const variants = routeDetail.routes;
                const preferred = variants.find(route => route.properties.SENTIDO?.toUpperCase() === 'IDA') || variants[0];
                const preferredDirection = preferred.properties.SENTIDO?.toUpperCase();
                const direction = preferredDirection === 'REGRESO'
                    ? 'REGRESO'
                    : preferredDirection === 'IDA'
                        ? 'IDA'
                        : null;

                set({
                    selectedRoute: preferred,
                    selectedRouteVariants: variants,
                    selectedRouteDirection: direction,
                    isLoading: false
                });
                // Cargar paradas de esta ruta
                await useParadasStore.getState().fetchParadasByRuta(codigo);
            } else {
                set({
                    selectedRoute: null,
                    selectedRouteVariants: [],
                    selectedRouteDirection: null,
                    error: 'Ruta no encontrada',
                    isLoading: false
                });
            }
        } catch {
            set({
                selectedRoute: null,
                selectedRouteVariants: [],
                selectedRouteDirection: null,
                error: 'Error al cargar la ruta',
                isLoading: false
            });
        }
    },

    setSelectedRouteDirection: (direction: 'IDA' | 'REGRESO' | null) => {
        const variants = get().selectedRouteVariants;
        if (!variants || variants.length === 0) {
            set({ selectedRoute: null, selectedRouteDirection: direction });
            return;
        }

        if (!direction) {
            set({ selectedRoute: variants[0], selectedRouteDirection: null });
            return;
        }

        const match = variants.find(route => route.properties.SENTIDO?.toUpperCase() === direction);
        if (match) {
            set({ selectedRoute: match, selectedRouteDirection: direction });
        }
    },

    clearSelectedRoute: () => {
        set({ selectedRoute: null, selectedRouteVariants: [], selectedRouteDirection: null });
        // Limpiar paradas de la ruta
        useParadasStore.getState().clearParadasByRuta();
    },

    clearNearbyRoutes: () => {
        set({
            nearbyRoutes: [],
            searchLocation: null
        });
        // Limpiar paradas también
        useParadasStore.getState().clearNearbyParadas();
    },

    fetchMetadata: async () => {
        const metadata = await getRoutesMetadata();
        set({ metadata });
    },

    setRadius: (radius: number) => {
        set({ searchRadius: Math.min(Math.max(radius, 0.5), 10) });
    },

    setShowNearbyOnMap: (show: boolean) => {
        set({ showNearbyOnMap: show });
    },

    setError: (error: string | null) => {
        set({ error });
    },

    setHoveredRoute: (codigo: string | null) => {
        set({ hoveredRoute: codigo });
    },

    setOverlappingRoutes: (routes: string[] | null) => {
        set({ overlappingRoutes: routes });
    },
}));
