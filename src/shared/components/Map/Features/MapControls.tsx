import React from 'react';
import { useMap } from 'react-map-gl/maplibre';
import { BiPlus, BiMinus, BiFullscreen, BiExitFullscreen, BiCurrentLocation, BiX, BiDotsVerticalRounded } from 'react-icons/bi';
import { MdDirectionsBus, MdContentCopy, MdDirections } from 'react-icons/md';
import { usePinStore } from '../../../store/pinStore';
import { useBottomSheet } from '../../../../hooks/useBottomSheet';
import { useMapStore } from '../../../store/mapStore';
import { useTripPlannerStore } from '../../../store/tripPlannerStore';
import { env } from '../../../config/env';

export const MapControls: React.FC = () => {
  const { current: map } = useMap();
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const [isLocating, setIsLocating] = React.useState(false);
  const [showPinMenu, setShowPinMenu] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const { pin, clearPin } = usePinStore();
  const { openNearbyRoutes, openTripPlanner } = useBottomSheet();
  const { updateConfig, config } = useMapStore();
  const { reset: resetTripPlanner } = useTripPlannerStore();

  const zoomIn = () => {
    if (map) map.zoomIn();
  };

  const zoomOut = () => {
    if (map) map.zoomOut();
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  React.useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Centrar en ubicación del usuario
  const centerOnUserLocation = () => {
    if (navigator.geolocation) {
      setIsLocating(true);
      console.log('🎯 Location button clicked - requesting position...');
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          console.log('✅ Location received:', { lat: latitude, lng: longitude });
          updateConfig({ 
            ...config, 
            center: { lat: latitude, lng: longitude }, 
            zoom: 15
          });
          setIsLocating(false);
        },
        (error) => {
          console.error('❌ Location error:', error);
          alert('No se pudo obtener tu ubicación. Verifica los permisos del navegador.');
          setIsLocating(false);
        },
        {
          enableHighAccuracy: false,
          timeout: 5000,
          maximumAge: 30000
        }
      );
    } else {
      alert('Tu navegador no soporta geolocalización');
    }
  };

  // Buscar rutas cercanas
  const handleNearbyRoutes = () => {
    const startTime = Date.now();
    console.log(`[${new Date().toISOString()}] 🚌 Nearby routes button clicked`);
    
    if (navigator.geolocation) {
      console.log(`[${new Date().toISOString()}] 📡 Requesting geolocation...`);
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const geoTime = Date.now();
          const { latitude, longitude } = position.coords;
          console.log(`[${new Date().toISOString()}] ✅ Location received (took ${geoTime - startTime}ms):`, { lat: latitude, lng: longitude });
          
          console.log(`[${new Date().toISOString()}] 🗺️ Updating map center...`);
          updateConfig({ 
            ...config, 
            center: { lat: latitude, lng: longitude }, 
            zoom: 14
          });
          const mapTime = Date.now();
          console.log(`[${new Date().toISOString()}] ✅ Map updated (took ${mapTime - geoTime}ms)`);
          
          console.log(`[${new Date().toISOString()}] 🔍 Fetching nearby routes (automatic radius)...`);
          openNearbyRoutes(latitude, longitude); // Sin radio = búsqueda automática
          const totalTime = Date.now();
          console.log(`[${new Date().toISOString()}] ⏱️ Total time: ${totalTime - startTime}ms`);
        },
        (error) => {
          console.error(`[${new Date().toISOString()}] ❌ Location error (took ${Date.now() - startTime}ms):`, error);
          alert('No se pudo obtener tu ubicación. Verifica los permisos del navegador.');
        },
        {
          enableHighAccuracy: false,
          timeout: 5000,
          maximumAge: 30000
        }
      );
    } else {
      alert('Tu navegador no soporta geolocalización');
    }
  };

  // Cerrar menú al hacer click fuera
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowPinMenu(false);
      }
    };

    if (showPinMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showPinMenu]);

  const handleSearchNearbyPin = () => {
    if (pin) {
      openNearbyRoutes(pin.lat, pin.lng); // Sin radio = búsqueda automática
      setShowPinMenu(false);
    }
  };

  const handleCopyCoordinates = () => {
    if (pin) {
      const coords = `${pin.lat.toFixed(6)}, ${pin.lng.toFixed(6)}`;
      navigator.clipboard.writeText(coords);
      setShowPinMenu(false);
    }
  };

  return (
    <div className="absolute top-20 right-[5%] sm:top-4 sm:right-4 z-10 flex flex-col gap-1 sm:gap-2">
      {/* Zoom Controls */}
      <div className="bg-primary shadow-lg rounded-lg overflow-hidden">
        <button
          onClick={zoomIn}
          className="block w-10 h-10 sm:w-10 sm:h-10 bg-primary hover:bg-primary/80 transition-colors border-b border-primary/20 touch-manipulation"
          title="Acercar"
        >
          <BiPlus className="text-secondary text-xl sm:text-xl mx-auto" />
        </button>
        <button
          onClick={zoomOut}
          className="block w-10 h-10 sm:w-10 sm:h-10 bg-primary hover:bg-primary/80 transition-colors touch-manipulation"
          title="Alejar"
        >
          <BiMinus className="text-secondary text-xl sm:text-xl mx-auto" />
        </button>
      </div>

      {/* Fullscreen Control */}
      <button
        onClick={toggleFullscreen}
        className="w-10 h-10 sm:w-10 sm:h-10 bg-primary shadow-lg rounded-lg hover:bg-primary/80 transition-colors touch-manipulation"
        title={isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
      >
        {isFullscreen ? (
          <BiExitFullscreen className="text-secondary text-xl sm:text-xl mx-auto" />
        ) : (
          <BiFullscreen className="text-secondary text-xl sm:text-xl mx-auto" />
        )}
      </button>

      {/* Trip Planner Button */}
      {env.FEATURE_TRIP_PLANNER && (
        <button
          onClick={() => {
            resetTripPlanner();
            openTripPlanner();
          }}
          className="w-10 h-10 sm:w-10 sm:h-10 bg-secondary shadow-lg rounded-lg hover:bg-secondary/80 transition-colors touch-manipulation"
          title="Planificar viaje"
        >
          <MdDirections className="text-white text-xl sm:text-xl mx-auto" />
        </button>
      )}

      {/* Nearby Routes Button */}
      <button
        onClick={handleNearbyRoutes}
        className="w-10 h-10 sm:w-10 sm:h-10 bg-primary shadow-lg rounded-lg hover:bg-primary/80 transition-colors touch-manipulation"
        title="Rutas cercanas"
      >
        <MdDirectionsBus className="text-secondary text-xl sm:text-xl mx-auto" />
      </button>

      {/* My Location Button */}
      <button
        onClick={centerOnUserLocation}
        disabled={isLocating}
        className="w-10 h-10 sm:w-10 sm:h-10 bg-primary shadow-lg rounded-lg hover:bg-primary/80 transition-colors touch-manipulation disabled:opacity-50"
        title="Centrar en mi ubicación"
      >
        <BiCurrentLocation className={`text-secondary text-xl sm:text-xl mx-auto ${isLocating ? 'animate-pulse' : ''}`} />
      </button>

      {/* Pin Controls */}
      {pin && (
        <div className="relative" ref={menuRef}>
          <div className="bg-primary shadow-lg rounded-lg overflow-hidden">
            <button
              onClick={() => setShowPinMenu(!showPinMenu)}
              className="block w-10 h-10 sm:w-10 sm:h-10 bg-primary hover:bg-primary/80 transition-colors border-b border-primary/20 touch-manipulation"
              title="Opciones del pin"
            >
              <BiDotsVerticalRounded className="text-secondary text-xl sm:text-xl mx-auto" />
            </button>
            <button
              onClick={clearPin}
              className="block w-10 h-10 sm:w-10 sm:h-10 bg-primary hover:bg-primary/80 transition-colors touch-manipulation"
              title="Quitar pin"
            >
              <BiX className="text-red-500 text-2xl sm:text-2xl mx-auto" />
            </button>
          </div>

          {/* Menú de opciones del pin */}
          {showPinMenu && (
            <div 
              className="absolute right-full mr-2 top-0 w-56 bg-primary/95 backdrop-blur-md border border-white/10 rounded-lg shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-right-2 duration-200"
            >
              <button
                onClick={handleSearchNearbyPin}
                className="w-full px-3 py-2.5 text-left hover:bg-white/10 transition-colors text-sm flex items-center gap-3 text-white border-b border-white/10"
              >
                <MdDirectionsBus className="text-secondary text-lg" />
                <span>Buscar rutas aquí</span>
              </button>
              
              <button
                onClick={handleCopyCoordinates}
                className="w-full px-3 py-2.5 text-left hover:bg-white/10 transition-colors text-sm flex items-center gap-3 text-white"
              >
                <MdContentCopy className="text-secondary text-lg" />
                <span>Copiar coordenadas</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
