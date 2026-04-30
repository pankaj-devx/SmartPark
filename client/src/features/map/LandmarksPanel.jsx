/**
 * LandmarksPanel.jsx
 * ------------------
 * Shows nearby points of interest for the selected parking spot.
 *
 * Each landmark has a "Navigate" button that opens Google Maps
 * walking directions to that specific place.
 *
 * Props:
 *   landmarks   - Array of Landmark objects from landmarkService
 *   isLoading   - Show skeleton while fetching
 *   error       - Non-fatal error string
 *   parkingName - Name of the selected parking (for the heading)
 */

import { ExternalLink, MapPin, Navigation } from 'lucide-react';

/**
 * Build a Google Maps URL for walking directions to a landmark.
 *
 * - destination is always the landmark coordinate
 * - origin is included only when the user's real GPS position is known
 *   (guards against lat/lng === 0 which is falsy but valid)
 */
function buildLandmarkNavUrl(landmark, userLocation) {
  const params = new URLSearchParams({
    api: '1',
    destination: `${landmark.lat},${landmark.lng}`,
    travelmode: 'walking'
  });

  // Use != null so that a coordinate of exactly 0 is still treated as valid
  if (userLocation?.lat != null && userLocation?.lng != null) {
    params.append('origin', `${userLocation.lat},${userLocation.lng}`);
  }

  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

export function LandmarksPanel({
  landmarks = [],
  isLoading = false,
  error = '',
  parkingName = '',
  userLocation = null   
}) {
  // Empty + not loading → show a compact empty state
  if (!isLoading && !error && landmarks.length === 0) {
    return (
      <div
        className="rounded-xl border border-dashed px-4 py-3 text-center text-xs"
        style={{ borderColor: 'var(--app-border-strong)', color: 'var(--app-text-muted)' }}
      >
        <MapPin className="mx-auto mb-1 h-4 w-4" aria-hidden="true" />
        No landmarks found nearby
      </div>
    );
  }

  return (
    <section
      className="rounded-xl border p-4"
      style={{ borderColor: 'var(--app-border)', background: 'var(--app-surface)' }}
    >
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <h3 className="app-heading mb-3 text-sm font-semibold">
        Nearby Places
        {parkingName ? (
          <span className="ml-1 font-normal" style={{ color: 'var(--app-text-muted)' }}>
            · {parkingName}
          </span>
        ) : null}
      </h3>

      {/* ── Loading skeleton ─────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="grid gap-2.5">
          {[0, 1, 2, 3].map((i) => (
            <div className="flex animate-pulse items-center gap-3" key={i}>
              <div
                className="h-8 w-8 shrink-0 rounded-lg"
                style={{ background: 'var(--app-surface-subtle)' }}
              />
              <div className="flex-1">
                <div
                  className="h-3 w-2/3 rounded"
                  style={{ background: 'var(--app-surface-subtle)' }}
                />
                <div
                  className="mt-1.5 h-2.5 w-1/3 rounded"
                  style={{ background: 'var(--app-surface-muted)' }}
                />
              </div>
              <div
                className="h-6 w-16 shrink-0 rounded-md"
                style={{ background: 'var(--app-surface-muted)' }}
              />
            </div>
          ))}
        </div>
      ) : null}

      {/* ── Error ────────────────────────────────────────────────────────── */}
      {!isLoading && error ? (
        <p className="text-xs" style={{ color: 'var(--app-text-muted)' }}>
          Could not load nearby places.
        </p>
      ) : null}

      {/* ── Landmark list ────────────────────────────────────────────────── */}
      {!isLoading && !error && landmarks.length > 0 ? (
        <ul className="grid gap-2.5">
          {landmarks.map((landmark) => (
            <li key={landmark.id} className="flex items-center gap-3">
              {/* Emoji icon */}
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-base"
                style={{ background: 'var(--app-surface-muted)' }}
                aria-hidden="true"
              >
                {landmark.emoji}
              </span>

              {/* Name + distance */}
              <div className="min-w-0 flex-1">
                <p className="app-heading truncate text-xs font-semibold">{landmark.name}</p>
                <p className="text-xs" style={{ color: 'var(--app-text-muted)' }}>
                  {landmark.label}
                  {' · '}
                  {landmark.distanceM < 1000
                    ? `${landmark.distanceM} m`
                    : `${(landmark.distanceM / 1000).toFixed(1)} km`}
                </p>
              </div>

              {/* Navigate button — opens Google Maps walking directions */}
              <a
                aria-label={`Navigate to ${landmark.name}`}
                className="inline-flex shrink-0 items-center gap-1 rounded-md border px-2 py-1 text-xs font-semibold transition hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700"
                href={buildLandmarkNavUrl(landmark, userLocation)}
                rel="noopener noreferrer"
                style={{ borderColor: 'var(--app-border-strong)', color: 'var(--app-text-muted)' }}
                target="_blank"
              >
                <Navigation className="h-3 w-3" aria-hidden="true" />
                Go
                <ExternalLink className="h-2.5 w-2.5 opacity-60" aria-hidden="true" />
              </a>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
