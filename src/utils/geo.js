/**
 * NER SmartRoute - Geo Utilities
 * Handles coordinate transformation between GeoJSON [lon, lat] and Leaflet [lat, lon].
 */

/**
 * Converts GeoJSON [longitude, latitude] coordinates array to Leaflet [latitude, longitude] format.
 * Works with LineString coordinates or nested arrays.
 * 
 * Example:
 * Backend GeoJSON: [91.7362, 26.1445]
 * Leaflet:         [26.1445, 91.7362]
 * 
 * @param {Array<Array<number>>} coordinates - Array of [lon, lat] coordinates from backend
 * @returns {Array<Array<number>>} Array of [lat, lon] coordinates for Leaflet
 */
export function geoJsonToLeafletCoordinates(coordinates) {
  if (!Array.isArray(coordinates) || coordinates.length === 0) {
    return [];
  }

  return coordinates.map((point) => {
    if (!Array.isArray(point) || point.length < 2) {
      return null;
    }
    const lon = Number(point[0]);
    const lat = Number(point[1]);
    return [lat, lon];
  }).filter(Boolean);
}

/**
 * Calculates a bounding box [minLat, minLon, maxLat, maxLon] or Leaflet LatLngBounds
 * around all given Leaflet [lat, lon] coordinates.
 * @param {Array<Array<number>>} leafletCoordsList - Multiple lists of [lat, lon] coordinates
 * @returns {Array<Array<number>>|null} Leaflet bounds [[minLat, minLon], [maxLat, maxLon]]
 */
export function calculateRouteBounds(...coordinateArrays) {
  const allPoints = [];
  coordinateArrays.forEach((arr) => {
    if (Array.isArray(arr)) {
      arr.forEach((pt) => {
        if (Array.isArray(pt) && pt.length >= 2 && !isNaN(pt[0]) && !isNaN(pt[1])) {
          allPoints.push(pt);
        }
      });
    }
  });

  if (allPoints.length === 0) return null;

  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLon = Infinity;
  let maxLon = -Infinity;

  allPoints.forEach(([lat, lon]) => {
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lon < minLon) minLon = lon;
    if (lon > maxLon) maxLon = lon;
  });

  // Add padding
  const latPad = Math.max((maxLat - minLat) * 0.15, 0.1);
  const lonPad = Math.max((maxLon - minLon) * 0.15, 0.1);

  return [
    [minLat - latPad, minLon - lonPad],
    [maxLat + latPad, maxLon + lonPad]
  ];
}

/**
 * Center coordinates for North Eastern Region of India
 */
export const NER_CENTER = [26.0, 92.5];
export const NER_DEFAULT_ZOOM = 7;
