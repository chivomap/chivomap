import React, { useEffect } from 'react';
import { useMap } from 'react-map-gl/maplibre';
import { useTripPlannerStore } from '../../../store/tripPlannerStore';

export const TripPlannerMapListener: React.FC = () => {
  const { current: map } = useMap();
  const { isSelectingOrigin, isSelectingDestination, setOrigin, setDestination, setIsSelectingOrigin, setIsSelectingDestination } = useTripPlannerStore();

  useEffect(() => {
    if (!map) return;

    const handleClick = (e: any) => {
      if (isSelectingOrigin) {
        setOrigin({
          lat: e.lngLat.lat,
          lng: e.lngLat.lng,
          name: `${e.lngLat.lat.toFixed(4)}, ${e.lngLat.lng.toFixed(4)}`
        });
        setIsSelectingOrigin(false);
      } else if (isSelectingDestination) {
        setDestination({
          lat: e.lngLat.lat,
          lng: e.lngLat.lng,
          name: `${e.lngLat.lat.toFixed(4)}, ${e.lngLat.lng.toFixed(4)}`
        });
        setIsSelectingDestination(false);
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
  }, [map, isSelectingOrigin, isSelectingDestination, setOrigin, setDestination, setIsSelectingOrigin, setIsSelectingDestination]);

  return null;
};
