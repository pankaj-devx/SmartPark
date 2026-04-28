import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, CircleSlash, ClipboardCheck, Search, XCircle } from 'lucide-react';
import { getApiErrorMessage } from '../../lib/getApiErrorMessage.js';
import {
  approveAdminParking,
  fetchAdminBookings,
  fetchAdminDashboard,
  rejectAdminParking,
  toggleAdminParkingActive
} from './adminApi.js';

const statusOptions = ['', 'pending', 'confirmed', 'cancelled', 'completed'];
const statusStyles = {
  pending: 'bg-amber-50 text-amber-700',
  approved: 'bg-brand-50 text-brand-700',
  rejected: 'bg-red-50 text-red-700',
  confirmed: 'bg-brand-50 text-brand-700',
  cancelled: 'bg-red-50 text-red-700',
  completed: 'bg-slate-100 text-slate-700'
};

export function AdminDashboardPage() {
  const [bookings, setBookings] = useState([]);
  const [bookingStatus, setBookingStatus] = useState('');
  const [dashboard, setDashboard] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [search, setSearch] = useState('');

  const filteredBookings = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) {
      return bookings;
    }

    return bookings.filter((booking) => `${booking.parking} ${booking.user}`.toLowerCase().includes(term));
  }, [bookings, search]);

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

  if (isLoading && !dashboard) {
    return (
      <section className="mx-auto max-w-7xl px-4 py-10">
        <div className="h-32 animate-pulse rounded-lg bg-slate-200" />
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-10">
      <div className="mb-6">
        <p className="text-sm font-medium uppercase text-brand-700">Admin</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">Platform control center</h1>
      </div>

      {error ? <p className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}

      {dashboard ? (
        <>
          <div className="mb-8 grid gap-4 md:grid-cols-4">
            <SummaryCard label="Pending approvals" value={dashboard.summary.pendingApprovals} />
            <SummaryCard label="Approved listings" value={dashboard.summary.approvedListings} />
            <SummaryCard label="Total bookings" value={dashboard.summary.totalBookings} />
            <SummaryCard label="Total users" value={dashboard.summary.totalUsers} />
          </div>

          <div className="grid gap-8">
            <ModerationSection
              icon={ClipboardCheck}
              onApprove={(parking) => applyParkingUpdate(() => approveAdminParking(parking.id))}
              onReject={(parking) => setRejectTarget(parking)}
              onToggle={(parking) => applyParkingUpdate(() => toggleAdminParkingActive(parking.id))}
              parkings={dashboard.parkings.pending}
              title="Pending listings"
            />
            <ModerationSection
              icon={CheckCircle2}
              onReject={(parking) => setRejectTarget(parking)}
              onToggle={(parking) => applyParkingUpdate(() => toggleAdminParkingActive(parking.id))}
              parkings={dashboard.parkings.approved}
              title="Approved listings"
            />
            <ModerationSection
              icon={XCircle}
              onApprove={(parking) => applyParkingUpdate(() => approveAdminParking(parking.id))}
              onToggle={(parking) => applyParkingUpdate(() => toggleAdminParkingActive(parking.id))}
              parkings={dashboard.parkings.rejected}
              title="Rejected listings"
            />
          </div>
        </>
      ) : null}

      <section className="mt-10">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-950">Booking oversight</h2>
            <p className="mt-1 text-sm text-slate-600">Read-only monitoring for platform operations.</p>
          </div>
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
              Search parking/user id
              <div className="flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2">
                <Search className="h-4 w-4 text-slate-500" aria-hidden="true" />
                <input className="min-w-0 flex-1 outline-none" onChange={(event) => setSearch(event.target.value)} value={search} />
              </div>
            </label>
          </div>
        </div>
        <div className="grid gap-3">
          {filteredBookings.map((booking) => (
            <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm" key={booking.id}>
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-semibold text-slate-950">{booking.bookingDate} · {booking.startTime}-{booking.endTime}</p>
                  <p className="mt-1 text-sm text-slate-600">Parking {booking.parking} · User {booking.user}</p>
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
      </section>

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

function ModerationSection({ icon, onApprove, onReject, onToggle, parkings, title }) {
  const SectionIcon = icon;

  return (
    <section>
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
                <p className="mt-1 text-sm text-slate-600">{parking.city}, {parking.state} · Rs {parking.hourlyPrice}/hr</p>
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
