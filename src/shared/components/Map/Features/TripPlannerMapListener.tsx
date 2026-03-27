import React, { useEffect } from 'react';
import { useMap } from 'react-map-gl/maplibre';
import { useTripPlannerStore } from '../../../store/tripPlannerStore';
import { useBottomSheetStore } from '../../../store/bottomSheetStore';
import { reverseGeocode } from '../../../api/search';

export const TripPlannerMapListener: React.FC = () => {
  const { current: map } = useMap();
  const {
    isSelectingOrigin, isSelectingDestination,
    focusedInput,
    setOrigin, setDestination,
    setIsSelectingOrigin, setIsSelectingDestination, setFocusedInput,
  } = useTripPlannerStore();
  const { setSheetState } = useBottomSheetStore();

  // Modo explícito: botones "Seleccionar en mapa" (mobile)
  const isExplicitSelecting = isSelectingOrigin || isSelectingDestination;
  // Modo implícito: input con foco (desktop - click en mapa asigna al campo enfocado)
  const isImplicitSelecting = !isExplicitSelecting && focusedInput !== null;
  const isActive = isExplicitSelecting || isImplicitSelecting;

  useEffect(() => {
    if (!map || !isActive) {
      map?.getCanvas().style.cursor && (map.getCanvas().style.cursor = '');
      return;
    }

    const handleClick = async (e: any) => {
      const { lat, lng } = e.lngLat;
      const coords = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;

      // Determinar si es origen o destino
      const isOrigin = isSelectingOrigin || (!isSelectingDestination && focusedInput === 'origin');
      const setter = isOrigin ? setOrigin : setDestination;

      // Poner coordenadas inmediatamente y cerrar modos de selección
      setter({ lat, lng, name: coords });
      setIsSelectingOrigin(false);
      setIsSelectingDestination(false);
      setFocusedInput(null);

      if (isExplicitSelecting) {
        setSheetState('full');
      }

      // Reverse geocoding en background para reemplazar con nombre legible
      try {
        const result = await reverseGeocode(lat, lng) as any;
        const place = result.results?.[0] ?? result;
        const name = place.display_name || place.name;
        if (name) {
          setter({ lat, lng, name });
        }
      } catch {
        // Mantener coordenadas como fallback
      }
    };

    if (isExplicitSelecting) {
      map.getCanvas().style.cursor = 'crosshair';
    }
    map.on('click', handleClick);

    return () => {
      map.off('click', handleClick);
      map.getCanvas().style.cursor = '';
    };
  }, [map, isActive, isExplicitSelecting, isSelectingOrigin, isSelectingDestination, focusedInput, setOrigin, setDestination, setIsSelectingOrigin, setIsSelectingDestination, setFocusedInput, setSheetState]);

  return null;
};
