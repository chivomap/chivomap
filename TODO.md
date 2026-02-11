# TODO - ChivoMap

Lista de tareas pendientes y mejoras futuras para el proyecto ChivoMap.

**Última actualización**: 2026-02-10

---

## 🔴 Crítico

### HTTPS para Geolocation en Móvil
- **Problema**: Geolocation API no funciona en HTTP sobre IP local (192.168.x.x)
- **Impacto**: Testing en dispositivos móviles requiere localhost o HTTPS
- **Opciones**:
  1. Certificado autofirmado + trust manual en dispositivo
  2. Usar ngrok/cloudflare tunnel para testing
  3. Solo testing en localhost del dispositivo
- **Prioridad**: Alta si se necesita testing móvil frecuente

---

## 🟡 Optimizaciones Pendientes

### 1. Throttle en lugar de Debounce
- **Actual**: Debounce de 150ms espera a que usuario pare de moverse
- **Propuesto**: Throttle de 250ms actualiza durante movimiento
- **Beneficio**: Feedback visual continuo, mejor UX
- **Archivo**: `web/src/shared/components/rutas/NearbyRoutesLayer.tsx`
- **Esfuerzo**: Bajo (30 min)

### 2. Simplificación en Backend (Opcional)
- **Actual**: Backend envía geometrías completas, frontend simplifica con LOD
- **Propuesto**: Backend podría pre-simplificar antes de enviar
- **Beneficio**: Reducir payload inicial de ~80 KB a ~50 KB
- **Consideración**: LOD actual ya es muy eficiente (92% reducción)
- **Esfuerzo**: Medio (2-3 horas)
- **Prioridad**: Baja (mejora marginal)

### 3. Web Workers para Simplificación
- **Actual**: Simplificación en thread principal (no aplica con LOD)
- **Propuesto**: Si se vuelve a simplificar en frontend, usar Web Workers
- **Beneficio**: No bloquear UI durante procesamiento
- **Consideración**: Con LOD actual no es necesario
- **Esfuerzo**: Alto (4-6 horas)
- **Prioridad**: Muy baja

### 4. Caching de Geometrías por Zoom
- **Actual**: Recalcula FeatureCollection en cada cambio de zoom entero
- **Propuesto**: Cachear FeatureCollection por nivel de zoom
- **Beneficio**: Evitar recalcular al volver a un zoom anterior
- **Esfuerzo**: Bajo (1 hora)
- **Prioridad**: Media

---

## 🟢 Mejoras de Código

### 1. Constantes de Configuración
- **Problema**: Valores mágicos en código (15, 25, 35, 50 rutas por zoom)
- **Propuesto**: Mover a archivo de configuración
- **Archivo**: Crear `web/src/shared/config/lod.ts`
- **Esfuerzo**: Muy bajo (15 min)

```typescript
// Propuesta
export const LOD_CONFIG = {
  levels: {
    low: { zoom: [0, 11], maxRoutes: 15 },
    med: { zoom: [11, 13], maxRoutes: 25 },
    high: { zoom: [13, 15], maxRoutes: 35 },
    ultra: { zoom: [15, 20], maxRoutes: 50 }
  }
};
```

### 2. Fallback en ParadaInfo
- **Problema**: Si parada tiene rutas no en `nearbyRoutes`, no muestra nombre
- **Propuesto**: Mostrar código como fallback o hacer fetch de nombres faltantes
- **Archivo**: `web/src/shared/components/Map/Features/BottomSheet/ParadaInfo.tsx`
- **Esfuerzo**: Bajo (30 min)
- **Prioridad**: Media

### 3. Limitar Rutas Solapadas en Click
- **Problema**: Si hay muchas rutas solapadas, selector puede ser confuso
- **Propuesto**: Limitar a top 3-5 rutas más cercanas al punto de click
- **Archivo**: `web/src/shared/components/Map/MapLibreMap.tsx`
- **Esfuerzo**: Bajo (30 min)
- **Prioridad**: Baja

---

## 📊 Métricas y Monitoreo

### 1. Logging de LOD Seleccionado
- **Actual**: Console.log básico
- **Propuesto**: Métricas estructuradas (nivel LOD, puntos, tiempo de render)
- **Beneficio**: Análisis de performance en producción
- **Esfuerzo**: Bajo (1 hora)

