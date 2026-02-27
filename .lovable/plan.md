

## Add Country Borders to the 3D Globe

### Approach

Add a `CountryBorders` component that fetches lightweight world boundary data (Natural Earth 110m TopoJSON, ~50KB) from CDN, converts it to line coordinates on the sphere, and renders as `THREE.LineSegments` — giving crisp, resolution-independent borders at any zoom level.

### Dependencies to Add

- `topojson-client` — tiny (~2KB) library to convert TopoJSON → GeoJSON coordinates
- `@types/topojson-client` — TypeScript types

### Changes

**`src/components/globe/GlobeScene.tsx`**

1. Add `topojson-client` import and register `THREE.LineSegments`, `THREE.LineBasicMaterial`, `THREE.BufferGeometry` in the existing `extend()` call

2. New `CountryBorders` component:
   - Fetches `https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json` once (cached in state)
   - Converts TopoJSON → GeoJSON features using `topojson.feature()`
   - For each polygon ring, converts lat/lng pairs to 3D positions using existing `latLngToVector3()` at radius `1.003` (just above earth surface, below clouds at `1.01`)
   - Builds a single `THREE.BufferGeometry` with all line segments
   - Renders as `<lineSegments>` with subtle semi-transparent white/light-grey material (`opacity: 0.35`, `color: #aabbcc`)

3. Wrap in `SafeCountryBorders` with `ErrorBoundary` + `Suspense` (same pattern as `SafeCloudLayer`) so border loading never blocks the globe

4. Add `<SafeCountryBorders />` inside the `Globe` component group, between `<SafeRealisticEarth />` and `<SafeCloudLayer />`

### Visual Result

Subtle light borders visible on the globe surface — enough to distinguish countries without overwhelming the Blue Marble texture. The borders rotate with the globe since they're inside the same `<group>`.

