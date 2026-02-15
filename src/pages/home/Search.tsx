import React, { useState, useEffect, useMemo, useRef } from "react";
import { BiX as ClearIcon, BiBus, BiMap, BiChevronDown, BiLoaderAlt } from "react-icons/bi";
import { FaBus } from "react-icons/fa";
import Fuse from 'fuse.js';
import { getGeoData, GeoDataSearch } from "../../shared/services/GetGeoData";
import { useMapStore } from '../../shared/store/mapStore';
// import { useAnnotationStore } from '../../shared/store/annotationStore';
import { getQueryData } from '../../shared/services/GetQueryData';
import { useRutasStore } from '../../shared/store/rutasStore';
import { TextCarousel } from './TextCarrusel';
import { useLayoutStore } from '../../shared/store/layoutStore';
import { useErrorStore } from '../../shared/store/errorStore';
import { errorHandler } from '../../shared/errors/ErrorHandler';
import { Z_INDEX } from '../../shared/constants/zIndex';
import { useSearchStore } from '../../shared/store/searchStore';
import { RouteCodeBadge } from '../../shared/components/rutas/RouteCodeBadge';

type SearchMode = 'routes' | 'places';

export const Search: React.FC = () => {
  const [geoData, setGeoData] = useState<GeoDataSearch>({
    departamentos: [],
    municipios: [],
    distritos: []
  });
  const { inputValue, showResults, setInputValue, setShowResults } = useSearchStore();
  const [mode, setMode] = useState<SearchMode>('routes');
  const [showModeSelector, setShowModeSelector] = useState<boolean>(false);

  const searchContainerRef = useRef<HTMLFormElement>(null);

  const { layoutStates } = useLayoutStore();
  const { search, department } = layoutStates;
  const { updateGeojson, setSelectedInfo, setCurrentLevel, setParentInfo, selectedInfo } = useMapStore();

  const { selectRoute, allRoutes, fetchAllRoutes, isLoading: isRutasLoading, clearSelectedRoute } = useRutasStore();

  // const { addAnnotation } = useAnnotationStore();
  const { showError, setLoading } = useErrorStore();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowResults(false);
        setShowModeSelector(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getGeoData();
        setGeoData(data.data);
      } catch (error) {
        console.error("Error loading geo data", error);
      }
    };
    fetchData();

    try {
      document.cookie = 'hasVisited=true; path=/; max-age=31536000; SameSite=Strict';
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (mode === 'routes' && allRoutes.length === 0) {
      fetchAllRoutes();
    }
  }, [mode, allRoutes.length, fetchAllRoutes]);

  // Limpiar todo al cambiar de modo
  useEffect(() => {
    setInputValue('');
    setShowResults(false);
    
    // Limpiar estado del mapa (lugares)
    updateGeojson(null);
    setSelectedInfo(null);
    setCurrentLevel('departamento');
    setParentInfo(null);
    
    // Limpiar ruta seleccionada
    clearSelectedRoute();
  }, [mode, updateGeojson, setSelectedInfo, setCurrentLevel, setParentInfo, clearSelectedRoute]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;
    setInputValue(newValue);
    setShowResults(true);
    setShowModeSelector(false); // Ocultar selector de modo al escribir

    if (selectedInfo && newValue !== selectedInfo.name) {
      updateGeojson(null);
      setSelectedInfo(null);
      setCurrentLevel('departamento');
      setParentInfo(null);
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
    
    // Limpiar rutas
    useRutasStore.getState().clearSelectedRoute();
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
  type PlaceItem = { name: string; type: 'D' | 'M' | 'distrito' };
  
  // Memoize Fuse instances separately to avoid re-creation when unrelated data changes
  const placesFuse = useMemo(() => {
    const allPlaces: PlaceItem[] = [
      ...geoData.departamentos.map(d => ({ name: d, type: 'D' as const })),
      ...geoData.municipios.map(m => ({ name: m, type: 'M' as const })),
      ...geoData.distritos.map(d => ({ name: d, type: 'distrito' as const }))
    ];
    return new Fuse(allPlaces, {
      threshold: 0.3,
      keys: ['name']
    });
  }, [geoData]);

  const routesFuse = useMemo(() => {
    return new Fuse(allRoutes, {
      threshold: 0.2,
      useExtendedSearch: true,
      ignoreLocation: true,
      keys: ['nombre', 'codigo']
    });
  }, [allRoutes]);

  const fuseInstance = mode === 'places' ? placesFuse : routesFuse;

  const searchResults = useMemo(() => {
    if (!inputValue) return { departamentos: [], municipios: [], distritos: [], routes: [] };

    const results = fuseInstance.search(inputValue);
    
    if (mode === 'places') {
      const placeResults = results.slice(0, 15);
      const departamentos: string[] = [];
      const municipios: string[] = [];
      const distritos: string[] = [];
      
      placeResults.forEach(r => {
        const item = r.item as any;
        if (item.type === 'D' && departamentos.length < 5) departamentos.push(item.name);
        else if (item.type === 'M' && municipios.length < 5) municipios.push(item.name);
        else if (item.type === 'distrito' && distritos.length < 5) distritos.push(item.name);
      });
      
      return { departamentos, municipios, distritos, routes: [] };
    } else {
      return {
        departamentos: [],
        municipios: [],
        distritos: [],
        routes: results.slice(0, 20).map(r => r.item as typeof allRoutes[0])
      };
    }
  }, [inputValue, mode, fuseInstance]);

  const { departamentos: filteredDepartamentos, municipios: filteredMunicipios, distritos: filteredDistritos, routes: filteredRoutes } = searchResults;

  const hasResults = filteredDepartamentos.length > 0 ||
    filteredMunicipios.length > 0 ||
    filteredDistritos.length > 0 ||
    filteredRoutes.length > 0;

  const isSelfLoading = mode === 'routes' && isRutasLoading && allRoutes.length === 0;

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

                <div className="relative border-r border-white/10 pr-1">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModeSelector(!showModeSelector);
                      setShowResults(false); // Ocultar resultados al abrir selector
                    }}
                    className="flex items-center gap-1 pl-3 pr-2 py-3 text-secondary hover:text-white transition-colors outline-none"
                    title="Cambiar modo de búsqueda"
                  >
                    {mode === 'routes' ? <BiBus className="text-xl" /> : <BiMap className="text-xl" />}
                    <BiChevronDown className={`text-xs opacity-70 transition-transform ${showModeSelector ? 'rotate-180' : ''}`} />
                  </button>

                  {showModeSelector && (
                    <div 
                      className="absolute top-full left-0 mt-2 w-32 bg-primary/95 backdrop-blur-md border border-white/10 rounded-lg shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
                      style={{ zIndex: Z_INDEX.SEARCH_RESULTS }}
                    >
                      <button
                        type="button"
                        onClick={() => { 
                          setMode('routes'); 
                          setShowModeSelector(false);
                          // Limpiar al cambiar modo
                          handleClearInput();
                        }}
                        className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-white/10 transition-colors ${mode === 'routes' ? 'text-secondary bg-white/5' : 'text-white'}`}
                      >
                        <BiBus /> Rutas
                      </button>
                      <button
                        type="button"
                        onClick={() => { 
                          setMode('places'); 
                          setShowModeSelector(false);
                          // Limpiar al cambiar modo
                          handleClearInput();
                        }}
                        className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-white/10 transition-colors ${mode === 'places' ? 'text-secondary bg-white/5' : 'text-white'}`}
                      >
                        <BiMap /> Lugares
                      </button>
                    </div>
                  )}
                </div>

                <input
                  onChange={handleInputChange}
                  onFocus={() => setShowResults(true)}
                  value={inputValue}
                  type="text"
                  placeholder={mode === 'routes' ? "Buscar ruta (ej: 42, 101, Especial)" : "Buscar municipio, departamento..."}
                  className="w-full h-12 px-3 text-white bg-transparent outline-none placeholder-white/30"
                  autoComplete="off"
                />

                {inputValue && (
                  <button
                    type="button"
                    onClick={handleClearInput}
                    className="mr-2 p-2 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors"
                  >
                    {isSelfLoading ? <BiLoaderAlt className="text-xl animate-spin text-secondary" /> : <ClearIcon className="text-xl" />}
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
                {mode === 'routes' && (
                  <>
                    {filteredRoutes.length > 0 ? (
                      <div>
                        <div className="px-4 py-2 text-xs font-semibold text-white/40 uppercase tracking-wider bg-white/5">
                          Resultados encontrados ({filteredRoutes.length})
                        </div>
                        {filteredRoutes.map((ruta) => (
                          <div
                            key={ruta.codigo}
                            onClick={() => handleClick(ruta.nombre, 'ROUTE', ruta.codigo)}
                            className="
                              group px-4 py-3 cursor-pointer 
                              border-b border-white/5 last:border-0
                              hover:bg-white/5 transition-colors
                            "
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
                    ) : (
                      <div className="p-8 text-center">
                        {isSelfLoading ? (
                          <div className="flex flex-col items-center gap-2">
                            <BiLoaderAlt className="text-3xl animate-spin text-secondary" />
                            <p className="text-white/60">Cargando catálogo de rutas...</p>
                          </div>
                        ) : (
                          <>
                            <FaBus className="mx-auto text-4xl text-white/20 mb-3" />
                            <p className="text-white/60">No encontramos rutas con ese nombre</p>
                            <p className="text-xs text-white/40 mt-1">Prueba buscando por número (ej: 42, 101)</p>
                          </>
                        )}
                      </div>
                    )}
                  </>
                )}

                {mode === 'places' && (
                  <>
                    {hasResults ? (
                      <div className="divide-y divide-white/5">
                        {filteredDepartamentos.length > 0 && (
                          <div>
                            <p className="px-4 py-2 text-xs font-semibold text-secondary uppercase tracking-wider bg-secondary/10">
                              Departamentos
                            </p>
                            {filteredDepartamentos.map((depto, index) => (
                              <button
                                key={index}
                                onClick={() => handleClick(depto, 'D')}
                                className="w-full text-left px-4 py-3 hover:bg-white/5 transition-colors flex items-center gap-3"
                              >
                                <BiMap className="text-white/40" />
                                <span className="text-white">{depto}</span>
                              </button>
                            ))}
                          </div>
                        )}

                        {filteredMunicipios.length > 0 && (
                          <div>
                            <p className="px-4 py-2 text-xs font-semibold text-secondary uppercase tracking-wider bg-secondary/10">
                              Municipios
                            </p>
                            {filteredMunicipios.map((muni, index) => (
                              <button
                                key={index}
                                onClick={() => handleClick(muni, 'M')}
                                className="w-full text-left px-4 py-3 hover:bg-white/5 transition-colors flex items-center gap-3"
                              >
                                <BiMap className="text-white/40" />
                                <span className="text-white">{muni}</span>
                              </button>
                            ))}
                          </div>
                        )}

                        {filteredDistritos.length > 0 && (
                          <div>
                            <p className="px-4 py-2 text-xs font-semibold text-secondary uppercase tracking-wider bg-secondary/10">
                              Distritos
                            </p>
                            {filteredDistritos.map((dist, index) => (
                              <button
                                key={index}
                                onClick={() => handleClick(dist, 'NAM')}
                                className="w-full text-left px-4 py-3 hover:bg-white/5 transition-colors flex items-center gap-3"
                              >
                                <BiMap className="text-white/40" />
                                <span className="text-white">{dist}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-8 text-center">
                        <BiMap className="mx-auto text-4xl text-white/20 mb-3" />
                        <p className="text-white/60">No encontramos lugares cercanos</p>
                      </div>
                    )}
                  </>
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
