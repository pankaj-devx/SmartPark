/**
 * MapMarker.jsx
 * -------------
 * A single Leaflet marker for one parking listing.
 * Renders a popup with the parking title, price, available slots,
 * and a link to the detail page.
 *
 * Props:
 *   parking  - A parking object from the API (must have latitude, longitude)
 */

import { Marker, Popup } from 'react-leaflet';
import { Link } from 'react-router-dom';
import L from 'leaflet';

// ---------------------------------------------------------------------------
// Custom marker icon
// ---------------------------------------------------------------------------
// Leaflet's default icon relies on image paths that break in Vite builds.
// We recreate it using the CDN URLs so it always resolves correctly.
// ---------------------------------------------------------------------------
const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

export function MapMarker({ parking }) {
  // Guard: skip markers that have no valid coordinates
  if (parking.latitude == null || parking.longitude == null) {
    return null;
  }

  return (
    <Marker
      icon={defaultIcon}
      // Leaflet expects [latitude, longitude] — opposite of GeoJSON order
      position={[parking.latitude, parking.longitude]}
    >
      <Popup minWidth={200}>
        {/* Popup content — keep it compact */}
        <div className="grid gap-1">
          <p className="font-semibold text-slate-950 leading-snug">{parking.title}</p>
          <p className="text-xs text-slate-500">
            {[parking.area, parking.city, parking.state].filter(Boolean).join(', ')}
          </p>

          <div className="mt-1 flex flex-wrap gap-1 text-xs">
            <span className="rounded bg-brand-50 px-2 py-0.5 font-semibold text-brand-700">
              Rs {parking.hourlyPrice}/hr
            </span>
            <span className="rounded bg-slate-100 px-2 py-0.5 text-slate-700">
              {parking.availableSlots} slots
            </span>
            {parking.distance != null ? (
              <span className="rounded bg-slate-100 px-2 py-0.5 text-slate-700">
                {(parking.distance / 1000).toFixed(1)} km away
              </span>
            ) : null}
          </div>

          <Link
            className="mt-2 inline-flex justify-center rounded-md bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700"
            to={`/parkings/${parking.id}`}
          >
            View details
          </Link>
        </div>
      </Popup>
    </Marker>
  );
}
