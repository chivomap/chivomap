import React, { useState, useEffect, useRef, useMemo } from 'react';
import { BiCurrentLocation, BiMap, BiLoaderAlt, BiWalk, BiChevronLeft, BiChevronRight } from 'react-icons/bi';
import { MdSwapVert } from 'react-icons/md';
import { FaBus } from 'react-icons/fa';
import { useTripPlannerStore } from '../../../../store/tripPlannerStore';
import { searchPlaces, reverseGeocode } from '../../../../api/search';
import { planTrip } from '../../../../api/trip';
import { useMapStore } from '../../../../store/mapStore';
import { useBottomSheet } from '../../../../../hooks/useBottomSheet';
import { useCurrentLocation } from '../../../../../hooks/useGeolocation';
import { useMapFocus } from '../../../../../hooks/useMapFocus';
import { CloseButton } from '../../../ui/CloseButton';

const ExpandableText: React.FC<{ text: string; maxChars?: number; className?: string }> = ({
  text,
  maxChars = 72,
  className = '',
}) => {
  const [expanded, setExpanded] = useState(false);
  const isLong = text.length > maxChars;
  const visible = expanded || !isLong ? text : `${text.slice(0, maxChars).trimEnd()}...`;

  return (
    <span className={className}>
      {visible}{' '}
      {isLong && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded((prev) => !prev);
          }}
          className="text-secondary/90 hover:text-secondary underline decoration-secondary/40"
        >
          {expanded ? 'menos' : 'mas'}
        </button>
      )}
    </span>
  );
};