### 2. Performance Monitoring en Producción
- **Actual**: stats.js solo en desarrollo
- **Propuesto**: Enviar métricas de FPS a analytics
- **Beneficio**: Detectar problemas de performance en usuarios reales
- **Esfuerzo**: Medio (2-3 horas)

---

## 🧪 Testing

### 1. Tests Unitarios para LOD
- **Faltante**: Tests para selección de nivel LOD según zoom
- **Archivo**: Crear `web/src/shared/components/rutas/__tests__/NearbyRoutesLayer.test.tsx`
- **Esfuerzo**: Medio (2 horas)

### 2. Tests de Integración Backend
- **Faltante**: Tests para `simplifyGeometryLOD`
- **Archivo**: Crear `api/internal/cache/rutas_test.go`
- **Esfuerzo**: Medio (2 horas)

### 3. Performance Benchmarks
- **Propuesto**: Benchmarks de simplificación en Go
- **Beneficio**: Validar que tolerancias son óptimas
- **Esfuerzo**: Bajo (1 hora)

---

## 📱 Mobile

### 1. Touch Gestures
- **Actual**: Pinch-to-zoom detectado correctamente
- **Pendiente**: Verificar en dispositivos reales (iOS/Android)
- **Esfuerzo**: Testing manual

### 2. Responsive UI
- **Actual**: Drawers funcionan en móvil
- **Pendiente**: Optimizar tamaños de botones para touch
- **Esfuerzo**: Bajo (1-2 horas)

---

## 🎨 UI/UX

### 1. Indicador de Nivel LOD
- **Propuesto**: Mostrar nivel LOD actual en UI (opcional)
- **Beneficio**: Usuario sabe qué nivel de detalle está viendo
- **Esfuerzo**: Muy bajo (30 min)
- **Prioridad**: Muy baja (más para debug que para usuario)

### 2. Transiciones Suaves entre LOD
- **Actual**: Cambio instantáneo al cambiar zoom entero
- **Propuesto**: Fade in/out al cambiar nivel
- **Beneficio**: Transición más suave visualmente
- **Esfuerzo**: Bajo (1 hora)
- **Prioridad**: Baja

---

## 🔧 Infraestructura

### 1. CI/CD
- **Faltante**: Pipeline de build/test automático
- **Propuesto**: GitHub Actions para build + tests
- **Esfuerzo**: Medio (3-4 horas)

### 2. Docker Compose
- **Faltante**: Setup completo con docker-compose
- **Beneficio**: Desarrollo más fácil para nuevos contribuidores
- **Esfuerzo**: Bajo (1-2 horas)

---

## 📚 Documentación

### ✅ Completado
- [x] Documentación LOD en API (`api/docs/LOD.md`)
- [x] Swagger actualizado con info de LOD
- [x] README con features principales

### Pendiente
- [ ] Guía de contribución detallada
- [ ] Arquitectura del sistema (diagramas)
- [ ] Guía de deployment
- [ ] Changelog estructurado

---

## 🚀 Features Futuras

### 1. Búsqueda de Rutas por Nombre/Código
- **Descripción**: Buscador de rutas en UI
- **Esfuerzo**: Medio (4-6 horas)

### 2. Rutas Favoritas
- **Descripción**: Guardar rutas favoritas en localStorage
- **Esfuerzo**: Bajo (2-3 horas)

### 3. Compartir Ubicación/Ruta
- **Descripción**: Generar URL con lat/lng/zoom/ruta
- **Esfuerzo**: Bajo (2 horas)

### 4. Modo Offline
- **Descripción**: Service Worker + cache de geometrías
- **Esfuerzo**: Alto (8-12 horas)

---

## 📝 Notas

### Decisiones Técnicas Tomadas
- **LOD en Backend**: Elegido sobre simplificación única o clipping dinámico
- **4 Niveles**: Balance entre calidad y complejidad
- **Douglas-Peucker**: Algoritmo estándar, bien probado
- **FeatureCollection**: Reduce layers de 144 a 2

### Métricas Actuales
- **FPS**: 35-60 (antes 10-15)
- **Payload**: 48-80 KB (antes 600 KB)
- **Puntos**: 220-1,400 (antes 40,000+)
- **Reducción**: 92-98% según zoom

### Próxima Sesión
1. Implementar throttle (30 min)
2. Mover constantes a config (15 min)
3. Agregar fallback en ParadaInfo (30 min)
4. Testing en móvil real

---

**Mantenido por**: Eliseo Arévalo  
**Proyecto**: ChivoMap - https://github.com/chivomap
