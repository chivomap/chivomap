import React, { useState, useEffect } from 'react';
import { BiCurrentLocation, BiMap, BiLoaderAlt, BiWalk, BiArrowBack } from 'react-icons/bi';
import { MdSwapVert } from 'react-icons/md';
import { FaBus } from 'react-icons/fa';
import { useTripPlannerStore } from '../../../../store/tripPlannerStore';
import { searchPlaces } from '../../../../api/search';
import { planTrip } from '../../../../api/trip';
import { useMapStore } from '../../../../store/mapStore';

export const TripPlannerSheet: React.FC = () => {
  const {
    origin,
    destination,
    tripPlan,
    setOrigin,
    setDestination,
    setTripPlan,
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
  const [isPlanning, setIsPlanning] = useState(false);
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

  const handlePlanTrip = async () => {
    if (!origin || !destination) return;
    
    setIsPlanning(true);
    try {
      const plan = await planTrip({ origin, destination });
      setTripPlan(plan);
    } catch (error) {
      console.error('Error planning trip:', error);
    } finally {
      setIsPlanning(false);
    }
  };

  // Si hay un plan, mostrar resultados
  if (tripPlan) {
    return <TripPlanResults />;
  }

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-lg font-semibold text-white mb-4">Planificar viaje</h2>

      {/* Inputs compactos en un solo contenedor */}
      <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
        {/* Origen */}
        <div className="flex items-center gap-2 p-3">
          <div className="w-3 h-3 rounded-full bg-secondary flex-shrink-0" />
          <input
            type="text"
            value={originInput}
            onChange={(e) => handleOriginSearch(e.target.value)}
            placeholder="Origen"
            className="flex-1 bg-transparent text-white placeholder-white/40 focus:outline-none"
          />
          <button
            onClick={() => getCurrentLocation(true)}
            className="p-1 hover:bg-white/10 rounded transition-colors"
            title="Usar mi ubicación"
          >
            <BiCurrentLocation className="w-5 h-5 text-white/60" />
          </button>
          <button
            onClick={() => setIsSelectingOrigin(true)}
            className="p-1 hover:bg-white/10 rounded transition-colors"
            title="Seleccionar en mapa"
          >
            <BiMap className="w-5 h-5 text-white/60" />
          </button>
        </div>

        {/* Separador con botón swap */}
        <div className="relative h-px bg-white/10">
          <button
            onClick={swapLocations}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 p-1 bg-primary border border-white/10 hover:bg-white/10 rounded-full transition-colors"
            title="Intercambiar"
          >
            <MdSwapVert className="w-4 h-4 text-white/60" />
          </button>
        </div>

        {/* Destino */}
        <div className="flex items-center gap-2 p-3">
          <div className="w-3 h-3 rounded-full bg-red-500 flex-shrink-0" />
          <input
            type="text"
            value={destinationInput}
            onChange={(e) => handleDestinationSearch(e.target.value)}
            placeholder="Destino"
            className="flex-1 bg-transparent text-white placeholder-white/40 focus:outline-none"
          />
          <button
            onClick={() => getCurrentLocation(false)}
            className="p-1 hover:bg-white/10 rounded transition-colors"
            title="Usar mi ubicación"
          >
            <BiCurrentLocation className="w-5 h-5 text-white/60" />
          </button>
          <button
            onClick={() => setIsSelectingDestination(true)}
            className="p-1 hover:bg-white/10 rounded transition-colors"
            title="Seleccionar en mapa"
          >
            <BiMap className="w-5 h-5 text-white/60" />
          </button>
        </div>
      </div>

      {/* Sugerencias y recomendaciones - SIEMPRE VISIBLES */}
      <div className="space-y-1 max-h-64 overflow-y-auto">
        {/* Loading */}
        {(isSearchingOrigin || isSearchingDestination) && (
          <div className="flex items-center gap-2 text-white/60 text-sm px-3 py-2">
            <BiLoaderAlt className="animate-spin" />
            Buscando...
          </div>
        )}

        {/* Sugerencias de búsqueda activa para origen */}
        {originInput && originSuggestions.length > 0 ? (
          <div className="space-y-1">
            <div className="text-xs text-white/40 px-3 py-1">Resultados para origen</div>
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
        ) : destinationInput && destinationSuggestions.length > 0 ? (
          /* Sugerencias de búsqueda activa para destino */
          <div className="space-y-1">
            <div className="text-xs text-white/40 px-3 py-1">Resultados para destino</div>
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
        ) : (
          /* Lugares cercanos - SIEMPRE VISIBLE cuando no hay búsqueda */
          nearbyPlaces && nearbyPlaces.length > 0 && (
            <div className="space-y-1">
              <div className="text-xs text-white/40 px-3 py-1">Lugares cercanos</div>
              {nearbyPlaces.map((place, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    if (!origin) {
                      setOrigin({ lat: place.lat, lng: place.lng, name: place.name });
                    } else if (!destination) {
                      setDestination({ lat: place.lat, lng: place.lng, name: place.name });
                    }
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-white/10 rounded-lg transition-colors"
                >
                  <div className="font-medium text-white text-sm">{place.name}</div>
                  <div className="text-xs text-white/60">{place.type}</div>
                </button>
              ))}
            </div>
          )
        )}
      </div>

      {/* Botón buscar */}
      <button
        onClick={handlePlanTrip}
        disabled={!origin || !destination || isPlanning}
        className="w-full py-3 bg-secondary hover:bg-secondary/80 disabled:bg-white/10 disabled:text-white/40 text-white rounded-lg font-semibold transition-all"
      >
        {isPlanning ? (
          <span className="flex items-center justify-center gap-2">
            <BiLoaderAlt className="animate-spin" />
            Planificando...
          </span>
        ) : (
          'Buscar rutas'
        )}
      </button>
    </div>
  );
};

