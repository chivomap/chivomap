import { env, isDevelopment } from '../config/env';
import { errorHandler } from '../errors/ErrorHandler';
import { createNetworkError } from '../errors/AppError';
import type {
    NearbyResponse,
    SearchResponse,
    RutaDetailResponse,
    RutaFeature,
    RutasMetadataResponse,
    ListResponse
} from '../types/rutas';

const API_BASE = `${env.API_URL}/rutas`;

/**
 * Check network status before making request
 */
const checkNetwork = () => {
    if (!navigator.onLine) {
        throw createNetworkError('No hay conexión a internet');
    }
};

/**
 * Obtiene rutas cercanas a una ubicación
 */
export const getNearbyRoutes = async (
    lat: number,
    lng: number,
    radius?: number // Opcional, undefined = búsqueda automática
): Promise<NearbyResponse> => {
    try {
        checkNetwork();
        
        // Si radius es undefined, no enviar el parámetro (búsqueda automática)
        const radiusParam = radius !== undefined ? `&radius=${radius}` : '';
        const url = `${API_BASE}/nearby?lat=${lat}&lng=${lng}${radiusParam}`;

        if (isDevelopment && env.ENABLE_CONSOLE_LOGS) {
            console.log('Fetching nearby routes:', url);
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), env.API_TIMEOUT);

        const response = await fetch(url, {
            method: 'GET',
            signal: controller.signal,
            headers: { 'Accept': 'application/json' },
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            throw createNetworkError(
                `HTTP ${response.status}: ${response.statusText}`,
                `HTTP_${response.status}`
            );
        }

        const data: NearbyResponse = await response.json();

        if (isDevelopment && env.ENABLE_CONSOLE_LOGS) {
            console.log(`Found ${data.count} nearby routes`);
        }

        return data;
    } catch (error) {
        errorHandler.handle(error);
        return {
            location: { lat, lng },
            radius_km: radius || 0,
            count: 0,
            routes: []
        };
    }
};

/**
 * Busca rutas por nombre o código
 */
export const searchRoutes = async (query: string): Promise<SearchResponse> => {
    try {
        checkNetwork();
        
        const url = `${API_BASE}/search?q=${encodeURIComponent(query)}`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), env.API_TIMEOUT);

        const response = await fetch(url, {
            method: 'GET',
            signal: controller.signal,
            headers: { 'Accept': 'application/json' },
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            throw createNetworkError(
                `HTTP ${response.status}: ${response.statusText}`,
                `HTTP_${response.status}`
            );
        }

        return await response.json();
    } catch (error) {
        errorHandler.handle(error);
        return { query, count: 0, results: [] };
    }
};

/**
 * Obtiene una ruta específica con geometría completa
 */
export const getRouteByCode = async (
    codigo: string,
    retries = 2,
    delay = 500
): Promise<RutaDetailResponse | null> => {
    checkNetwork();
    
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const url = `${API_BASE}/${encodeURIComponent(codigo)}`;

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), env.API_TIMEOUT);

            const response = await fetch(url, {
                method: 'GET',
                signal: controller.signal,
                headers: { 'Accept': 'application/json' },
            });

            clearTimeout(timeoutId);

            if (response.status === 429 && attempt < retries) {
                await new Promise(resolve => setTimeout(resolve, delay * (attempt + 1)));
                continue;
            }

            if (!response.ok) {
                if (response.status === 404) return null;
                throw createNetworkError(
                    `HTTP ${response.status}: ${response.statusText}`,
                    `HTTP_${response.status}`
                );
            }

            return await response.json();
        } catch (error) {
            if (attempt === retries) {
                errorHandler.handle(error);
                return null;
            }
        }
    }
    return null;
};

/**
 * Obtiene múltiples rutas en una sola petición con retry automático
 */
export const getRoutesBatch = async (
    codes: string[], 
    retries = 3, 
    delay = 1000
): Promise<Record<string, RutaFeature[]>> => {
    checkNetwork();
    
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const url = `${API_BASE}/batch`;

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), env.API_TIMEOUT);

            const response = await fetch(url, {
                method: 'POST',
                signal: controller.signal,
                headers: { 
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(codes),
            });

            clearTimeout(timeoutId);

            if (response.status === 429 && attempt < retries) {
                await new Promise(resolve => setTimeout(resolve, delay * (attempt + 1)));
                continue;
            }

            if (!response.ok) {
                throw createNetworkError(
                    `HTTP ${response.status}: ${response.statusText}`,
                    `HTTP_${response.status}`
                );
            }

            return await response.json();
        } catch (error) {
            if (attempt === retries) {
                errorHandler.handle(error);
                return {};
            }
        }
    }
    return {};
};

/**
 * Obtiene metadatos para filtros (departamentos, tipos, subtipos)
 */
export const getRoutesMetadata = async (): Promise<RutasMetadataResponse> => {
    try {
        const url = `${API_BASE}/metadata`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), env.API_TIMEOUT);

        const response = await fetch(url, {
            method: 'GET',
            signal: controller.signal,
            headers: { 'Accept': 'application/json' },
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            throw createNetworkError(
                `HTTP ${response.status}: ${response.statusText}`,
                `HTTP_${response.status}`
            );
        }

        return await response.json();
    } catch (error) {
        errorHandler.handle(error);
        return { departamentos: [], tipos: [], subtipos: [] };
    }
};

/**
 * Lista rutas con filtros opcionales
 */
export const listRoutes = async (filters?: {
    departamento?: string;
    tipo?: string;
    subtipo?: string;
}): Promise<ListResponse> => {
    try {
        const params = new URLSearchParams();
        if (filters?.departamento) params.append('departamento', filters.departamento);
        if (filters?.tipo) params.append('tipo', filters.tipo);
        if (filters?.subtipo) params.append('subtipo', filters.subtipo);

        const url = `${API_BASE}?${params.toString()}`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), env.API_TIMEOUT);

        const response = await fetch(url, {
            method: 'GET',
            signal: controller.signal,
            headers: { 'Accept': 'application/json' },
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            throw createNetworkError(
                `HTTP ${response.status}: ${response.statusText}`,
                `HTTP_${response.status}`
            );
        }

        return await response.json();
    } catch (error) {
        errorHandler.handle(error);
        return {
            filters: { departamento: '', tipo: '', subtipo: '' },
            count: 0,
            results: []
        };
    }
};
