import React, { useState, useEffect } from 'react';
import { BiCurrentLocation, BiMap, BiLoaderAlt } from 'react-icons/bi';
import { MdSwapVert } from 'react-icons/md';
import { useTripPlannerStore } from '../../../../store/tripPlannerStore';
import { searchPlaces } from '../../../../api/search';
import { useMapStore } from '../../../../store/mapStore';

export const TripPlannerSheet: React.FC = () => {
  const {
    origin,
    destination,
    setOrigin,
    setDestination,
    setIsSelectingOrigin,
    setIsSelectingDestination,
    swapLocations,
  } = useTripPlannerStore();

  const { config } = useMapStore();
  const [originInput, setOriginInput] = useState('');
  const [destinationInput, setDestinationInput] = useState('');
  const [originSuggestions, setOriginSuggestions] = useState<any[]>([]);
  const [destinationSuggestions, setDestinationSuggestions] = useState<any[]>([]);
  const [isSearchingOrigin, setIsSearchingOrigin] = useState(false);
  const [isSearchingDestination, setIsSearchingDestination] = useState(false);
  const [nearbyPlaces, setNearbyPlaces] = useState<any[]>([]);

  useEffect(() => {
    if (origin) setOriginInput(origin.name || '');
  }, [origin]);

  useEffect(() => {
    if (destination) setDestinationInput(destination.name || '');
  }, [destination]);

  // Cargar lugares cercanos al abrir
  useEffect(() => {
    const loadNearbyPlaces = async () => {
      try {
        const response = await searchPlaces({ 
          query: '', 
          lat: config.center.lat, 
          lng: config.center.lng,
          limit: 5 
        });
        setNearbyPlaces(response.results);
      } catch (error) {
        console.error('Error loading nearby places:', error);
      }
    };
    loadNearbyPlaces();
  }, [config.center]);

  const handleOriginSearch = async (value: string) => {
    setOriginInput(value);
    if (value.length < 2) {
      setOriginSuggestions([]);
      return;
    }
    setIsSearchingOrigin(true);
    try {
      const response = await searchPlaces({ query: value, lat: config.center.lat, lng: config.center.lng });
      setOriginSuggestions(response.results.slice(0, 5));
    } catch (error) {
      console.error('Error searching:', error);
    } finally {
      setIsSearchingOrigin(false);
    }
  };

  const handleDestinationSearch = async (value: string) => {
    setDestinationInput(value);
    if (value.length < 2) {
      setDestinationSuggestions([]);
      return;
    }
    setIsSearchingDestination(true);
    try {
      const response = await searchPlaces({ query: value, lat: config.center.lat, lng: config.center.lng });
      setDestinationSuggestions(response.results.slice(0, 5));
    } catch (error) {
      console.error('Error searching:', error);
    } finally {
      setIsSearchingDestination(false);
    }
  };

  const getCurrentLocation = (isOrigin: boolean) => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition((position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          name: 'Mi ubicación'
        };
        if (isOrigin) {
          setOrigin(location);
        } else {
          setDestination(location);
        }
      });
    }
  };

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-lg font-semibold text-white mb-4">Planificar viaje</h2>

      {/* Origen */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-secondary flex-shrink-0" />
          <input
            type="text"
            value={originInput}
            onChange={(e) => handleOriginSearch(e.target.value)}
            placeholder="Origen"
            className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-secondary/50"
          />
          <button
            onClick={() => getCurrentLocation(true)}
            className="p-2 hover:bg-white/10 rounded transition-colors"
            title="Usar mi ubicación"
          >
            <BiCurrentLocation className="w-5 h-5 text-white/60" />
          </button>
          <button
            onClick={() => setIsSelectingOrigin(true)}
            className="p-2 hover:bg-white/10 rounded transition-colors"
            title="Seleccionar en mapa"
          >
            <BiMap className="w-5 h-5 text-white/60" />
          </button>
        </div>

        {/* Sugerencias origen */}
        {isSearchingOrigin && (
          <div className="flex items-center gap-2 text-white/60 text-sm px-3">
            <BiLoaderAlt className="animate-spin" />
            Buscando...
          </div>
        )}
        {originSuggestions.length > 0 && (
          <div className="space-y-1">
            {originSuggestions.map((place, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setOrigin({ lat: place.lat, lng: place.lng, name: place.name });
                  setOriginSuggestions([]);
                }}
                className="w-full px-3 py-2 text-left hover:bg-white/10 rounded-lg transition-colors"
              >
                <div className="font-medium text-white text-sm">{place.name}</div>
                <div className="text-xs text-white/60">{place.type}</div>
              </button>
            ))}
            <button
              onClick={() => {
                setIsSelectingOrigin(true);
                setOriginSuggestions([]);
              }}
              className="w-full px-3 py-2 text-left hover:bg-white/10 rounded-lg transition-colors text-secondary text-sm font-medium"
            >
              📍 Establecer en el mapa
            </button>
          </div>
        )}
        {!originInput && nearbyPlaces.length > 0 && (
          <div className="space-y-1">
            <div className="text-xs text-white/40 px-3">Lugares cercanos</div>
            {nearbyPlaces.map((place, idx) => (
              <button
                key={idx}
                onClick={() => setOrigin({ lat: place.lat, lng: place.lng, name: place.name })}
                className="w-full px-3 py-2 text-left hover:bg-white/10 rounded-lg transition-colors"
              >
                <div className="font-medium text-white text-sm">{place.name}</div>
                <div className="text-xs text-white/60">{place.type}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Botón swap */}
      <div className="flex justify-center">
        <button
          onClick={swapLocations}
          className="p-2 hover:bg-white/10 rounded-full transition-colors"
          title="Intercambiar"
        >
          <MdSwapVert className="w-5 h-5 text-white/60" />
        </button>
      </div>

      {/* Destino */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500 flex-shrink-0" />
          <input
            type="text"
            value={destinationInput}
            onChange={(e) => handleDestinationSearch(e.target.value)}
            placeholder="Destino"
            className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-secondary/50"
          />
          <button
            onClick={() => getCurrentLocation(false)}
            className="p-2 hover:bg-white/10 rounded transition-colors"
            title="Usar mi ubicación"
          >
            <BiCurrentLocation className="w-5 h-5 text-white/60" />
          </button>
          <button
            onClick={() => setIsSelectingDestination(true)}
            className="p-2 hover:bg-white/10 rounded transition-colors"
            title="Seleccionar en mapa"
          >
            <BiMap className="w-5 h-5 text-white/60" />
          </button>
        </div>

        {/* Sugerencias destino */}
        {isSearchingDestination && (
          <div className="flex items-center gap-2 text-white/60 text-sm px-3">
            <BiLoaderAlt className="animate-spin" />
            Buscando...
          </div>
        )}
        {destinationSuggestions.length > 0 && (
          <div className="space-y-1">
            {destinationSuggestions.map((place, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setDestination({ lat: place.lat, lng: place.lng, name: place.name });
                  setDestinationSuggestions([]);
                }}
                className="w-full px-3 py-2 text-left hover:bg-white/10 rounded-lg transition-colors"
              >
                <div className="font-medium text-white text-sm">{place.name}</div>
                <div className="text-xs text-white/60">{place.type}</div>
              </button>
            ))}
            <button
              onClick={() => {
                setIsSelectingDestination(true);
                setDestinationSuggestions([]);
              }}
              className="w-full px-3 py-2 text-left hover:bg-white/10 rounded-lg transition-colors text-secondary text-sm font-medium"
            >
              📍 Establecer en el mapa
            </button>
          </div>
        )}
        {!destinationInput && nearbyPlaces.length > 0 && (
          <div className="space-y-1">
            <div className="text-xs text-white/40 px-3">Lugares cercanos</div>
            {nearbyPlaces.map((place, idx) => (
              <button
                key={idx}
                onClick={() => setDestination({ lat: place.lat, lng: place.lng, name: place.name })}
                className="w-full px-3 py-2 text-left hover:bg-white/10 rounded-lg transition-colors"
              >
                <div className="font-medium text-white text-sm">{place.name}</div>
                <div className="text-xs text-white/60">{place.type}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Botón buscar */}
      <button
        disabled={!origin || !destination}
        className="w-full py-3 bg-secondary hover:bg-secondary/80 disabled:bg-white/10 disabled:text-white/40 text-white rounded-lg font-semibold transition-all"
      >
        Buscar rutas
      </button>
    </div>
  );
};
