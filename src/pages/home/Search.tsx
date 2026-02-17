import React, { useState, useEffect, useMemo, useRef } from "react";
import { BiX as ClearIcon, BiBus, BiMap, BiLoaderAlt } from "react-icons/bi";
import { FaBus } from "react-icons/fa";
import Fuse from 'fuse.js';
import { useMapStore } from '../../shared/store/mapStore';
import { usePinStore } from '../../shared/store/pinStore';
import { getQueryData } from '../../shared/services/GetQueryData';
import { useRutasStore } from '../../shared/store/rutasStore';
import { TextCarousel } from './TextCarrusel';
import { useLayoutStore } from '../../shared/store/layoutStore';
import { useErrorStore } from '../../shared/store/errorStore';
import { errorHandler } from '../../shared/errors/ErrorHandler';
import { useSearchStore } from '../../shared/store/searchStore';
import { usePlaceSearchStore } from '../../shared/store/placeSearchStore';
import { RouteCodeBadge } from '../../shared/components/rutas/RouteCodeBadge';
import { searchPlaces } from '../../shared/api/search';
import type { SearchResult } from '../../shared/types/search';
import { LngLat } from 'maplibre-gl';

const normalizeRouteQuery = (value: string) =>
  value
    .toUpperCase()
    .replace(/^RUTA\s+/i, '')
    .replace(/[^A-Z0-9]/g, '');

