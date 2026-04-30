/**
 * mapSmartService.js
 * ------------------
 * Client-side service for the Phase 7C smart recommendations endpoint.
 *
 * Calls GET /api/parkings/smart and returns the ranked list with badges.
 * Keeps MapPage decoupled from the raw API client.
 */

import { apiClient } from '../../lib/apiClient.js';

/**
 * Fetch smart parking recommendations near a coordinate.
 *
 * @param {number} lat      - Latitude of the user's position
 * @param {number} lng      - Longitude of the user's position
 * @param {number} radiusKm - Search radius in km (default 3)
 * @param {number} limit    - Max results to return (default 5)
 *
 * @returns {Promise<SmartParking[]>} Array of parking objects with `smartScore` and `badge`
 *
 * @typedef {Object} SmartParking
 * @property {string}      id
 * @property {string}      title
 * @property {number}      latitude
 * @property {number}      longitude
 * @property {number}      hourlyPrice
 * @property {number}      availableSlots
 * @property {number}      distance       - metres from user
 * @property {number}      smartScore     - 0–1, lower is better
 * @property {string|null} badge          - "Best Choice" | "Closest" | "Cheapest" | "Most Available" | null
 */
export async function getSmartParking(lat, lng, radiusKm = 3, limit = 5) {
  const response = await apiClient.get('/parkings/smart', {
    params: { lat, lng, radiusKm, limit }
  });

  // Response shape: { success: true, data: { recommendations: [...], count: N } }
  return Array.isArray(response.data?.data?.recommendations)
    ? response.data.data.recommendations
    : [];
}
