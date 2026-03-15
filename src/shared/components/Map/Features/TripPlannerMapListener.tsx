import React, { useEffect } from 'react';
import { useMap } from 'react-map-gl/maplibre';
import { useTripPlannerStore } from '../../../store/tripPlannerStore';
import { useBottomSheetStore } from '../../../store/bottomSheetStore';
import { reverseGeocode } from '../../../api/search';

export const TripPlannerMapListener: React.FC = () => {
  const { current: map } = useMap();
  const { isSelectingOrigin, isSelectingDestination, setOrigin, setDestination, setIsSelectingOrigin, setIsSelectingDestination } = useTripPlannerStore();
  const { setSheetState } = useBottomSheetStore();

  useEffect(() => {
    if (!map) return;

    const handleClick = async (e: any) => {
      const { lat, lng } = e.lngLat;
      const coords = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      const setter = isSelectingOrigin ? setOrigin : setDestination;

      // Poner coordenadas inmediatamente y cerrar modo selección
      setter({ lat, lng, name: coords });
      setIsSelectingOrigin(false);
      setIsSelectingDestination(false);
      setSheetState('full');

      // Reverse geocoding en background para reemplazar con nombre legible
      try {
        const result = await reverseGeocode(lat, lng) as any;
        // El API puede devolver { results: [...] } o un objeto directo
        const place = result.results?.[0] ?? result;
        const name = place.display_name || place.name;
        if (name) {
          setter({ lat, lng, name });
        }
      } catch {
        // Mantener coordenadas como fallback
      }
    };

    if (isSelectingOrigin || isSelectingDestination) {
      map.getCanvas().style.cursor = 'crosshair';
      map.on('click', handleClick);
    } else {
      map.getCanvas().style.cursor = '';
    }

    return () => {
      map.off('click', handleClick);
      map.getCanvas().style.cursor = '';
    };
  }, [map, isSelectingOrigin, isSelectingDestination, setOrigin, setDestination, setIsSelectingOrigin, setIsSelectingDestination, setSheetState]);

  return null;
};
