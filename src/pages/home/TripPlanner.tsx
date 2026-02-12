import React, { useState, useEffect } from 'react';
import { BiX, BiCurrentLocation, BiMap } from 'react-icons/bi';
import { MdSwapVert } from 'react-icons/md';
import { useTripPlannerStore } from '../../shared/store/tripPlannerStore';
import { planTrip } from '../../shared/api/trip';
import { searchPlaces } from '../../shared/api/search';
import { TripPlanView } from './TripPlanView';

export const TripPlanner: React.FC<{ onClose: () => void }> = ({ onClose }) => {
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
    reset
  } = useTripPlannerStore();

  const [originInput, setOriginInput] = useState('');
  const [destinationInput, setDestinationInput] = useState('');
  const [originSuggestions, setOriginSuggestions] = useState<any[]>([]);
  const [destinationSuggestions, setDestinationSuggestions] = useState<any[]>([]);
  const [isPlanning, setIsPlanning] = useState(false);

  useEffect(() => {
    if (origin) setOriginInput(origin.name || '');
  }, [origin]);

  useEffect(() => {
    if (destination) setDestinationInput(destination.name || '');
  }, [destination]);

  const handleOriginSearch = async (value: string) => {
    setOriginInput(value);
    if (value.length < 2) {
      setOriginSuggestions([]);
      return;
    }
    const response = await searchPlaces({ query: value });
    setOriginSuggestions(response.results.slice(0, 5));
  };

  const handleDestinationSearch = async (value: string) => {
    setDestinationInput(value);
    if (value.length < 2) {
      setDestinationSuggestions([]);
      return;
    }
    const response = await searchPlaces({ query: value });
    setDestinationSuggestions(response.results.slice(0, 5));
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

  const handleClose = () => {
    reset();
    onClose();
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

  if (tripPlan) {
    return <TripPlanView onBack={() => setTripPlan(null)} onClose={handleClose} />;
  }

  return (
    <div className="w-full relative flex flex-col gap-3 pointer-events-auto">
      <div className="relative group">
        <div className="absolute inset-0 bg-secondary/20 rounded-xl blur" />
        <div className="relative bg-primary backdrop-blur-sm rounded-xl border border-white/10 shadow-2xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Planificar viaje</h2>
            <button onClick={handleClose} className="p-1 hover:bg-white/10 rounded transition-colors">
              <BiX className="w-6 h-6 text-white/60 hover:text-white" />
            </button>
          </div>

          <div className="space-y-3">
            <div className="relative">
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
                  <BiCurrentLocation className="w-5 h-5 text-white/60 hover:text-white" />
                </button>
                <button
                  onClick={() => setIsSelectingOrigin(true)}
                  className="p-2 hover:bg-white/10 rounded transition-colors"
                  title="Seleccionar en mapa"
                >
                  <BiMap className="w-5 h-5 text-white/60 hover:text-white" />
                </button>
              </div>
              {originSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-primary/95 backdrop-blur-sm border border-white/10 rounded-lg shadow-xl max-h-48 overflow-y-auto z-10">
                  {originSuggestions.map((place, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setOrigin({ lat: place.lat, lng: place.lng, name: place.name });
                        setOriginSuggestions([]);
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-white/10 transition-colors"
                    >
                      <div className="font-medium text-white">{place.name}</div>
                      <div className="text-sm text-white/60">{place.type}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-center">
              <button
                onClick={swapLocations}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
                title="Intercambiar origen y destino"
              >
                <MdSwapVert className="w-5 h-5 text-white/60 hover:text-white" />
              </button>
            </div>

            <div className="relative">
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
                  <BiCurrentLocation className="w-5 h-5 text-white/60 hover:text-white" />
                </button>
                <button
                  onClick={() => setIsSelectingDestination(true)}
                  className="p-2 hover:bg-white/10 rounded transition-colors"
                  title="Seleccionar en mapa"
                >
                  <BiMap className="w-5 h-5 text-white/60 hover:text-white" />
                </button>
              </div>
              {destinationSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-primary/95 backdrop-blur-sm border border-white/10 rounded-lg shadow-xl max-h-48 overflow-y-auto z-10">
                  {destinationSuggestions.map((place, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setDestination({ lat: place.lat, lng: place.lng, name: place.name });
                        setDestinationSuggestions([]);
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-white/10 transition-colors"
                    >
                      <div className="font-medium text-white">{place.name}</div>
                      <div className="text-sm text-white/60">{place.type}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={handlePlanTrip}
              disabled={!origin || !destination || isPlanning}
              className="w-full py-3 bg-secondary hover:bg-secondary/80 disabled:bg-white/10 disabled:text-white/40 text-white rounded-lg font-semibold transition-all hover:scale-[1.02] disabled:hover:scale-100"
            >
              {isPlanning ? 'Planificando...' : 'Buscar rutas'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