export const TripPlannerSheet: React.FC = () => {
  const {
    origin,
    destination,
    tripPlan,
    setOrigin,
    setDestination,
    setTripPlan,
    setSelectedOptionIndex,
    setFocusedLegIndex,
    setIsSelectingOrigin,
    setIsSelectingDestination,
    swapLocations,
  } = useTripPlannerStore();
  const { closeContent } = useBottomSheet();

  const { config } = useMapStore();
  const [originInput, setOriginInput] = useState('');
  const [destinationInput, setDestinationInput] = useState('');
  const [originSuggestions, setOriginSuggestions] = useState<any[]>([]);
  const [destinationSuggestions, setDestinationSuggestions] = useState<any[]>([]);
  const [isSearchingOrigin, setIsSearchingOrigin] = useState(false);
  const [isSearchingDestination, setIsSearchingDestination] = useState(false);
  const [isPlanning, setIsPlanning] = useState(false);
  const [nearbyPlaces, setNearbyPlaces] = useState<any[]>([]);
  const [planError, setPlanError] = useState<string | null>(null);
  const nearbyPlacesTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { getLocation } = useCurrentLocation();
  const hasAutoFilledOrigin = useRef(false);
  const prevOriginDestRef = useRef<string>('');
  const { focusPoint, focusPoints } = useMapFocus();

  // Calcular viewport óptimo basado en origen/destino
  const optimalViewport = useMemo(() => {
    if (!origin && !destination) return null;

    // Si solo hay origen, hacer zoom a él
    if (origin && !destination) {
      return {
        center: { lat: origin.lat, lng: origin.lng },
        zoom: 15
      };
    }

    // Si hay origen y destino, mostrar ambos
    if (origin && destination) {
      const minLat = Math.min(origin.lat, destination.lat);
      const maxLat = Math.max(origin.lat, destination.lat);
      const minLng = Math.min(origin.lng, destination.lng);
      const maxLng = Math.max(origin.lng, destination.lng);

      const centerLat = (minLat + maxLat) / 2;
      const centerLng = (minLng + maxLng) / 2;

      const latDiff = maxLat - minLat;
      const lngDiff = maxLng - minLng;
      const maxDiff = Math.max(latDiff, lngDiff);

      let zoom = 15;
      if (maxDiff > 0.5) zoom = 10;
      else if (maxDiff > 0.2) zoom = 11;
      else if (maxDiff > 0.1) zoom = 12;
      else if (maxDiff > 0.05) zoom = 13;
      else if (maxDiff > 0.02) zoom = 14;

      return {
        center: { lat: centerLat, lng: centerLng },
        zoom
      };
    }

    return null;
  }, [origin, destination]);

  // Aplicar viewport cuando cambia
  useEffect(() => {
    if (!optimalViewport) return;

    // Crear key único para detectar cambios
    const currentKey = `${origin?.lat},${origin?.lng}-${destination?.lat},${destination?.lng}`;
    if (currentKey === prevOriginDestRef.current) return;
    
    prevOriginDestRef.current = currentKey;
    
    // Si solo hay origen, enfocar punto
    if (origin && !destination) {
      focusPoint(origin, { zoom: optimalViewport.zoom, sheetWillBeHalf: true });
      return;
    }

    // Si hay origen y destino, enfocar ambos puntos
    if (origin && destination) {
      focusPoints([origin, destination], { maxZoom: optimalViewport.zoom, sheetWillBeHalf: true });
    }
  }, [optimalViewport, origin, destination, focusPoint, focusPoints]);

  // Auto-llenar origen con ubicación del usuario al abrir
  useEffect(() => {
    if (hasAutoFilledOrigin.current || origin) return;

    const autoFillOrigin = async () => {
      try {
        const location = await getLocation();
        
        // Verificar que el usuario no haya seleccionado un origen mientras esperábamos
        if (origin) return;
        
        // Intentar reverse geocoding para obtener dirección legible
        try {
          const geocodeResult = await reverseGeocode(location.lat, location.lng);
          
          // Verificar nuevamente antes de aplicar el resultado
          if (origin) return;
          
          if (geocodeResult.results && geocodeResult.results.length > 0) {
            const place = geocodeResult.results[0];
            // Usar display_name si está disponible, sino construir desde address
            let locationName = place.display_name || place.name;
            
            if (!locationName && place.address) {
              const parts = [
                place.address.street,
                place.address.city,
                place.address.state
              ].filter(Boolean);
              locationName = parts.length > 0 ? parts.join(', ') : 'Mi ubicación';
            }
            
            setOrigin({
              lat: location.lat,
              lng: location.lng,
              name: locationName || 'Mi ubicación'
            });
          } else {
            // Fallback a coordenadas
            setOrigin({
              lat: location.lat,
              lng: location.lng,
              name: 'Mi ubicación'
            });
          }
        } catch (geocodeError) {
          console.warn('Reverse geocoding failed, using coordinates:', geocodeError);
          
          // Verificar antes del fallback
          if (origin) return;
          
          // Fallback a coordenadas
          setOrigin({
            lat: location.lat,
            lng: location.lng,
            name: 'Mi ubicación'
          });
        }
        
        hasAutoFilledOrigin.current = true;
      } catch (error) {
        // Si no hay ubicación disponible, no hacer nada (silencioso)
      }
    };

    autoFillOrigin();
  }, [origin, getLocation, setOrigin]);

  useEffect(() => {
    if (origin) setOriginInput(origin.name || '');
    if (!origin) setOriginInput('');
  }, [origin]);

  useEffect(() => {
    if (destination) setDestinationInput(destination.name || '');
    if (!destination) setDestinationInput('');
  }, [destination]);

  // Cargar lugares cercanos al abrir
  useEffect(() => {
    if (nearbyPlacesTimer.current) {
      clearTimeout(nearbyPlacesTimer.current);
    }

    nearbyPlacesTimer.current = setTimeout(async () => {
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
    }, 400);

    return () => {
      if (nearbyPlacesTimer.current) {
        clearTimeout(nearbyPlacesTimer.current);
      }
    };
  }, [config.center.lat, config.center.lng]);

  const handleOriginSearch = async (value: string) => {
    setOriginInput(value);
    if (value.length < 2) {
      setOriginSuggestions([]);
      if (value.trim() === '') {
        setOrigin(null);
        setTripPlan(null);
        setSelectedOptionIndex(null);
      }
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
      if (value.trim() === '') {
        setDestination(null);
        setTripPlan(null);
        setSelectedOptionIndex(null);
      }
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

  const getCurrentLocation = async (isOrigin: boolean) => {
    try {
      const location = await getLocation();
      
      // Intentar reverse geocoding para obtener dirección legible
      let locationName = 'Mi ubicación';
      try {
        const geocodeResult = await reverseGeocode(location.lat, location.lng);
        if (geocodeResult.results && geocodeResult.results.length > 0) {
          const place = geocodeResult.results[0];
          // Usar display_name si está disponible, sino construir desde address
          locationName = place.display_name || place.name;
          
          if (!locationName && place.address) {
            const parts = [
              place.address.street,
              place.address.city,
              place.address.state
            ].filter(Boolean);
            locationName = parts.length > 0 ? parts.join(', ') : 'Mi ubicación';
          }
        }
      } catch (geocodeError) {
        console.warn('Reverse geocoding failed:', geocodeError);
      }
      
      const locationData = {
        lat: location.lat,
        lng: location.lng,
        name: locationName || 'Mi ubicación'
      };
      
      if (isOrigin) {
        setOrigin(locationData);
      } else {
        setDestination(locationData);
      }
    } catch (error) {
      // Error ya manejado por el hook
      console.error('Error getting location:', error);
    }
  };

  const handlePlanTrip = async () => {
    if (!origin || !destination) return;
    
    setIsPlanning(true);
    setPlanError(null);
    try {
      const plan = await planTrip({ origin, destination });
      setTripPlan(plan);
      setSelectedOptionIndex(plan.options.length > 0 ? 0 : null);
      setFocusedLegIndex(null);
    } catch (error) {
      setPlanError('No se pudo planificar el viaje. Intenta de nuevo.');
      console.error('Error planning trip:', error);
    } finally {
      setIsPlanning(false);
    }
  };

  useEffect(() => {
    setTripPlan(null);
    setSelectedOptionIndex(null);
    setFocusedLegIndex(null);
  }, [origin, destination, setTripPlan, setSelectedOptionIndex, setFocusedLegIndex]);

  // Si hay un plan, mostrar resultados
  if (tripPlan) {
    return <TripPlanResults />;
  }

  const handleClose = () => {
    // Limpiar todo el estado del planificador
    setOrigin(null);
    setDestination(null);
    setIsSelectingOrigin(false);
    setIsSelectingDestination(false);
    setTripPlan(null);
    setSelectedOptionIndex(null);
    setFocusedLegIndex(null);
    closeContent();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header fijo */}
      <div className="flex-shrink-0 p-4 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Planificar viaje</h2>
            <p className="text-xs text-white/50">Define origen y destino</p>
          </div>
          <CloseButton onClick={handleClose} />
        </div>
      </div>

      {/* Contenido scrolleable */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="p-4 space-y-4">
          {/* Inputs compactos */}
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

          {/* Sugerencias y recomendaciones */}
          <div className="space-y-1">
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
                    <div className="font-medium text-white text-sm truncate" title={place.name}>{place.name}</div>
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
                    <div className="font-medium text-white text-sm truncate" title={place.name}>{place.name}</div>
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
              /* Lugares cercanos */
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
                      <div className="font-medium text-white text-sm truncate" title={place.name}>{place.name}</div>
                      <div className="text-xs text-white/60">{place.type}</div>
                    </button>
                  ))}
                </div>
              )
            )}
          </div>

          {/* Error */}
          {planError && (
            <div className="text-xs text-red-200 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
              {planError}
            </div>
          )}
        </div>
      </div>

      {/* Botón fijo en la parte inferior */}
      <div className="flex-shrink-0 p-4 border-t border-white/10 bg-primary/50 backdrop-blur-sm">
        <button
          onClick={handlePlanTrip}
          disabled={!origin || !destination || isPlanning}
          className="w-full py-3 bg-secondary hover:bg-secondary/80 disabled:bg-white/10 disabled:text-white/40 text-primary font-semibold rounded-lg transition-all shadow-lg"
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
    </div>
  );
};

