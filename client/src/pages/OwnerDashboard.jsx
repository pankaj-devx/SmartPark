import { useEffect, useState } from 'react';
import { BarChart3, IndianRupee, Loader2, TrendingUp } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { fetchOwnerAnalytics } from '../features/analytics/analyticsApi.js';
import { getApiErrorMessage } from '../lib/getApiErrorMessage.js';
import { useAuth } from '../features/auth/useAuth.js';

export function OwnerDashboard() {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        const data = await fetchOwnerAnalytics();
        if (import.meta.env.DEV) {
          console.log('[OwnerDashboard] analytics response:', data);
          console.log('[OwnerDashboard] bookingsPerDay:', data?.bookingsPerDay);
          console.log('[OwnerDashboard] peakHours:', data?.peakHours);
        }
        if (isMounted) setAnalytics(data);
      } catch (err) {
        if (isMounted) setError(getApiErrorMessage(err, 'Unable to load owner analytics'));
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    load();
    return () => { isMounted = false; };
  }, []);

  if (isLoading) {
    return (
      <section className="mx-auto max-w-5xl px-4 py-12">
        <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--app-text-soft)' }}>
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Loading your analytics…
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="mx-auto max-w-5xl px-4 py-12">
        <p className="text-sm text-red-600">{error}</p>
      </section>
    );
  }

  // Normalise peak hours for the bar chart.
  // _id from $hour is a number (0–23); pad to "HH:00" and sort chronologically.
  const peakHoursData = (analytics?.peakHours ?? [])
    .map((item) => ({
      hour: `${String(item._id ?? 0).padStart(2, '0')}:00`,
      bookings: item.count ?? 0
    }))
    .sort((a, b) => a.hour.localeCompare(b.hour));

  // _id from $dateToString is already "YYYY-MM-DD"
  const bookingsPerDayData = (analytics?.bookingsPerDay ?? []).map((item) => ({
    date: item._id ?? '',
    bookings: item.count ?? 0
  }));

  const hasBookingsOverTime = bookingsPerDayData.length > 0;
  const hasPeakHours        = peakHoursData.length > 0;

  return (
    <section className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6">
        <h1 className="app-heading text-2xl font-bold">Owner Dashboard</h1>
        <p className="app-copy mt-1 text-sm">
          Hello, {user?.name}. Here's an overview of your parking business.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard
          icon={<IndianRupee className="h-5 w-5 text-brand-600" aria-hidden="true" />}
          label="Total Earnings"
          value={`₹${(analytics?.totalEarnings ?? 0).toLocaleString('en-IN')}`}
        />
        <StatCard
          icon={<BarChart3 className="h-5 w-5 text-brand-600" aria-hidden="true" />}
          label="Total Bookings"
          value={analytics?.totalBookings ?? 0}
        />
      </div>

      {/* Bookings per day — line chart — always rendered */}
      <div className="app-panel mt-6">
        <div className="mb-4 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-brand-600" aria-hidden="true" />
          <h2 className="app-heading text-sm font-semibold">Bookings Over Time</h2>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={bookingsPerDayData} margin={{ top: 4, right: 16, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--app-border)" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: 'var(--app-text-muted)' }}
              tickFormatter={(v) => (v ? v.slice(5) : '')}
            />
            <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'var(--app-text-muted)' }} />
            <Tooltip
              contentStyle={{
                background: 'var(--app-surface)',
                border: '1px solid var(--app-border)',
                borderRadius: 8,
                fontSize: 12
              }}
            />
            <Line
              dataKey="bookings"
              dot={false}
              name="Bookings"
              stroke="#2563eb"
              strokeWidth={2}
              type="monotone"
            />
          </LineChart>
        </ResponsiveContainer>
        {!hasBookingsOverTime && (
          <p className="app-copy mt-2 text-center text-xs">No bookings yet. Trends will appear here once customers start booking.</p>
        )}
      </div>

      {/* Peak hours — bar chart — always rendered */}
      <div className="app-panel mt-6">
        <div className="mb-4 flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-brand-600" aria-hidden="true" />
          <h2 className="app-heading text-sm font-semibold">Peak Booking Hours</h2>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={peakHoursData} margin={{ top: 4, right: 16, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--app-border)" />
            <XAxis dataKey="hour" tick={{ fontSize: 11, fill: 'var(--app-text-muted)' }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'var(--app-text-muted)' }} />
            <Tooltip
              contentStyle={{
                background: 'var(--app-surface)',
                border: '1px solid var(--app-border)',
                borderRadius: 8,
                fontSize: 12
              }}
            />
            <Bar dataKey="bookings" fill="#2563eb" name="Bookings" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        {!hasPeakHours && (
          <p className="app-copy mt-2 text-center text-xs">No peak hour data yet. Trends will appear here once customers start booking.</p>
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
