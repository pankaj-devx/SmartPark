import { useCallback, useEffect, useMemo, useState } from 'react';
import { Bell, Bookmark, Clock3, Compass, MapPin, Repeat2, Search, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  buildQuickRebookLink,
  getRecentActivity,
  getRecentSearches,
  getRecentlyViewedParkings,
  getReminderPlaceholders,
  getSavedParkings
} from '../features/account/accountExperience.js';
import { useAuth } from '../features/auth/useAuth.js';
import { fetchMyBookings } from '../features/bookings/bookingApi.js';
import { buildDiscoveryPath } from '../features/parkings/discoveryFilters.js';
import { fetchParkingById, fetchPublicParkings } from '../features/parkings/parkingApi.js';
import { getApiErrorMessage } from '../lib/getApiErrorMessage.js';

export function DriverHomePage() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [nearby, setNearby] = useState([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const loadHome = useCallback(async () => {
    setError('');
    setIsLoading(true);

    try {
      const [bookingRows, parkingList] = await Promise.all([
        fetchMyBookings().catch(() => []),
        fetchPublicParkings({ limit: 4 }).catch(() => ({ parkings: [] }))
      ]);

      const parkingIds = [...new Set(bookingRows.map((booking) => booking.parking))];
      const parkingPairs = await Promise.all(
        parkingIds.map(async (parkingId) => {
          try {
            return [parkingId, await fetchParkingById(parkingId)];
          } catch {
            return [parkingId, null];
          }
        })
      );
      const parkingMap = Object.fromEntries(parkingPairs);

      setBookings(bookingRows.map((booking) => ({ ...booking, parkingDetail: parkingMap[booking.parking] })));
      setNearby(Array.isArray(parkingList?.parkings) ? parkingList.parkings : []);
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Unable to load your home experience'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    Promise.resolve().then(loadHome);
  }, [loadHome]);

  const savedParkings = getSavedParkings();
  const recentSearches = getRecentSearches();
  const recentlyViewed = getRecentlyViewedParkings();
  const recentActivity = getRecentActivity();

  const upcomingBookings = useMemo(
    () =>
      bookings
        .filter((booking) => booking.status === 'confirmed' || booking.status === 'pending')
        .slice(0, 3),
    [bookings]
  );
  const recentBookings = useMemo(() => bookings.slice(0, 3), [bookings]);
  const reminders = useMemo(() => getReminderPlaceholders(upcomingBookings), [upcomingBookings]);
  const greeting = useMemo(() => buildGreeting(user?.name), [user?.name]);
  const primarySearch = recentSearches[0] ?? null;

  return (
    <section className="mx-auto max-w-7xl px-4 py-8">
      <section className="overflow-hidden rounded-3xl border p-7 text-white shadow-sm sm:p-8" style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'linear-gradient(135deg, #168556 0%, #14532d 48%, #0f172a 100%)' }}>
        <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide">
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          Driver home
        </p>
        <h1 className="mt-4 text-3xl font-bold sm:text-4xl">{greeting}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-white/80">
          Start with the next reservation, pick up an unfinished search, and get back on the road without digging through menus.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link className="inline-flex items-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100" to="/parkings">
            <Search className="h-4 w-4" aria-hidden="true" />
            Explore live parking
          </Link>
          <Link className="inline-flex items-center gap-2 rounded-md border border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20" to="/bookings">
            <Clock3 className="h-4 w-4" aria-hidden="true" />
            My bookings
          </Link>
          {primarySearch ? (
            <Link className="inline-flex items-center gap-2 rounded-md border border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20" to={buildDiscoveryPath({ search: primarySearch.label })}>
              <Repeat2 className="h-4 w-4" aria-hidden="true" />
              Continue "{primarySearch.label}"
            </Link>
          ) : null}
        </div>
      </section>

      {error ? <p className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}

      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Clock3} label="Upcoming bookings" value={upcomingBookings.length} />
        <StatCard icon={Bookmark} label="Saved parkings" value={savedParkings.length} />
        <StatCard icon={Bell} label="Active reminders" value={reminders.length} />
        <StatCard icon={Compass} label="Recent searches" value={recentSearches.length} />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <Panel title="Upcoming booking summary" subtitle="Your next active reservations, at a glance.">
          {isLoading ? (
            <SkeletonList />
          ) : upcomingBookings.length === 0 ? (
            <EmptyState
              action={<Link className="mt-3 inline-flex rounded-md bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700" to="/parkings">Book a parking</Link>}
              description="Once you confirm a reservation it will appear here with quick rebook actions."
              title="No upcoming bookings"
            />
          ) : (
            <div className="grid gap-3">
              {upcomingBookings.map((booking) => (
                <article className="rounded-md border border-slate-200 p-4" key={booking.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-950">{booking.parkingDetail?.title ?? 'Parking listing'}</p>
                      <p className="mt-1 text-sm text-slate-600">{booking.bookingDate} - {booking.startTime}-{booking.endTime}</p>
                    </div>
                    <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold capitalize text-slate-700">{booking.status}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {booking.parkingDetail ? (
                      <Link className="rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100" to={`/parkings/${booking.parkingDetail.id}`}>
                        View listing
                      </Link>
                    ) : null}
                    <Link className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100" to={buildQuickRebookLink(booking)}>
                      <Repeat2 className="h-3.5 w-3.5" aria-hidden="true" />
                      Quick rebook
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Booking reminders" subtitle="Gentle nudges so you never miss a reservation window.">
          {reminders.length === 0 ? (
            <EmptyState description="Reminders light up here when you have an upcoming or in-flight reservation." title="No reminders right now" />
          ) : (
            <div className="grid gap-3">
              {reminders.map((reminder) => (
                <div className="rounded-md border border-slate-200 bg-slate-50 p-4" key={reminder.id}>
                  <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-950">
                    <Bell className="h-4 w-4 text-brand-600" aria-hidden="true" />
                    {reminder.title}
                  </p>
                  <p className="mt-2 text-sm text-slate-600">{reminder.detail}</p>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Quick reserve shortcuts" subtitle="Reopen the places and time windows you return to most often.">
          {recentBookings.length === 0 ? (
            <EmptyState description="Quick reserve appears after your first reservation." title="No rebook shortcuts yet" />
          ) : (
            <div className="grid gap-3">
              {recentBookings.map((booking) => (
                <article className="rounded-md border border-slate-200 p-4" key={booking.id}>
                  <p className="font-semibold text-slate-950">{booking.parkingDetail?.title ?? 'Parking listing'}</p>
                  <p className="mt-1 text-sm text-slate-600">{booking.bookingDate} - {booking.startTime}-{booking.endTime}</p>
                  <Link className="mt-3 inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100" to={buildQuickRebookLink(booking)}>
                    <Repeat2 className="h-3.5 w-3.5" aria-hidden="true" />
                    Quick rebook
                  </Link>
                </article>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Saved parkings" subtitle="Keep a short list of trusted spaces close at hand.">
          {savedParkings.length === 0 ? (
            <EmptyState
              action={<Link className="mt-3 inline-flex rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100" to="/parkings">Explore parkings</Link>}
              description="Tap save on any parking card or detail page to pin it here."
              title="No saved parkings yet"
            />
          ) : (
            <div className="grid gap-3">
              {savedParkings.slice(0, 3).map((parking) => (
                <MiniParkingCard key={parking.id} parking={parking} />
              ))}
            </div>
          )}
        </Panel>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_0.95fr]">
        <Panel title="Nearby recommendations" subtitle="A lightweight peek at active listings you can reserve today.">
          {isLoading ? (
            <SkeletonList />
          ) : nearby.length === 0 ? (
            <EmptyState description="Nearby suggestions will appear after the first few listings are indexed." title="No nearby suggestions yet" />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {nearby.slice(0, 4).map((parking) => (
                <MiniParkingCard key={parking.id} parking={parking} />
              ))}
            </div>
          )}
        </Panel>

        <div className="grid gap-6">
        <Panel title="Continue recent search" subtitle="Jump back into the searches and listing views that were already working for you.">
            {recentSearches.length === 0 && recentlyViewed.length === 0 ? (
              <EmptyState description="Your recent searches and viewed listings will populate this panel." title="Nothing to resume yet" />
            ) : (
              <div className="grid gap-3">
                {recentSearches.slice(0, 3).map((searchItem) => (
                  <Link className="rounded-md border border-slate-200 p-4 transition hover:border-brand-600 hover:bg-brand-50" key={searchItem.label} to={buildDiscoveryPath({ search: searchItem.label })}>
                    <p className="inline-flex items-center gap-2 font-semibold text-slate-950">
                      <Search className="h-4 w-4 text-brand-600" aria-hidden="true" />
                      {searchItem.label}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">{new Date(searchItem.createdAt).toLocaleString()}</p>
                  </Link>
                ))}
                {recentlyViewed.slice(0, 2).map((parking) => (
                  <Link className="rounded-md border border-slate-200 p-4 transition hover:border-brand-600 hover:bg-brand-50" key={parking.id} to={`/parkings/${parking.id}`}>
                    <p className="inline-flex items-center gap-2 font-semibold text-slate-950">
                      <MapPin className="h-4 w-4 text-brand-600" aria-hidden="true" />
                      {parking.title}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">{[parking.area, parking.city].filter(Boolean).join(', ')}</p>
                  </Link>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Recent activity" subtitle="A lightweight timeline of your account actions.">
            {recentActivity.length === 0 ? (
              <EmptyState description="Searches, saved parkings, and views fill this timeline as you explore." title="No recent activity yet" />
            ) : (
              <ul className="grid gap-3">
                {recentActivity.slice(0, 4).map((item, index) => (
                  <li className="rounded-md border border-slate-200 p-4" key={`${item.type}-${item.createdAt}-${index}`}>
                    <p className="font-semibold text-slate-950">{item.title}</p>
                    <p className="mt-1 text-sm text-slate-600">{item.detail}</p>
                    <p className="mt-2 text-xs text-slate-500">{new Date(item.createdAt).toLocaleString()}</p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </section>
  );
}

function buildGreeting(name) {
  const hour = new Date().getHours();
  const timeOfDay = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const displayName = name ? name.split(' ')[0] : 'driver';
  return `${timeOfDay}, ${displayName}`;
}

function StatCard({ icon, label, value }) {
  const Icon = icon;
  return (
    <article className="app-stat">
      <Icon className="h-5 w-5 text-brand-600" aria-hidden="true" />
      <p className="app-copy-soft mt-3 text-sm">{label}</p>
      <p className="app-heading mt-2 text-2xl font-bold">{value}</p>
    </article>
  );
}

function Panel({ children, subtitle, title }) {
  return (
    <section className="app-panel">
      <h2 className="app-heading text-xl font-semibold">{title}</h2>
      <p className="app-copy mt-2 text-sm">{subtitle}</p>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function EmptyState({ action, description, title }) {
  return (
    <div className="rounded-lg border border-dashed p-6 text-center" style={{ borderColor: 'var(--app-border-strong)', background: 'var(--app-surface-muted)' }}>
      <p className="app-heading font-semibold">{title}</p>
      <p className="app-copy mt-2 text-sm">{description}</p>
      {action ?? null}
    </div>
  );
}

function MiniParkingCard({ parking }) {
  return (
    <article className="rounded-md border border-slate-200 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-slate-950">{parking.title}</p>
          <p className="mt-1 text-sm text-slate-600">{[parking.area, parking.city, parking.state].filter(Boolean).join(', ')}</p>
        </div>
        {parking.hourlyPrice != null ? (
          <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">Rs {parking.hourlyPrice}/hr</span>
        ) : null}
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-700">
        {parking.availableSlots != null ? <span className="rounded-md bg-slate-100 px-2 py-1">{parking.availableSlots} slots</span> : null}
        {parking.parkingType ? <span className="rounded-md bg-slate-100 px-2 py-1 capitalize">{parking.parkingType}</span> : null}
      </div>
      <Link className="mt-4 inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100" to={`/parkings/${parking.id}`}>
        <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
        View details
      </Link>
    </article>
  );
}

function SkeletonList() {
  return (
    <div className="grid gap-3">
      {[0, 1, 2].map((item) => (
        <div className="animate-pulse rounded-md border border-slate-200 bg-white p-4" key={item}>
          <div className="h-4 w-2/3 rounded bg-slate-200" />
          <div className="mt-3 h-3 w-1/2 rounded bg-slate-200" />
          <div className="mt-4 h-10 rounded bg-slate-100" />
        </div>
      ))}
    </div>
  );
}
