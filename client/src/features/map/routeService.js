/**
 * routeService.js
 * ---------------
 * Fetches a driving route between two coordinates using the OSRM public API.
 *
 * Why OSRM instead of OpenRouteService?
 *   OpenRouteService blocks direct browser requests with CORS errors unless
 *   you proxy through a backend. OSRM's public demo server
 *   (router.project-osrm.org) is the same engine that powers OpenStreetMap's
 *   own routing — it has full CORS headers, requires no API key, and is free
 *   for reasonable use.
 *
 * API format:
 *   GET https://router.project-osrm.org/route/v1/driving/{lng1},{lat1};{lng2},{lat2}
 *       ?overview=full&geometries=geojson
 *
 * Note: OSRM uses [longitude, latitude] order in the URL (GeoJSON convention).
 */

// Base URL for the OSRM public demo server
const OSRM_BASE = 'https://router.project-osrm.org/route/v1/driving';

/**
 * Fetch a driving route between two points.
 *
 * @param {{ lat: number, lng: number }} start - Origin coordinate (user location)
 * @param {{ lat: number, lng: number }} end   - Destination coordinate (parking)
 *
 * @returns {Promise<RouteResult>} Resolved route data
 *
 * @typedef {Object} RouteResult
 * @property {Array<[number, number]>} polyline  - Array of [lat, lng] pairs for Leaflet Polyline
 * @property {number}                  distanceKm - Route distance in kilometres (1 decimal)
 * @property {number}                  durationMin - Estimated driving time in minutes (rounded up)
 */
export async function getRoute(start, end) {
  // OSRM expects coordinates as "lng,lat" pairs separated by semicolons
  const coords = `${start.lng},${start.lat};${end.lng},${end.lat}`;
  const url = `${OSRM_BASE}/${coords}?overview=full&geometries=geojson`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Routing request failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  // OSRM returns { code: "Ok", routes: [...] }
  if (data.code !== 'Ok' || !data.routes?.length) {
    throw new Error('No route found between these two points.');
  }

  const route = data.routes[0];

  // geometry.coordinates is an array of [lng, lat] pairs (GeoJSON order).
  // Leaflet's Polyline expects [lat, lng] — we flip each pair here.
  const polyline = route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);

  // distance is in metres, duration is in seconds
  const distanceKm = Number((route.distance / 1000).toFixed(1));
  const durationMin = Math.ceil(route.duration / 60);

  return { polyline, distanceKm, durationMin };
}

/**
 * Build a Google Maps directions URL that opens in a new tab.
 * The user's current location is used as the implicit origin by Google Maps.
 *
 * @param {{ lat: number, lng: number }} destination - Parking coordinates
 * @param {string} [label] - Optional parking name shown in Google Maps
 * @returns {string} Google Maps URL
 */
export function buildGoogleMapsUrl(destination, label = '') {
  const params = new URLSearchParams({
    api: '1',
    destination: `${destination.lat},${destination.lng}`,
    ...(label ? { destination_place_id: label } : {})
  });

  return `https://www.google.com/maps/dir/?${params.toString()}`;
}
