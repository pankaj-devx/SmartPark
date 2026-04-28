import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Bookmark,
  Camera,
  MapPin,
  Navigation,
  Search,
  ShieldCheck,
  Sparkles,
  Store,
  Timer
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import {
  getRecentSearches,
  getRecentlyViewedParkings
} from '../features/account/accountExperience.js';
import { fetchNearbyParkings, fetchPublicParkings } from '../features/parkings/parkingApi.js';
import { buildDiscoveryPath } from '../features/parkings/discoveryFilters.js';
import { SearchBar } from '../features/parkings/SearchBar.jsx';

const trendingSearches = [
  { label: 'Downtown', filters: { search: 'Downtown' } },
  { label: 'Airport', filters: { search: 'Airport' } },
  { label: 'Stadium', filters: { search: 'Stadium' } },
  { label: 'Business District', filters: { search: 'Business District' } }
];

const howItWorks = [
  {
    icon: Search,
    title: 'Search live inventory',
    text: 'Look by city, area, landmark, or listing name and refine by time when you need a guaranteed window.'
  },
  {
    icon: Timer,
    title: 'Preview your reservation',
    text: 'Open a listing, choose your date and time, and review the booking estimate before you commit.'
  },
  {
    icon: ShieldCheck,
    title: 'Sign in only at checkout',
    text: 'Guests can explore freely. Authentication shows up only when it is time to save or complete a reservation.'
  }
];

const quickActions = [
  {
    icon: Navigation,
    title: 'Find parking nearby',
    description: 'Open map-first discovery around your current location.',
    actionLabel: 'Use my location',
    type: 'nearby'
  },
  {
    icon: Search,
    title: 'Browse all spaces',
    description: 'Jump into the full approved inventory with filters and map discovery.',
    actionLabel: 'View all spaces',
    to: '/parkings'
  },
  {
    icon: Store,
    title: 'List your space',
    description: 'Start owner onboarding and create a host account built for parking operations.',
    actionLabel: 'Become an owner',
    to: '/register?role=owner'
  },
  {
    icon: Bookmark,
    title: 'Create an account',
    description: 'Save favorites, keep booking history, and complete reservations faster.',
    actionLabel: 'Create account',
    to: '/register'
  }
];

