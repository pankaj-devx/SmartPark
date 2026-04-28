import { useCallback, useEffect, useState } from 'react';
import { MapPin, Search } from 'lucide-react';
import { getApiErrorMessage } from '../../lib/getApiErrorMessage.js';
import { fetchPublicParkings } from './parkingApi.js';

const initialFilters = {
  search: '',
  city: '',
  vehicleType: '',
  sort: 'newest'
};

export function ParkingListPage() {
  const [filters, setFilters] = useState(initialFilters);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [parkings, setParkings] = useState([]);

  const loadParkings = useCallback(async (nextFilters = {}) => {
    setError('');
    setIsLoading(true);

    try {
      const params = Object.fromEntries(Object.entries(nextFilters).filter(([, value]) => value));
      const data = await fetchPublicParkings(params);
      setParkings(data.parkings);
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Unable to load parking listings'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    Promise.resolve().then(() => loadParkings(initialFilters));
  }, [loadParkings]);

  function updateFilter(event) {
    setFilters((current) => ({
      ...current,
      [event.target.name]: event.target.value
    }));
  }

  function handleSearch(event) {
    event.preventDefault();
    loadParkings(filters);
  }

  return (
    <section className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-950">Approved parking spaces</h1>
          <p className="mt-2 text-slate-600">Drivers only see active listings approved by an admin.</p>
        </div>
      </div>

      <form className="mb-6 grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[1fr_1fr_160px_140px_auto]" onSubmit={handleSearch}>
        <input className="rounded-md border border-slate-300 px-3 py-2" name="search" onChange={updateFilter} placeholder="Search" value={filters.search} />
        <input className="rounded-md border border-slate-300 px-3 py-2" name="city" onChange={updateFilter} placeholder="City" value={filters.city} />
        <select className="rounded-md border border-slate-300 px-3 py-2" name="vehicleType" onChange={updateFilter} value={filters.vehicleType}>
          <option value="">Any vehicle</option>
          <option value="2-wheeler">2-wheeler</option>
          <option value="4-wheeler">4-wheeler</option>
        </select>
        <select className="rounded-md border border-slate-300 px-3 py-2" name="sort" onChange={updateFilter} value={filters.sort}>
          <option value="newest">Newest</option>
          <option value="price_asc">Price low</option>
          <option value="price_desc">Price high</option>
        </select>
        <button className="inline-flex items-center justify-center gap-2 rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700" type="submit">
          <Search className="h-4 w-4" aria-hidden="true" />
          Search
        </button>
      </form>

      {error ? <p className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
      {isLoading ? <p className="text-sm text-slate-600">Loading parking listings...</p> : null}

      <div className="grid gap-4 md:grid-cols-2">
        {parkings.map((parking) => (
          <article key={parking.id} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">{parking.title}</h2>
                <p className="mt-2 flex items-center gap-1 text-sm text-slate-600">
                  <MapPin className="h-4 w-4" aria-hidden="true" />
                  {parking.city}, {parking.state}
                </p>
              </div>
              <p className="shrink-0 rounded-md bg-brand-50 px-3 py-1 text-sm font-semibold text-brand-700">Rs {parking.hourlyPrice}/hr</p>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-600">{parking.description}</p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-600">
              <span className="rounded-md bg-slate-100 px-2 py-1">{parking.availableSlots} slots</span>
              {parking.vehicleTypes.map((type) => (
                <span key={type} className="rounded-md bg-slate-100 px-2 py-1">
                  {type}
                </span>
              ))}
            </div>
          </article>
        ))}
      </div>

      {!isLoading && parkings.length === 0 ? <p className="rounded-md border border-slate-200 bg-white p-6 text-slate-600">No approved parking listings found.</p> : null}
    </section>
  );
}
