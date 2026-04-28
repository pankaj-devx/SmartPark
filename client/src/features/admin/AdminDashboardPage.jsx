import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, CircleSlash, ClipboardCheck, Search, XCircle } from 'lucide-react';
import { getApiErrorMessage } from '../../lib/getApiErrorMessage.js';
import { ProfilePage } from '../../pages/ProfilePage.jsx';
import {
  approveAdminParking,
  fetchAdminBookings,
  fetchAdminDashboard,
  rejectAdminParking,
  toggleAdminParkingActive
} from './adminApi.js';

const ADMIN_CACHE_KEY = 'smartpark_admin_dashboard_cache';
const statusOptions = ['', 'pending', 'confirmed', 'cancelled', 'completed'];
const statusStyles = {
  pending: 'bg-amber-50 text-amber-700',
  approved: 'bg-brand-50 text-brand-700',
  rejected: 'bg-red-50 text-red-700',
  confirmed: 'bg-brand-50 text-brand-700',
  cancelled: 'bg-red-50 text-red-700',
  completed: 'bg-slate-100 text-slate-700'
};

const cachedData = readAdminCache();

export function AdminDashboardPage({ activeSection = 'overview' }) {
  const [bookings, setBookings] = useState(cachedData?.bookings ?? []);
  const [bookingStatus, setBookingStatus] = useState('');
  const [dashboard, setDashboard] = useState(cachedData?.dashboard ?? null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(!cachedData);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [bookingSearch, setBookingSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('');
  const [listingSearch, setListingSearch] = useState('');

  const filteredBookings = useMemo(() => {
    const term = bookingSearch.trim().toLowerCase();

    if (!term) {
      return bookings;
    }

    return bookings.filter((booking) =>
      [booking.id, booking.user, booking.userName, booking.userEmail, booking.parking, booking.parkingTitle]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(term)
    );
  }, [bookings, bookingSearch]);

  const filteredUsers = useMemo(() => {
    const users = dashboard?.users ?? [];
    const term = userSearch.trim().toLowerCase();

    return users.filter((user) => {
      const matchesRole = userRoleFilter ? user.role === userRoleFilter : true;
      const matchesTerm = term
        ? [user.name, user.email, user.phone, user.role, user.status].filter(Boolean).join(' ').toLowerCase().includes(term)
        : true;

      return matchesRole && matchesTerm;
    });
  }, [dashboard?.users, userRoleFilter, userSearch]);

  const filteredParkings = useMemo(() => {
    const term = listingSearch.trim().toLowerCase();

    if (!dashboard || !term) {
      return dashboard?.parkings ?? { pending: [], approved: [], rejected: [] };
    }

    return {
      pending: dashboard.parkings.pending.filter((parking) => matchesListingSearch(parking, term)),
      approved: dashboard.parkings.approved.filter((parking) => matchesListingSearch(parking, term)),
      rejected: dashboard.parkings.rejected.filter((parking) => matchesListingSearch(parking, term))
    };
  }, [dashboard, listingSearch]);

  const bookingMetrics = useMemo(() => buildBookingMetrics(bookings), [bookings]);

  const loadDashboard = useCallback(async () => {
    setError('');
    setIsLoading(true);

    try {
      const [dashboardData, bookingRows] = await Promise.all([
        fetchAdminDashboard(),
        fetchAdminBookings(bookingStatus ? { status: bookingStatus } : {})
      ]);
      setDashboard(dashboardData);
      setBookings(bookingRows);
      writeAdminCache({
        dashboard: dashboardData,
        bookings: bookingRows
      });
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Unable to load admin dashboard'));
    } finally {
      setIsLoading(false);
    }
  }, [bookingStatus]);

  useEffect(() => {
    Promise.resolve().then(loadDashboard);
  }, [loadDashboard]);

  async function applyParkingUpdate(action) {
    setError('');

    try {
      const parking = await action();
      setDashboard((current) => replaceParking(current, parking));
      setRejectTarget(null);
      setRejectReason('');
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Unable to update listing moderation status'));
    }
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-8">
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-medium uppercase text-brand-700">Admin control panel</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">Platform operations workspace</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Moderation, operational monitoring, reporting context, and settings now live in section-switched control panels instead of a long vertical dashboard.</p>
      </div>

      {error ? <p className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
      {isLoading && !dashboard ? <SkeletonGrid /> : null}

      {activeSection === 'overview' ? <AdminOverview bookingMetrics={bookingMetrics} dashboard={dashboard} /> : null}
      {activeSection === 'approvals' ? <AdminApprovals applyParkingUpdate={applyParkingUpdate} listingSearch={listingSearch} parkings={filteredParkings} rejectReason={rejectReason} rejectTarget={rejectTarget} setListingSearch={setListingSearch} setRejectReason={setRejectReason} setRejectTarget={setRejectTarget} /> : null}
      {activeSection === 'bookings' ? <AdminBookings bookingSearch={bookingSearch} bookingStatus={bookingStatus} filteredBookings={filteredBookings} setBookingSearch={setBookingSearch} setBookingStatus={setBookingStatus} /> : null}
      {activeSection === 'users' ? <AdminUsers filteredUsers={filteredUsers} search={userSearch} setSearch={setUserSearch} setUserRoleFilter={setUserRoleFilter} userMetrics={dashboard?.userMetrics} userRoleFilter={userRoleFilter} /> : null}
      {activeSection === 'reports' ? <AdminReports bookingMetrics={bookingMetrics} dashboard={dashboard} /> : null}
      {activeSection === 'settings' ? <ProfilePage defaultTab="security" embedded showHeader={false} /> : null}
    </section>
  );
}

function AdminOverview({ bookingMetrics, dashboard }) {
  return (
    <div className="mt-6 grid gap-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Pending approvals" value={dashboard?.summary.pendingApprovals ?? 0} />
        <SummaryCard label="Approved listings" value={dashboard?.summary.approvedListings ?? 0} />
        <SummaryCard label="Total bookings" value={dashboard?.summary.totalBookings ?? 0} />
        <SummaryCard label="Total users" value={dashboard?.summary.totalUsers ?? 0} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_0.95fr]">
        <Panel title="Moderation snapshot" subtitle="The key platform signals are easier to scan in a dedicated overview panel.">
          <div className="grid gap-3">
            <GuideTile label="Approvals queue" text={`${dashboard?.summary.pendingApprovals ?? 0} listings are currently waiting for review.`} />
            <GuideTile label="Platform listings" text={`${dashboard?.summary.approvedListings ?? 0} listings are available in the approved pool.`} />
            <GuideTile label="Booking operations" text={`${dashboard?.summary.totalBookings ?? 0} bookings are visible through the oversight layer.`} />
          </div>
        </Panel>
        <Panel title="Operational posture" subtitle="A more product-grade frame for admin work.">
          <div className="grid gap-3">
            <GuideTile label="Users" text={`${dashboard?.userMetrics?.owners ?? 0} owners and ${dashboard?.userMetrics?.drivers ?? 0} drivers are visible in the user operations panel.`} />
            <GuideTile label="Reports" text={`${bookingMetrics.confirmed} confirmed bookings and ${dashboard?.summary.inactiveListings ?? 0} inactive listings are rolled into the reports section.`} />
            <GuideTile label="Settings" text="Admin account controls and permissions summary live in a dedicated security-first settings panel." />
          </div>
        </Panel>
      </div>
    </div>
  );
}

function AdminApprovals({ applyParkingUpdate, listingSearch, parkings, rejectReason, rejectTarget, setListingSearch, setRejectReason, setRejectTarget }) {
  return (
    <div className="mt-6 grid gap-8">
      <Panel title="Listing search" subtitle="Search by title, city, state, or owner-facing listing details.">
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Search listings
          <div className="flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2">
            <Search className="h-4 w-4 text-slate-500" aria-hidden="true" />
            <input className="min-w-0 flex-1 outline-none" onChange={(event) => setListingSearch(event.target.value)} value={listingSearch} />
          </div>
        </label>
      </Panel>
      <ModerationSection
        icon={ClipboardCheck}
        onApprove={(parking) => applyParkingUpdate(() => approveAdminParking(parking.id))}
        onReject={(parking) => setRejectTarget(parking)}
        onToggle={(parking) => applyParkingUpdate(() => toggleAdminParkingActive(parking.id))}
        parkings={parkings.pending}
        title="Pending listings"
      />
      <ModerationSection
        icon={CheckCircle2}
        onReject={(parking) => setRejectTarget(parking)}
        onToggle={(parking) => applyParkingUpdate(() => toggleAdminParkingActive(parking.id))}
        parkings={parkings.approved}
        title="Approved listings"
      />
      <ModerationSection
        icon={XCircle}
        onApprove={(parking) => applyParkingUpdate(() => approveAdminParking(parking.id))}
        onToggle={(parking) => applyParkingUpdate(() => toggleAdminParkingActive(parking.id))}
        parkings={parkings.rejected}
        title="Rejected listings"
      />

      {rejectTarget ? (
        <div className="fixed inset-0 z-40 grid place-items-center bg-slate-950/50 px-4">
          <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl">
            <h2 className="text-lg font-semibold text-slate-950">Reject listing</h2>
            <p className="mt-2 text-sm text-slate-600">Owners will see this reason in their dashboard.</p>
            <textarea
              className="mt-4 min-h-28 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
              onChange={(event) => setRejectReason(event.target.value)}
              value={rejectReason}
            />
            <div className="mt-4 flex gap-3">
              <button
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                disabled={rejectReason.trim().length < 3}
                onClick={() => applyParkingUpdate(() => rejectAdminParking(rejectTarget.id, rejectReason))}
                type="button"
              >
                Reject
              </button>
              <button className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100" onClick={() => setRejectTarget(null)} type="button">
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function AdminBookings({ bookingSearch, bookingStatus, filteredBookings, setBookingSearch, setBookingStatus }) {
  return (
    <Panel title="Bookings" subtitle="Read-only platform oversight with cleaner separation from moderation work.">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="grid gap-3 md:grid-cols-[180px_260px]">
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Status
            <select className="rounded-md border border-slate-300 px-3 py-2" onChange={(event) => setBookingStatus(event.target.value)} value={bookingStatus}>
              {statusOptions.map((status) => (
                <option key={status || 'all'} value={status}>
                  {status || 'all'}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Search booking, user, or parking
            <div className="flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2">
              <Search className="h-4 w-4 text-slate-500" aria-hidden="true" />
              <input className="min-w-0 flex-1 outline-none" onChange={(event) => setBookingSearch(event.target.value)} value={bookingSearch} />
            </div>
          </label>
        </div>
      </div>
      {filteredBookings.length === 0 ? <EmptyState description="Booking results will appear here when they match the selected filters." title="No booking records match" /> : null}
      <div className="grid gap-3">
        {filteredBookings.map((booking) => (
          <article className="rounded-lg border border-slate-200 p-4" key={booking.id}>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-semibold text-slate-950">#{booking.id} - {booking.bookingDate} - {booking.startTime}-{booking.endTime}</p>
                <p className="mt-1 text-sm text-slate-600">{booking.parkingTitle || booking.parking} - {booking.userName || booking.user}</p>
                {booking.userEmail ? <p className="mt-1 text-xs text-slate-500">{booking.userEmail}</p> : null}
              </div>
              <div className="flex flex-wrap gap-2 text-sm">
                <span className={`rounded-md px-2 py-1 font-semibold capitalize ${statusStyles[booking.status] ?? statusStyles.completed}`}>{booking.status}</span>
                <span className="rounded-md bg-slate-100 px-2 py-1 text-slate-700">Rs {booking.totalAmount}</span>
                <span className="rounded-md bg-slate-100 px-2 py-1 text-slate-700">{booking.slotCount} slots</span>
              </div>
            </div>
          </article>
        ))}
      </div>
    </Panel>
  );
}

function AdminUsers({ filteredUsers, search, setSearch, setUserRoleFilter, userMetrics, userRoleFilter }) {
  return (
    <Panel title="Users" subtitle="Searchable user operations backed by the real admin dashboard dataset.">
      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard label="Drivers" value={userMetrics?.drivers ?? 0} />
        <SummaryCard label="Owners" value={userMetrics?.owners ?? 0} />
        <SummaryCard label="Admins" value={userMetrics?.admins ?? 0} />
      </div>
      <div className="mt-6 grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Search users
          <div className="flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2">
            <Search className="h-4 w-4 text-slate-500" aria-hidden="true" />
            <input className="min-w-0 flex-1 outline-none" onChange={(event) => setSearch(event.target.value)} value={search} />
          </div>
        </label>
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Role filter
          <select className="rounded-md border border-slate-300 px-3 py-2" onChange={(event) => setUserRoleFilter(event.target.value)} value={userRoleFilter}>
            <option value="">All roles</option>
            <option value="driver">Driver</option>
            <option value="owner">Owner</option>
            <option value="admin">Admin</option>
          </select>
        </label>
      </div>
      {filteredUsers.length === 0 ? <EmptyState description="Users that match the current filters will appear here." title="No users match the current filters" /> : null}
      {filteredUsers.length > 0 ? (
        <div className="mt-6 grid gap-3">
          {filteredUsers.map((user) => (
            <article className="rounded-lg border border-slate-200 p-4" key={user.id}>
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-semibold text-slate-950">{user.name}</p>
                  <p className="mt-1 text-sm text-slate-600">{user.email}</p>
                  <p className="mt-1 text-xs text-slate-500">{user.phone || 'No phone on file'}</p>
                </div>
                <div className="flex flex-wrap gap-2 text-sm">
                  <span className="rounded-md bg-slate-100 px-2 py-1 font-semibold capitalize text-slate-700">{user.role}</span>
                  <span className={`rounded-md px-2 py-1 font-semibold capitalize ${user.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{user.status}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </Panel>
  );
}

function AdminReports({ bookingMetrics, dashboard }) {
  return (
    <div className="mt-6 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
      <Panel title="Reports" subtitle="Operational summaries built from real booking, approval, and user data.">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <SummaryCard label="Approved listings" value={dashboard?.summary.approvedListings ?? 0} />
          <SummaryCard label="Total bookings" value={dashboard?.summary.totalBookings ?? 0} />
          <SummaryCard label="Inactive listings" value={dashboard?.summary.inactiveListings ?? 0} />
          <SummaryCard label="Confirmed bookings" value={bookingMetrics.confirmed} />
          <SummaryCard label="Completed bookings" value={bookingMetrics.completed} />
          <SummaryCard label="Pending approvals" value={dashboard?.summary.pendingApprovals ?? 0} />
        </div>
      </Panel>
      <Panel title="Operational notes" subtitle="A steadier information hierarchy for admin review.">
        <div className="grid gap-3">
          <GuideTile label="Approval volume" text={`${dashboard?.summary.pendingApprovals ?? 0} listings remain in the moderation backlog.`} />
          <GuideTile label="Booking distribution" text={`${bookingMetrics.confirmed} confirmed, ${bookingMetrics.completed} completed, and ${bookingMetrics.cancelled} cancelled bookings are currently visible.`} />
          <GuideTile label="User population" text={`${dashboard?.userMetrics?.drivers ?? 0} drivers and ${dashboard?.userMetrics?.owners ?? 0} owners are represented in the current dataset.`} />
        </div>
      </Panel>
    </div>
  );
}

function Panel({ children, subtitle, title }) {
  return (
    <section className="mt-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-950">{title}</h2>
      <p className="mt-2 text-sm text-slate-600">{subtitle}</p>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function SummaryCard({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-slate-950">{value}</p>
    </div>
  );
}

function GuideTile({ label, text }) {
  return (
    <div className="rounded-md border border-slate-200 p-4">
      <p className="font-semibold text-slate-950">{label}</p>
      <p className="mt-1 text-sm text-slate-600">{text}</p>
    </div>
  );
}

function EmptyState({ description, title }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
      <p className="font-semibold text-slate-950">{title}</p>
      <p className="mt-2 text-sm text-slate-600">{description}</p>
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="mt-6 grid gap-4 md:grid-cols-2">
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

function ModerationSection({ icon, onApprove, onReject, onToggle, parkings, title }) {
  const SectionIcon = icon;

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="mb-3 inline-flex items-center gap-2 text-xl font-semibold text-slate-950">
        <SectionIcon className="h-5 w-5 text-brand-600" aria-hidden="true" />
        {title}
      </h2>
      {parkings.length === 0 ? <p className="rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-600">Nothing to review.</p> : null}
      <div className="grid gap-4 lg:grid-cols-2">
        {parkings.map((parking) => (
          <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm" key={parking.id}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-semibold text-slate-950">{parking.title}</h3>
                <p className="mt-1 text-sm text-slate-600">{parking.city}, {parking.state} - Rs {parking.hourlyPrice}/hr</p>
              </div>
              <span className={`rounded-md px-2 py-1 text-xs font-semibold capitalize ${statusStyles[parking.verificationStatus]}`}>{parking.verificationStatus}</span>
            </div>
            {parking.rejectionReason ? <p className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-700">{parking.rejectionReason}</p> : null}
            <p className="mt-3 inline-flex items-center gap-2 text-sm text-slate-600">
              <CircleSlash className="h-4 w-4" aria-hidden="true" />
              {parking.isActive ? 'Active' : 'Inactive'}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {onApprove ? <button className="rounded-md bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700" onClick={() => onApprove(parking)} type="button">Approve</button> : null}
              {onReject ? <button className="rounded-md border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50" onClick={() => onReject(parking)} type="button">Reject</button> : null}
              <button className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100" onClick={() => onToggle(parking)} type="button">
                {parking.isActive ? 'Deactivate' : 'Activate'}
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function replaceParking(current, parking) {
  if (!current) {
    return current;
  }

  const allParkings = [
    ...current.parkings.pending,
    ...current.parkings.approved,
    ...current.parkings.rejected
  ].filter((item) => item.id !== parking.id);
  allParkings.unshift(parking);

  return {
    ...current,
    summary: {
      ...current.summary,
      pendingApprovals: allParkings.filter((item) => item.verificationStatus === 'pending').length,
      approvedListings: allParkings.filter((item) => item.verificationStatus === 'approved').length,
      rejectedListings: allParkings.filter((item) => item.verificationStatus === 'rejected').length
    },
    parkings: {
      pending: allParkings.filter((item) => item.verificationStatus === 'pending'),
      approved: allParkings.filter((item) => item.verificationStatus === 'approved'),
      rejected: allParkings.filter((item) => item.verificationStatus === 'rejected')
    }
  };
}

function readAdminCache() {
  if (typeof sessionStorage === 'undefined') {
    return null;
  }

  try {
    const raw = sessionStorage.getItem(ADMIN_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeAdminCache(value) {
  if (typeof sessionStorage === 'undefined') {
    return;
  }

  sessionStorage.setItem(ADMIN_CACHE_KEY, JSON.stringify(value));
}

function matchesListingSearch(parking, term) {
  return [parking.title, parking.city, parking.state, parking.address, parking.area]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .includes(term);
}

function buildBookingMetrics(bookings) {
  return {
    confirmed: bookings.filter((booking) => booking.status === 'confirmed').length,
    completed: bookings.filter((booking) => booking.status === 'completed').length,
    cancelled: bookings.filter((booking) => booking.status === 'cancelled').length,
    pending: bookings.filter((booking) => booking.status === 'pending').length
  };
}
