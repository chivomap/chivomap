## 2026-02-10 - Expensive GeoJSON processing in render
**Learning:** The `GeoLayer` component was re-calculating `groupDistritosByMunicipio` on every render, which involves iterating over all features and creating a Map. This blocks the main thread during map interactions.
**Action:** Always memoize expensive data transformations in map layers, especially when dealing with large GeoJSON datasets.
