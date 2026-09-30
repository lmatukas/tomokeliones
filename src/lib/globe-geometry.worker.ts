// This geometry dependency reads window.THREE at import time, but otherwise only
// performs numeric work. Supply its optional global lookup inside this worker.
const scope = self as typeof self & {window?: unknown};
scope.window = scope;
let geometryModule: Promise<typeof import('three-conic-polygon-geometry')>;

scope.onmessage = async ({data: {feature}}) => {
  const code = feature.properties.alpha2;
  try {
    geometryModule ??= import('three-conic-polygon-geometry');
    const {default: ConicPolygonGeometry} = await geometryModule;
    const polygons = feature.geometry.type === 'Polygon'
      ? [feature.geometry.coordinates] : feature.geometry.coordinates;
    const parts = polygons.map(poly => {
      // Preserve the original geometry and curvature resolution exactly.
      const geometry = new ConicPolygonGeometry(poly, 1.004, 1.008, false, true, true, 4);
      const part = {position: geometry.getAttribute('position').array, index: geometry.index!.array};
      geometry.dispose();
      return part;
    });
    // MeshBasicMaterial needs positions and indices only, not normals or UVs.
    scope.postMessage({code, parts}, {transfer: parts.flatMap(part => [part.position.buffer, part.index.buffer])});
  } catch {
    // The contour and country navigation remain usable if tessellation fails.
    scope.postMessage({code, parts: null});
  }
};