export const Search: React.FC = () => {
  const { inputValue, showResults, setInputValue, setShowResults } = useSearchStore();
  const { setSelectedResult, clearSelectedResult } = usePlaceSearchStore();
  const [placeResults, setPlaceResults] = useState<SearchResult[]>([]);
  const [isSearchingPlaces, setIsSearchingPlaces] = useState(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout>>();

  const searchContainerRef = useRef<HTMLFormElement>(null);

  const { layoutStates } = useLayoutStore();
  const { search, department } = layoutStates;
  const { updateGeojson, setSelectedInfo, setCurrentLevel, setParentInfo, selectedInfo, config, updateConfig } = useMapStore();
  const { setPin } = usePinStore();

  const { selectRoute, allRoutes, fetchAllRoutes, isLoading: isRutasLoading, clearSelectedRoute } = useRutasStore();

  // const { addAnnotation } = useAnnotationStore();
  const { showError, setLoading } = useErrorStore();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    try {
      document.cookie = 'hasVisited=true; path=/; max-age=31536000; SameSite=Strict';
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchAllRoutes();
  }, [fetchAllRoutes]);

  // Limpiar al cambiar input
  useEffect(() => {
    if (!inputValue) {
      updateGeojson(null);
      setSelectedInfo(null);
      setCurrentLevel('departamento');
      setParentInfo(null);
      clearSelectedRoute();
    }
  }, [inputValue, updateGeojson, setSelectedInfo, setCurrentLevel, setParentInfo, clearSelectedRoute]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;
    setInputValue(newValue);
    setShowResults(true);

    if (selectedInfo && newValue !== selectedInfo.name) {
      updateGeojson(null);
      setSelectedInfo(null);
      setCurrentLevel('departamento');
      setParentInfo(null);
    }
    
    // Búsqueda de lugares con debounce
    if (newValue.trim()) {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
      
      setIsSearchingPlaces(true);
      debounceTimer.current = setTimeout(async () => {
        try {
          const response = await searchPlaces({
            query: newValue.trim(),
            lat: config.center.lat,
            lng: config.center.lng,
            limit: 5,
            country: 'sv',
          });
          setPlaceResults(response.results);
        } catch (error) {
          console.error('Error searching places:', error);
          setPlaceResults([]);
        } finally {
          setIsSearchingPlaces(false);
        }
      }, 300);
    } else {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
        debounceTimer.current = undefined;
      }
      setIsSearchingPlaces(false);
      setPlaceResults([]);
    }
  };

  const handleClearInput = () => {
    setInputValue('');
    if (inputValue) setShowResults(false);

    // Limpiar info geográfica
    updateGeojson(null);
    setSelectedInfo(null);
    setCurrentLevel('departamento');
    setParentInfo(null);
    
    // Limpiar rutas y lugares
    useRutasStore.getState().clearSelectedRoute();
    clearSelectedResult();
    setPlaceResults([]);
    setPin(null);
    useRutasStore.getState().clearNearbyRoutes();
  }

  const handleClick = async (query: string, whatIs: string, routeCode?: string) => {
    try {
      setInputValue(query);
      setShowResults(false);

      if (whatIs === 'ROUTE' && routeCode) {
        updateGeojson(null);
        setSelectedInfo(null);
        setCurrentLevel('departamento');
        setParentInfo(null);

        await selectRoute(routeCode);
        return;
      }

      setLoading(true);

      const data = await getQueryData(query, whatIs);
      if (data) {
        updateGeojson(data);
        setSelectedInfo({
          type: whatIs === 'D' ? 'Departamento' : whatIs === 'M' ? 'Municipio' : 'Distrito',
          name: query
        });

        // Comentado: funcionalidad de anotaciones
        // addAnnotation({
        //   type: 'search-result',
        //   name: query,
        //   data: {
        //     geojson: data,
        //     metadata: {
        //       searchType: whatIs as 'D' | 'M' | 'distrito',
        //       searchQuery: query,
        //     },
        //   },
        // });

        if (whatIs === 'D') {
          setCurrentLevel('departamento');
          setParentInfo(null);
        } else if (whatIs === 'M') {
          setCurrentLevel('distrito');
          setParentInfo({ municipio: query });
        } else {
          setCurrentLevel('distrito');
        }
      } else {
        showError(errorHandler.handle(new Error('No se encontraron datos para la búsqueda')));
      }
    } catch (error) {
      const handledError = errorHandler.handle(error);
      showError(handledError);
    } finally {
      if (whatIs !== 'ROUTE') setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedInfo) {
      setInputValue(selectedInfo.name);
    } else {
      setInputValue('');
    }
  }, [selectedInfo]);

  // --- Unified Search Logic with Lazy Loading ---
  
  const fuseInstance = useMemo(() => {
    return new Fuse(allRoutes, {
      threshold: 0.2,
      useExtendedSearch: true,
      ignoreLocation: true,
      keys: ['nombre', 'codigo']
    });
  }, [allRoutes]);

  // Pre-calculate normalized values for all routes
  const normalizedRoutes = useMemo(() => {
    return allRoutes.map(route => ({
      original: route,
      normalizedCode: normalizeRouteQuery(route.codigo),
      normalizedName: normalizeRouteQuery(route.nombre)
    }));
  }, [allRoutes]);

  const searchResults = useMemo(() => {
    if (!inputValue) return { routes: [] };

    const normalizedQuery = normalizeRouteQuery(inputValue);
    const isRouteQuery = /\d/.test(inputValue) || /\bruta\b/i.test(inputValue);

    const fuseResults = fuseInstance.search(inputValue).map(result => result.item as typeof allRoutes[0]);

    // Use pre-calculated normalized values
    const normalizedMatches = normalizedQuery.length >= 2
      ? normalizedRoutes
          .filter(({ normalizedCode, normalizedName }) =>
            normalizedCode.includes(normalizedQuery) || normalizedName.includes(normalizedQuery)
          )
          .map(({ original }) => original)
      : [];

    const primary = isRouteQuery ? normalizedMatches : fuseResults;
    const secondary = isRouteQuery ? fuseResults : normalizedMatches;

    const combined = new Map<string, typeof allRoutes[0]>();
    [...primary, ...secondary].forEach((route) => {
      if (!combined.has(route.codigo)) {
        combined.set(route.codigo, route);
      }
    });

    return {
      routes: Array.from(combined.values()).slice(0, 20)
    };
  }, [inputValue, fuseInstance, normalizedRoutes]);

  const { routes: filteredRoutes } = searchResults;

  const isSelfLoading = isRutasLoading && allRoutes.length === 0;

  return (
    <>
      <form
        ref={searchContainerRef}
        onSubmit={(e) => e.preventDefault()}
        className="w-full"
      >
        {search && (
          <div className="w-full relative flex flex-col gap-2">
            <div className="relative w-full group">
              <div className={`
                absolute inset-0 bg-secondary/20 rounded-xl blur transition-opacity duration-300
                ${showResults ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'}
              `} />

              <div className="relative flex items-center bg-primary backdrop-blur-sm rounded-xl border border-white/10 shadow-2xl overflow-visible pointer-events-auto">

                <div className="pl-3 text-secondary">
                  <BiBus className="text-xl" />
                </div>

                <input
                  onChange={handleInputChange}
                  onFocus={() => setShowResults(true)}
                  value={inputValue}
                  type="text"
                  placeholder="Buscar rutas, hospitales, restaurantes..."
                  className="w-full h-12 px-3 text-white bg-transparent outline-none placeholder-white/30"
                  autoComplete="off"
                />

                {inputValue && (
                  <button
                    type="button"
                    onClick={handleClearInput}
                    className="mr-2 p-2 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors"
                  >
                    {isSelfLoading || isSearchingPlaces ? <BiLoaderAlt className="text-xl animate-spin text-secondary" /> : <ClearIcon className="text-xl" />}
                  </button>
                )}
              </div>
            </div>

            {inputValue && showResults && (
              <div
                className="
                  absolute top-full mt-2 w-full left-0 
                  bg-primary/95 backdrop-blur-md 
                  rounded-xl border border-white/10 shadow-2xl 
                  overflow-hidden max-h-[60vh] overflow-y-auto custom-scrollbar
                  animate-slide-up pointer-events-auto
                "
              >
                {/* Resultados unificados */}
                {(filteredRoutes?.length > 0 || placeResults?.length > 0) ? (
                  <div className="divide-y divide-white/5">
                    {/* Lugares */}
                    {placeResults?.length > 0 && (
                      <div>
                        <p className="px-4 py-2 text-xs font-semibold text-secondary uppercase tracking-wider bg-secondary/10">
                          Lugares
                        </p>
                        {placeResults.map((place) => (
                          <button
                            key={place.id}
                            onClick={() => {
                              updateConfig({
                                center: { lat: place.lat, lng: place.lng },
                                zoom: 16,
                              });
                              setPin(new LngLat(place.lng, place.lat));
                              setSelectedResult(place);
                              setShowResults(false);
                            }}
                            className="w-full text-left px-4 py-3 hover:bg-white/5 transition-colors"
                          >
                            <div className="flex items-start gap-3">
                              <BiMap className="text-secondary mt-0.5 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-white truncate">{place.name}</p>
                                {place.address && (
                                  <p className="text-xs text-white/50 truncate">
                                    {[place.address.city, place.address.state]
                                      .filter(Boolean)
                                      .join(', ')}
                                  </p>
                                )}
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-xs text-white/40 capitalize">
                                    {place.type}
                                  </span>
                                  {place.distance_m && (
                                    <>
                                      <span className="text-xs text-white/30">•</span>
                                      <span className="text-xs text-white/40">
                                        {place.distance_m < 1000
                                          ? `${Math.round(place.distance_m)}m`
                                          : `${(place.distance_m / 1000).toFixed(1)}km`}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Rutas */}
                    {filteredRoutes?.length > 0 && (
                      <div>
                        <p className="px-4 py-2 text-xs font-semibold text-secondary uppercase tracking-wider bg-secondary/10">
                          Rutas de Transporte
                        </p>
                        {filteredRoutes.map((ruta) => (
                          <div
                            key={ruta.codigo}
                            onClick={() => handleClick(ruta.nombre, 'ROUTE', ruta.codigo)}
                            className="group px-4 py-3 cursor-pointer border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors"
                          >
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-3">
                                <RouteCodeBadge 
                                  code={ruta.nombre.replace('Ruta ', '').split(' ')[0]} 
                                  subtipo={ruta.subtipo}
                                  size="sm"
                                />
                                <div>
                                  <p className="font-semibold text-white group-hover:text-secondary transition-colors">
                                    {ruta.nombre}
                                  </p>
                                  <p className="text-xs text-white/50">
                                    {ruta.tipo === 'POR AUTOBUS' ? 'Bus' : 'Micro'} • {ruta.departamento}
                                  </p>
                                </div>
                              </div>
                              <BiBus className="text-white/20 group-hover:text-secondary" />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-8 text-center">
                    {isSelfLoading || isSearchingPlaces ? (
                      <div className="flex flex-col items-center gap-2">
                        <BiLoaderAlt className="text-3xl animate-spin text-secondary" />
                        <p className="text-white/60">Buscando...</p>
                      </div>
                    ) : inputValue ? (
                      <>
                        <FaBus className="mx-auto text-4xl text-white/20 mb-3" />
                        <p className="text-white/60">No encontramos resultados</p>
                        <p className="text-xs text-white/40 mt-1">Prueba: 42, hospital, restaurante</p>
                      </>
                    ) : null}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {department && <TextCarousel />}
      </form>
    </>
  );
};
