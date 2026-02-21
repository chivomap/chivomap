import { useCallback } from 'react';
import { useBottomSheetStore } from '../shared/store/bottomSheetStore';

export interface FocusPoint {
  lat: number;
  lng: number;
}

export interface FocusOptions {
  zoom?: number;
  duration?: number;
  maxZoom?: number;
  sheetWillBeHalf?: boolean; // Si la acción abrirá el drawer a half
}

/**
 * Hook para centrar el mapa considerando UI overlays (panel lateral, bottom sheet, etc.)
 */
export const useMapFocus = () => {
  const { sheetState } = useBottomSheetStore();

  /**
   * Calcula el padding apropiado según el viewport y estado de la UI
   */
  const calculatePadding = useCallback((willBeHalf = false) => {
    const isMobile = window.innerWidth < 640;
    
    if (isMobile) {
      // Determinar altura del drawer
      let bottomPadding = 180; // peek default
      
      const effectiveState = willBeHalf ? 'half' : sheetState;
      
      if (effectiveState === 'half') {
        bottomPadding = window.innerHeight * 0.48; // 48% de pantalla (antes 52%)
      } else if (effectiveState === 'full') {
        bottomPadding = window.innerHeight * 0.85;
      }
      
      return {
        top: 100, // Más espacio arriba (antes 80)
        bottom: bottomPadding,
        left: 20,
        right: 20
      };
    }
    
    // Desktop
    return {
      top: 80,
      bottom: 80,
      left: 400,
      right: 80
    };
  }, [sheetState]);

  /**
   * Calcula el offset para easeTo (un solo punto)
   */
  const calculateOffset = useCallback((willBeHalf = false): [number, number] => {
    const isMobile = window.innerWidth < 640;
    
    if (!isMobile) return [120, 0];
    
    // En mobile, offset depende del estado del drawer
    const effectiveState = willBeHalf ? 'half' : sheetState;
    
    if (effectiveState === 'half') {
      return [0, -window.innerHeight * 0.18]; // Mueve hacia arriba 18% (antes 12%)
    } else if (effectiveState === 'full') {
      return [0, -window.innerHeight * 0.25];
    }
    
    return [0, -50]; // peek
  }, [sheetState]);

  /**
   * Enfoca un solo punto en el mapa
   */
  const focusPoint = useCallback((point: FocusPoint, options: FocusOptions = {}) => {
    const { zoom = 15, duration = 1000, sheetWillBeHalf = false } = options;
    
    const event = new CustomEvent('map-focus-point', {
      detail: {
        point,
        zoom,
        duration,
        offset: calculateOffset(sheetWillBeHalf)
      }
    });
    
    window.dispatchEvent(event);
  }, [calculateOffset]);

  /**
   * Enfoca múltiples puntos en el mapa (fitBounds)
   */
  const focusPoints = useCallback((points: FocusPoint[], options: FocusOptions = {}) => {
    const { duration = 1000, maxZoom = 15, sheetWillBeHalf = false } = options;
    
    console.log('🎯 focusPoints called:', { points, maxZoom, sheetWillBeHalf });
    
    const event = new CustomEvent('map-focus-points', {
      detail: {
        points,
        padding: calculatePadding(sheetWillBeHalf),
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
