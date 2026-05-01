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

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ExternalLink, LocateFixed, MapPin, Navigation, RefreshCw, Route, Search, X } from 'lucide-react';
import { getNearbyParking } from '../features/map/mapService.js';
import { getSmartParking } from '../features/map/mapSmartService.js';
import { getNearbyLandmarks } from '../features/map/landmarkService.js';
import { buildGoogleMapsUrl, getRoute } from '../features/map/routeService.js';
import { MapView } from '../features/map/MapView.jsx';
import { RecommendedParkingPanel } from '../features/map/RecommendedParkingPanel.jsx';
import { LandmarksPanel } from '../features/map/LandmarksPanel.jsx';
import { getApiErrorMessage } from '../lib/getApiErrorMessage.js';

// Default fallback location — centre of India
const FALLBACK_CENTER = { lat: 20.5937, lng: 78.9629 };
const DEFAULT_RADIUS_KM = 5;

export function MapPage() {
  // ── State ────────────────────────────────────────────────────────────────
  const [center, setCenter] = useState(FALLBACK_CENTER); // always start at fallback
  const [parkings, setParkings] = useState([]);         // markers to render
  const [radiusKm, setRadiusKm] = useState(DEFAULT_RADIUS_KM);
  const [manualLat, setManualLat] = useState('');       // manual input fields
  const [manualLng, setManualLng] = useState('');
  const [manualLatError, setManualLatError] = useState('');  // T4: inline hints
  const [manualLngError, setManualLngError] = useState('');
  const [locationStatus, setLocationStatus] = useState('idle');
  // 'idle' | 'requesting' | 'granted' | 'denied' | 'unavailable'
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const hasMounted = useRef(false);
  const radiusDebounceRef = useRef(null);  // T5: debounce radius changes
  // Stores the confirmed GPS position independently of the map centre.
  // center can be moved (deep-link, manual search) without corrupting routing.
  const userLocationRef = useRef(null);

  // ── Query-param deep-link (from "View on Map" on detail page) ────────────
  // Parsed once on mount. useMemo with [] guarantees a single evaluation
  // and keeps the value inside the hook flow (no render-body side effects).
  const [searchParams] = useSearchParams();
  const deepLink = useMemo(() => {
    const qLat = parseFloat(searchParams.get('lat') ?? '');
    const qLng = parseFloat(searchParams.get('lng') ?? '');
    const qId  = searchParams.get('id')?.trim() ?? '';
    const valid =
      !isNaN(qLat) && qLat >= -90 && qLat <= 90 &&
      !isNaN(qLng) && qLng >= -180 && qLng <= 180;
    return valid ? { lat: qLat, lng: qLng, id: qId } : null;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally empty — read params once at mount, never re-parse

  // Zoom level — elevated when arriving from a deep-link
  const [mapZoom] = useState(deepLink ? 16 : 13);

  // ── Routing state ────────────────────────────────────────────────────────
  // selectedParking — the parking the user clicked "Get directions" on
  // routeData       — { polyline, distanceKm, durationMin } from routeService
  // isRouting       — true while the route API call is in flight
  // routeError      — non-fatal: shown in the route panel, does not clear map
  const [selectedParking, setSelectedParking] = useState(null);
  const [routeData, setRouteData] = useState(null);
  const [isRouting, setIsRouting] = useState(false);
  const [routeError, setRouteError] = useState('');

  // ── Phase 7C state ───────────────────────────────────────────────────────
  const [recommendations, setRecommendations] = useState([]);
  const [isLoadingRecs, setIsLoadingRecs] = useState(false);
  const [recsError, setRecsError] = useState('');
  const [recsUsingFallback, setRecsUsingFallback] = useState(false);

  const [landmarks, setLandmarks] = useState([]);
  const [isLoadingLandmarks, setIsLoadingLandmarks] = useState(false);
  const [landmarksError, setLandmarksError] = useState('');

  // ── Fetch nearby parkings ────────────────────────────────────────────────
  const loadNearby = useCallback(async (lat, lng, km = radiusKm) => {
    setError('');
    setIsLoading(true);

    // Expand radius automatically if no results — max 2 retries
    const radiiToTry = [km, 10, 20].filter((r, i, arr) => arr.indexOf(r) === i); // dedupe

    try {
      let results = [];
      let usedRadius = km;

      for (const radius of radiiToTry) {
        results = await getNearbyParking(lat, lng, radius);
        usedRadius = radius;
        if (results.length > 0) break;
      }

      setParkings(results);

      if (results.length === 0) {
        setError(`No approved parking found within ${radiiToTry.at(-1)} km. Try a different location.`);
      } else if (usedRadius > km) {
        setError(`No parking within ${km} km. Showing results within ${usedRadius} km.`);
      }
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Unable to load nearby parking. Please try again.'));
      setParkings([]);
    } finally {
      setIsLoading(false);
    }
  }, [radiusKm]);

  // ── Phase 7C: Fetch smart recommendations ───────────────────────────────
  const loadSmartRecommendations = useCallback(async (lat, lng, usingFallback = false) => {
    setIsLoadingRecs(true);
    setRecsError('');
    setRecsUsingFallback(usingFallback);
    try {
      const recs = await getSmartParking(lat, lng);
      setRecommendations(Array.isArray(recs) ? recs : []);
    } catch {
      setRecsError('Smart recommendations unavailable right now.');
      setRecommendations([]);
    } finally {
      setIsLoadingRecs(false);
    }
  }, []);

  // ── Geolocation ──────────────────────────────────────────────────────────
  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      // No geolocation support — load using fallback silently
      console.warn('[SmartPark] Geolocation not supported, using fallback location.');
      setLocationStatus('unavailable');
      loadNearby(FALLBACK_CENTER.lat, FALLBACK_CENTER.lng);
      loadSmartRecommendations(FALLBACK_CENTER.lat, FALLBACK_CENTER.lng, true);
      return;
    }

    setLocationStatus('requesting');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        userLocationRef.current = { lat, lng }; // real GPS — used as route origin
        setLocationStatus('granted');
        setCenter({ lat, lng });
        setManualLat(String(lat.toFixed(6)));
        setManualLng(String(lng.toFixed(6)));
        loadNearby(lat, lng);
        loadSmartRecommendations(lat, lng);
      },
      (geolocationError) => {
        // Location failed — load using fallback silently, no error shown to user
        console.warn('[SmartPark] Geolocation failed, using fallback location.', geolocationError.message);
        setLocationStatus('denied');
        // center is already FALLBACK_CENTER from initial state
        loadNearby(FALLBACK_CENTER.lat, FALLBACK_CENTER.lng);
        loadSmartRecommendations(FALLBACK_CENTER.lat, FALLBACK_CENTER.lng, true);
      },
      // Safe options — no watchPosition, fast timeout, allow cached
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 }
    );
  }, [loadNearby, loadSmartRecommendations]);

  // Auto-request location on first mount.
  // Deep-link path: centre on the linked parking immediately and load nearby
  // around it. Also silently attempt GPS so userLocationRef gets populated
  // and routing becomes available — but only update center/data if GPS
  // succeeds (handled inside requestLocation's success callback).
  // Normal path: request GPS, load nearby on success/failure.
  useEffect(() => {
    if (hasMounted.current) return;
    hasMounted.current = true;

    if (deepLink) {
      setCenter({ lat: deepLink.lat, lng: deepLink.lng });
      loadNearby(deepLink.lat, deepLink.lng, radiusKm);
      loadSmartRecommendations(deepLink.lat, deepLink.lng);
      // Attempt GPS in background — populates userLocationRef for routing.
      // requestLocation will also call loadNearby/loadSmartRecommendations
      // with the real GPS coords if granted, which is the desired behaviour
      // (re-centres map on the user and refreshes results).
      requestLocation();
    } else {
      requestLocation();
    }
  }, [requestLocation, loadNearby, loadSmartRecommendations, radiusKm, deepLink]);

  // Auto-select the deep-linked parking once nearby results have loaded.
  // Runs whenever `parkings` changes — exits immediately when no deep-link id.
  useEffect(() => {
    if (!deepLink?.id || parkings.length === 0) return;

    const target = parkings.find((p) => p.id === deepLink.id);
    if (target && selectedParking?.id !== target.id) {
      handleSelectParking(target);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parkings]); // intentionally omit handleSelectParking — stable function ref

  // ── Manual search ────────────────────────────────────────────────────────
  function handleManualSearch(event) {
    event.preventDefault();

    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);

    // T4: inline validation — set field-level hints, do not call API
    const latErr = (!manualLat.trim() || isNaN(lat) || lat < -90 || lat > 90)
      ? 'Enter a valid latitude (−90 to 90).'
      : '';
    const lngErr = (!manualLng.trim() || isNaN(lng) || lng < -180 || lng > 180)
      ? 'Enter a valid longitude (−180 to 180).'
      : '';

    setManualLatError(latErr);
    setManualLngError(lngErr);

    if (latErr || lngErr) return;

    setCenter({ lat, lng });
    loadNearby(lat, lng, radiusKm);
    loadSmartRecommendations(lat, lng);
  }

  // ── Derived UI state ─────────────────────────────────────────────────────
  const mapCenter = center; // always defined — starts at FALLBACK_CENTER
  const showManualForm = locationStatus === 'denied' || locationStatus === 'unavailable';

  // T5: debounced radius change — prevents rapid-fire API calls when user
  // clicks the select multiple times quickly
  function handleRadiusChange(km) {
    setRadiusKm(km);
    clearTimeout(radiusDebounceRef.current);
    radiusDebounceRef.current = setTimeout(() => {
      loadNearby(center.lat, center.lng, km);
    }, 400);
  }

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

    // Phase 7C: fetch landmarks for the selected parking
    setLandmarks([]);
    setLandmarksError('');
    setIsLoadingLandmarks(true);
    getNearbyLandmarks(parking.latitude, parking.longitude)
      .then((results) => setLandmarks(Array.isArray(results) ? results : []))
      .catch(() => setLandmarks([]))   // silent failure — panel shows empty state
      .finally(() => setIsLoadingLandmarks(false));

    // Route origin: always the real GPS position, never the map centre.
    // This prevents deep-link arrivals from producing a 0 km route.
    const origin = userLocationRef.current;

    if (!origin) {
      setRouteError(
        'Enable location to get directions. Click "Use my location" above, or open in Google Maps.'
      );
      return;
    }

    // Guard: origin and destination are the same point — no route needed
    const isSameLocation =
      Math.abs(origin.lat - parking.latitude)  < 0.0001 &&
      Math.abs(origin.lng - parking.longitude) < 0.0001;

    if (isSameLocation) {
      setRouteError('You are already at this location.');
      return;
    }

    setIsRouting(true);

    try {
      const result = await getRoute(
        { lat: origin.lat, lng: origin.lng },
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
    setLandmarks([]);
    setLandmarksError('');
  }

  /** Open the selected parking's destination in Google Maps */
  function openInGoogleMaps() {
    if (!selectedParking) return;
    const url = buildGoogleMapsUrl(
      { lat: selectedParking.latitude, lng: selectedParking.longitude },
      userLocationRef.current  // null when GPS was never granted — Google Maps handles it
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
            onChange={(e) => handleRadiusChange(Number(e.target.value))}
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
              className={`app-input text-sm ${manualLatError ? 'border-red-400' : ''}`}
              onChange={(e) => { setManualLat(e.target.value); setManualLatError(''); }}
              placeholder="e.g. 19.0596"
              type="number"
              step="any"
              value={manualLat}
            />
            {manualLatError ? (
              <span className="text-xs text-red-500">{manualLatError}</span>
            ) : null}
          </label>
          <label className="grid gap-1 text-sm font-medium" style={{ color: 'var(--app-text-muted)' }}>
            Longitude
            <input
              className={`app-input text-sm ${manualLngError ? 'border-red-400' : ''}`}
              onChange={(e) => { setManualLng(e.target.value); setManualLngError(''); }}
              placeholder="e.g. 72.8656"
              type="number"
              step="any"
              value={manualLng}
            />
            {manualLngError ? (
              <span className="text-xs text-red-500">{manualLngError}</span>
            ) : null}
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
      {/* Removed: was only shown when center was null, which can no longer happen */}

      {/* ── Phase 7C: Smart Recommendations ────────────────────────────── */}
      <RecommendedParkingPanel
        recommendations={recommendations}
        isLoading={isLoadingRecs}
        error={recsError}
        onSelect={handleSelectParking}
        selectedParking={selectedParking}
        usingFallback={recsUsingFallback}
      />

      {/* ── Main layout: map + sidebar ───────────────────────────────────── */}
      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">

        {/* Map — takes up the left column */}
        <div style={{ height: '560px' }}>
          <MapView
            center={mapCenter}
            parkings={parkings}
            zoom={mapZoom}
            routeData={routeData}
            userLocation={center}
            onSelectParking={handleSelectParking}
            selectedParking={selectedParking}
            recommendedParkings={recommendations}
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

          {/* ── Phase 7C: Landmarks for selected parking ──────────────── */}
          {selectedParking ? (
            <LandmarksPanel
              landmarks={landmarks}
              isLoading={isLoadingLandmarks}
              error={landmarksError}
              parkingName={selectedParking.title}
              userLocation={center}
            />
          ) : null}

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
              <p className="app-heading mt-3 font-semibold">No parking found nearby</p>
              <p className="app-copy mt-2 text-sm">
                Try increasing the search radius or searching another area.
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
