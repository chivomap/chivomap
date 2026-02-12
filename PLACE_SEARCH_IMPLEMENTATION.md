# Implementación de Búsqueda de Lugares - Frontend

## Resumen

Se implementó la búsqueda de lugares en el frontend usando el endpoint `/places/search` del backend con Photon.

## Archivos Creados

### 1. Tipos
**`src/shared/types/search.ts`**
- `SearchResult` - Resultado individual de búsqueda
- `SearchResponse` - Respuesta completa del API

### 2. API Client
**`src/shared/api/search.ts`**
- `searchPlaces()` - Búsqueda de lugares
- `reverseGeocode()` - Geocodificación inversa

### 3. Store
**`src/shared/store/placeSearchStore.ts`**
- Estado global para búsqueda de lugares
- Manejo de resultados, loading y errores

### 4. Componente UI
**`src/shared/components/Map/Features/PlaceSearch.tsx`**
- Botón de búsqueda flotante
- Panel de búsqueda con autocompletado
- Debounce de 300ms
- Lista de resultados con distancia
- Navegación al seleccionar resultado

## Características

✅ **Búsqueda en tiempo real** con debounce
✅ **Autocompletado** mientras escribes
✅ **Filtrado por país** (El Salvador)
✅ **Cálculo de distancia** desde ubicación actual del mapa
✅ **Navegación automática** al seleccionar resultado
✅ **UI responsive** con dark mode
✅ **Estados de loading y error**

## Uso

1. Click en el botón de búsqueda (🔍) en la esquina superior izquierda
2. Escribe el nombre del lugar (hospital, restaurante, etc.)
3. Los resultados aparecen automáticamente
4. Click en un resultado para navegar al lugar

## Ejemplo de Búsqueda

```typescript
// Búsqueda automática con ubicación actual
searchPlaces({
  query: 'hospital',
  lat: 13.7,
  lng: -89.2,
  limit: 10,
  country: 'sv'
})
```

## Integración

El componente se agregó al `MapLibreMap.tsx`:

```tsx
<PlaceSearch />
```

Se posiciona en la esquina superior izquierda, encima de los controles del mapa.

## Dependencias Agregadas

- `lucide-react` - Iconos (Search, X, MapPin, Loader2)

## Testing

```bash
# Compilar
pnpm build

# Desarrollo
pnpm dev
```

## Próximos Pasos

1. Agregar marcador en el mapa para el lugar seleccionado
2. Mostrar información del lugar en BottomSheet
3. Agregar historial de búsquedas
4. Implementar búsqueda por categorías
5. Agregar favoritos
