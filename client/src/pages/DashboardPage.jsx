import { useCallback, useEffect, useMemo, useState } from 'react';
import { Bell, Bookmark, Clock3, MapPin, Repeat2, Settings2, ShieldCheck } from 'lucide-react';
import { Link, NavLink } from 'react-router-dom';
import {
  buildQuickRebookLink,
  getProfileCompletionScore,
  getRecentActivity,
  getRecentSearches,
  getRecentlyViewedParkings,
  getReminderPlaceholders,
  getSavedParkings
} from '../features/account/accountExperience.js';
import { fetchParkingById } from '../features/parkings/parkingApi.js';
import { buildDiscoveryPath } from '../features/parkings/discoveryFilters.js';
import { useAuth } from '../features/auth/useAuth.js';
import { fetchMyBookings } from '../features/bookings/bookingApi.js';
import { formatBookingDate, formatTime12h, getComputedStatus } from '../features/bookings/bookingUtils.js';
import { getApiErrorMessage } from '../lib/getApiErrorMessage.js';
import { ProfilePage } from './ProfilePage.jsx';

const sectionLabels = {
  overview: 'Overview',
  bookings: 'My Bookings',
  saved: 'Saved Parkings',
  activity: 'Recent Activity',
  notifications: 'Notifications',
  profile: 'Profile',
  settings: 'Settings'
};

const driverSections = Object.entries(sectionLabels).map(([id, label]) => ({ id, label }));

