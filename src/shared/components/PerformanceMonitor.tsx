import { useEffect, useRef } from 'react';
// @ts-ignore - stats.js no tiene tipos
import Stats from 'stats.js';

export const PerformanceMonitor: React.FC = () => {
  const statsRef = useRef<Stats | null>(null);

  useEffect(() => {
    // Solo mostrar en desarrollo
    if (import.meta.env.PROD) return;

    const stats = new Stats();
    stats.showPanel(0); // 0: fps, 1: ms, 2: mb
    
    // Posicionar en la esquina superior izquierda
    stats.dom.style.position = 'fixed';
    stats.dom.style.left = '0px';
    stats.dom.style.top = '0px';
    stats.dom.style.zIndex = '9999';
    
    document.body.appendChild(stats.dom);
    statsRef.current = stats;

    // Actualizar en cada frame
    const animate = () => {
      stats.begin();
      stats.end();
      requestAnimationFrame(animate);
    };
    
    requestAnimationFrame(animate);

    return () => {
      if (statsRef.current) {
        document.body.removeChild(statsRef.current.dom);
      }
    };
  }, []);

  return null;
};