export function HomePage() {
  const navigate = useNavigate();
  const [searchValue, setSearchValue] = useState('');
  const [featuredParkings, setFeaturedParkings] = useState([]);
  const [nearbyParkings, setNearbyParkings] = useState([]);
  const [recentSearches] = useState(() => getRecentSearches());
  const [recentlyViewed] = useState(() => getRecentlyViewedParkings());
  const [heroError, setHeroError] = useState('');
  const [isFeaturedLoading, setIsFeaturedLoading] = useState(true);
  const [isNearbyLoading, setIsNearbyLoading] = useState(false);
  const [locationFilters, setLocationFilters] = useState(null);

  useEffect(() => {
    async function loadHome() {
      setIsFeaturedLoading(true);

      try {
        const response = await fetchPublicParkings({ sort: 'relevance', limit: 6 });
        setFeaturedParkings(Array.isArray(response?.parkings) ? response.parkings : []);
      } catch {
        setFeaturedParkings([]);
      } finally {
        setIsFeaturedLoading(false);
      }
    }

    loadHome();
  }, []);

  const continueExploringItems = useMemo(
    () => [
      ...recentSearches.slice(0, 2).map((searchItem) => ({
        id: `search-${searchItem.label}`,
        eyebrow: 'Recent search',
        title: searchItem.label,
        description: searchItem.createdAt ? new Date(searchItem.createdAt).toLocaleString() : 'Resume this search',
        to: buildDiscoveryPath({ search: searchItem.label })
      })),
      ...recentlyViewed.slice(0, 2).map((parking) => ({
        id: `parking-${parking.id}`,
        eyebrow: 'Recently viewed',
        title: parking.title,
        description: [parking.area, parking.city, parking.state].filter(Boolean).join(', ') || 'Open listing again',
        to: `/parkings/${parking.id}`
      }))
    ],
    [recentSearches, recentlyViewed]
  );

  function navigateToSearch(patch = {}) {
    navigate(buildDiscoveryPath(patch));
  }

  function handleSearch(search) {
    const nextSearch = search?.search ?? searchValue.trim();
    navigateToSearch(nextSearch ? { search: nextSearch } : {});
  }

  function requestLocation(onSuccess) {
    setHeroError('');

    if (!navigator.geolocation) {
      setHeroError('Location services are not available in this browser.');
      setIsNearbyLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextFilters = {
          lat: String(position.coords.latitude),
          lng: String(position.coords.longitude),
          radiusKm: '5',
          sort: 'nearest'
        };

        setLocationFilters(nextFilters);
        onSuccess(nextFilters);
      },
      () => {
        setHeroError('Unable to read your location. Try searching by city or area instead.');
        setIsNearbyLoading(false);
      }
    );
  }

  function handleFindNearby() {
    requestLocation((nextFilters) => {
      navigateToSearch(nextFilters);
    });
  }

  function loadNearbyRecommendations() {
    setIsNearbyLoading(true);
    requestLocation(async (nextFilters) => {
      try {
        const response = await fetchNearbyParkings(nextFilters);
        setNearbyParkings(Array.isArray(response?.parkings) ? response.parkings.slice(0, 4) : []);
      } catch {
        setNearbyParkings([]);
      } finally {
        setIsNearbyLoading(false);
      }
    });
  }

  return (
    <div className="flex flex-col gap-10 pb-16">
      <section className="overflow-hidden bg-slate-950 px-4 py-16 text-white sm:py-24">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white/90">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              Guest discovery dashboard
            </p>
            <h1 className="mt-5 max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl">
              Find the right parking space before you ever hit a login wall
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-300">
              Explore live inventory, preview booking details, and move from discovery to reservation with a guest-first flow that stays fast.
            </p>

            <div className="mt-8 rounded-3xl bg-white p-3 shadow-2xl">
              <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto]">
                <SearchBar
                  value={searchValue}
                  onChange={setSearchValue}
                  onSearch={(eventOrPatch) => {
                    if (eventOrPatch?.preventDefault) {
                      eventOrPatch.preventDefault();
                    }
                    handleSearch(eventOrPatch);
                  }}
                />
                <button
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-brand-600 px-5 text-sm font-semibold text-white hover:bg-brand-700"
                  onClick={(event) => {
                    event.preventDefault();
                    handleSearch();
                  }}
                  type="button"
                >
                  <Search className="h-4 w-4" aria-hidden="true" />
                  Search
                </button>
                <button
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 px-5 text-sm font-semibold text-slate-900 hover:bg-slate-50"
                  onClick={handleFindNearby}
                  type="button"
                >
                  <Navigation className="h-4 w-4" aria-hidden="true" />
                  Find nearby
                </button>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                <span className="font-medium text-slate-700">Trending:</span>
                {trendingSearches.map((item) => (
                  <button
                    className="rounded-full border border-slate-200 px-3 py-1 font-medium text-slate-700 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
                    key={item.label}
                    onClick={() => navigateToSearch(item.filters)}
                    type="button"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {heroError ? (
              <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{heroError}</p>
            ) : null}
          </div>

          <div className="grid gap-4 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <p className="text-sm font-medium uppercase tracking-wide text-white/70">Quick actions</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                {quickActions.map((item) => (
                  <QuickActionCard
                    key={item.title}
                    item={item}
                    onNearby={handleFindNearby}
                  />
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <p className="text-sm font-medium uppercase tracking-wide text-white/70">How booking works</p>
              <div className="mt-4 grid gap-3">
                {howItWorks.map((item, index) => (
                  <div className="rounded-2xl border border-white/10 bg-slate-950/20 p-4" key={item.title}>
                    <p className="text-xs font-semibold uppercase tracking-wide text-white/60">Step {index + 1}</p>
                    <p className="mt-2 font-semibold text-white">{item.title}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-300">{item.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-4 px-4 md:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Featured spaces" value={featuredParkings.length} description="Curated public listings ready to explore." />
        <StatTile label="Recent searches" value={recentSearches.length} description="Local guest search history follows you on this device." />
        <StatTile label="Recently viewed" value={recentlyViewed.length} description="Listings you opened most recently." />
        <StatTile label="Nearby mode" value={locationFilters ? 'Live' : 'Ready'} description={locationFilters ? 'Location-aware discovery is active.' : 'Use location to unlock nearby results.'} />
      </section>

      <section className="mx-auto w-full max-w-7xl px-4">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-950">Featured parking spaces</h2>
            <p className="mt-2 text-slate-600">Premium listings with fast paths into details and reservation preview.</p>
          </div>
          <Link className="hidden items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700 sm:flex" to="/parkings">
            View all <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        {isFeaturedLoading ? (
          <CarouselSkeleton />
        ) : featuredParkings.length === 0 ? (
          <EmptyPanel
            action={<Link className="mt-4 inline-flex rounded-2xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700" to="/parkings">Browse public listings</Link>}
            description="Freshly approved spaces appear here first so guests can jump into real inventory."
            title="Featured listings are loading back in"
          />
        ) : (
          <div className="flex snap-x gap-5 overflow-x-auto pb-2">
            {featuredParkings.map((parking) => (
              <FeaturedParkingCard key={parking.id} parking={parking} />
            ))}
          </div>
        )}
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-6 px-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Panel title="Nearby recommended parking" subtitle="Use location when speed matters, then jump into the full nearby inventory only when you need it.">
          {isNearbyLoading ? (
            <CompactSkeleton count={3} />
          ) : nearbyParkings.length === 0 ? (
            <EmptyPanel
              action={<button className="mt-4 inline-flex rounded-2xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700" onClick={loadNearbyRecommendations} type="button">Load nearby recommendations</button>}
              description="Use your location to unlock nearby listings and jump into map discovery."
              title="Nearby recommendations are waiting for location access"
            />
          ) : (
            <div className="grid gap-4">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-100 bg-brand-50 p-4">
                <div>
                  <p className="font-semibold text-slate-950">Nearby mode is active</p>
                  <p className="mt-1 text-sm text-slate-600">Open map discovery to explore the full nearby result set with filters.</p>
                </div>
                <button className="inline-flex rounded-2xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700" onClick={() => navigateToSearch(locationFilters ?? {})} type="button">
                  Open nearby results
                </button>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {nearbyParkings.map((parking) => (
                  <MiniParkingCard key={parking.id} parking={parking} />
                ))}
              </div>
            </div>
          )}
        </Panel>

        <Panel title="Continue exploring" subtitle="Return to the searches and listings that were already worth your attention.">
          {continueExploringItems.length === 0 ? (
            <EmptyPanel
              action={<button className="mt-4 inline-flex rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50" onClick={() => navigateToSearch()} type="button">Start browsing</button>}
              description="As soon as you search or open a listing, SmartPark keeps a lightweight trail here."
              title="Nothing to resume yet"
            />
          ) : (
            <div className="grid gap-3">
              {continueExploringItems.map((item) => (
                <Link className="rounded-2xl border border-slate-200 p-4 transition hover:border-brand-300 hover:bg-brand-50" key={item.id} to={item.to}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">{item.eyebrow}</p>
                  <p className="mt-2 font-semibold text-slate-950">{item.title}</p>
                  <p className="mt-1 text-sm text-slate-600">{item.description}</p>
                </Link>
              ))}
            </div>
          )}
        </Panel>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-6 px-4 xl:grid-cols-[0.95fr_1.05fr]">
        <Panel title="Recent searches" subtitle="Reopen proven search paths instead of starting each parking run from scratch.">
          {recentSearches.length === 0 ? (
            <EmptyPanel
              action={<button className="mt-4 inline-flex rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50" onClick={() => navigateToSearch({ search: 'Downtown' })} type="button">Try a trending search</button>}
              description="Search history is stored locally so you can keep momentum even before creating an account."
              title="No recent searches yet"
            />
          ) : (
            <div className="grid gap-3">
              {recentSearches.slice(0, 4).map((item) => (
                <button
                  className="rounded-2xl border border-slate-200 p-4 text-left transition hover:border-brand-300 hover:bg-brand-50"
                  key={item.label}
                  onClick={() => navigateToSearch({ search: item.label })}
                  type="button"
                >
                  <p className="inline-flex items-center gap-2 font-semibold text-slate-950">
                    <Search className="h-4 w-4 text-brand-600" aria-hidden="true" />
                    {item.label}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">{item.createdAt ? new Date(item.createdAt).toLocaleString() : 'Recent search'}</p>
                </button>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Recently viewed" subtitle="Keep active comparisons close while you narrow down the right space.">
          {recentlyViewed.length === 0 ? (
            <EmptyPanel
              action={<Link className="mt-4 inline-flex rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50" to="/parkings">Explore featured listings</Link>}
              description="Open any parking card or detail page and it will appear here for quick comparison."
              title="No viewed listings yet"
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {recentlyViewed.slice(0, 4).map((parking) => (
                <MiniParkingCard key={parking.id} parking={parking} />
              ))}
            </div>
          )}
        </Panel>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4">
        <Panel title="Trending locations" subtitle="Real quick-search shortcuts into public discovery, not dead-end category chips.">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {trendingSearches.map((item) => (
              <button
                className="rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-brand-300 hover:bg-brand-50"
                key={item.label}
                onClick={() => navigateToSearch(item.filters)}
                type="button"
              >
                <p className="text-sm font-semibold uppercase tracking-wide text-brand-700">Quick search</p>
                <p className="mt-2 text-lg font-semibold text-slate-950">{item.label}</p>
                <p className="mt-2 text-sm text-slate-600">Open public inventory and refine from there.</p>
              </button>
            ))}
          </div>
        </Panel>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4">
        <div className="overflow-hidden rounded-3xl bg-brand-600 px-6 py-16 text-center sm:px-16 sm:py-24">
          <h2 className="mx-auto max-w-2xl text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Turn occasional discovery into one-tap parking
          </h2>
          <p className="mx-auto mt-5 max-w-3xl text-lg leading-8 text-brand-100">
            Create a guest account to save parking, hold onto recent searches, and move from reservation preview to checkout with less friction. Have a space to monetize? Start owner onboarding instead.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link className="rounded-2xl bg-white px-6 py-3 text-sm font-semibold text-brand-700 shadow-sm hover:bg-brand-50" to="/register">
              Create an account
            </Link>
            <Link className="rounded-2xl border border-white/30 bg-white/10 px-6 py-3 text-sm font-semibold text-white hover:bg-white/20" to="/register?role=owner">
              List your space
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function QuickActionCard({ item, onNearby }) {
  const Icon = item.icon;

  return item.to ? (
    <Link className="rounded-2xl border border-white/10 bg-slate-950/20 p-4 transition hover:bg-white/10" to={item.to}>
      <Icon className="h-5 w-5 text-white" aria-hidden="true" />
      <p className="mt-3 font-semibold text-white">{item.title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-300">{item.description}</p>
      <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-white">
        {item.actionLabel}
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </span>
    </Link>
  ) : (
    <button className="rounded-2xl border border-white/10 bg-slate-950/20 p-4 text-left transition hover:bg-white/10" onClick={onNearby} type="button">
      <Icon className="h-5 w-5 text-white" aria-hidden="true" />
      <p className="mt-3 font-semibold text-white">{item.title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-300">{item.description}</p>
      <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-white">
        {item.actionLabel}
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </span>
    </button>
  );
}

function FeaturedParkingCard({ parking }) {
  const reservePath = `/parkings/${parking.id}?intent=reserve`;

  return (
    <article className="flex min-w-[295px] max-w-[340px] snap-start flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <Link className="group block" to={`/parkings/${parking.id}`}>
        <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
          {parking.coverImage ? (
            <img
              alt={parking.coverImage.caption || parking.title}
              className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
              src={parking.coverImage.url}
            />
          ) : (
            <div className="grid h-full w-full place-items-center text-slate-400">
              <Camera className="h-8 w-8" />
            </div>
          )}
          <div className="absolute right-3 top-3 rounded-full bg-white/95 px-3 py-1 text-sm font-semibold text-slate-900 shadow-sm">
            Rs {parking.hourlyPrice}/hr
          </div>
        </div>
      </Link>
      <div className="flex flex-1 flex-col p-5">
        <Link className="font-semibold text-slate-950 hover:text-brand-700" to={`/parkings/${parking.id}`}>
          {parking.title}
        </Link>
        <p className="mt-2 flex items-center gap-2 text-sm text-slate-500">
          <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="line-clamp-1">{[parking.area, parking.city, parking.state].filter(Boolean).join(', ')}</span>
        </p>
        <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">{parking.description}</p>
        <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-700">
          <span className="rounded-full bg-emerald-50 px-3 py-1 font-medium text-emerald-700">{parking.availableSlots} slots available</span>
          {parking.parkingType ? <span className="rounded-full bg-slate-100 px-3 py-1 capitalize">{parking.parkingType}</span> : null}
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link className="inline-flex rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50" to={`/parkings/${parking.id}`}>
            View details
          </Link>
          <Link className="inline-flex rounded-2xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700" to={reservePath}>
            Reserve preview
          </Link>
        </div>
      </div>
    </article>
  );
}

function StatTile({ description, label, value }) {
  return (
    <article className="app-stat">
      <p className="app-copy-soft text-sm font-medium">{label}</p>
      <p className="app-heading mt-3 text-2xl font-bold">{value}</p>
      <p className="app-copy mt-2 text-sm leading-6">{description}</p>
    </article>
  );
}

function Panel({ children, subtitle, title }) {
  return (
    <section className="app-panel rounded-3xl">
      <h2 className="app-heading text-2xl font-semibold">{title}</h2>
      <p className="app-copy mt-2 text-sm leading-6">{subtitle}</p>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function EmptyPanel({ action, description, title }) {
  return (
    <div className="rounded-3xl border border-dashed p-6 text-center" style={{ borderColor: 'var(--app-border-strong)', background: 'var(--app-surface-muted)' }}>
      <p className="app-heading font-semibold">{title}</p>
      <p className="app-copy mt-2 text-sm leading-6">{description}</p>
      {action ?? null}
    </div>
  );
}

function MiniParkingCard({ parking }) {
  return (
    <article className="rounded-2xl border border-slate-200 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-slate-950">{parking.title}</p>
          <p className="mt-1 text-sm text-slate-600">{[parking.area, parking.city, parking.state].filter(Boolean).join(', ')}</p>
        </div>
        {parking.hourlyPrice != null ? (
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">Rs {parking.hourlyPrice}/hr</span>
        ) : null}
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-700">
        {parking.availableSlots != null ? <span className="rounded-full bg-slate-100 px-3 py-1">{parking.availableSlots} slots</span> : null}
        {parking.parkingType ? <span className="rounded-full bg-slate-100 px-3 py-1 capitalize">{parking.parkingType}</span> : null}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100" to={`/parkings/${parking.id}`}>
          <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
          View details
        </Link>
        <Link className="inline-flex rounded-2xl bg-brand-600 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-700" to={`/parkings/${parking.id}?intent=reserve`}>
          Reserve preview
        </Link>
      </div>
    </article>
  );
}

function CarouselSkeleton() {
  return (
    <div className="flex gap-5 overflow-hidden">
      {[0, 1, 2].map((item) => (
        <div className="min-w-[295px] max-w-[340px] animate-pulse rounded-3xl border border-slate-200 bg-white p-5" key={item}>
          <div className="aspect-[4/3] rounded-2xl bg-slate-200" />
          <div className="mt-5 h-5 w-2/3 rounded bg-slate-200" />
          <div className="mt-3 h-4 w-1/2 rounded bg-slate-100" />
          <div className="mt-5 h-12 rounded-2xl bg-slate-100" />
        </div>
      ))}
    </div>
  );
}

function CompactSkeleton({ count }) {
  return (
    <div className="grid gap-3">
      {Array.from({ length: count }).map((_, index) => (
        <div className="animate-pulse rounded-2xl border border-slate-200 bg-white p-4" key={index}>
          <div className="h-4 w-1/2 rounded bg-slate-200" />
          <div className="mt-3 h-3 w-2/3 rounded bg-slate-100" />
          <div className="mt-4 h-10 rounded-2xl bg-slate-100" />
        </div>
      ))}
    </div>
  );
}
