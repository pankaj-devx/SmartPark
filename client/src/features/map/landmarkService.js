/**
 * landmarkService.js
 * ------------------
 * Fetches nearby points of interest (landmarks) using the Overpass API.
 *
 * Overpass is the query engine for OpenStreetMap data.
 * It has full CORS support, requires no API key, and is free for
 * reasonable use (same data that powers OSM's own search).
 *
 * We query for 5 categories that are most useful when choosing a parking spot:
 *   cafe, mall/supermarket, hospital, bus_stop, restaurant
 *
 * The query uses a bounding circle (around=radiusM,lat,lng) so results
 * are always relevant to the selected parking location.
 */

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

// Maximum radius for landmark search — keep it tight so results are walkable
const DEFAULT_RADIUS_M = 500;

// OSM amenity/shop tags we care about, mapped to a display label and emoji
const LANDMARK_TYPES = [
  { tag: 'amenity', value: 'cafe',        label: 'Cafe',        emoji: '☕' },
  { tag: 'amenity', value: 'restaurant',  label: 'Restaurant',  emoji: '🍽️' },
  { tag: 'amenity', value: 'hospital',    label: 'Hospital',    emoji: '🏥' },
  { tag: 'amenity', value: 'bus_station', label: 'Bus Stop',    emoji: '🚌' },
  { tag: 'highway', value: 'bus_stop',    label: 'Bus Stop',    emoji: '🚌' },
  { tag: 'shop',    value: 'mall',        label: 'Mall',        emoji: '🛍️' },
  { tag: 'shop',    value: 'supermarket', label: 'Supermarket', emoji: '🛒' }
];

/**
 * Build an Overpass QL query string for the given coordinate and radius.
 * Returns nodes matching any of the LANDMARK_TYPES within the radius.
 */
function buildOverpassQuery(lat, lng, radiusM) {
  // Each type becomes one "node[tag=value](around:radius,lat,lng);" line
  const nodeQueries = LANDMARK_TYPES.map(
    ({ tag, value }) => `node["${tag}"="${value}"](around:${radiusM},${lat},${lng});`
  ).join('\n  ');

  return `
    [out:json][timeout:10];
    (
      ${nodeQueries}
    );
    out body 20;
  `.trim();
}

/**
 * Calculate straight-line distance between two coordinates in metres.
 * Uses the Haversine formula.
 */
function haversineMetres(lat1, lng1, lat2, lng2) {
  const R = 6_371_000; // Earth radius in metres
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.asin(Math.sqrt(a)));
}

/**
 * Resolve the display label and emoji for an OSM node's tags.
 * Returns the first matching LANDMARK_TYPE, or a generic fallback.
 */
function resolveLandmarkMeta(tags) {
  for (const type of LANDMARK_TYPES) {
    if (tags[type.tag] === type.value) {
      return { label: type.label, emoji: type.emoji };
    }
  }
  return { label: 'Place', emoji: '📍' };
}

/**
 * Fetch nearby landmarks for a given coordinate.
 *
 * @param {number} lat      - Latitude of the parking (or user)
 * @param {number} lng      - Longitude of the parking (or user)
 * @param {number} radiusM  - Search radius in metres (default 500)
 *
 * @returns {Promise<Landmark[]>}
 *
 * @typedef {Object} Landmark
 * @property {string} id        - OSM node id
 * @property {string} name      - Display name (from OSM tags or label fallback)
 * @property {string} label     - Category label e.g. "Cafe"
 * @property {string} emoji     - Category emoji e.g. "☕"
 * @property {number} distanceM - Straight-line distance in metres
 * @property {number} lat
 * @property {number} lng
 */
export async function getNearbyLandmarks(lat, lng, radiusM = DEFAULT_RADIUS_M) {
  const query = buildOverpassQuery(lat, lng, radiusM);

  const response = await fetch(OVERPASS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`
  });

  if (!response.ok) {
    throw new Error(`Overpass API error: ${response.status}`);
  }

  const data = await response.json();
  const elements = Array.isArray(data?.elements) ? data.elements : [];

  // Deduplicate by name+label (OSM sometimes has duplicate nodes)
  const seen = new Set();

  return elements
    .map((el) => {
      const { label, emoji } = resolveLandmarkMeta(el.tags ?? {});
      const name = el.tags?.name || label;
      const distanceM = haversineMetres(lat, lng, el.lat, el.lon);
      return { id: String(el.id), name, label, emoji, distanceM, lat: el.lat, lng: el.lon };
    })
    .filter(({ name, label }) => {
      const key = `${name}|${label}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => a.distanceM - b.distanceM) // nearest first
    .slice(0, 8); // cap at 8 so the UI stays compact
}
