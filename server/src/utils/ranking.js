/**
 * ranking.js
 * ----------
 * Smart parking recommendation scoring utility.
 *
 * Used by the /api/parkings/smart endpoint to rank nearby parkings
 * and return the top N recommendations.
 *
 * Scoring philosophy:
 *   A lower score = a better recommendation.
 *   We normalise each factor to a 0–1 range, weight them, and sum.
 *
 * Factors and weights:
 *   Distance   50% — closer is always better for a driver
 *   Price      30% — cheaper is preferred
 *   Availability 20% — more open slots = less risk of arriving to a full lot
 *
 * The weights are intentionally simple and readable. They can be tuned
 * without touching any other file.
 */

// ── Weight constants ─────────────────────────────────────────────────────────
const WEIGHT_DISTANCE     = 0.5;
const WEIGHT_PRICE        = 0.3;
const WEIGHT_AVAILABILITY = 0.2;

// ── Normalisation caps ───────────────────────────────────────────────────────
// Values beyond these caps are treated as the worst case (score = 1.0).
const MAX_DISTANCE_M  = 10_000;  // 10 km — beyond this, distance score = 1
const MAX_PRICE_RS    = 500;     // Rs 500/hr — beyond this, price score = 1

/**
 * Calculate a recommendation score for a single parking listing.
 *
 * @param {Object} parking      - Serialized parking object from the DB
 * @param {number} parking.distance      - Distance from user in metres (from $geoNear)
 * @param {number} parking.hourlyPrice   - Price per hour in rupees
 * @param {number} parking.availableSlots
 * @param {number} parking.totalSlots
 *
 * @returns {number} Score between 0 and 1 (lower = better recommendation)
 */
export function calculateScore(parking) {
  // ── Distance factor ──────────────────────────────────────────────────────
  // 0 = right next to user, 1 = at or beyond MAX_DISTANCE_M
  const distanceMetres = parking.distance ?? MAX_DISTANCE_M;
  const distanceFactor = Math.min(distanceMetres / MAX_DISTANCE_M, 1);

  // ── Price factor ─────────────────────────────────────────────────────────
  // 0 = free, 1 = at or beyond MAX_PRICE_RS
  const priceFactor = Math.min((parking.hourlyPrice ?? MAX_PRICE_RS) / MAX_PRICE_RS, 1);

  // ── Availability factor ──────────────────────────────────────────────────
  // 0 = fully available, 1 = completely full
  // We invert the ratio so that more slots = lower (better) score.
  const total = parking.totalSlots ?? 1;
  const available = parking.availableSlots ?? 0;
  const availabilityFactor = total > 0 ? 1 - available / total : 1;

  // ── Weighted sum ─────────────────────────────────────────────────────────
  const score =
    distanceFactor     * WEIGHT_DISTANCE +
    priceFactor        * WEIGHT_PRICE +
    availabilityFactor * WEIGHT_AVAILABILITY;

  // Round to 4 decimal places for clean JSON output
  return Number(score.toFixed(4));
}

/**
 * Assign a human-readable badge to a parking based on its characteristics.
 * Returns the single most relevant badge, or null if none applies.
 *
 * Badge priority: Best Choice → Closest → Cheapest → Most Available
 *
 * @param {Object}  parking  - Parking object with score attached
 * @param {boolean} isBest   - true if this is the top-ranked item
 * @returns {string|null}
 */
export function assignBadge(parking, isBest = false) {
  if (isBest) return 'Best Choice';

  // Cheapest: under Rs 20/hr
  if (parking.hourlyPrice != null && parking.hourlyPrice <= 20) return 'Cheapest';

  // Closest: within 500 m
  if (parking.distance != null && parking.distance <= 500) return 'Closest';

  // High availability: more than 50% slots free
  const ratio = parking.totalSlots ? parking.availableSlots / parking.totalSlots : 0;
  if (ratio >= 0.5) return 'Most Available';

  return null;
}
