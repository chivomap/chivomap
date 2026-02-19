import React, { useState, useCallback, useEffect, useRef } from 'react';
import Map, { ViewStateChangeEvent, MapRef } from 'react-map-gl/maplibre';
import { LngLat, LngLatBounds } from 'maplibre-gl';
import { useMapStore } from '../../../shared/store/mapStore';
import { usePinStore } from '../../store/pinStore';
import { useRutasStore } from '../../store/rutasStore';
import { useBottomSheet } from '../../../hooks/useBottomSheet';
import { env } from '../../config/env';
import { MapStyle } from '../../data/mapStyles';
import { useThemeStore } from '../../store/themeStore';
import { useBottomSheetStore } from '../../store/bottomSheetStore';

import { MapControls, MapMarker, MapScale, MapStyleSelector, GeoLayer, GeoDistritos } from './Features';
import { UserLocationMarker } from './Features/UserLocationMarker';
import { TripPlannerMapListener } from './Features/TripPlannerMapListener';
import { TripRouteLayer } from './Features/TripRouteLayer';
import { RouteLayer, SearchRadiusLayer, NearbyRoutesLayer } from '../rutas';
import { ParadasLayer } from '../paradas/ParadasLayer';
import { useTripPlannerStore } from '../../store/tripPlannerStore';
import 'maplibre-gl/dist/maplibre-gl.css';
import './popup-styles.css';

