import React, { useState, useEffect } from 'react';
import { useMap } from 'react-map-gl/maplibre';

export const MapScale: React.FC = () => {
  const { current: map } = useMap();
  const [scale, setScale] = useState<string>('');

  useEffect(() => {
    if (!map) return;

    const updateScale = () => {
      const zoom = map.getZoom();
      const lat = map.getCenter().lat;
      
      // Calculate scale based on zoom and latitude
      const metersPerPixel = 156543.03392 * Math.cos(lat * Math.PI / 180) / Math.pow(2, zoom);
      const scaleWidth = 100; // pixels
      const scaleMeters = metersPerPixel * scaleWidth;
      
      let scaleText = '';
      if (scaleMeters >= 1000) {
        scaleText = `${Math.round(scaleMeters / 1000)} km`;
      } else {
        scaleText = `${Math.round(scaleMeters)} m`;
      }
      
      setScale(scaleText);
    };

    map.on('zoomend', updateScale);
    map.on('moveend', updateScale);
    updateScale();

    return () => {
      map.off('zoomend', updateScale);
      map.off('moveend', updateScale);
    };
  }, [map]);

  if (!scale) return null;

  return (
    <div className="hidden sm:block absolute bottom-4 left-1/2 transform -translate-x-1/2 sm:left-4 sm:transform-none z-10">
      <div className="bg-primary/90 backdrop-blur-sm rounded px-2 py-1 shadow-lg">
        <div className="flex items-center gap-2">
          <div className="w-16 h-0.5 bg-secondary"></div>
          <span className="text-secondary text-xs font-medium">{scale}</span>
        </div>
      </div>
    </div>
  );
};
