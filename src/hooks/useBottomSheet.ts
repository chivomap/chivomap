import { useEffect, useRef } from 'react';
import { useBottomSheetStore } from '../shared/store/bottomSheetStore';
import { useRutasStore } from '../shared/store/rutasStore';
import { useParadasStore } from '../shared/store/paradasStore';
import { useMapStore } from '../shared/store/mapStore';
import { useAnnotationStore } from '../shared/store/annotationStore';
import { env } from '../shared/config/env';

type ContentType = 'route' | 'nearbyRoutes' | 'geoInfo' | 'annotations' | 'tripPlanner' | 'none';

export const useBottomSheet = () => {
  const { sheetState, setSheetState, setActiveTab, activeTab } = useBottomSheetStore();
  const { selectedRoute, nearbyRoutes, clearSelectedRoute, clearNearbyRoutes } = useRutasStore();
  const { selectedInfo, setSelectedInfo } = useMapStore();
  const { annotations } = useAnnotationStore();
  
  // Prevenir auto-ajuste si usuario modificó manualmente
  const userAdjustedRef = useRef(false);
  const prevContentTypeRef = useRef<ContentType>('none');

  // Determinar tipo de contenido actual con prioridad clara
  const getContentType = (): ContentType => {
    // Prioridad: tripPlanner > ruta individual > rutas cercanas > info geo > anotaciones
    if (activeTab === 'tripPlanner' && env.FEATURE_TRIP_PLANNER) return 'tripPlanner';
    if (selectedRoute) return 'route';
    // Mostrar nearbyRoutes si hay searchLocation (aunque esté vacío)
    const { searchLocation } = useRutasStore.getState();
    if (searchLocation || (nearbyRoutes && nearbyRoutes.length > 0)) return 'nearbyRoutes';
    if (selectedInfo) return 'geoInfo';
    if (annotations && annotations.length > 0) return 'annotations';
    return 'none';
  };

  const contentType = getContentType();
  const isOpen = contentType !== 'none';

  useEffect(() => {
    if (!env.FEATURE_TRIP_PLANNER && activeTab === 'tripPlanner') {
      setActiveTab('info');
    }
  }, [activeTab, setActiveTab]);

  // Estado inicial inteligente según contenido
  const getInitialState = (type: ContentType) => {
    switch (type) {
      case 'tripPlanner': return 'half';
      case 'route': return 'half';
      case 'nearbyRoutes': return 'half';
      case 'geoInfo': return 'peek';
      case 'annotations': return 'half';
      default: return 'peek';
    }
  };

  // Solo auto-ajustar cuando cambia el TIPO de contenido, no cuando usuario ajusta
  useEffect(() => {
    const prevType = prevContentTypeRef.current;
    
    // Si cambió el tipo de contenido (no solo abrió/cerró)
    if (prevType !== contentType && contentType !== 'none') {
      // Solo auto-ajustar si usuario no ha tocado el estado manualmente
      // Y solo si NO es un cambio dentro del mismo contexto (nearbyRoutes -> route)
      const isSameContext = (prevType === 'nearbyRoutes' && contentType === 'route') ||
                            (prevType === 'route' && contentType === 'nearbyRoutes');
      
      if (!userAdjustedRef.current && !isSameContext) {
        const initialState = getInitialState(contentType);
        setSheetState(initialState);
      }
      // Resetear flag cuando cambia el contenido (excepto en mismo contexto)
      if (!isSameContext) {
        userAdjustedRef.current = false;
      }
    }
    
    // Si se cerró todo, resetear
    if (contentType === 'none') {
      setSheetState('peek');
      userAdjustedRef.current = false;
    }
    
    prevContentTypeRef.current = contentType;
  }, [contentType, setSheetState]);

  // Cerrar solo el contenido actual (inteligente)
  const closeContent = () => {
    switch (contentType) {
      case 'route':
        // Solo cerrar el drawer, NO limpiar la ruta
        setSheetState('peek');
        break;
      case 'nearbyRoutes':
        // Solo cerrar el drawer, NO limpiar las rutas
        setSheetState('peek');
        break;
      case 'geoInfo':
        setSelectedInfo(null);
        useMapStore.getState().updateGeojson(null);
        break;
      case 'annotations':
        // No limpiar anotaciones, solo cambiar tab
        setActiveTab('info');
        break;
    }
  };

  // Cerrar TODO (solo usar en casos específicos)
  const closeAll = () => {
    clearSelectedRoute();
    clearNearbyRoutes();
    setSelectedInfo(null);
    useMapStore.getState().updateGeojson(null);
    useMapStore.getState().setCurrentLevel('departamento');
    useMapStore.getState().setParentInfo(null);
    useMapStore.getState().setDepartamentoGeojson(null);
    
    setSheetState('peek');
    setActiveTab('info');
    userAdjustedRef.current = false;
  };

  // Cuando usuario ajusta manualmente, marcar flag
  const setSheetStateManual = (state: 'peek' | 'half' | 'full') => {
    userAdjustedRef.current = true;
    setSheetState(state);
  };

  // Abrir con contenido específico
  const openRoute = (codigo: string) => {
    useRutasStore.getState().selectRoute(codigo);
    setActiveTab('info');
    // No forzar estado, dejar que useEffect lo maneje
  };

  const openNearbyRoutes = (lat: number, lng: number, radius?: number) => {
    // Limpiar ruta seleccionada para mostrar el listado
    clearSelectedRoute();
    useRutasStore.getState().fetchNearbyRoutes(lat, lng, radius);
    useParadasStore.getState().fetchNearbyParadas(lat, lng, radius);
    setActiveTab('info');
    // No forzar estado, dejar que useEffect lo maneje
  };

  const openAnnotations = () => {
    setActiveTab('annotations');
    if (!isOpen) {
      setSheetState('half');
    }
  };

  const openTripPlanner = () => {
    if (!env.FEATURE_TRIP_PLANNER) return;
    // Limpiar otros contenidos
    clearSelectedRoute();
    clearNearbyRoutes();
    setSelectedInfo(null);
    
    // Abrir el sheet
    setSheetState('half');
    setActiveTab('tripPlanner');
  };

  return {
    // Estado
    isOpen,
    sheetState,
    contentType,
    
    // Acciones
    closeContent,
    closeAll,
    setSheetState: setSheetStateManual,
    
    // Abrir con contenido
    openRoute,
    openNearbyRoutes,
    openAnnotations,
    openTripPlanner,
  };
};
