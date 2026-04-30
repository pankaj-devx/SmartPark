/**
 * MapView.jsx
 * -----------
 * Renders a Leaflet map with parking markers.
 * This component is purely presentational — it receives data as props
 * and does not fetch anything itself.
 *
 * Props:
 *   center   - { lat: number, lng: number } — map centre coordinate
 *   parkings - Array of parking objects to render as markers
 *   zoom     - Initial zoom level (default 13)
 */

import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import { useEffect } from 'react';
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

export function MapView({ center, parkings = [], zoom = 13 }) {
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

        {/* Re-centre the map whenever the search location changes */}
        <MapCentreUpdater center={center} />

        {/* One marker per parking listing */}
        {parkings.map((parking) => (
          <MapMarker key={parking.id} parking={parking} />
        ))}
      </MapContainer>
    </div>
  );
}