// Componente para mostrar resultados
const TripPlanResults: React.FC = () => {
  const { tripPlan, setTripPlan, selectedOptionIndex, setSelectedOptionIndex } = useTripPlannerStore();

  if (!tripPlan || tripPlan.options.length === 0) {
    return (
      <div className="p-4">
        <button
          onClick={() => setTripPlan(null)}
          className="flex items-center gap-2 text-secondary hover:text-secondary/80 mb-4"
        >
          <BiArrowBack className="w-5 h-5" />
          Volver
        </button>
        <p className="text-white/60 text-center py-8">No se encontraron rutas disponibles</p>
      </div>
    );
  }

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${Math.round(minutes)} min`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}min`;
  };

  const formatDistance = (meters: number) => {
    if (meters < 1000) return `${Math.round(meters)} m`;
    return `${(meters / 1000).toFixed(1)} km`;
  };

  const getConfidenceBadge = (confidence: string) => {
    const colors = {
      high: 'bg-green-500/20 text-green-300 border-green-500/30',
      medium: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
      low: 'bg-red-500/20 text-red-300 border-red-500/30'
    };
    return colors[confidence as keyof typeof colors] || colors.low;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header fijo */}
      <div className="flex-shrink-0 p-4 border-b border-white/10">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setTripPlan(null)}
            className="flex items-center gap-2 text-secondary hover:text-secondary/80 font-medium"
          >
            <BiArrowBack className="w-5 h-5" />
            Volver
          </button>
          <h2 className="text-lg font-semibold text-white">Rutas disponibles</h2>
          <div className="w-20" />
        </div>
      </div>

      {/* Lista scrolleable */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {tripPlan.options.map((option, idx) => (
          <div 
            key={idx} 
            className={`relative group cursor-pointer transition-all ${
              selectedOptionIndex === idx ? 'ring-2 ring-secondary' : ''
            }`}
            onClick={() => setSelectedOptionIndex(selectedOptionIndex === idx ? null : idx)}
          >
            {/* Glow effect */}
            <div className="absolute inset-0 bg-secondary/10 rounded-xl blur opacity-0 group-hover:opacity-100 transition-opacity" />
            
            {/* Card */}
            <div className="relative bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-colors">
              {/* Header de la opción */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <BiWalk className="w-5 h-5 text-white/60" />
                    <span className="text-sm text-white/60">{formatDistance(option.total_walking_m)}</span>
                  </div>
                  <div className="w-px h-4 bg-white/20" />
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-white">{formatDuration(option.estimated_time_m)}</span>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded border text-xs font-medium ${getConfidenceBadge(option.confidence)}`}>
                  {option.confidence === 'high' ? 'Alta' : option.confidence === 'medium' ? 'Media' : 'Baja'}
                </span>
              </div>

              {/* Resumen de rutas */}
              <div className="flex items-center gap-2 mb-3">
                {option.legs.filter(leg => leg.type === 'bus').map((leg, legIdx) => (
                  <span key={legIdx} className="px-2 py-1 bg-secondary/80 text-white text-xs font-bold rounded">
                    {leg.route_name || leg.route_code}
                  </span>
                ))}
                {option.total_transfers > 0 && (
                  <span className="text-xs text-white/60">
                    • {option.total_transfers} transbordo{option.total_transfers > 1 ? 's' : ''}
                  </span>
                )}
              </div>

              {/* Detalles expandibles */}
              {selectedOptionIndex === idx && (
                <div className="mt-4 pt-4 border-t border-white/10 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                  {option.legs.map((leg, legIdx) => (
                    <div key={legIdx} className="flex gap-3">
                      {/* Icono */}
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                        {leg.type === 'walk' ? (
                          <BiWalk className="w-5 h-5 text-white/80" />
                        ) : (
                          <FaBus className="w-4 h-4 text-secondary" />
                        )}
                      </div>

                      {/* Contenido */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {leg.type === 'bus' && leg.route_code && (
                            <span className="px-2 py-0.5 bg-secondary text-white text-xs font-bold rounded">
                              {leg.route_name || leg.route_code}
                            </span>
                          )}
                          <span className="font-medium text-white text-sm">
                            {leg.type === 'walk' ? 'Caminar' : leg.route_name || 'Bus'}
                          </span>
                        </div>
                        <div className="text-xs text-white/60 mb-1">
                          {formatDistance(leg.distance_m)} • {formatDuration(leg.duration_m)}
                        </div>
                        {leg.instructions && (
                          <div className="text-xs text-white/40 leading-relaxed">
                            {leg.instructions}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Indicador de expandible */}
              <div className="mt-3 pt-3 border-t border-white/10 text-center">
                <span className="text-xs text-white/40">
                  {selectedOptionIndex === idx ? 'Click para ocultar detalles' : 'Click para ver detalles'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
