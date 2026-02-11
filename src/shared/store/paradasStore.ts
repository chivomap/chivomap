import { create } from 'zustand';
import type { Parada } from '../types/paradas';
import { getNearbyParadas, getParadasByRuta } from '../services/GetParadasData';

interface ParadasState {
  // Data
  nearbyParadas: Parada[];
  paradasByRuta: Parada[];
  selectedParada: Parada | null;
  
  // Location
  searchLocation: { lat: number; lng: number } | null;
  searchRadius: number;
  
  // UI State
  isLoading: boolean;
  showParadasOnMap: boolean;
  error: string | null;
  
  // Actions
  fetchNearbyParadas: (lat: number, lng: number, radius?: number) => Promise<void>;
  fetchParadasByRuta: (codigoRuta: string) => Promise<void>;
  setSelectedParada: (parada: Parada | null) => void;
  clearNearbyParadas: () => void;
  clearParadasByRuta: () => void;
  setShowParadasOnMap: (show: boolean) => void;
  setRadius: (radius: number) => void;
}

export const useParadasStore = create<ParadasState>((set) => ({
  // Initial state
  nearbyParadas: [],
  paradasByRuta: [],
  selectedParada: null,
  searchLocation: null,
  searchRadius: 0.5,
  isLoading: false,
  showParadasOnMap: true,
  error: null,

  fetchNearbyParadas: async (lat: number, lng: number, radius?: number) => {
    const startTime = Date.now();
    console.log(`[${new Date().toISOString()}] 🔄 fetchNearbyParadas started`);
    
    // Si radius es undefined, usar undefined (búsqueda automática)
    const r = radius;
    set({ isLoading: true, error: null, searchLocation: { lat, lng } });

    try {
      console.log(`[${new Date().toISOString()}] 📞 Calling API getNearbyParadas...`);
      const response = await getNearbyParadas(lat, lng, r);
      const apiTime = Date.now();
      console.log(`[${new Date().toISOString()}] ✅ API response received (took ${apiTime - startTime}ms):`, response?.paradas?.length || 0, 'paradas');
      
      set({
        nearbyParadas: response?.paradas || [],
        searchRadius: response?.radius_km || 0.5, // Actualizar con el radio devuelto por el backend
        isLoading: false,
      });
      console.log(`[${new Date().toISOString()}] ✅ Store updated (total: ${Date.now() - startTime}ms)`);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ fetchNearbyParadas error (took ${Date.now() - startTime}ms):`, error);
      set({
        nearbyParadas: [], // Limpiar paradas en caso de error
        error: 'Error al buscar paradas cercanas',
        isLoading: false,
      });
    }
  },

  fetchParadasByRuta: async (codigoRuta: string) => {
    set({ isLoading: true, error: null });

    try {
      const response = await getParadasByRuta(codigoRuta);
      set({
        paradasByRuta: response.paradas,
        isLoading: false,
      });
    } catch (error) {
      console.error('Error fetching paradas:', error);
      set({
        error: 'Error al obtener paradas de la ruta',
        isLoading: false,
      });
    }
  },

  setSelectedParada: (parada: Parada | null) => {
    set({ selectedParada: parada });
  },

  clearNearbyParadas: () => {
    set({
      nearbyParadas: [],
      searchLocation: null,
      selectedParada: null,
    });
  },

  clearParadasByRuta: () => {
    set({
      paradasByRuta: [],
    });
  },

  setShowParadasOnMap: (show: boolean) => {
    set({ showParadasOnMap: show });
  },

  setRadius: (radius: number) => {
    set({ searchRadius: Math.min(Math.max(radius, 0.5), 5) });
  },
}));
