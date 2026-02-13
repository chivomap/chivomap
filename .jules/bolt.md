## 2025-03-09 - Zustand Store Selectors
**Learning:** `useMapStore()` without selectors causes components to re-render on EVERY state change (like map viewport updates), which is devastating for performance in `RouteInfo` and other components subscribed to the store. Always use `useStore(state => state.selector)` to prevent this.
**Action:** When using Zustand stores, always use selectors to pick only the necessary state slices or actions.
**Learning:** `import * as turf from '@turf/turf'` was surprisingly well-optimized by Vite/Rollup (bundle size didn't change significantly), suggesting modern bundlers are smart enough to tree-shake even wildcard imports for some libraries.
**Action:** Prioritize logical optimizations (re-renders) over micro-optimizations (imports) unless bundle size is critical.
