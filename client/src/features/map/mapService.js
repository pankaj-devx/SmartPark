/**
 * mapService.js
 * -------------
 * Thin service layer for map-related API calls.
 * Wraps the existing parkingApi so MapPage never imports it directly —
 * keeping the map feature isolated and easy to test or swap out.
 */

import { fetchNearbyParkings } from '../parkings/parkingApi.js';

/**
 * Fetch parking spots near a given coordinate.
 *
 * @param {number} lat      - Latitude of the search centre
 * @param {number} lng      - Longitude of the search centre
 * @param {number} radiusKm - Search radius in kilometres (default 5)
 * @returns {Promise<Array>} Array of parking objects with latitude/longitude fields
 */
export async function getNearbyParking(lat, lng, radiusKm = 5) {
  // The existing /api/parkings/nearby endpoint already handles validation,
  // geospatial querying, and distance sorting — we just call it.
  const data = await fetchNearbyParkings({
    lat,
    lng,
    radiusKm,
    sort: 'nearest',
    limit: 50 // fetch enough to fill the map
  });

  // data.parkings is the array returned by the backend
  return Array.isArray(data?.parkings) ? data.parkings : [];
}