// Componente para mostrar resultados
const TripPlanResults: React.FC = () => {
  const { tripPlan, setTripPlan, selectedOptionIndex, setSelectedOptionIndex, focusedLegIndex, setFocusedLegIndex } = useTripPlannerStore();

  const handleClose = () => {
    setTripPlan(null);
    setSelectedOptionIndex(null);
    setFocusedLegIndex(null);
  };

  if (!tripPlan || tripPlan.options.length === 0) {
    return (
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-white">Opciones de viaje</h2>
          <CloseButton onClick={handleClose} />
        </div>
        <p className="text-white/60 text-center py-6">No se encontraron rutas disponibles</p>
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

  const handlePrevStep = () => {
    if (selectedOptionIndex === null) return;
    const option = tripPlan.options[selectedOptionIndex];
    if (!option) return;
    
    if (focusedLegIndex === null) {
      setFocusedLegIndex(option.legs.length - 1);
    } else if (focusedLegIndex > 0) {
      setFocusedLegIndex(focusedLegIndex - 1);
    }
  };

  const handleNextStep = () => {
    if (selectedOptionIndex === null) return;
    const option = tripPlan.options[selectedOptionIndex];
    if (!option) return;
    
    if (focusedLegIndex === null) {
      setFocusedLegIndex(0);
    } else if (focusedLegIndex < option.legs.length - 1) {
      setFocusedLegIndex(focusedLegIndex + 1);
    }
  };

  const canGoPrev = selectedOptionIndex !== null && (focusedLegIndex === null || focusedLegIndex > 0);
  const canGoNext = selectedOptionIndex !== null && tripPlan.options[selectedOptionIndex] && 
    (focusedLegIndex === null || focusedLegIndex < tripPlan.options[selectedOptionIndex].legs.length - 1);

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex-shrink-0 p-4 border-b border-white/10 bg-primary/95 backdrop-blur">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-base sm:text-lg font-semibold text-white">Opciones de viaje</h2>
          <CloseButton onClick={handleClose} />
        </div>
        
        {/* Navegación de pasos */}
        {selectedOptionIndex !== null && (
          <div className="flex items-center gap-2 w-full">
            <button
              onClick={handlePrevStep}
              disabled={!canGoPrev}
              className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-sm text-white"
            >
              <BiChevronLeft className="w-4 h-4" />
              Anterior
            </button>
            <button
              onClick={() => setFocusedLegIndex(null)}
              className={`flex-1 px-3 py-1.5 rounded-lg transition-colors text-sm ${
                focusedLegIndex === null 
                  ? 'bg-secondary text-primary font-medium' 
                  : 'bg-white/5 hover:bg-white/10 text-white'
              }`}
            >
              Ver todo
            </button>
            <button
              onClick={handleNextStep}
              disabled={!canGoNext}
              className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-sm text-white"
            >
              Siguiente
              <BiChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Lista scrolleable */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 pt-2 pb-4 space-y-2">
        {tripPlan.options.map((option, idx) => (
          <div 
            key={idx} 
            className={`relative group cursor-pointer transition-all ${
              selectedOptionIndex === idx ? 'ring-2 ring-secondary' : ''
            }`}
            onClick={() => {
              setSelectedOptionIndex(selectedOptionIndex === idx ? null : idx);
              setFocusedLegIndex(null);
            }}
          >
            {/* Glow effect */}
            <div className="absolute inset-0 bg-secondary/10 rounded-lg blur opacity-0 group-hover:opacity-100 transition-opacity" />
            
            {/* Card */}
            <div className="relative bg-white/5 border border-white/10 rounded-lg p-3 hover:bg-white/10 transition-colors">
              {/* Header de la opción */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <BiWalk className="w-4 h-4 text-white/60" />
                    <span className="text-xs text-white/60">{formatDistance(option.total_walking_m)}</span>
                  </div>
                  <div className="w-px h-4 bg-white/20" />
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-white">{formatDuration(option.estimated_time_m)}</span>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded border text-xs font-medium ${getConfidenceBadge(option.confidence)}`}>
                  {option.confidence === 'high' ? 'Alta' : option.confidence === 'medium' ? 'Media' : 'Baja'}
                </span>
              </div>

              {/* Resumen de rutas */}
              <div className="flex flex-wrap items-center gap-1.5 mb-1">
                {option.legs
                  .map((leg, legIdx) => ({ ...leg, legIdx }))
                  .filter(leg => leg.type === 'bus')
                  .map((leg) => (
                  <button
                    key={leg.legIdx}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedOptionIndex(idx);
                      setFocusedLegIndex(leg.legIdx);
                    }}
                    className={`flex items-center gap-1 rounded-md transition-colors ${
                      focusedLegIndex === leg.legIdx ? 'bg-white/10' : 'hover:bg-white/5'
                    }`}
                  >
                    <span className="px-1.5 py-1 bg-secondary/80 text-white text-[11px] font-bold rounded">
                      {leg.route_name || leg.route_code}
                    </span>
                    {leg.direction && (
                      <span className="px-1.5 py-0.5 bg-white/10 text-white/70 text-[10px] uppercase rounded">
                        {leg.direction === 'IDA' ? 'I' : 'R'}
                      </span>
                    )}
                  </button>
                ))}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setFocusedLegIndex(null);
                  }}
                  className={`text-[10px] px-1.5 py-1 rounded border transition-colors ${
                    focusedLegIndex === null
                      ? 'border-secondary/40 text-secondary bg-secondary/10'
                      : 'border-white/15 text-white/50 hover:text-white'
                  }`}
                >
                  Ver todo
                </button>
                {option.total_transfers > 0 && (
                  <span className="text-[11px] text-white/60">
                    • {option.total_transfers} transbordo{option.total_transfers > 1 ? 's' : ''}
                  </span>
                )}
              </div>

              {/* Detalles expandibles */}
              {selectedOptionIndex === idx && (
                <div className="mt-2 pt-2 border-t border-white/10 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                  {(() => {
                    let busCounter = 0;
                    let transferCounter = 0;

                    return option.legs.map((leg, legIdx) => {
                      const isBus = leg.type === 'bus';
                      const isTransferWalk = leg.type === 'walk'
                        && legIdx > 0
                        && legIdx < option.legs.length - 1
                        && option.legs[legIdx - 1].type === 'bus'
                        && option.legs[legIdx + 1].type === 'bus';

                      if (isBus) busCounter += 1;
                      if (isTransferWalk) transferCounter += 1;

                      const label = isBus
                        ? `Bus ${busCounter}`
                        : isTransferWalk
                          ? `Transbordo ${transferCounter}`
                          : legIdx === 0
                            ? 'Salida'
                            : legIdx === option.legs.length - 1
                              ? 'Llegada'
                              : 'Caminar';

                      return (
                        <button
                          key={legIdx}
                          onClick={(e) => {
                            e.stopPropagation();
                            setFocusedLegIndex(legIdx);
                          }}
                          className={`w-full flex gap-2 text-left rounded-lg p-1.5 transition-colors ${
                            focusedLegIndex === legIdx ? 'bg-white/10 border border-secondary/30' : 'hover:bg-white/5'
                          }`}
                        >
                      {/* Icono */}
                          <div className="flex-shrink-0 relative">
                            <div className="absolute -top-1 -left-1 w-5 h-5 rounded-full bg-secondary text-primary text-[10px] font-bold flex items-center justify-center border border-white/30">
                              {legIdx + 1}
                            </div>
                            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                              {leg.type === 'walk' ? (
                                <BiWalk className="w-5 h-5 text-white/80" />
                              ) : (
                                <FaBus className="w-4 h-4 text-secondary" />
                              )}
                            </div>
                          </div>

                      {/* Contenido */}
                      <div className="flex-1 min-w-0">
                        <div className="text-[10px] uppercase tracking-wide text-white/40">
                          {label}
                        </div>
                        <div className="flex items-center gap-2">
                        {leg.type === 'bus' && leg.route_code && (
                          <span className="px-2 py-0.5 bg-secondary text-white text-xs font-bold rounded">
                            {leg.route_name || leg.route_code}
                          </span>
                        )}
                        {leg.type === 'bus' && leg.direction && (
                          <span className="px-2 py-0.5 bg-white/10 text-white/70 text-[10px] uppercase rounded">
                            {leg.direction === 'IDA' ? 'Ida' : 'Regreso'}
                          </span>
                        )}
                        <span className="font-medium text-white text-xs">
                          {leg.type === 'walk' ? 'Caminar' : leg.route_name || 'Bus'}
                        </span>
                      </div>
                      <div className="text-[11px] text-white/60">
                        {formatDistance(leg.distance_m)} • {formatDuration(leg.duration_m)}
                      </div>
                      {leg.type === 'bus' && (leg.from_stop || leg.to_stop) && (
                        <div className="text-xs text-white/40 space-y-1">
                          <div>
                            <span className="text-white/50">Sube:</span>{' '}
                            <ExpandableText
                              text={leg.from_stop?.nombre || 'Parada cercana'}
                              maxChars={58}
                            />
                          </div>
                          {leg.to_stop?.nombre && (
                            <div>
                              <span className="text-white/50">Baja:</span>{' '}
                              <ExpandableText
                                text={leg.to_stop.nombre}
                                maxChars={58}
                              />
                            </div>
                          )}
                        </div>
                      )}
                      {leg.instructions && (
                        <div className="text-[11px] text-white/40 leading-relaxed">
                          <ExpandableText text={leg.instructions} maxChars={90} />
                        </div>
                      )}
                      </div>
                    </button>
                      );
                    });
                  })()}
                </div>
              )}

              <div className="mt-1 text-center">
                <span className="text-[10px] text-white/35">
                  {selectedOptionIndex === idx ? 'Detalle abierto' : 'Toca para ver detalle'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
