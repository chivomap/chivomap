# Bolt's Journal

## 2024-09-08 - Turf.js Tree Shaking Effectiveness
**Learning:** Replacing `import * as turf from '@turf/turf'` with named imports in this Vite/Rollup project did not result in any measurable bundle size reduction (size remained exactly 138.80 kB). This suggests Rollup's tree-shaking was already effective with the wildcard import, or the monolithic `@turf/turf` package structure limits further optimization without switching to modular `@turf/package` dependencies.
**Action:** Always verify bundle size reduction before claiming optimization success. For Turf.js, consider switching to scoped packages (e.g., `@turf/bbox`) if named imports don't yield results.
