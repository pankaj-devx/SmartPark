/**
 * MapMarker.jsx
 * -------------
 * A single Leaflet marker for one parking listing.
 * Renders a popup with the parking title, price, available slots,
 * and a link to the detail page.
 *
 * Props:
 *   parking    - A parking object from the API (must have latitude, longitude)
 *   isSelected - true when this parking is the active route destination
 *   onSelect   - callback(parking) fired when "Get directions" is clicked
 */

import { Marker, Popup } from 'react-leaflet';
import { Link } from 'react-router-dom';
import L from 'leaflet';

// ---------------------------------------------------------------------------
// Custom marker icons
// ---------------------------------------------------------------------------
// Leaflet's default icon relies on image paths that break in Vite builds.
// We recreate it using the CDN URLs so it always resolves correctly.
// A second "selected" icon uses a red tint to highlight the active destination.
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

// Selected marker — slightly larger to stand out as the route destination
const selectedIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [30, 49],   // 20% larger
  iconAnchor: [15, 49],
  popupAnchor: [1, -42],
  shadowSize: [49, 49],
  className: 'marker-selected' // hook for CSS filter if desired
});

export function MapMarker({ parking, isSelected = false, onSelect = null }) {
  // Guard: skip markers that have no valid coordinates
  if (parking.latitude == null || parking.longitude == null) {
    return null;
  }

  return (
    <Marker
      icon={isSelected ? selectedIcon : defaultIcon}
      // Leaflet expects [latitude, longitude] — opposite of GeoJSON order
      position={[parking.latitude, parking.longitude]}
    >
      <Popup minWidth={210}>
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

          {/* Get directions button — triggers route drawing in MapPage */}
          {onSelect ? (
            <button
              className="mt-2 inline-flex w-full justify-center rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
              onClick={() => onSelect(parking)}
              type="button"
            >
              {isSelected ? '✓ Route active' : 'Get directions'}
            </button>
          ) : null}

          <Link
            className="mt-1 inline-flex justify-center rounded-md border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
            to={`/parkings/${parking.id}`}
          >
            View details
          </Link>
        </div>
      </Popup>
    </Marker>
  );
}
