import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, CalendarCheck2, IndianRupee, Loader2 } from 'lucide-react';
import { fetchDriverAnalytics } from '../features/analytics/analyticsApi.js';
import { formatBookingDate, formatTime12h, getComputedStatus } from '../features/bookings/bookingUtils.js';
import { getApiErrorMessage } from '../lib/getApiErrorMessage.js';
import { useAuth } from '../features/auth/useAuth.js';

const statusConfig = {
  upcoming:  'bg-blue-50 text-blue-700',
  ongoing:   'bg-green-50 text-green-700',
  completed: 'bg-slate-100 text-slate-600',
  cancelled: 'bg-red-50 text-red-700',
  pending:   'bg-amber-50 text-amber-700',
  confirmed: 'bg-brand-50 text-brand-700'
};

export function DriverDashboard() {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        const data = await fetchDriverAnalytics();
        if (isMounted) setAnalytics(data);
      } catch (err) {
        if (isMounted) setError(getApiErrorMessage(err, 'Unable to load your analytics'));
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    load();
    return () => { isMounted = false; };
  }, []);

  if (isLoading) {
    return (
      <section className="mx-auto max-w-4xl px-4 py-12">
        <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--app-text-soft)' }}>
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Loading your analytics…
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="mx-auto max-w-4xl px-4 py-12">
        <p className="text-sm text-red-600">{error}</p>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6">
        <h1 className="app-heading text-2xl font-bold">My Dashboard</h1>
        <p className="app-copy mt-1 text-sm">
          Welcome back, {user?.name}. Here's a summary of your parking activity.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard
          icon={<CalendarCheck2 className="h-5 w-5 text-brand-600" aria-hidden="true" />}
          label="Total Bookings"
          value={analytics?.totalBookings ?? 0}
        />
        <StatCard
          icon={<IndianRupee className="h-5 w-5 text-brand-600" aria-hidden="true" />}
          label="Total Spent"
          value={`₹${(analytics?.totalSpent ?? 0).toLocaleString('en-IN')}`}
        />
      </div>

      {/* Status breakdown */}
      {analytics?.statusBreakdown?.length > 0 && (
        <div className="app-panel mt-6">
          <div className="mb-3 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-brand-600" aria-hidden="true" />
            <h2 className="app-heading text-sm font-semibold">Booking Status Breakdown</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {analytics.statusBreakdown.map((item) => (
              <span
                key={item._id}
                className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusConfig[item._id] ?? 'bg-slate-100 text-slate-700'}`}
              >
                {item._id}: {item.count}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Recent bookings */}
      <div className="app-panel mt-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="app-heading text-sm font-semibold">Recent Bookings</h2>
          <Link className="text-xs font-semibold text-brand-600 hover:text-brand-700" to="/bookings">
            View all
          </Link>
        </div>

        {analytics?.recentBookings?.length === 0 ? (
          <p className="app-copy text-sm">No bookings yet. Start by finding a parking space.</p>
        ) : (
          <ul className="divide-y" style={{ borderColor: 'var(--app-border)' }}>
            {analytics?.recentBookings?.map((booking) => {
              const computedStatus = getComputedStatus(booking);
              return (
                <li key={booking._id} className="py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="app-heading truncate text-sm font-semibold">
                        {booking.parking?.title ?? 'Parking space'}
                      </p>
                      <p className="app-copy-soft mt-0.5 text-xs">
                        {booking.parking?.city ? `${booking.parking.city} · ` : ''}
                        {formatBookingDate(booking.bookingDate)} · {formatTime12h(booking.startTime)}–{formatTime12h(booking.endTime)}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${statusConfig[computedStatus] ?? 'bg-slate-100 text-slate-700'}`}>
                        {computedStatus}
                      </span>
                      <span className="app-heading text-xs font-semibold">
                        ₹{booking.totalAmount?.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}

function StatCard({ icon, label, value }) {
  return (
    <div className="app-panel flex items-center gap-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50">
        {icon}
      </div>
      <div>
        <p className="app-copy-soft text-xs uppercase tracking-wide">{label}</p>
        <p className="app-heading mt-0.5 text-2xl font-bold">{value}</p>
      </div>
    </div>
  );
}
