# Feature Flags

Configuración de características opcionales en el frontend.

## Flags Activos

### `FEATURE_ROUTE_ARROWS`
**Estado:** `false` (deshabilitado)  
**Razón:** Datos GeoJSON tienen coordenadas en orden arbitrario, causando flechas incorrectas  
**Variable:** `VITE_FEATURE_ROUTE_ARROWS` en `.env`  
**Ubicación:** 
- `src/shared/components/rutas/RouteLayer.tsx`
- `src/shared/components/Map/Features/TripRouteLayer.tsx`

```bash
# .env
VITE_FEATURE_ROUTE_ARROWS=false
```

## Notas

- Las flechas están deshabilitadas solo visualmente
- El algoritmo de planificación funciona correctamente
- Para habilitar: cambiar variable en `.env` y reiniciar dev server