export function DashboardPage({ activeSection = 'overview' }) {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const loadBookings = useCallback(async () => {
    setError('');
    setIsLoading(true);

    try {
      const bookingRows = await fetchMyBookings();
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
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Unable to load your dashboard'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    Promise.resolve().then(loadBookings);
  }, [loadBookings]);

  const savedParkings = getSavedParkings();
  const recentlyViewed = getRecentlyViewedParkings();
  const recentSearches = getRecentSearches();
  const recentActivity = getRecentActivity();

  const upcomingBookings = useMemo(
    () => bookings.filter((booking) => {
      const s = getComputedStatus(booking);
      return s === 'upcoming' || s === 'ongoing';
    }),
    [bookings]
  );
  const recentBookings = useMemo(() => bookings.slice(0, 3), [bookings]);
  const completionScore = useMemo(() => getProfileCompletionScore(user), [user]);
  const reminders = useMemo(() => getReminderPlaceholders(upcomingBookings), [upcomingBookings]);

  return (
    <section className="mx-auto max-w-7xl px-4 py-8">
      <div className="grid gap-5 xl:grid-cols-[250px_minmax(0,1fr)]">
        <aside className="app-panel xl:sticky xl:top-6 xl:h-fit">
          <p className="text-sm font-medium uppercase text-brand-700">Driver workspace</p>
          <h1 className="app-heading mt-2 text-2xl font-bold">Welcome back, {user?.name}</h1>
          <p className="app-copy mt-2 text-sm leading-6">Reservations, saved spaces, reminders, and account controls stay close without wasting space.</p>

          <div className="app-card-muted mt-5">
            <p className="app-copy-soft text-sm">Account readiness</p>
            <div className="mt-3 h-2 rounded-full" style={{ background: 'var(--app-border)' }}>
              <div className="h-2 rounded-full bg-brand-600" style={{ width: `${completionScore}%` }} />
            </div>
            <p className="app-heading mt-2 text-sm font-semibold">{completionScore}% complete</p>
          </div>

          <nav className="mt-5 hidden gap-2 xl:grid">
            {driverSections.map((section) => (
              <SectionLink activeSection={activeSection} key={section.id} label={section.label} sectionId={section.id} />
            ))}
          </nav>
        </aside>

        <div className="min-w-0">
          <nav className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-2 xl:hidden">
            {driverSections.map((section) => (
              <SectionLink activeSection={activeSection} key={section.id} label={section.label} mobile sectionId={section.id} />
            ))}
          </nav>

          {error ? <p className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}

          {activeSection === 'overview' ? (
            <OverviewSection
              completionScore={completionScore}
              isLoading={isLoading}
              recentBookings={recentBookings}
              recentSearches={recentSearches}
              reminders={reminders}
              savedParkings={savedParkings}
              upcomingBookings={upcomingBookings}
            />
          ) : null}

          {activeSection === 'bookings' ? <BookingsSection bookings={bookings} isLoading={isLoading} /> : null}
          {activeSection === 'saved' ? <SavedSection savedParkings={savedParkings} /> : null}
          {activeSection === 'activity' ? <ActivitySection recentActivity={recentActivity} recentSearches={recentSearches} recentlyViewed={recentlyViewed} /> : null}
          {activeSection === 'notifications' ? <NotificationsSection recentActivity={recentActivity} reminders={reminders} upcomingBookings={upcomingBookings} /> : null}
          {activeSection === 'profile' ? <ProfilePage defaultTab="profile" embedded showHeader={false} /> : null}
          {activeSection === 'settings' ? <ProfilePage defaultTab="preferences" embedded showHeader={false} /> : null}
        </div>
      </div>
    </section>
  );
}

function OverviewSection({ completionScore, isLoading, recentBookings, recentSearches, reminders, savedParkings, upcomingBookings }) {
  return (
    <div className="grid gap-6">
      <section className="app-panel">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm font-medium uppercase text-brand-700">Overview</p>
            <h2 className="app-heading mt-2 text-3xl font-bold">Everything you need before you leave</h2>
            <p className="app-copy mt-2 max-w-2xl text-sm leading-6">See the next reservation, resume a search, and keep your shortlist moving without bouncing across duplicate screens.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700" to={recentSearches[0] ? buildDiscoveryPath({ search: recentSearches[0].label }) : '/parkings'}>
              {recentSearches[0] ? 'Resume discovery' : 'Start discovery'}
            </Link>
            <Link className="rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-slate-100" style={{ borderColor: 'var(--app-border)', color: 'var(--app-text-muted)' }} to="/bookings">
              Review reservations
            </Link>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Clock3} label="Upcoming bookings" value={upcomingBookings.length} />
        <StatCard icon={Bookmark} label="Saved parkings" value={savedParkings.length} />
        <StatCard icon={Bell} label="Active reminders" value={reminders.length} />
        <StatCard icon={ShieldCheck} label="Account completion" value={`${completionScore}%`} />
      </div>

      {isLoading ? <DashboardSkeleton /> : null}

      {!isLoading ? (
        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <Panel title="Upcoming booking summary" subtitle="Your next active reservations and quick rebook routes.">
            {upcomingBookings.length === 0 ? (
              <EmptyState description="Your next reservation will appear here once you book an approved parking space." title="No upcoming bookings" />
            ) : (
              <div className="grid gap-3">
                {upcomingBookings.slice(0, 3).map((booking) => (
                  <CompactBookingRow booking={booking} key={booking.id} />
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Quick rebook shortcuts" subtitle="Jump back into the places and time windows you already use.">
            {recentBookings.length === 0 ? (
              <EmptyState description="Rebook shortcuts unlock after your first reservation." title="No rebook history yet" />
            ) : (
              <div className="grid gap-3">
                {recentBookings.map((booking) => (
                  <article className="rounded-md border border-slate-200 p-4" key={booking.id}>
                    <p className="font-semibold text-slate-950">{booking.parkingDetail?.title ?? 'Parking listing'}</p>
                    <p className="mt-1 text-sm text-slate-600">
                      {formatBookingDate(booking.bookingDate)} · {formatTime12h(booking.startTime)}–{formatTime12h(booking.endTime)}
                    </p>
                    <Link className="mt-3 inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100" to={buildQuickRebookLink(booking)}>
                      <Repeat2 className="h-4 w-4" aria-hidden="true" />
                      Quick rebook
                    </Link>
                  </article>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Favorite locations" subtitle="Saved parkings from your account experience layer.">
            {savedParkings.length === 0 ? (
              <EmptyState description="Save parking spaces from search results or the detail page to build a personal shortlist." title="No saved parkings yet" />
            ) : (
              <div className="grid gap-3">
                {savedParkings.slice(0, 3).map((parking) => (
                  <MiniParkingCard key={parking.id} parking={parking} />
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Recent search memory" subtitle="Searches are remembered locally to make discovery feel faster.">
            {recentSearches.length === 0 ? (
              <EmptyState description="Your recent searches will start showing up after you explore a few areas." title="No recent searches yet" />
            ) : (
              <div className="grid gap-3">
              {recentSearches.map((searchItem) => (
                  <Link className="app-card block transition hover:border-brand-300 hover:bg-brand-50" key={searchItem.label} to={buildDiscoveryPath({ search: searchItem.label })}>
                    <p className="app-heading font-semibold">{searchItem.label}</p>
                    <p className="app-copy mt-1 text-sm">{new Date(searchItem.createdAt).toLocaleString()}</p>
                  </Link>
              ))}
            </div>
          )}
          </Panel>
        </div>
      ) : null}
    </div>
  );
}

function BookingsSection({ bookings, isLoading }) {
  return (
    <Panel title="My bookings" subtitle="A more focused booking surface inside the driver workspace.">
      {isLoading ? <DashboardSkeleton compact /> : null}
      {!isLoading && bookings.length === 0 ? <EmptyState description="Reserve a parking space to build your reservation history." title="No bookings yet" /> : null}
      {!isLoading && bookings.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {bookings.map((booking) => {
            const computedStatus = getComputedStatus(booking);
            const statusClass =
              computedStatus === 'upcoming'  ? 'bg-blue-50 text-blue-700' :
              computedStatus === 'ongoing'   ? 'bg-green-50 text-green-700' :
              computedStatus === 'completed' ? 'bg-slate-100 text-slate-600' :
              computedStatus === 'cancelled' ? 'bg-red-50 text-red-700' :
              'bg-slate-100 text-slate-700';

            return (
              <article className="rounded-lg border border-slate-200 p-5" key={booking.id}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-slate-950">{booking.parkingDetail?.title ?? 'Parking listing'}</p>
                    <p className="mt-1 text-sm text-slate-600">
                      {formatBookingDate(booking.bookingDate)} · {formatTime12h(booking.startTime)}–{formatTime12h(booking.endTime)}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${statusClass}`}>
                    {computedStatus}
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2 text-sm text-slate-600">
                  <span className="rounded-md bg-slate-100 px-2 py-1">₹{booking.totalAmount?.toLocaleString('en-IN')}</span>
                  <span className="rounded-md bg-slate-100 px-2 py-1">{booking.slotCount} slot{booking.slotCount === 1 ? '' : 's'}</span>
                  <span className="rounded-md bg-slate-100 px-2 py-1 capitalize">{booking.vehicleType}</span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {booking.parkingDetail ? (
                    <Link className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100" to={`/parkings/${booking.parkingDetail.id}`}>
                      View parking
                    </Link>
                  ) : null}
                  <Link className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100" to={buildQuickRebookLink(booking)}>
                    Quick rebook
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      ) : null}
    </Panel>
  );
}

function SavedSection({ savedParkings }) {
  return (
    <Panel title="Saved parkings" subtitle="A lightweight favorites experience for repeat parking behavior.">
      {savedParkings.length === 0 ? (
        <EmptyState description="Tap save on a parking card or detail page to build your shortlist." title="No saved parkings yet" />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {savedParkings.map((parking) => (
            <MiniParkingCard key={parking.id} parking={parking} />
          ))}
        </div>
      )}
    </Panel>
  );
}

function ActivitySection({ recentActivity, recentSearches, recentlyViewed }) {
  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_0.95fr]">
      <Panel title="Recent activity" subtitle="A clear trail of the places and actions shaping your next reservation.">
        {recentActivity.length === 0 ? (
          <EmptyState description="Searches, saved parkings, and viewed listings will begin to fill this timeline." title="No recent activity yet" />
        ) : (
          <div className="grid gap-3">
            {recentActivity.map((item, index) => (
              <div className="rounded-md border border-slate-200 p-4" key={`${item.type}-${item.createdAt}-${index}`}>
                <p className="font-semibold text-slate-950">{item.title}</p>
                <p className="mt-1 text-sm text-slate-600">{item.detail}</p>
                <p className="mt-2 text-xs text-slate-500">{new Date(item.createdAt).toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <div className="grid gap-6">
        <Panel title="Recently viewed" subtitle="Listings you opened most recently.">
          {recentlyViewed.length === 0 ? (
            <EmptyState description="View a parking detail page to see it appear here." title="No recently viewed listings" />
          ) : (
            <div className="grid gap-3">
              {recentlyViewed.map((parking) => (
                <MiniParkingCard key={parking.id} parking={parking} />
              ))}
            </div>
          )}
        </Panel>
        <Panel title="Recent searches" subtitle="Quick context from your latest discovery behavior.">
          {recentSearches.length === 0 ? (
            <EmptyState description="Search history will populate here after a few discovery actions." title="No recent searches" />
          ) : (
            <div className="grid gap-3">
              {recentSearches.map((searchItem) => (
                <div className="rounded-md border border-slate-200 p-4" key={searchItem.label}>
                  <p className="font-semibold text-slate-950">{searchItem.label}</p>
                  <p className="mt-1 text-sm text-slate-600">{new Date(searchItem.createdAt).toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}

function NotificationsSection({ recentActivity, reminders, upcomingBookings }) {
  return (
    <Panel title="Notifications" subtitle="Reservation reminders and account follow-up based on your current activity.">
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="app-card">
          <div className="app-heading inline-flex items-center gap-2 text-sm font-semibold">
            <Bell className="h-4 w-4 text-brand-600" aria-hidden="true" />
            Booking reminders
          </div>
          {reminders.length === 0 ? (
            <p className="mt-3 text-sm text-slate-600">No upcoming reservations need a reminder right now.</p>
          ) : (
            <div className="mt-4 grid gap-3">
              {reminders.map((reminder) => (
                <div className="rounded-md bg-slate-50 p-4" key={reminder.id}>
                  <p className="font-semibold text-slate-950">{reminder.title}</p>
                  <p className="mt-1 text-sm text-slate-600">{reminder.detail}</p>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="app-card">
          <div className="app-heading inline-flex items-center gap-2 text-sm font-semibold">
            <Settings2 className="h-4 w-4 text-brand-600" aria-hidden="true" />
            Account cues
          </div>
          <div className="mt-4 grid gap-3">
            <NotificationTile text={`You currently have ${upcomingBookings.length} active reservation${upcomingBookings.length === 1 ? '' : 's'} on the books.`} title="Upcoming reservations" />
            <NotificationTile text="Notification settings, appearance, and privacy controls are available from account settings." title="Preferences" />
            <NotificationTile text={recentActivity.length ? 'Recent activity is ready to review when you want a quick recap.' : 'Searches, saved spaces, and viewed listings will start surfacing here as you use SmartPark more.'} title="Activity feed" />
          </div>
        </div>
      </div>
    </Panel>
  );
}

function SectionLink({ activeSection, label, mobile = false, sectionId }) {
  const to = driverSectionToPath(sectionId);

  return (
    <NavLink
      className={[
        'rounded-md text-sm font-semibold transition',
        mobile ? 'shrink-0 px-3 py-2' : 'px-3 py-2.5 text-left',
        activeSection === sectionId ? 'bg-slate-950 text-white shadow-sm' : ''
      ].join(' ')}
      style={({ isActive }) => (!isActive ? { background: 'var(--app-surface)', color: 'var(--app-text-muted)', border: '1px solid var(--app-border)' } : undefined)}
      to={to}
    >
      {label}
    </NavLink>
  );
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

function EmptyState({ description, title }) {
  return (
    <div className="rounded-lg border border-dashed p-6 text-center" style={{ borderColor: 'var(--app-border-strong)', background: 'var(--app-surface-muted)' }}>
      <p className="app-heading font-semibold">{title}</p>
      <p className="app-copy mt-2 text-sm">{description}</p>
    </div>
  );
}

function CompactBookingRow({ booking }) {
  const computedStatus = getComputedStatus(booking);
  const statusClass =
    computedStatus === 'upcoming'  ? 'bg-blue-50 text-blue-700' :
    computedStatus === 'ongoing'   ? 'bg-green-50 text-green-700' :
    computedStatus === 'completed' ? 'bg-slate-100 text-slate-600' :
    computedStatus === 'cancelled' ? 'bg-red-50 text-red-700' :
    'bg-slate-100 text-slate-700';

  return (
    <article className="rounded-md border border-slate-200 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-slate-950">{booking.parkingDetail?.title ?? 'Parking listing'}</p>
          <p className="mt-1 text-sm text-slate-600">
            {formatBookingDate(booking.bookingDate)} · {formatTime12h(booking.startTime)}–{formatTime12h(booking.endTime)}
          </p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${statusClass}`}>
          {computedStatus}
        </span>
      </div>
    </article>
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
        <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">Rs {parking.hourlyPrice}/hr</span>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <span className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-700">{parking.availableSlots} slots</span>
        <span className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-700 capitalize">{parking.parkingType}</span>
      </div>
      <Link className="mt-4 inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100" to={`/parkings/${parking.id}`}>
        <MapPin className="h-4 w-4" aria-hidden="true" />
        View details
      </Link>
    </article>
  );
}

function NotificationTile({ text, title }) {
  return (
    <div className="app-card-muted">
      <p className="app-heading font-semibold">{title}</p>
      <p className="app-copy mt-1 text-sm">{text}</p>
    </div>
  );
}

function DashboardSkeleton({ compact = false }) {
  return (
    <div className={`grid gap-4 ${compact ? 'md:grid-cols-2' : 'md:grid-cols-4'}`}>
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

function driverSectionToPath(sectionId) {
  const sectionRoutes = {
    overview: '/dashboard',
    bookings: '/bookings',
    saved: '/saved',
    activity: '/activity',
    notifications: '/notifications',
    profile: '/profile',
    settings: '/settings'
  };

  return sectionRoutes[sectionId] ?? '/dashboard';
}
