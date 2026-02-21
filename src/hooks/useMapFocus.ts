import { useCallback } from 'react';

export interface FocusPoint {
  lat: number;
  lng: number;
}

export interface FocusOptions {
  zoom?: number;
  duration?: number;
  maxZoom?: number;
}

/**
 * Hook para centrar el mapa considerando UI overlays (panel lateral, bottom sheet, etc.)
 */
export const useMapFocus = () => {
  /**
   * Calcula el padding apropiado según el viewport y estado de la UI
   */
  const calculatePadding = useCallback(() => {
    const isMobile = window.innerWidth < 640;
    
    if (isMobile) {
      return {
        top: 100,      // Header + controles
        bottom: 250,   // Bottom sheet
        left: 40,      // Margen
        right: 40      // Margen
      };
    }
    
    // Desktop
    return {
      top: 80,       // Header
      bottom: 80,    // Margen
      left: 450,     // Panel lateral + margen
      right: 80      // Margen
    };
  }, []);

  /**
   * Calcula el offset para easeTo (un solo punto)
   */
  const calculateOffset = useCallback((): [number, number] => {
    const isMobile = window.innerWidth < 640;
    return isMobile ? [0, -50] : [150, 0];
  }, []);

  /**
   * Enfoca un solo punto en el mapa
   */
  const focusPoint = useCallback((point: FocusPoint, options: FocusOptions = {}) => {
    const { zoom = 15, duration = 1000 } = options;
    
    const event = new CustomEvent('map-focus-point', {
      detail: {
        point,
        zoom,
        duration,
        offset: calculateOffset()
      }
    });
    
    window.dispatchEvent(event);
  }, [calculateOffset]);

  /**
   * Enfoca múltiples puntos en el mapa (fitBounds)
   */
  const focusPoints = useCallback((points: FocusPoint[], options: FocusOptions = {}) => {
    const { duration = 1000, maxZoom = 15 } = options;
    
    const event = new CustomEvent('map-focus-points', {
      detail: {
        points,
        padding: calculatePadding(),
        duration,
        maxZoom
      }
    });
    
    window.dispatchEvent(event);
  }, [calculatePadding]);

  /**
   * Enfoca un área (bounds)
   */
  const focusArea = useCallback((
    southwest: FocusPoint,
    northeast: FocusPoint,
    options: FocusOptions = {}
  ) => {
    focusPoints([southwest, northeast], options);
  }, [focusPoints]);

  return {
    focusPoint,
    focusPoints,
    focusArea,
    calculatePadding,
    calculateOffset
  };
};
