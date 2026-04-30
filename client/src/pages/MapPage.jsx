/**
 * MapPage.jsx
 * -----------
 * Standalone map discovery page for SmartPark.
 *
 * Flow:
 *   1. On mount → request browser geolocation
 *   2. On success → call /api/parkings/nearby → render markers
 *   3. On denial / error → show fallback UI with manual lat/lng inputs
 *
 * This page is completely independent — it does not modify any existing
 * page, route, or component.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, LocateFixed, MapPin, Navigation, RefreshCw, Route, Search, X } from 'lucide-react';
import { getNearbyParking } from '../features/map/mapService.js';
import { buildGoogleMapsUrl, getRoute } from '../features/map/routeService.js';
import { MapView } from '../features/map/MapView.jsx';
import { getApiErrorMessage } from '../lib/getApiErrorMessage.js';

// Default fallback location — centre of India
const FALLBACK_CENTER = { lat: 20.5937, lng: 78.9629 };
const DEFAULT_RADIUS_KM = 5;

export function MapPage() {
  // ── State ────────────────────────────────────────────────────────────────
  const [center, setCenter] = useState(null);           // current map centre
  const [parkings, setParkings] = useState([]);         // markers to render
  const [radiusKm, setRadiusKm] = useState(DEFAULT_RADIUS_KM);
  const [manualLat, setManualLat] = useState('');       // manual input fields
  const [manualLng, setManualLng] = useState('');
  const [locationStatus, setLocationStatus] = useState('idle');
  // 'idle' | 'requesting' | 'granted' | 'denied' | 'unavailable'
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const hasMounted = useRef(false);

  // ── Routing state ────────────────────────────────────────────────────────
  // selectedParking — the parking the user clicked "Get directions" on
  // routeData       — { polyline, distanceKm, durationMin } from routeService
  // isRouting       — true while the route API call is in flight
  // routeError      — non-fatal: shown in the route panel, does not clear map
  const [selectedParking, setSelectedParking] = useState(null);
  const [routeData, setRouteData] = useState(null);
  const [isRouting, setIsRouting] = useState(false);
  const [routeError, setRouteError] = useState('');

  // ── Fetch nearby parkings ────────────────────────────────────────────────
  const loadNearby = useCallback(async (lat, lng, km = radiusKm) => {
    setError('');
    setIsLoading(true);

    try {
      const results = await getNearbyParking(lat, lng, km);
      setParkings(results);

      if (results.length === 0) {
        setError(`No approved parking found within ${km} km. Try increasing the radius.`);
      }
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Unable to load nearby parking. Please try again.'));
      setParkings([]);
    } finally {
      setIsLoading(false);
    }
  }, [radiusKm]);

  // ── Geolocation ──────────────────────────────────────────────────────────
  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationStatus('unavailable');
      setError('Location services are not supported in this browser. Enter coordinates manually below.');
      return;
    }

    setLocationStatus('requesting');
    setError('');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        setLocationStatus('granted');
        setCenter({ lat, lng });
        setManualLat(String(lat.toFixed(6)));
        setManualLng(String(lng.toFixed(6)));
        loadNearby(lat, lng);
      },
      (geolocationError) => {
        // Permission denied or position unavailable
        const isDenied = geolocationError.code === geolocationError.PERMISSION_DENIED;
        setLocationStatus(isDenied ? 'denied' : 'unavailable');
        setError(
          isDenied
            ? 'Location access was denied. Enter your coordinates manually to search nearby parking.'
            : 'Unable to determine your location. Enter coordinates manually below.'
        );
        // Show the map at the fallback centre so it's not blank
        setCenter(FALLBACK_CENTER);
      }
    );
  }, [loadNearby]);

  // Auto-request location on first mount
  useEffect(() => {
    if (hasMounted.current) return;
    hasMounted.current = true;
    requestLocation();
  }, [requestLocation]);

  // ── Manual search ────────────────────────────────────────────────────────
  function handleManualSearch(event) {
    event.preventDefault();

    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);

    if (isNaN(lat) || lat < -90 || lat > 90) {
      setError('Latitude must be a number between -90 and 90.');
      return;
    }

    if (isNaN(lng) || lng < -180 || lng > 180) {
      setError('Longitude must be a number between -180 and 180.');
      return;
    }

    setCenter({ lat, lng });
    loadNearby(lat, lng, radiusKm);
  }

  // ── Derived UI state ─────────────────────────────────────────────────────
  const mapCenter = center ?? FALLBACK_CENTER;
  const showManualForm = locationStatus === 'denied' || locationStatus === 'unavailable';

  // ── Route handling ───────────────────────────────────────────────────────

  /**
   * Called when the user clicks "Get directions" on a marker popup.
   * Fetches a driving route from the user's current location to the parking.
   */
  async function handleSelectParking(parking) {
    // Clicking the same parking again clears the route (toggle off)
    if (selectedParking?.id === parking.id) {
      setSelectedParking(null);
      setRouteData(null);
      setRouteError('');
      return;
    }

    setSelectedParking(parking);
    setRouteData(null);
    setRouteError('');

    // Need the user's location as the route origin
    if (!center || locationStatus === 'denied' || locationStatus === 'unavailable') {
      setRouteError(
        'Your location is needed to draw a route. Use "Use my location" above, or enter coordinates manually.'
      );
      return;
    }

    setIsRouting(true);

    try {
      const result = await getRoute(
        { lat: center.lat, lng: center.lng },
        { lat: parking.latitude, lng: parking.longitude }
      );
      setRouteData(result);
    } catch {
      // Route failed — non-fatal, keep the map working
      setRouteError(
        'Could not calculate a driving route to this parking. You can still open it in Google Maps.'
      );
    } finally {
      setIsRouting(false);
    }
  }

  /** Clear the active route and deselect the parking */
  function clearRoute() {
    setSelectedParking(null);
    setRouteData(null);
    setRouteError('');
  }

  /** Open the selected parking's destination in Google Maps */
  function openInGoogleMaps() {
    if (!selectedParking) return;
    const url = buildGoogleMapsUrl(
      { lat: selectedParking.latitude, lng: selectedParking.longitude },
      selectedParking.title
    );
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-8">

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="mb-6">
        <p className="text-sm font-medium uppercase text-brand-700">Map discovery</p>
        <h1 className="app-heading mt-2 text-3xl font-bold">Nearby parking map</h1>
        <p className="app-copy mt-2 text-sm">
          Find approved parking spaces around your location, visualised on an interactive map.
        </p>
      </div>

      {/* ── Controls bar ────────────────────────────────────────────────── */}
      <div className="app-panel mb-5 flex flex-wrap items-end gap-4 p-4">

        {/* Use my location button */}
        <button
          className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
          disabled={locationStatus === 'requesting' || isLoading}
          onClick={requestLocation}
          type="button"
        >
          <LocateFixed className="h-4 w-4" aria-hidden="true" />
          {locationStatus === 'requesting' ? 'Locating…' : 'Use my location'}
        </button>

        {/* Radius selector */}
        <label className="grid gap-1 text-sm font-medium" style={{ color: 'var(--app-text-muted)' }}>
          Search radius
          <select
            className="app-input text-sm"
            onChange={(e) => {
              const km = Number(e.target.value);
              setRadiusKm(km);
              if (center) loadNearby(center.lat, center.lng, km);
            }}
            value={radiusKm}
          >
            <option value={1}>1 km</option>
            <option value={2}>2 km</option>
            <option value={5}>5 km</option>
            <option value={10}>10 km</option>
            <option value={20}>20 km</option>
            <option value={50}>50 km</option>
          </select>
        </label>

        {/* Result count badge */}
        {!isLoading && parkings.length > 0 ? (
          <span className="inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium" style={{ borderColor: 'var(--app-border)', color: 'var(--app-text-muted)' }}>
            <MapPin className="h-4 w-4 text-brand-600" aria-hidden="true" />
            {parkings.length} parking{parkings.length !== 1 ? 's' : ''} found
          </span>
        ) : null}

        {/* Link to full list view */}
        <Link
          className="ml-auto inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold hover:bg-slate-100"
          style={{ borderColor: 'var(--app-border-strong)', color: 'var(--app-text)' }}
          to="/parkings"
        >
          <Search className="h-4 w-4" aria-hidden="true" />
          List view
        </Link>
      </div>

      {/* ── Manual coordinate form (shown when location is denied) ───────── */}
      {showManualForm ? (
        <form
          className="app-panel mb-5 grid gap-4 p-4 sm:grid-cols-[1fr_1fr_auto]"
          onSubmit={handleManualSearch}
        >
          <label className="grid gap-1 text-sm font-medium" style={{ color: 'var(--app-text-muted)' }}>
            Latitude
            <input
              className="app-input text-sm"
              onChange={(e) => setManualLat(e.target.value)}
              placeholder="e.g. 19.0596"
              type="number"
              step="any"
              value={manualLat}
            />
          </label>
          <label className="grid gap-1 text-sm font-medium" style={{ color: 'var(--app-text-muted)' }}>
            Longitude
            <input
              className="app-input text-sm"
              onChange={(e) => setManualLng(e.target.value)}
              placeholder="e.g. 72.8656"
              type="number"
              step="any"
              value={manualLng}
            />
          </label>
          <button
            className="self-end inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
            disabled={isLoading}
            type="submit"
          >
            <Search className="h-4 w-4" aria-hidden="true" />
            Search
          </button>
        </form>
      ) : null}

      {/* ── Error / status messages ──────────────────────────────────────── */}
      {error ? (
        <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
          <X className="mt-0.5 h-4 w-4 shrink-0 text-red-500" aria-hidden="true" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      ) : null}

      {/* ── Loading state ────────────────────────────────────────────────── */}
      {locationStatus === 'requesting' && !center ? (
        <div className="mb-5 flex items-center gap-3 rounded-xl border px-4 py-3 text-sm" style={{ borderColor: 'var(--app-border)', color: 'var(--app-text-muted)' }}>
          <RefreshCw className="h-4 w-4 animate-spin text-brand-600" aria-hidden="true" />
          Requesting your location…
        </div>
      ) : null}

      {/* ── Main layout: map + sidebar ───────────────────────────────────── */}
      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">

        {/* Map — takes up the left column */}
        <div style={{ height: '560px' }}>
          <MapView
            center={mapCenter}
            parkings={parkings}
            zoom={13}
            routeData={routeData}
            userLocation={center}
            onSelectParking={handleSelectParking}
            selectedParking={selectedParking}
          />
        </div>

        {/* Sidebar — route info panel + parking list */}
        <aside className="flex flex-col gap-3">

          {/* ── Route info panel ──────────────────────────────────────── */}
          {/* Shown whenever a parking is selected, regardless of route state */}
          {selectedParking ? (
            <div className="rounded-xl border p-4" style={{ borderColor: 'var(--app-border)', background: 'var(--app-surface)' }}>

              {/* Header row */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Route className="h-4 w-4 shrink-0 text-blue-600" aria-hidden="true" />
                  <p className="app-heading text-sm font-semibold">Route to destination</p>
                </div>
                <button
                  aria-label="Clear route"
                  className="rounded-md p-1 hover:bg-slate-100"
                  onClick={clearRoute}
                  style={{ color: 'var(--app-text-muted)' }}
                  type="button"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>

              {/* Destination name */}
              <p className="mt-2 truncate text-sm font-medium" style={{ color: 'var(--app-text)' }}>
                {selectedParking.title}
              </p>
              <p className="mt-0.5 truncate text-xs" style={{ color: 'var(--app-text-muted)' }}>
                {[selectedParking.area, selectedParking.city].filter(Boolean).join(', ')}
              </p>

              {/* Route loading spinner */}
              {isRouting ? (
                <div className="mt-3 flex items-center gap-2 text-xs" style={{ color: 'var(--app-text-muted)' }}>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin text-blue-600" aria-hidden="true" />
                  Calculating route…
                </div>
              ) : null}

              {/* Route error — non-fatal */}
              {routeError ? (
                <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  {routeError}
                </p>
              ) : null}

              {/* Route summary — distance + ETA */}
              {routeData && !isRouting ? (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="rounded-lg bg-blue-50 px-3 py-2 text-center">
                    <p className="text-lg font-bold text-blue-700">{routeData.distanceKm} km</p>
                    <p className="text-xs text-blue-600">Distance</p>
                  </div>
                  <div className="rounded-lg bg-blue-50 px-3 py-2 text-center">
                    <p className="text-lg font-bold text-blue-700">{routeData.durationMin} min</p>
                    <p className="text-xs text-blue-600">Est. drive time</p>
                  </div>
                </div>
              ) : null}

              {/* Action buttons */}
              <div className="mt-3 grid gap-2">
                {/* Open in Google Maps */}
                <button
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                  onClick={openInGoogleMaps}
                  type="button"
                >
                  <Navigation className="h-3.5 w-3.5" aria-hidden="true" />
                  Open in Google Maps
                  <ExternalLink className="h-3 w-3 opacity-70" aria-hidden="true" />
                </button>

                {/* View parking details */}
                <Link
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold hover:bg-slate-100"
                  style={{ borderColor: 'var(--app-border-strong)', color: 'var(--app-text)' }}
                  to={`/parkings/${selectedParking.id}`}
                >
                  View parking details
                </Link>
              </div>
            </div>
          ) : (
            /* Hint shown when no parking is selected */
            <div className="rounded-xl border border-dashed px-4 py-3 text-center text-xs" style={{ borderColor: 'var(--app-border-strong)', color: 'var(--app-text-muted)' }}>
              <Route className="mx-auto mb-1 h-4 w-4" aria-hidden="true" />
              Click a marker then "Get directions" to draw a route
            </div>
          )}

          {/* ── Result count heading ───────────────────────────────────── */}
          <h2 className="app-heading text-lg font-semibold">
            {isLoading ? 'Searching…' : `${parkings.length} result${parkings.length !== 1 ? 's' : ''}`}
          </h2>

          {/* Loading skeleton */}
          {isLoading ? (
            <div className="grid gap-3">
              {[0, 1, 2, 3].map((i) => (
                <div className="animate-pulse rounded-xl border p-4" key={i} style={{ borderColor: 'var(--app-border)', background: 'var(--app-surface)' }}>
                  <div className="h-4 w-2/3 rounded" style={{ background: 'var(--app-surface-subtle)' }} />
                  <div className="mt-2 h-3 w-1/2 rounded" style={{ background: 'var(--app-surface-muted)' }} />
                  <div className="mt-3 h-8 rounded-lg" style={{ background: 'var(--app-surface-muted)' }} />
                </div>
              ))}
            </div>
          ) : null}

          {/* Empty state */}
          {!isLoading && parkings.length === 0 && !error ? (
            <div
              className="rounded-xl border border-dashed p-6 text-center"
              style={{ borderColor: 'var(--app-border-strong)', background: 'var(--app-surface-muted)' }}
            >
              <MapPin className="mx-auto h-8 w-8 text-slate-400" aria-hidden="true" />
              <p className="app-heading mt-3 font-semibold">No parking found</p>
              <p className="app-copy mt-2 text-sm">
                Try increasing the search radius or searching a different location.
              </p>
            </div>
          ) : null}

          {/* Parking cards */}
          {!isLoading
            ? parkings.map((parking) => (
                <ParkingSidebarCard
                  key={parking.id}
                  parking={parking}
                  isSelected={selectedParking?.id === parking.id}
                  onGetDirections={handleSelectParking}
                />
              ))
            : null}
        </aside>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// ParkingSidebarCard
// ---------------------------------------------------------------------------
// Compact card shown in the sidebar next to the map.
// Props:
//   parking         - parking object
//   isSelected      - true when this parking is the active route destination
//   onGetDirections - callback(parking) to trigger route drawing
// ---------------------------------------------------------------------------
function ParkingSidebarCard({ parking, isSelected = false, onGetDirections = null }) {
  return (
    <article
      className={`rounded-xl border p-4 transition ${isSelected ? 'border-blue-400 bg-blue-50' : 'hover:border-brand-300'}`}
      style={isSelected ? {} : { borderColor: 'var(--app-border)', background: 'var(--app-surface)' }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="app-heading truncate font-semibold">{parking.title}</p>
          <p className="app-copy mt-1 flex items-center gap-1 text-xs">
            <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">
              {[parking.area, parking.city].filter(Boolean).join(', ')}
            </span>
          </p>
        </div>
        <span className="shrink-0 rounded-lg bg-brand-50 px-2 py-1 text-xs font-semibold text-brand-700">
          Rs {parking.hourlyPrice}/hr
        </span>
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5 text-xs" style={{ color: 'var(--app-text-muted)' }}>
        <span className="app-pill rounded-md px-2 py-0.5">{parking.availableSlots} slots</span>
        {parking.parkingType ? (
          <span className="app-pill rounded-md px-2 py-0.5 capitalize">{parking.parkingType}</span>
        ) : null}
        {parking.distance != null ? (
          <span className="app-pill rounded-md px-2 py-0.5">
            {(parking.distance / 1000).toFixed(1)} km
          </span>
        ) : null}
      </div>

      <div className="mt-3 grid gap-2">
        {/* Get directions button */}
        {onGetDirections ? (
          <button
            className={`inline-flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition ${
              isSelected
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'border hover:bg-slate-100'
            }`}
            style={isSelected ? {} : { borderColor: 'var(--app-border-strong)', color: 'var(--app-text)' }}
            onClick={() => onGetDirections(parking)}
            type="button"
          >
            <Navigation className="h-3.5 w-3.5" aria-hidden="true" />
            {isSelected ? 'Clear route' : 'Get directions'}
          </button>
        ) : null}

        <Link
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold hover:bg-slate-100"
          style={{ borderColor: 'var(--app-border-strong)', color: 'var(--app-text)' }}
          to={`/parkings/${parking.id}`}
        >
          View details
        </Link>
      </div>
    </article>
  );
}
