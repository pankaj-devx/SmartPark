import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BadgeCheck, Camera, Car, MapPin, Navigation, Search, Shield, Zap } from 'lucide-react';
import { getApiErrorMessage } from '../../lib/getApiErrorMessage.js';
import { fetchNearbyParkings, fetchPublicParkings } from './parkingApi.js';
import { FilterSidebar } from './FilterSidebar.jsx';
import { NearbyMapView } from './NearbyMapView.jsx';
import { SearchBar } from './SearchBar.jsx';

const initialFilters = {
  search: '',
  state: '',
  district: '',
  city: '',
  area: '',
  vehicleType: '',
  parkingType: '',
  minPrice: '',
  maxPrice: '',
  amenities: [],
  availableOnly: true,
  openNow: false,
  isOpen24x7: false,
  sort: 'relevance',
  lat: '',
  lng: '',
  radiusKm: '5'
};

export function SearchResultsPage() {
  const [filters, setFilters] = useState(initialFilters);
  const [parkings, setParkings] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const activeChips = useMemo(() => buildChips(filters), [filters]);

  const loadParkings = useCallback(async (nextFilters) => {
    setError('');
    setIsLoading(true);

    try {
      const params = toParams(nextFilters);
      const hasLocation = params.lat && params.lng;
      const data = hasLocation ? await fetchNearbyParkings(params) : await fetchPublicParkings(params);
      setParkings(data.parkings);
      setPagination(data.pagination);
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Unable to load parking listings'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    Promise.resolve().then(() => loadParkings(initialFilters));
  }, [loadParkings]);

  function patchFilters(patch) {
    setFilters((current) => ({
      ...current,
      ...patch
    }));
  }

  function submitSearch(eventOrPatch) {
    if (eventOrPatch?.preventDefault) {
      eventOrPatch.preventDefault();
      loadParkings(filters);
      return;
    }

    const nextFilters = { ...filters, ...eventOrPatch };
    setFilters(nextFilters);
    loadParkings(nextFilters);
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
        setFilters(nextFilters);
        loadParkings(nextFilters);
      },
      () => setError('Unable to read your location. You can enter latitude and longitude manually.')
    );
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-8">
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
        <button className="inline-flex items-center justify-center gap-2 rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700" onClick={() => loadParkings(filters)} type="button">
          <Search className="h-4 w-4" aria-hidden="true" />
          Search
        </button>
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
        <FilterSidebar filters={filters} onChange={patchFilters} onReset={() => setFilters(initialFilters)} />
        <div className="grid gap-5">
          <NearbyMapView center={{ lat: filters.lat, lng: filters.lng }} onUseLocation={useBrowserLocation} parkings={parkings} />

          {error ? <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
          {isLoading ? <LoadingSkeleton /> : null}

          {!isLoading && parkings.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {parkings.map((parking) => (
                <ParkingResultCard key={parking.id} parking={parking} />
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

function ParkingResultCard({ parking }) {
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
      <Link className="mt-5 inline-flex rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-100" to={`/parkings/${parking.id}`}>
        View details
      </Link>
      </div>
    </article>
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

function toParams(filters) {
  return Object.fromEntries(
    Object.entries({
      ...filters,
      amenities: filters.amenities.join(',')
    }).filter(([, value]) => {
      if (Array.isArray(value)) {
        return value.length > 0;
      }

      return value !== '' && value !== false && value !== null && value !== undefined;
    })
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
