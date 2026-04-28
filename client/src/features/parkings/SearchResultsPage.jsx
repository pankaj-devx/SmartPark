import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { BadgeCheck, Bookmark, BookmarkCheck, Camera, Car, MapPin, Navigation, Search, Shield, Zap } from 'lucide-react';
import { isSavedParking, recordRecentSearch, toggleSavedParking } from '../account/accountExperience.js';
import { getApiErrorMessage } from '../../lib/getApiErrorMessage.js';
import { fetchNearbyParkings, fetchPublicParkings } from './parkingApi.js';
import { filtersFromSearchParams, filtersToSearchParams, initialDiscoveryFilters, toApiParams } from './discoveryFilters.js';
import { FilterSidebar } from './FilterSidebar.jsx';
import { NearbyMapView } from './NearbyMapView.jsx';
import { SearchBar } from './SearchBar.jsx';
import { useAuth } from '../auth/useAuth.js';
import { AuthModal } from '../auth/AuthModal.jsx';

export function SearchResultsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlFilters = useMemo(() => filtersFromSearchParams(searchParams), [searchParams]);
  const [draftFilters, setDraftFilters] = useState(() => ({
    sourceKey: searchParams.toString(),
    values: urlFilters
  }));
  const [parkings, setParkings] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [lastRequestKey, setLastRequestKey] = useState('');
  const [authModalConfig, setAuthModalConfig] = useState({ isOpen: false, pendingAction: null, title: '' });
  const { isAuthenticated } = useAuth();
  const searchParamsKey = searchParams.toString();
  const filters = draftFilters.sourceKey === searchParamsKey ? draftFilters.values : urlFilters;

  const activeChips = useMemo(() => buildChips(filters), [filters]);

  const loadParkings = useCallback(async (nextFilters) => {
    const params = toApiParams(nextFilters);
    const requestKey = JSON.stringify(params);

    if (requestKey === lastRequestKey) {
      return;
    }

    setLastRequestKey(requestKey);
    setError('');
    setIsLoading(true);

    try {
      const hasLocation = params.lat && params.lng;
      const data = hasLocation ? await fetchNearbyParkings(params) : await fetchPublicParkings(params);
      setParkings(data.parkings);
      setPagination(data.pagination);
      recordRecentSearch({
        label: buildSearchLabel(nextFilters)
      });
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Unable to load parking listings'));
    } finally {
      setIsLoading(false);
    }
  }, [lastRequestKey]);

  useEffect(() => {
    Promise.resolve().then(() => loadParkings(urlFilters));
  }, [loadParkings, urlFilters]);

  function patchFilters(patch) {
    setDraftFilters({
      sourceKey: searchParamsKey,
      values: {
        ...filters,
        ...patch
      }
    });
  }

  function submitSearch(eventOrPatch) {
    if (eventOrPatch?.preventDefault) {
      eventOrPatch.preventDefault();
      setSearchParams(buildSearchParams(filters));
      return;
    }

    const nextFilters = { ...filters, ...eventOrPatch };
    setSearchParams(buildSearchParams(nextFilters));
  }

  function useBrowserLocation() {
    if (!navigator.geolocation) {
      setError('Location services are not available in this browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextFilters = {
          ...filters,
          lat: String(position.coords.latitude),
          lng: String(position.coords.longitude),
          sort: 'nearest'
        };
        setSearchParams(buildSearchParams(nextFilters));
      },
      () => setError('Unable to read your location. You can enter latitude and longitude manually.')
    );
  }

  function handleAuthSuccess() {
    if (authModalConfig.pendingAction) {
      authModalConfig.pendingAction();
    }
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-8">
      <AuthModal 
        isOpen={authModalConfig.isOpen} 
        onClose={() => setAuthModalConfig({ isOpen: false, pendingAction: null, title: '' })} 
        onSuccess={handleAuthSuccess}
        title={authModalConfig.title}
      />

      <div className="mb-6 grid gap-4 lg:grid-cols-[1fr_220px] lg:items-end">
        <div>
          <p className="text-sm font-medium uppercase text-brand-700">Discovery</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-950">Find an approved parking space</h1>
        </div>
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Sort
          <select className="rounded-md border border-slate-300 px-3 py-2" name="sort" onChange={(event) => patchFilters({ sort: event.target.value })} value={filters.sort}>
            <option value="relevance">Best match</option>
            <option value="nearest">Nearest</option>
            <option value="cheapest">Cheapest</option>
            <option value="highest_availability">Highest availability</option>
            <option value="newest">Newest</option>
          </select>
        </label>
      </div>

      <div className="mb-4 grid gap-3 lg:grid-cols-[1fr_auto_auto_auto]">
        <SearchBar onChange={(search) => patchFilters({ search })} onSearch={submitSearch} value={filters.search} />
        <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" onChange={(event) => patchFilters({ lat: event.target.value })} placeholder="Lat" value={filters.lat} />
        <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" onChange={(event) => patchFilters({ lng: event.target.value })} placeholder="Lng" value={filters.lng} />
        <button className="inline-flex items-center justify-center gap-2 rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700" onClick={() => setSearchParams(buildSearchParams(filters))} type="button">
          <Search className="h-4 w-4" aria-hidden="true" />
          Search
        </button>
      </div>

      <div className="mb-4 grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-3">
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Date
          <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" onChange={(event) => patchFilters({ date: event.target.value })} type="date" value={filters.date} />
        </label>
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Start
          <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" onChange={(event) => patchFilters({ startTime: event.target.value })} type="time" value={filters.startTime} />
        </label>
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          End
          <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" onChange={(event) => patchFilters({ endTime: event.target.value })} type="time" value={filters.endTime} />
        </label>
      </div>

      {activeChips.length > 0 ? (
        <div className="mb-5 flex flex-wrap gap-2">
          {activeChips.map((chip) => (
            <span className="rounded-md bg-slate-200 px-3 py-1 text-xs font-medium text-slate-700" key={chip}>
              {chip}
            </span>
          ))}
        </div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
          <FilterSidebar filters={filters} onChange={patchFilters} onReset={() => setSearchParams(buildSearchParams(initialDiscoveryFilters))} />
          <div className="grid gap-5">
            <NearbyMapView center={{ lat: filters.lat, lng: filters.lng }} onUseLocation={useBrowserLocation} parkings={parkings} />

          {error ? <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
          {isLoading ? <LoadingSkeleton /> : null}

          {!isLoading && parkings.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {parkings.map((parking) => (
                <ParkingResultCard 
                  bookingParams={getBookingParams(filters)} 
                  key={parking.id} 
                  parking={parking} 
                  isAuthenticated={isAuthenticated}
                  setAuthModalConfig={setAuthModalConfig}
                />
              ))}
            </div>
          ) : null}

          {!isLoading && parkings.length === 0 ? (
            <div className="rounded-lg border border-slate-200 bg-white p-8 text-center">
              <Navigation className="mx-auto h-8 w-8 text-slate-400" aria-hidden="true" />
              <h2 className="mt-3 text-lg font-semibold text-slate-950">No approved spaces match</h2>
              <p className="mt-2 text-sm text-slate-600">Try widening the radius, clearing amenities, or searching a nearby area.</p>
            </div>
          ) : null}

          {pagination ? (
            <p className="text-sm text-slate-500">
              Showing page {pagination.page} of {Math.max(pagination.pages, 1)} ({pagination.total} results)
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function ParkingResultCard({ bookingParams, parking, isAuthenticated, setAuthModalConfig }) {
  const detailSearch = new URLSearchParams(bookingParams).toString();
  const detailPath = detailSearch ? `/parkings/${parking.id}?${detailSearch}` : `/parkings/${parking.id}`;
  const reservePath = buildDiscoveryReservePath(parking.id, bookingParams);
  const [isSaved, setIsSaved] = useState(() => isSavedParking(parking.id));

  function handleToggleSaved() {
    if (!isAuthenticated) {
      setAuthModalConfig({
        isOpen: true,
        title: 'Sign in to save parking',
        pendingAction: () => {
          toggleSavedParking(parking);
          setIsSaved(true);
        }
      });
      return;
    }

    toggleSavedParking(parking);
    setIsSaved((current) => !current);
  }

  return (
    <article className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="relative bg-slate-100">
        {parking.coverImage ? (
          <img alt={parking.coverImage.caption || parking.title} className="aspect-video w-full object-cover" src={parking.coverImage.url} />
        ) : (
          <div className="grid aspect-video place-items-center text-slate-400">
            <Camera className="h-8 w-8" aria-hidden="true" />
          </div>
        )}
        <p className="absolute right-3 top-3 rounded-md bg-white/95 px-3 py-1 text-sm font-semibold text-brand-700 shadow-sm">Rs {parking.hourlyPrice}/hr</p>
      </div>
      <div className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">{parking.title}</h2>
          <p className="mt-2 flex items-center gap-1 text-sm text-slate-600">
            <MapPin className="h-4 w-4" aria-hidden="true" />
            {[parking.area, parking.city, parking.state].filter(Boolean).join(', ')}
          </p>
        </div>
        <button aria-label={isSaved ? 'Remove saved parking' : 'Save parking'} className="rounded-md border border-slate-300 p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-950" onClick={handleToggleSaved} type="button">
          {isSaved ? <BookmarkCheck className="h-4 w-4 text-brand-700" aria-hidden="true" /> : <Bookmark className="h-4 w-4" aria-hidden="true" />}
        </button>
      </div>
      <p className="mt-4 line-clamp-3 text-sm leading-6 text-slate-600">{parking.description}</p>
      <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-600">
        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 font-medium text-emerald-700">
          <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
          {parking.availableSlots} slots
        </span>
        {parking.distance ? <span className="rounded-md bg-slate-100 px-2 py-1">{(parking.distance / 1000).toFixed(1)} km</span> : null}
        {parking.vehicleTypes.map((type) => (
          <span key={type} className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1">
            <Car className="h-3.5 w-3.5" aria-hidden="true" />
            {type}
          </span>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
        {parking.amenities.slice(0, 4).map((amenity) => (
          <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1" key={amenity}>
            {amenity === 'ev charging' ? <Zap className="h-3.5 w-3.5" aria-hidden="true" /> : <Shield className="h-3.5 w-3.5" aria-hidden="true" />}
            {amenity}
          </span>
        ))}
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <Link className="inline-flex rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-100" to={detailPath}>
          View details
        </Link>
        <Link className="inline-flex rounded-md bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700" to={reservePath}>
          Reserve preview
        </Link>
      </div>
      </div>
    </article>
  );
}

function getBookingParams(filters) {
  return Object.fromEntries(
    Object.entries({
      date: filters.date,
      startTime: filters.startTime,
      endTime: filters.endTime
    }).filter(([, value]) => value)
  );
}

function LoadingSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {[0, 1, 2, 3].map((item) => (
        <div className="animate-pulse rounded-lg border border-slate-200 bg-white p-5" key={item}>
          <div className="h-5 w-2/3 rounded bg-slate-200" />
          <div className="mt-4 h-4 w-1/2 rounded bg-slate-200" />
          <div className="mt-5 h-16 rounded bg-slate-100" />
        </div>
      ))}
    </div>
  );
}

function buildChips(filters) {
  return [
    filters.city,
    filters.area,
    filters.vehicleType,
    filters.parkingType,
    filters.availableOnly ? 'available now' : '',
    filters.openNow ? 'open now' : '',
    filters.isOpen24x7 ? '24x7' : '',
    ...filters.amenities
  ].filter(Boolean);
}

function buildSearchLabel(filters) {
  return filters.search || [filters.area, filters.city, filters.state].filter(Boolean).join(', ') || 'Parking discovery';
}

function buildSearchParams(filters) {
  return filtersToSearchParams(filters);
}

function buildDiscoveryReservePath(parkingId, bookingParams) {
  const params = new URLSearchParams({
    ...bookingParams,
    intent: 'reserve'
  });

  return `/parkings/${parkingId}?${params.toString()}`;
}
