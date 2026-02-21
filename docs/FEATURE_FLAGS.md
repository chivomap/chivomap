# Feature Flags

Configuración de características opcionales en el frontend.

## Flags Activos

### `SHOW_ROUTE_ARROWS` (RouteLayer.tsx)
**Estado:** `false` (deshabilitado)  
**Razón:** Datos GeoJSON tienen coordenadas en orden arbitrario, causando flechas incorrectas  
**Ubicación:** `src/shared/components/rutas/RouteLayer.tsx`

```typescript
const SHOW_ROUTE_ARROWS = false;
```

### `SHOW_TRIP_ROUTE_ARROWS` (TripRouteLayer.tsx)
**Estado:** `false` (deshabilitado)  
**Razón:** Mismo problema que RouteLayer  
**Ubicación:** `src/shared/components/Map/Features/TripRouteLayer.tsx`

```typescript
const SHOW_TRIP_ROUTE_ARROWS = false;
```

## Notas

- Las flechas están deshabilitadas solo visualmente
- El algoritmo de planificación funciona correctamente
- Para habilitar: cambiar flag a `true` y recompilar
