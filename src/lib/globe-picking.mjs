import {geoBounds, geoContains} from 'd3-geo';

// Spherical bounds include great-circle latitude extrema and date-line wrapping.
// Keep source order for shared borders; the final test uses the original polygon.
export function createCountryPicker(features) {
  const entries = features.map(feature => ({
    feature,
    bounds: (feature.geometry.type === 'Polygon'
      ? [feature.geometry.coordinates]
      : feature.geometry.coordinates
    ).map(coordinates => geoBounds({type: 'Polygon', coordinates}))
  }));
  return ([longitude, lat]) => {
    const lon = longitude < -180 || longitude > 180
      ? ((longitude + 180) % 360 + 360) % 360 - 180 : longitude;
    return entries.find(({feature, bounds}) =>
    bounds.some(([[west, south], [east, north]]) =>
      lat >= south - 1e-7 && lat <= north + 1e-7 &&
      (west <= east
        ? lon >= west - 1e-7 && lon <= east + 1e-7
        : lon >= west - 1e-7 || lon <= east + 1e-7)
    ) && geoContains(feature, [lon, lat])
    )?.feature ?? null;
  };
}