export const MapLibreMap: React.FC = () => {
  const [mapReady, setMapReady] = useState<boolean>(false);
  const [polygonCoords, setPolygonCoords] = useState<LngLat[]>([]);
  const [hoverInfo, setHoverInfo] = useState<{ name: string; x: number; y: number } | null>(null);
  const [routeHover, setRouteHover] = useState<{ 
    codigo: string; 
    nombre: string; 
    tipo: string;
    subtipo: string;
    sentido: string;
    departamento: string;
    kilometros: number;
    distancia_m: number;
    x: number; 
    y: number;
  } | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; lngLat: LngLat } | null>(null);
  const [interactiveLayers, setInteractiveLayers] = useState<string[]>(['distritos-fill']);
  const [longPressTimer, setLongPressTimer] = useState<number | null>(null);
  
  const { config, updateConfig } = useMapStore();
  const { pin, setPin } = usePinStore();
  const { selectedRoute, nearbyRoutes, showNearbyOnMap, selectRoute, setHoveredRoute, setOverlappingRoutes } = useRutasStore();
  const { currentMapStyle, setMapStyle } = useThemeStore();
  const { openNearbyRoutes, isOpen: isDrawerOpen } = useBottomSheet();
  const { selectedOptionIndex, tripPlan, focusedLegIndex } = useTripPlannerStore();
  const { sheetState } = useBottomSheetStore();
  const { center, zoom } = config;

  const mapRef = useRef<MapRef>(null);
  const lastTripViewKey = useRef<string | null>(null);
  const lastDrawerKeyRef = useRef<string>('');
  const drawerShiftRef = useRef(0);

  // Initialize map style from store
  const [mapStyle, setMapStyleState] = useState<string>(currentMapStyle.url);

  useEffect(() => {
    setMapStyleState(currentMapStyle.url);
  }, [currentMapStyle]);

  // Zoom to route when selected
  useEffect(() => {
    if (selectedRoute && mapRef.current) {
      try {
        const bounds = new LngLatBounds();
        const coords = selectedRoute.geometry.coordinates;

        const extendBounds = (coord: any) => {
          if (Array.isArray(coord) && coord.length >= 2) {
            bounds.extend([coord[0], coord[1]]);
          }
        };

        if (Array.isArray(coords)) {
          const first = coords[0];
          if (Array.isArray(first) && typeof first[0] === 'number') {
            // LineString
            coords.forEach(extendBounds);
          } else if (Array.isArray(first) && Array.isArray(first[0])) {
            // MultiLineString
            coords.forEach((line: any) => {
              if (Array.isArray(line)) {
                line.forEach(extendBounds);
              }
            });
          }

          if (!bounds.isEmpty()) {
            mapRef.current.fitBounds(bounds, {
              padding: 50,
              duration: 1000 // Smooth animation
            });
          }
        }
      } catch (error) {
        console.error("Error fitting bounds to route:", error);
      }
    }
  }, [selectedRoute]);

  useEffect(() => {
    if (window.innerWidth >= 640 || !mapRef.current) return;

    const key = `${isDrawerOpen ? 'open' : 'closed'}:${sheetState}`;
    if (key === lastDrawerKeyRef.current) return;
    lastDrawerKeyRef.current = key;

    const map = mapRef.current.getMap();
    if (!map) return;

    let targetShift = 0;
    if (isDrawerOpen) {
      if (sheetState === 'peek') targetShift = 60;
      if (sheetState === 'half') targetShift = Math.round(window.innerHeight * 0.16);
      if (sheetState === 'full') targetShift = Math.round(window.innerHeight * 0.26);
    }

    const deltaShift = targetShift - drawerShiftRef.current;
    drawerShiftRef.current = targetShift;

    if (deltaShift === 0) return;

    const centerPoint = map.project(map.getCenter());
    // Drawer abajo => shift positivo mueve foco hacia abajo.
    const nextCenter = map.unproject([centerPoint.x, centerPoint.y + deltaShift]);

    map.easeTo({
      center: nextCenter,
      duration: 220,
      easing: (t) => 1 - Math.pow(1 - t, 2),
      essential: true,
    });
  }, [isDrawerOpen, sheetState]);

  // Focus on trip plan key points (origin/destination/transfers)
  useEffect(() => {
    if (!tripPlan || selectedOptionIndex === null || !mapRef.current) {
      lastTripViewKey.current = null;
      return;
    }

    const option = tripPlan.options[selectedOptionIndex];
    if (!option) return;

    const focusLeg = focusedLegIndex !== null ? option.legs[focusedLegIndex] : null;
    const legsForBounds = focusLeg ? [focusLeg] : option.legs;

    const key = `${selectedOptionIndex}:${focusedLegIndex ?? 'all'}:${legsForBounds
      .map((leg) => `${leg.from.lat.toFixed(4)},${leg.from.lng.toFixed(4)}:${leg.to.lat.toFixed(4)},${leg.to.lng.toFixed(4)}`)
      .join('|')}`;
    if (lastTripViewKey.current === key) return;
    lastTripViewKey.current = key;

    const bounds = new LngLatBounds();
    const addPoint = (lng: number, lat: number) => {
      if (Number.isFinite(lng) && Number.isFinite(lat)) {
        bounds.extend([lng, lat]);
      }
    };

    legsForBounds.forEach((leg) => {
      addPoint(leg.from.lng, leg.from.lat);
      addPoint(leg.to.lng, leg.to.lat);
    });

    if (!bounds.isEmpty()) {
      const isMobile = window.innerWidth < 640;
      mapRef.current.fitBounds(bounds, {
        padding: isMobile
          ? { top: 140, bottom: 180, left: 40, right: 40 }
          : { top: 120, bottom: 120, left: 60, right: 60 },
        duration: 1200,
        pitch: isMobile ? 30 : 45,
        bearing: -15,
      });
    }
  }, [tripPlan, selectedOptionIndex, focusedLegIndex]);

  // Listener para enfocar un solo punto
  useEffect(() => {
    const handleFocusPoint = (event: CustomEvent) => {
      if (!mapRef.current) return;

      const { point, zoom, duration, offset } = event.detail;
      const map = mapRef.current.getMap();
      
      map.easeTo({
        center: [point.lng, point.lat],
        zoom,
        duration,
        offset,
      });
    };

    window.addEventListener('map-focus-point', handleFocusPoint as EventListener);
    return () => {
      window.removeEventListener('map-focus-point', handleFocusPoint as EventListener);
    };
  }, []);

  // Listener para enfocar múltiples puntos (fitBounds)
  useEffect(() => {
    const handleFocusPoints = (event: CustomEvent) => {
      if (!mapRef.current) return;

      const { points, padding, duration, maxZoom } = event.detail;
      
      if (!points || points.length === 0) return;

      const bounds = new LngLatBounds();
      points.forEach((point: { lat: number; lng: number }) => {
        bounds.extend([point.lng, point.lat]);
      });

      mapRef.current.fitBounds(bounds, {
        padding,
        duration,
        maxZoom,
      });
    };

    window.addEventListener('map-focus-points', handleFocusPoints as EventListener);
    return () => {
      window.removeEventListener('map-focus-points', handleFocusPoints as EventListener);
    };
  }, []);

  const handleMapLoad = useCallback(() => {
    if (mapRef.current) {
      const map = mapRef.current.getMap();
      
      // Crear ícono de flecha SVG
      const arrowSvg = `
        <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2 L12 18 M12 18 L6 12 M12 18 L18 12" 
                stroke="white" 
                stroke-width="3" 
                fill="none" 
                stroke-linecap="round" 
                stroke-linejoin="round"/>
        </svg>
      `;
      
      const img = new Image(24, 24);
      img.onload = () => {
        if (!map.hasImage('arrow')) {
          map.addImage('arrow', img);
        }
      };
      img.src = 'data:image/svg+xml;base64,' + btoa(arrowSvg);
    }
    
    setMapReady(true);
  }, []);

  // Update interactive layers when nearby routes change
  useEffect(() => {
    if (showNearbyOnMap && nearbyRoutes && nearbyRoutes.length > 0) {
      // Con FeatureCollection, solo hay 2 capas: hitbox y line
      setInteractiveLayers(['distritos-fill', 'nearby-routes-hitbox', 'nearby-routes-line']);
    } else {
      setInteractiveLayers(['distritos-fill']);
    }
  }, [showNearbyOnMap, nearbyRoutes]);

  // RAF throttle para updateConfig - actualizar a 60fps máximo
  const rafIdRef = useRef<number | null>(null);
  const pendingUpdateRef = useRef<{ center: { lat: number; lng: number }; zoom: number } | null>(null);
  
  const handleViewStateChange = useCallback((evt: ViewStateChangeEvent) => {
    // Limpiar overlapping routes cuando el usuario arrastra el mapa
    setOverlappingRoutes(null);
    
    // Guardar el update pendiente
    pendingUpdateRef.current = {
      center: { lat: evt.viewState.latitude, lng: evt.viewState.longitude },
      zoom: evt.viewState.zoom
    };
    
    // Si ya hay un RAF pendiente, no crear otro
    if (rafIdRef.current !== null) return;
    
    // Usar RAF para batch updates a 60fps
    rafIdRef.current = requestAnimationFrame(() => {
      if (pendingUpdateRef.current) {
        updateConfig(pendingUpdateRef.current);
        pendingUpdateRef.current = null;
      }
      rafIdRef.current = null;
    });
  }, [updateConfig, setOverlappingRoutes]);

  const handleMapClick = useCallback((event: any) => {
    // Limpiar overlapping routes cuando se hace click en el mapa
    setOverlappingRoutes(null);

    const { features } = event;
    
    // Check if clicked on a nearby route (hitbox or line)
    if (features && features.length > 0) {
      const routeFeatures = features.filter((f: any) => 
        f.layer?.id === 'nearby-routes-hitbox' || 
        f.layer?.id === 'nearby-routes-line'
      );
      
      if (routeFeatures.length > 0) {
        // Obtener todos los códigos únicos de las rutas clickeadas
        const codigos = [...new Set(routeFeatures.map((f: any) => f.properties?.codigo).filter(Boolean))] as string[];
        
        if (codigos.length > 1) {
          // Múltiples rutas solapadas - mostrar selector
          setOverlappingRoutes(codigos);
          return;
        } else if (codigos.length === 1) {
          // Una sola ruta - seleccionarla directamente
          selectRoute(codigos[0] as string);
          return;
        }
      }
    }
  }, [selectRoute, setOverlappingRoutes]);

  const handleMapRightClick = useCallback((event: any) => {
    event.preventDefault();
    const { lngLat, point } = event;
    
    setContextMenu({ x: point.x, y: point.y, lngLat });
  }, []);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      setPolygonCoords([]);
      setContextMenu(null);
    } else if (event.key === 'Backspace' || event.key === 'Delete') {
      setPolygonCoords([]);
    } else if (event.ctrlKey && event.key === 'z') {
      setPolygonCoords((prevCoords) => prevCoords.slice(0, -1));
    }
    // Comentado: funcionalidad de anotaciones
    // else if (event.key === 'Enter' && polygonCoords.length >= 3) {
    //   addAnnotation({
    //     type: 'drawn-polygon',
    //     name: `Polígono ${new Date().toLocaleTimeString('es-SV')}`,
    //     data: { coordinates: polygonCoords },
    //   });
    //   setPolygonCoords([]);
    //   setIsDrawingMode(false);
    // }
  }, [polygonCoords]);

  React.useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  const handleStyleChange = useCallback((style: MapStyle) => {
    setMapStyleState(style.url);
    setMapStyle(style);
  }, [setMapStyle]);

  return (
    <div className="w-screen h-screen fixed top-0 left-0">
      <Map
        ref={mapRef}
        longitude={center.lng}
        latitude={center.lat}
        zoom={zoom}
        minZoom={env.MAP_MIN_ZOOM}
        maxZoom={18}
        style={{ width: '100%', height: '100%' }}
        mapStyle={mapStyle}
        onLoad={handleMapLoad}
        onMove={handleViewStateChange}
        onClick={(event) => {
          // Check for nearby routes click
          if (event.features && event.features.length > 0) {
            const routeFeatures = event.features.filter(f => 
              f.layer?.id?.startsWith('nearby-route-hitbox-') || 
              f.layer?.id?.startsWith('nearby-route-line-')
            );
            
            if (routeFeatures.length > 0) {
              const routeCodes = [...new Set(routeFeatures.map(f => 
                f.layer.id
                  .replace('nearby-route-hitbox-', '')
                  .replace('nearby-route-line-', '')
              ))];
              
              if (routeCodes.length === 1) {
                // Single route, select it
                setOverlappingRoutes(null);
                selectRoute(routeCodes[0]);
                return;
              } else {
                // Multiple routes - show overlapping info
                setOverlappingRoutes(routeCodes);
                return;
              }
            }
            
            // Handle distrito clicks
            const feature = event.features[0];
            if (feature.source === 'distritos-source') {
              const geoDistritosEvent = new CustomEvent('distrito-click', {
                detail: { feature, lngLat: event.lngLat }
              });
              window.dispatchEvent(geoDistritosEvent);
              return;
            }
          }
          // Handle regular map clicks
          handleMapClick(event);
        }}
        onMouseMove={(event) => {
          // En mobile, deshabilitar completamente para evitar lag
          const isMobile = window.innerWidth < 768;
          if (isMobile) return;
          
          if (event.features && event.features.length > 0) {
            // Check for nearby routes hover (multiple possible)
            const routeFeatures = event.features.filter(f => 
              f.layer?.id?.startsWith('nearby-route-hitbox-') || 
              f.layer?.id?.startsWith('nearby-route-line-')
            );
            
            if (routeFeatures.length > 0) {
              const routeCodes = [...new Set(routeFeatures.map(f => 
                f.layer.id
                  .replace('nearby-route-hitbox-', '')
                  .replace('nearby-route-line-', '')
              ))];
              
              event.target.getCanvas().style.cursor = 'pointer';
              
              if (routeCodes.length > 1) {
                // Multiple routes - show summary
                setHoveredRoute(null);
                const rutas = routeCodes.map(code => nearbyRoutes.find(r => r.codigo === code)).filter(Boolean) as typeof nearbyRoutes;
                setRouteHover({
                  codigo: 'multiple',
                  nombre: `${routeCodes.length} rutas`,
                  tipo: rutas.map(r => r.nombre).join(', '),
                  subtipo: '',
                  sentido: '',
                  departamento: '',
                  kilometros: 0,
                  distancia_m: 0,
                  x: event.point.x,
                  y: event.point.y
                });
                return;
              }
              
              // Single route
              const codigo = routeCodes[0];
              const ruta = nearbyRoutes.find(r => r.codigo === codigo);
              
              if (ruta) {
                event.target.getCanvas().style.cursor = 'pointer';
                
                // Actualizar hover state
                setHoveredRoute(ruta.codigo);
                
                setRouteHover({
                  codigo: ruta.codigo,
                  nombre: ruta.nombre,
                  tipo: ruta.tipo,
                  subtipo: ruta.subtipo,
                  sentido: ruta.sentido,
                  departamento: ruta.departamento,
                  kilometros: ruta.kilometros,
                  distancia_m: ruta.distancia_m,
                  x: event.point.x,
                  y: event.point.y
                });
                return;
              }
            }
            
            const feature = event.features[0];
            if (feature.source === 'distritos-source') {
              event.target.getCanvas().style.cursor = 'pointer';

              // Mostrar tooltip
              const name = feature.properties.NAM || feature.properties.M;
              setHoverInfo({
                name,
                x: event.point.x,
                y: event.point.y
              });

              if (feature.id !== undefined) {
                // Limpiar hover anterior
                event.target.queryRenderedFeatures().forEach((f: any) => {
                  if (f.source === 'distritos-source' && f.id !== feature.id && f.id !== undefined) {
                    event.target.setFeatureState(
                      { source: 'distritos-source', id: f.id },
                      { hover: false }
                    );
                  }
                });
                // Activar hover actual
                event.target.setFeatureState(
                  { source: 'distritos-source', id: feature.id },
                  { hover: true }
                );
              }
            }
          } else {
            event.target.getCanvas().style.cursor = '';
            setHoverInfo(null);
            setRouteHover(null);
            setHoveredRoute(null);
            // Limpiar todos los hovers
            try {
              event.target.queryRenderedFeatures().forEach((f: any) => {
                if (f.source === 'distritos-source' && f.id !== undefined) {
                  event.target.setFeatureState(
                    { source: 'distritos-source', id: f.id },
                    { hover: false }
                  );
                }
              });
            } catch {
              // ignore
            }
          }
        }}
        onContextMenu={handleMapRightClick}
        onTouchStart={(e) => {
          // Solo en móvil
          if (window.innerWidth >= 640) return;
          
          // Cancelar si hay múltiples toques (pinch-to-zoom)
          if (e.originalEvent && e.originalEvent.touches && e.originalEvent.touches.length > 1) {
            if (longPressTimer) {
              clearTimeout(longPressTimer);
              setLongPressTimer(null);
            }
            return;
          }
          
          const lngLat = e.lngLat;
          
          const timer = window.setTimeout(() => {
            // Long press detectado - agregar pin
            setPin(new LngLat(lngLat.lng, lngLat.lat));
            
            // Vibración si está disponible
            if (navigator.vibrate) {
              navigator.vibrate(50);
            }
          }, 500); // 500ms para long press
          
          setLongPressTimer(timer);
        }}
        onTouchEnd={() => {
          // Cancelar long press si se suelta antes de tiempo
          if (longPressTimer) {
            clearTimeout(longPressTimer);
            setLongPressTimer(null);
          }
        }}
        onTouchMove={() => {
          // Cancelar long press si se mueve el dedo
          if (longPressTimer) {
            clearTimeout(longPressTimer);
            setLongPressTimer(null);
          }
        }}
        maxBounds={[
          [-92.5, 10.5], // Southwest - Ampliado
          [-84.5, 18.5]  // Northeast - Ampliado
        ]}
        interactiveLayerIds={interactiveLayers}
        attributionControl={false}
      >
        <MapStyleSelector
          onStyleChange={handleStyleChange}
        />
        <MapControls />
        <MapScale />
        {env.FEATURE_TRIP_PLANNER && <TripPlannerMapListener />}
        {mapReady && (
          <>
            <GeoLayer />
            <GeoDistritos />
            <SearchRadiusLayer />
            <NearbyRoutesLayer />
            <ParadasLayer />
            <RouteLayer />
            <UserLocationMarker />
            {env.FEATURE_TRIP_PLANNER && (
              <TripRouteLayer selectedOptionIndex={selectedOptionIndex} />
            )}
            {pin && (
              <MapMarker position={pin} />
            )}
          </>
        )}
      </Map>

      {/* Menú contextual simple */}
      {contextMenu && (
        <>
          <div
            className="fixed inset-0 z-[70]"
            onClick={() => setContextMenu(null)}
          />
          <div
            className="fixed z-[71] bg-primary/95 backdrop-blur-md rounded-xl shadow-2xl border border-white/10 py-2 min-w-[200px] overflow-hidden"
            style={{
              left: contextMenu.x,
              top: contextMenu.y
            }}
          >
            <div className="px-4 py-2 border-b border-white/10">
              <div className="text-xs font-medium text-white/60">Coordenadas</div>
              <div className="text-xs font-mono text-white/80 mt-0.5">
                {contextMenu.lngLat.lat.toFixed(6)}, {contextMenu.lngLat.lng.toFixed(6)}
              </div>
            </div>

            <div className="py-1">
              <button
                onClick={() => {
                  setPin(contextMenu.lngLat);
                  setContextMenu(null);
                }}
                className="w-full px-4 py-2.5 text-left hover:bg-white/10 transition-colors text-sm flex items-center gap-3 text-white"
              >
                <svg className="w-5 h-5 text-secondary" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                </svg>
                <span>Colocar pin aquí</span>
              </button>

              <button
                onClick={() => {
                  setPin(contextMenu.lngLat); // Agregar pin
                  openNearbyRoutes(contextMenu.lngLat.lat, contextMenu.lngLat.lng); // Sin radio = búsqueda automática
                  updateConfig({ ...config, center: { lat: contextMenu.lngLat.lat, lng: contextMenu.lngLat.lng }, zoom: 14 });
                  setContextMenu(null);
                }}
                className="w-full px-4 py-2.5 text-left hover:bg-white/10 transition-colors text-sm flex items-center gap-3 text-white"
              >
                <svg className="w-5 h-5 text-secondary" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M4 16c0 .88.39 1.67 1 2.22V20c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h8v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10zm3.5 1c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17zm9 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm1.5-6H6V6h12v5z"/>
                </svg>
                <span>Buscar rutas y paradas</span>
              </button>

              <button
                onClick={async () => {
                  const coords = `${contextMenu.lngLat.lat.toFixed(6)}, ${contextMenu.lngLat.lng.toFixed(6)}`;
                  await navigator.clipboard.writeText(coords);
                  setContextMenu(null);
                }}
                className="w-full px-4 py-2.5 text-left hover:bg-white/10 transition-colors text-sm flex items-center gap-3 text-white"
              >
                <svg className="w-5 h-5 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <span>Copiar coordenadas</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Tooltip discreto */}
      {hoverInfo && (
        <div
          className="fixed pointer-events-none z-50 bg-primary/95 backdrop-blur-sm text-white text-sm px-3 py-1.5 rounded-lg shadow-lg border border-white/10"
          style={{
            left: hoverInfo.x + 10,
            top: hoverInfo.y + 10
          }}
        >
          {hoverInfo.name}
        </div>
      )}

      {/* Route hover tooltip */}
      {routeHover && (
        <div
          className="fixed z-50 bg-primary/95 backdrop-blur-sm text-white px-3 py-2.5 rounded-lg shadow-xl border border-white/20 pointer-events-none min-w-[220px]"
          style={{
            left: routeHover.x + 10,
            top: routeHover.y + 10
          }}
        >
          {routeHover.codigo === 'multiple' ? (
            <>
              <div className="font-bold text-base mb-1 text-secondary">{routeHover.nombre}</div>
              <div className="text-xs text-white/80 mb-2">Rutas: {routeHover.tipo}</div>
              <div className="text-[10px] text-white/50 mt-2 text-center">Click para seleccionar</div>
            </>
          ) : (
            <>
              <div className="font-bold text-base mb-1 text-secondary">Ruta {routeHover.nombre}</div>
              <div className="text-xs text-white/60 mb-2 font-mono">Código: {routeHover.codigo}</div>
              <div className="space-y-0.5 text-xs">
                <div className="flex justify-between gap-3">
                  <span className="text-white/70">Departamento:</span>
                  <span className="font-medium text-right">{routeHover.departamento}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-white/70">Tipo:</span>
                  <span className="font-medium text-right">{routeHover.tipo}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-white/70">Subtipo:</span>
                  <span className="font-medium text-right">{routeHover.subtipo}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-white/70">Sentido:</span>
                  <span className="font-medium text-right">{routeHover.sentido}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-white/70">Longitud ruta:</span>
                  <span className="font-medium text-right">{routeHover.kilometros?.toFixed(2) || '0.00'} km</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-white/70">Distancia:</span>
                  <span className="font-medium text-right">{routeHover.distancia_m < 1000 ? `${Math.round(routeHover.distancia_m)}m` : `${(routeHover.distancia_m / 1000).toFixed(2)}km`}</span>
                </div>
              </div>
              <div className="text-[10px] text-white/50 mt-2 text-center">Click para ver detalles</div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
