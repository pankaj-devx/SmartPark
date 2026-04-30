/**
 * RecommendedParkingPanel.jsx
 * ---------------------------
 * Displays the top smart parking recommendations above the map.
 *
 * Props:
 *   recommendations  - Array of SmartParking objects (with badge + smartScore)
 *   isLoading        - Show skeleton while fetching
 *   error            - Non-fatal error string (shown inline, does not crash page)
 *   onSelect         - callback(parking) — triggers route drawing in MapPage
 *   selectedParking  - Currently selected parking (for highlight)
 */

import { Link } from 'react-router-dom';
import { MapPin, Navigation, Sparkles, Star } from 'lucide-react';

// Badge colour map — each badge gets a distinct pill style
const BADGE_STYLES = {
  'Best Choice':     'bg-amber-100 text-amber-800 border-amber-200',
  'Closest':         'bg-blue-100 text-blue-800 border-blue-200',
  'Cheapest':        'bg-green-100 text-green-800 border-green-200',
  'Most Available':  'bg-purple-100 text-purple-800 border-purple-200'
};

export function RecommendedParkingPanel({
  recommendations = [],
  isLoading = false,
  error = '',
  onSelect = null,
  selectedParking = null
}) {
  return (
    <section className="app-panel mb-5 p-4">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="mb-4 flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-amber-500" aria-hidden="true" />
        <h2 className="app-heading text-base font-semibold">Smart Recommendations</h2>
        <span className="ml-auto text-xs" style={{ color: 'var(--app-text-muted)' }}>
          Ranked by distance · price · availability
        </span>
      </div>

      {/* ── Loading skeleton ─────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div
              className="animate-pulse rounded-xl border p-4"
              key={i}
              style={{ borderColor: 'var(--app-border)', background: 'var(--app-surface-muted)' }}
            >
              <div className="h-3 w-1/3 rounded" style={{ background: 'var(--app-surface-subtle)' }} />
              <div className="mt-2 h-4 w-2/3 rounded" style={{ background: 'var(--app-surface-subtle)' }} />
              <div className="mt-3 h-3 w-1/2 rounded" style={{ background: 'var(--app-surface-muted)' }} />
              <div className="mt-4 h-8 rounded-lg" style={{ background: 'var(--app-surface-muted)' }} />
            </div>
          ))}
        </div>
      ) : null}

      {/* ── Error state ──────────────────────────────────────────────────── */}
      {!isLoading && error ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          {error}
        </p>
      ) : null}

      {/* ── Empty state ──────────────────────────────────────────────────── */}
      {!isLoading && !error && recommendations.length === 0 ? (
        <div
          className="rounded-xl border border-dashed p-5 text-center"
          style={{ borderColor: 'var(--app-border-strong)', background: 'var(--app-surface-muted)' }}
        >
          <Star className="mx-auto h-6 w-6 text-slate-400" aria-hidden="true" />
          <p className="app-heading mt-2 text-sm font-semibold">No recommendations available</p>
          <p className="app-copy mt-1 text-xs">
            Allow location access or enter coordinates to see smart picks.
          </p>
        </div>
      ) : null}

      {/* ── Recommendation cards ─────────────────────────────────────────── */}
      {!isLoading && recommendations.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-3">
          {recommendations.slice(0, 3).map((parking, index) => (
            <RecommendationCard
              key={parking.id}
              parking={parking}
              rank={index + 1}
              isSelected={selectedParking?.id === parking.id}
              onSelect={onSelect}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

// ---------------------------------------------------------------------------
// RecommendationCard — individual card inside the panel
// ---------------------------------------------------------------------------
function RecommendationCard({ parking, rank, isSelected, onSelect }) {
  const badgeClass = parking.badge ? BADGE_STYLES[parking.badge] : null;

  return (
    <article
      className={`relative flex flex-col rounded-xl border p-4 transition ${
        isSelected
          ? 'border-blue-400 bg-blue-50'
          : 'hover:border-brand-300 hover:shadow-sm'
      }`}
      style={isSelected ? {} : { borderColor: 'var(--app-border)', background: 'var(--app-surface)' }}
    >
      {/* Rank number */}
      <span
        className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold"
        style={{ background: 'var(--app-surface-subtle)', color: 'var(--app-text-muted)' }}
        aria-label={`Rank ${rank}`}
      >
        {rank}
      </span>

      {/* Badge */}
      {badgeClass ? (
        <span className={`mb-2 inline-flex w-fit items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold ${badgeClass}`}>
          {parking.badge === 'Best Choice' ? <Star className="h-3 w-3" aria-hidden="true" /> : null}
          {parking.badge}
        </span>
      ) : null}

      {/* Title */}
      <p className="app-heading line-clamp-2 text-sm font-semibold leading-snug">
        {parking.title}
      </p>

      {/* Location */}
      <p className="app-copy mt-1 flex items-center gap-1 text-xs">
        <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />
        <span className="truncate">{[parking.area, parking.city].filter(Boolean).join(', ')}</span>
      </p>

      {/* Stats row */}
      <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
        <span className="rounded-md bg-brand-50 px-2 py-0.5 font-semibold text-brand-700">
          Rs {parking.hourlyPrice}/hr
        </span>
        {parking.distance != null ? (
          <span className="app-pill rounded-md px-2 py-0.5">
            {(parking.distance / 1000).toFixed(1)} km
          </span>
        ) : null}
        <span className="app-pill rounded-md px-2 py-0.5">
          {parking.availableSlots} slots
        </span>
      </div>

      {/* Actions */}
      <div className="mt-3 grid gap-1.5">
        {onSelect ? (
          <button
            className={`inline-flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              isSelected
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'border hover:bg-slate-100'
            }`}
            style={isSelected ? {} : { borderColor: 'var(--app-border-strong)', color: 'var(--app-text)' }}
            onClick={() => onSelect(parking)}
            type="button"
          >
            <Navigation className="h-3.5 w-3.5" aria-hidden="true" />
            {isSelected ? 'Clear route' : 'Get directions'}
          </button>
        ) : null}
        <Link
          className="inline-flex w-full items-center justify-center rounded-lg border px-3 py-1.5 text-xs font-semibold hover:bg-slate-100"
          style={{ borderColor: 'var(--app-border-strong)', color: 'var(--app-text)' }}
          to={`/parkings/${parking.id}`}
        >
          View details
        </Link>
      </div>
    </article>
  );
}
