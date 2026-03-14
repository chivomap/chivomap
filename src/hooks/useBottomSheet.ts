import { useEffect, useRef } from 'react';
import { useBottomSheetStore } from '../shared/store/bottomSheetStore';
import { useRutasStore } from '../shared/store/rutasStore';
import { useParadasStore } from '../shared/store/paradasStore';
import { useMapStore } from '../shared/store/mapStore';
import { useAnnotationStore } from '../shared/store/annotationStore';
import { useTripPlannerStore } from '../shared/store/tripPlannerStore';
import { env } from '../shared/config/env';

type ContentType = 'route' | 'parada' | 'nearbyRoutes' | 'geoInfo' | 'annotations' | 'tripPlanner' | 'none';

export const useBottomSheet = () => {
  const { sheetState, setSheetState, setActiveTab, activeTab } = useBottomSheetStore();
  const { selectedRoute, nearbyRoutes, clearSelectedRoute, clearNearbyRoutes } = useRutasStore();
  const { selectedInfo, setSelectedInfo } = useMapStore();
  const { annotations } = useAnnotationStore();
  const selectedParada = useParadasStore(state => state.selectedParada);

  const prevContentTypeRef = useRef<ContentType>('none');

  // Determinar tipo de contenido actual (misma prioridad que el renderizado del BottomSheet)
  const getContentType = (): ContentType => {
    if (activeTab === 'tripPlanner' && env.FEATURE_TRIP_PLANNER) return 'tripPlanner';
    if (selectedParada) return 'parada';
    if (selectedRoute) return 'route';
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

  // Estado al mostrar nuevo contenido: half por defecto (ver detalle)
  const getInitialState = (type: ContentType): 'peek' | 'half' | 'full' => {
    if (type === 'tripPlanner') return 'full';
    if (type === 'geoInfo') return 'peek';
    return 'half';
  };

  // Auto-ajustar solo cuando cambia el TIPO de contenido
  // Si el contentType no cambia (ej: elegir parada dentro de una ruta), se mantiene el estado actual
  useEffect(() => {
    if (prevContentTypeRef.current === contentType) return;
    prevContentTypeRef.current = contentType;

    if (contentType === 'none') {
      setSheetState('peek');
    } else {
      setSheetState(getInitialState(contentType));
    }
  }, [contentType, setSheetState]);

  // Cerrar solo el contenido actual (inteligente)
  const closeContent = () => {
    switch (contentType) {
      case 'tripPlanner':
        useTripPlannerStore.getState().setIsSelectingOrigin(false);
        useTripPlannerStore.getState().setIsSelectingDestination(false);
        setSheetState('peek');
        setActiveTab('info');
        break;
      case 'parada':
      case 'route':
      case 'nearbyRoutes':
        setSheetState('peek');
        break;
      case 'geoInfo':
        setSelectedInfo(null);
        useMapStore.getState().updateGeojson(null);
        break;
      case 'annotations':
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
  };

  // Abrir con contenido específico
  const openRoute = (codigo: string) => {
    useRutasStore.getState().selectRoute(codigo);
    setActiveTab('info');
  };

  const openNearbyRoutes = (lat: number, lng: number, radius?: number) => {
    clearSelectedRoute();
    useRutasStore.getState().fetchNearbyRoutes(lat, lng, radius);
    useParadasStore.getState().fetchNearbyParadas(lat, lng, radius);
    setActiveTab('info');
  };

  const openAnnotations = () => {
    setActiveTab('annotations');
    if (!isOpen) {
      setSheetState('half');
    }
  };

  const openTripPlanner = () => {
    if (!env.FEATURE_TRIP_PLANNER) return;
    clearSelectedRoute();
    clearNearbyRoutes();
    setSelectedInfo(null);

    useTripPlannerStore.getState().setIsSelectingOrigin(false);
    useTripPlannerStore.getState().setIsSelectingDestination(false);

    setActiveTab('tripPlanner');
  };

  return {
    isOpen,
    sheetState,
    contentType,

    closeContent,
    closeAll,
    setSheetState,

    openRoute,
    openNearbyRoutes,
    openAnnotations,
    openTripPlanner,
  };
};
