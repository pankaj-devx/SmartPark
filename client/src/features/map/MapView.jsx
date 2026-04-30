/**
 * MapView.jsx
 * -----------
 * Renders a Leaflet map with parking markers.
 * This component is purely presentational — it receives data as props
 * and does not fetch anything itself.
 *
 * Props:
 *   center       - { lat: number, lng: number } — map centre coordinate
 *   parkings     - Array of parking objects to render as markers
 *   zoom         - Initial zoom level (default 13)
 *   routeData    - { polyline, distanceKm, durationMin } from routeService (optional)
 *   userLocation - { lat: number, lng: number } — user's GPS position (optional)
 *   onSelectParking - callback(parking) fired when a marker is clicked
 *   selectedParking - the currently selected parking object (or null)
 */

import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';
import { useEffect } from 'react';
import L from 'leaflet';
import { MapMarker } from './MapMarker.jsx';

// ---------------------------------------------------------------------------
// MapCentreUpdater
// ---------------------------------------------------------------------------
// react-leaflet's MapContainer does not re-centre when the `center` prop
// changes after mount. This small inner component watches for centre changes
// and calls the Leaflet map API directly.
// ---------------------------------------------------------------------------
function MapCentreUpdater({ center }) {
  const map = useMap();

  useEffect(() => {
    if (center?.lat != null && center?.lng != null) {
      map.setView([center.lat, center.lng], map.getZoom(), { animate: true });
    }
  }, [map, center?.lat, center?.lng]);

  return null;
}

// ---------------------------------------------------------------------------
// RouteFitBounds
// ---------------------------------------------------------------------------
// When a route polyline is drawn, automatically pan + zoom the map so the
// entire route is visible. Resets to the centre view when route is cleared.
// ---------------------------------------------------------------------------
function RouteFitBounds({ polyline, center }) {
  const map = useMap();

  useEffect(() => {
    if (polyline?.length >= 2) {
      // Fit the map to the bounding box of the route with a small padding
      map.fitBounds(polyline, { padding: [48, 48], animate: true });
    } else if (center?.lat != null && center?.lng != null) {
      map.setView([center.lat, center.lng], 13, { animate: true });
    }
  }, [map, polyline, center?.lat, center?.lng]);

  return null;
}

// ---------------------------------------------------------------------------
// Custom icon for the user's current position
// ---------------------------------------------------------------------------
const userLocationIcon = L.divIcon({
  className: '',
  // A pulsing blue dot — pure CSS, no external image needed
  html: `
    <div style="
      width: 16px; height: 16px;
      background: #2563eb;
      border: 3px solid white;
      border-radius: 50%;
      box-shadow: 0 0 0 4px rgba(37,99,235,0.25);
    "></div>
  `,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
  popupAnchor: [0, -12]
});

export function MapView({
  center,
  parkings = [],
  zoom = 13,
  routeData = null,
  userLocation = null,
  onSelectParking = null,
  selectedParking = null
}) {
  // Leaflet needs a concrete initial centre — fall back to India's geographic
  // centre if nothing is provided yet.
  const initialCenter = [
    center?.lat ?? 20.5937,
    center?.lng ?? 78.9629
  ];

  return (
    // The container div must have an explicit height — Leaflet renders nothing
    // inside a zero-height element.
    <div className="h-full w-full overflow-hidden rounded-xl border" style={{ borderColor: 'var(--app-border)', minHeight: '400px' }}>
      <MapContainer
        center={initialCenter}
        zoom={zoom}
        // Fill the parent container completely
        style={{ height: '100%', width: '100%' }}
        // Disable scroll-wheel zoom so the page stays scrollable
        scrollWheelZoom={false}
      >
        {/* OpenStreetMap tiles — free, no API key required */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Fit map to route when a route is active, otherwise re-centre */}
        <RouteFitBounds polyline={routeData?.polyline ?? null} center={center} />

        {/* User's current position — blue pulsing dot */}
        {userLocation?.lat != null && userLocation?.lng != null ? (
          <Marker
            icon={userLocationIcon}
            position={[userLocation.lat, userLocation.lng]}
          >
            <Popup>
              <p className="text-xs font-semibold text-slate-950">Your location</p>
            </Popup>
          </Marker>
        ) : null}

        {/* Route polyline — drawn when a parking is selected */}
        {routeData?.polyline?.length >= 2 ? (
          <Polyline
            positions={routeData.polyline}
            // Brand blue, 5px wide, slightly transparent
            pathOptions={{ color: '#2563eb', weight: 5, opacity: 0.85 }}
          />
        ) : null}

        {/* One marker per parking listing */}
        {parkings.map((parking) => (
          <MapMarker
            key={parking.id}
            parking={parking}
            isSelected={selectedParking?.id === parking.id}
            onSelect={onSelectParking}
          />
        ))}
      </MapContainer>
    </div>
  );
}
