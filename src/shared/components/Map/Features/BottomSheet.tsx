import React, { useState, useCallback, useRef } from 'react';
import { useBottomSheet } from '../../../../hooks/useBottomSheet';
// import { useAnnotationStore } from '../../../store/annotationStore';
import { useRutasStore } from '../../../store/rutasStore';
import { useBottomSheetStore } from '../../../store/bottomSheetStore';
import { Z_INDEX } from '../../../constants/zIndex';
import { RouteInfo } from './BottomSheet/RouteInfo';
import { NearbyRoutesList } from './BottomSheet/NearbyRoutesList';
import { NearbyParadasList } from './BottomSheet/NearbyParadasList';
import { ParadaInfo } from './BottomSheet/ParadaInfo';
import { useParadasStore } from '../../../store/paradasStore';
import { PlaceInfo } from './BottomSheet/PlaceInfo';
import { TripPlannerSheet } from './BottomSheet/TripPlannerSheet';
import { env } from '../../../config/env';
// import { AnnotationsList } from './BottomSheet/AnnotationsList';

export const BottomSheet: React.FC = () => {
  const { isOpen, sheetState, setSheetState } = useBottomSheet();
  const { activeTab } = useBottomSheetStore();
  // const annotations = useAnnotationStore(state => state.annotations);
  const selectedRoute = useRutasStore(state => state.selectedRoute);
  const nearbyRoutes = useRutasStore(state => state.nearbyRoutes);
  const searchLocation = useRutasStore(state => state.searchLocation);
  const selectedParada = useParadasStore(state => state.selectedParada);

  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartY, setDragStartY] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);
  const lastScrollTop = useRef(0);

  const getSheetHeight = useCallback(() => {
    if (window.innerWidth >= 640) return '60vh'; // Desktop: altura fija
    switch (sheetState) {
      case 'peek': return '140px';
      case 'half': return '50dvh';
      case 'full': return '90dvh';
      default: return '140px';
    }
  }, [sheetState]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    // Limpiar overlapping routes cuando el usuario interactúa con el drawer
    useRutasStore.getState().setOverlappingRoutes(null);
    
    setIsDragging(true);
    setDragStartY(e.touches[0].clientY);
    setDragY(0);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging) return;
    const currentY = e.touches[0].clientY;
    const diff = currentY - dragStartY;
    setDragY(diff);
  }, [isDragging, dragStartY]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
    const threshold = 80;

    if (dragY > threshold) {
      if (sheetState === 'full') setSheetState('half');
      else if (sheetState === 'half') {
        setSheetState('peek');
        // Limpiar overlapping routes al cerrar a peek
        useRutasStore.getState().setOverlappingRoutes(null);
      }
    } else if (dragY < -threshold) {
      if (sheetState === 'peek') setSheetState('half');
      else if (sheetState === 'half') setSheetState('full');
    }

    setDragY(0);
    setDragStartY(0);
  }, [dragY, sheetState, setSheetState]);

  const handleTabClick = useCallback(() => {
    if (sheetState === 'peek') setSheetState('half');
    else if (sheetState === 'half') setSheetState('full');
  }, [sheetState, setSheetState]);

  // Scroll inteligente: expandir drawer en vez de hacer scroll
  const handleWheel = useCallback((e: React.WheelEvent) => {
    // Solo en mobile
    if (window.innerWidth >= 640) return;
    
    // Si no está en full, expandir en vez de hacer scroll
    if (sheetState !== 'full') {
      if (e.deltaY < 0) { // Scroll up
        e.preventDefault();
        if (sheetState === 'peek') setSheetState('half');
        else if (sheetState === 'half') setSheetState('full');
      }
    } else {
      // En full, si está en el top y scrollea hacia abajo, colapsar
      const content = contentRef.current;
      if (content) {
        const isAtTop = content.scrollTop === 0;
        const isScrollingDown = e.deltaY > 0;
        
        if (isAtTop && isScrollingDown) {
          e.preventDefault();
          setSheetState('half');
        }
      }
    }
  }, [sheetState, setSheetState]);

  // Touch scroll inteligente
  const handleTouchScroll = useCallback((e: React.TouchEvent) => {
    // Solo en mobile
    if (window.innerWidth >= 640) return;
    
    const content = contentRef.current;
    if (!content) return;

    const touch = e.touches[0];
    const currentY = touch.clientY;
    const deltaY = lastScrollTop.current - currentY;
    
    // Si no está en full, expandir
    if (sheetState !== 'full') {
      if (deltaY > 5) { // Scroll up
        e.preventDefault();
        if (sheetState === 'peek') setSheetState('half');
        else if (sheetState === 'half') setSheetState('full');
      }
    } else {
      // En full, si está en el top y scrollea hacia abajo, colapsar
      const isAtTop = content.scrollTop === 0;
      if (isAtTop && deltaY < -10) { // Scroll down
        e.preventDefault();
        setSheetState('half');
      }
    }
    
    lastScrollTop.current = currentY;
  }, [sheetState, setSheetState]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-0 sm:fixed sm:top-20 sm:left-4 sm:bottom-auto w-full sm:w-80 sm:max-h-[calc(100vh-6rem)]"
      style={{
        height: getSheetHeight(),
        zIndex: Z_INDEX.BOTTOM_SHEET,
        transform: `translateY(${Math.max(0, dragY)}px)`,
        transition: isDragging ? 'none' : 'height 0.3s cubic-bezier(0.4, 0, 0.2, 1), transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
      }}
    >
      <div className="bg-primary/95 backdrop-blur-sm text-white rounded-t-2xl sm:rounded-xl shadow-xl border-t sm:border border-white/20 h-full sm:h-auto flex flex-col sm:max-h-[calc(100vh-6rem)]">
        <div
          className="sm:hidden w-full flex justify-center pt-4 pb-4 flex-shrink-0 cursor-grab active:cursor-grabbing"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onClick={handleTabClick}
        >
          <div className="w-12 h-1.5 bg-secondary/40 rounded-full" />
        </div>

        <div
          ref={contentRef}
          className="flex-1 custom-scrollbar"
          style={{
            overflowY: window.innerWidth >= 640 ? 'auto' : (sheetState === 'full' ? 'auto' : 'hidden')
          }}
          onWheel={handleWheel}
          onTouchMove={handleTouchScroll}
        >
          {activeTab === 'tripPlanner' && env.FEATURE_TRIP_PLANNER ? (
            <TripPlannerSheet />
          ) : selectedParada ? (
            <ParadaInfo parada={selectedParada} />
          ) : selectedRoute ? (
            <RouteInfo route={selectedRoute} />
          ) : searchLocation || (nearbyRoutes && nearbyRoutes.length > 0) ? (
            <>
              <NearbyRoutesList />
              <NearbyParadasList />
            </>
          ) : (
            <PlaceInfo />
          )}
        </div>
      </div>
    </div>
  );
};
