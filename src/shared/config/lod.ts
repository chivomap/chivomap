/**
 * Configuración de niveles LOD (Level of Detail) para rutas
 */

export const LOD_CONFIG = {
  levels: {
    low: {
      name: 'low' as const,
      zoomRange: [0, 11] as const,
      maxRoutes: 50, // Aumentado para mostrar todas las rutas
      label: 'Vista general',
      description: 'Vista alejada de toda la ciudad'
    },
    med: {
      name: 'med' as const,
      zoomRange: [11, 13] as const,
      maxRoutes: 50, // Aumentado para mostrar todas las rutas
      label: 'Vista media',
      description: 'Vista de varios barrios'
    },
    high: {
      name: 'high' as const,
      zoomRange: [13, 15] as const,
      maxRoutes: 50, // Aumentado para mostrar todas las rutas
      label: 'Vista detallada',
      description: 'Vista de pocas cuadras'
    },
    ultra: {
      name: 'ultra' as const,
      zoomRange: [15, 20] as const,
      maxRoutes: 50,
      label: 'Vista máxima',
      description: 'Vista muy cercana (1-2 cuadras)'
    }
  }
} as const;

export type LODLevel = 'low' | 'med' | 'high' | 'ultra';

/**
 * Obtiene el nivel LOD apropiado según el zoom
 */
export const getLODLevel = (zoom: number): LODLevel => {
  const zoomLevel = Math.floor(zoom);
  
  if (zoomLevel < LOD_CONFIG.levels.med.zoomRange[0]) return 'low';
  if (zoomLevel < LOD_CONFIG.levels.high.zoomRange[0]) return 'med';
  if (zoomLevel < LOD_CONFIG.levels.ultra.zoomRange[0]) return 'high';
  return 'ultra';
};

/**
 * Obtiene el número máximo de rutas para un nivel de zoom
 */
export const getMaxRoutesForZoom = (zoom: number): number => {
  const level = getLODLevel(zoom);
  return LOD_CONFIG.levels[level].maxRoutes;
};
