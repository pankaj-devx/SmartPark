import { useEffect, useState } from 'react';
import {
  BarChart3,
  Calendar,
  Clock,
  DollarSign,
  Filter,
  IndianRupee,
  Loader2,
  MapPin,
  TrendingUp,
  Users,
  XCircle,
  CheckCircle,
  AlertCircle,
  Award
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend
} from 'recharts';
import { fetchOwnerAnalytics } from '../features/analytics/analyticsApi.js';
import { getApiErrorMessage } from '../lib/getApiErrorMessage.js';
import { useAuth } from '../features/auth/useAuth.js';

export function OwnerDashboard() {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filters
  const [dateRange, setDateRange] = useState('30'); // 7, 30, 90, or 'custom'
  const [selectedParking, setSelectedParking] = useState('all');

  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        setIsLoading(true);
        const filters = {};
        
        if (dateRange !== 'custom') {
          filters.dateRange = dateRange;
        }
        
        if (selectedParking !== 'all') {
          filters.parkingId = selectedParking;
        }
        
        const data = await fetchOwnerAnalytics(filters);
        if (isMounted) setAnalytics(data);
      } catch (err) {
        if (isMounted) setError(getApiErrorMessage(err, 'Unable to load owner analytics'));
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    load();
    return () => { isMounted = false; };
  }, [dateRange, selectedParking]);

  if (isLoading) {
    return (
      <section className="mx-auto max-w-7xl px-4 py-12">
        <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--app-text-soft)' }}>
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Loading your analytics…
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="mx-auto max-w-7xl px-4 py-12">
        <div className="app-panel border-red-200 bg-red-50">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      </section>
    );
  }

  const kpis = analytics?.kpis ?? {};
  const revenueTrend = analytics?.revenueTrend ?? [];
  const bookingsTrend = analytics?.bookingsTrend ?? [];
  const peakHours = analytics?.peakHours ?? [];
  const listingPerformance = analytics?.listingPerformance ?? [];
  const customerInsights = analytics?.customerInsights ?? {};
  const recentActivity = analytics?.recentActivity ?? [];

  // Format revenue trend for chart
  const revenueTrendData = revenueTrend.map(item => ({
    date: formatDateShort(item.date),
    revenue: item.revenue,
    bookings: item.bookings
  }));

  // Format bookings trend for multi-line chart
  const bookingsTrendData = bookingsTrend.map(item => ({
    date: formatDateShort(item.date),
    confirmed: item.confirmed,
    completed: item.completed,
    cancelled: item.cancelled
  }));

  // Format peak hours for bar chart
  const peakHoursData = peakHours.map(item => ({
    hour: `${String(item.hour).padStart(2, '0')}:00`,
    bookings: item.bookings
  }));

  // Get best performer
  const bestPerformer = listingPerformance.length > 0 ? listingPerformance[0] : null;

  return (
    <section className="mx-auto max-w-7xl px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="app-heading text-3xl font-bold">Owner Analytics</h1>
        <p className="app-copy mt-1 text-sm">
          Hello, {user?.name}. Comprehensive insights into your parking business.
        </p>
      </div>

      {/* Filters */}
      <div className="app-panel mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-4 w-4 text-brand-600" aria-hidden="true" />
          <h2 className="app-heading text-sm font-semibold">Filters</h2>
        </div>
        <div className="flex flex-wrap gap-4">
          <div>
            <label htmlFor="dateRange" className="app-copy-soft block text-xs mb-1">
              Date Range
            </label>
            <select
              id="dateRange"
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="app-input text-sm"
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
            </select>
          </div>
          
          {listingPerformance.length > 1 && (
            <div>
              <label htmlFor="parkingFilter" className="app-copy-soft block text-xs mb-1">
                Parking Location
              </label>
              <select
                id="parkingFilter"
                value={selectedParking}
                onChange={(e) => setSelectedParking(e.target.value)}
                className="app-input text-sm"
              >
                <option value="all">All Locations</option>
                {listingPerformance.map(listing => (
                  <option key={listing.parkingId} value={listing.parkingId}>
                    {listing.parkingName}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* SECTION 1: KPI Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-6">
        <KPICard
          icon={<IndianRupee className="h-5 w-5" aria-hidden="true" />}
          label="Total Revenue"
          value={`₹${kpis.totalRevenue?.toLocaleString('en-IN') ?? 0}`}
          subtitle="Completed bookings only"
          color="green"
        />
        <KPICard
          icon={<Clock className="h-5 w-5" aria-hidden="true" />}
          label="Active Reservations"
          value={kpis.activeReservations ?? 0}
          subtitle="Current confirmed slots"
          color="blue"
        />
        <KPICard
          icon={<CheckCircle className="h-5 w-5" aria-hidden="true" />}
          label="Completed Bookings"
          value={kpis.completedBookings ?? 0}
          subtitle="Successfully finished"
          color="green"
        />
        <KPICard
          icon={<XCircle className="h-5 w-5" aria-hidden="true" />}
          label="Cancelled Bookings"
          value={kpis.cancelledBookings ?? 0}
          subtitle="Customer cancellations"
          color="red"
        />
        <KPICard
          icon={<DollarSign className="h-5 w-5" aria-hidden="true" />}
          label="Avg Booking Value"
          value={`₹${kpis.averageBookingValue?.toFixed(0) ?? 0}`}
          subtitle="Per completed booking"
          color="purple"
        />
        <KPICard
          icon={<BarChart3 className="h-5 w-5" aria-hidden="true" />}
          label="Occupancy Rate"
          value={`${kpis.occupancyRate?.toFixed(1) ?? 0}%`}
          subtitle="Reserved / Total slots"
          color="orange"
        />
      </div>

      {/* SECTION 2: Revenue Trend Chart */}
      <div className="app-panel mb-6">
        <div className="mb-4 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-green-600" aria-hidden="true" />
          <h2 className="app-heading text-lg font-semibold">Revenue Trend</h2>
          <span className="app-copy-soft text-xs">(Completed bookings only)</span>
        </div>
        {revenueTrendData.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={revenueTrendData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--app-border)" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: 'var(--app-text-muted)' }}
              />
              <YAxis
                tick={{ fontSize: 11, fill: 'var(--app-text-muted)' }}
                tickFormatter={(value) => `₹${value}`}
              />
              <Tooltip
                contentStyle={{
                  background: 'var(--app-surface)',
                  border: '1px solid var(--app-border)',
                  borderRadius: 8,
                  fontSize: 12
                }}
                formatter={(value, name) => {
                  if (name === 'revenue') return [`₹${value}`, 'Revenue'];
                  return [value, 'Bookings'];
                }}
              />
              <Line
                dataKey="revenue"
                dot={false}
                name="Revenue"
                stroke="#10b981"
                strokeWidth={2}
                type="monotone"
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState message="No revenue data yet. Revenue will appear once bookings are completed." />
        )}
      </div>

      {/* SECTION 3: Bookings Trend Chart */}
      <div className="app-panel mb-6">
        <div className="mb-4 flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-brand-600" aria-hidden="true" />
          <h2 className="app-heading text-lg font-semibold">Bookings Trend</h2>
          <span className="app-copy-soft text-xs">(By status)</span>
        </div>
        {bookingsTrendData.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={bookingsTrendData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--app-border)" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: 'var(--app-text-muted)' }}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fill: 'var(--app-text-muted)' }}
              />
              <Tooltip
                contentStyle={{
                  background: 'var(--app-surface)',
                  border: '1px solid var(--app-border)',
                  borderRadius: 8,
                  fontSize: 12
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line
                dataKey="confirmed"
                dot={false}
                name="Confirmed"
                stroke="#3b82f6"
                strokeWidth={2}
                type="monotone"
              />
              <Line
                dataKey="completed"
                dot={false}
                name="Completed"
                stroke="#10b981"
                strokeWidth={2}
                type="monotone"
              />
              <Line
                dataKey="cancelled"
                dot={false}
                name="Cancelled"
                stroke="#ef4444"
                strokeWidth={2}
                type="monotone"
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState message="No booking trends yet. Data will appear once you receive bookings." />
        )}
      </div>

      {/* SECTION 4: Peak Booking Hours */}
      <div className="app-panel mb-6">
        <div className="mb-4 flex items-center gap-2">
          <Clock className="h-4 w-4 text-brand-600" aria-hidden="true" />
          <h2 className="app-heading text-lg font-semibold">Peak Booking Hours</h2>
          <span className="app-copy-soft text-xs">(Excludes cancelled)</span>
        </div>
        {peakHoursData.length > 0 ? (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={peakHoursData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
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
              <Bar dataKey="bookings" fill="#3b82f6" name="Bookings" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState message="No peak hour data yet. Patterns will emerge as bookings increase." />
        )}
      </div>

      {/* SECTION 5: Listing Performance */}
      <div className="app-panel mb-6">
        <div className="mb-4 flex items-center gap-2">
          <MapPin className="h-4 w-4 text-brand-600" aria-hidden="true" />
          <h2 className="app-heading text-lg font-semibold">Listing Performance</h2>
        </div>
        {listingPerformance.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: 'var(--app-border)' }}>
                  <th className="app-copy-soft text-left py-2 px-3 font-medium">Parking</th>
                  <th className="app-copy-soft text-right py-2 px-3 font-medium">Total</th>
                  <th className="app-copy-soft text-right py-2 px-3 font-medium">Completed</th>
                  <th className="app-copy-soft text-right py-2 px-3 font-medium">Cancelled</th>
                  <th className="app-copy-soft text-right py-2 px-3 font-medium">Revenue</th>
                  <th className="app-copy-soft text-right py-2 px-3 font-medium">Cancel Rate</th>
                </tr>
              </thead>
              <tbody>
                {listingPerformance.map((listing, idx) => (
                  <tr
                    key={listing.parkingId}
                    className="border-b"
                    style={{ borderColor: 'var(--app-border)' }}
                  >
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        {idx === 0 && bestPerformer && (
                          <Award className="h-4 w-4 text-yellow-500" aria-label="Best performer" />
                        )}
                        <span className="app-copy font-medium">{listing.parkingName}</span>
                      </div>
                    </td>
                    <td className="app-copy text-right py-3 px-3">{listing.totalBookings}</td>
                    <td className="text-right py-3 px-3">
                      <span className="text-green-600 font-medium">{listing.completedBookings}</span>
                    </td>
                    <td className="text-right py-3 px-3">
                      <span className="text-red-600 font-medium">{listing.cancelledBookings}</span>
                    </td>
                    <td className="app-copy text-right py-3 px-3 font-semibold">
                      ₹{listing.revenue.toLocaleString('en-IN')}
                    </td>
                    <td className="app-copy text-right py-3 px-3">{listing.cancellationRate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState message="No listing performance data yet. Add parking listings to see performance metrics." />
        )}
      </div>

      {/* SECTION 6: Customer Insights */}
      <div className="app-panel mb-6">
        <div className="mb-4 flex items-center gap-2">
          <Users className="h-4 w-4 text-brand-600" aria-hidden="true" />
          <h2 className="app-heading text-lg font-semibold">Customer Insights</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <InsightCard
            label="Unique Customers"
            value={customerInsights.uniqueCustomers ?? 0}
            icon={<Users className="h-4 w-4 text-blue-600" />}
          />
          <InsightCard
            label="Repeat Customers"
            value={customerInsights.repeatCustomers ?? 0}
            icon={<Users className="h-4 w-4 text-green-600" />}
          />
          <InsightCard
            label="Avg Slots/Booking"
            value={customerInsights.averageSlotsPerBooking ?? 0}
            icon={<BarChart3 className="h-4 w-4 text-purple-600" />}
          />
          <InsightCard
            label="Avg Duration (hrs)"
            value={customerInsights.averageBookingDuration ?? 0}
            icon={<Clock className="h-4 w-4 text-orange-600" />}
          />
        </div>
      </div>

      {/* SECTION 7: Recent Activity */}
      <div className="app-panel">
        <div className="mb-4 flex items-center gap-2">
          <Calendar className="h-4 w-4 text-brand-600" aria-hidden="true" />
          <h2 className="app-heading text-lg font-semibold">Recent Activity</h2>
        </div>
        {recentActivity.length > 0 ? (
          <div className="space-y-3">
            {recentActivity.map((activity) => (
              <ActivityItem key={activity.id} activity={activity} />
            ))}
          </div>
        ) : (
          <EmptyState message="No recent activity. Activity will appear as bookings are created." />
        )}
      </div>
    </section>
  );
}

// KPI Card Component
function KPICard({ icon, label, value, subtitle, color = 'blue' }) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600'
  };

  return (
    <div className="app-panel">
      <div className="flex items-start gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${colorClasses[color]}`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="app-copy-soft text-xs uppercase tracking-wide">{label}</p>
          <p className="app-heading mt-1 text-2xl font-bold truncate">{value}</p>
          {subtitle && <p className="app-copy-soft text-xs mt-0.5">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}

// Insight Card Component
function InsightCard({ label, value, icon }) {
  return (
    <div className="border rounded-lg p-4" style={{ borderColor: 'var(--app-border)' }}>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="app-copy-soft text-xs">{label}</span>
      </div>
      <p className="app-heading text-xl font-bold">{value}</p>
    </div>
  );
}

// Activity Item Component
function ActivityItem({ activity }) {
  const typeConfig = {
    new: {
      icon: <AlertCircle className="h-4 w-4 text-blue-600" />,
      label: 'New Booking',
      color: 'text-blue-600'
    },
    completed: {
      icon: <CheckCircle className="h-4 w-4 text-green-600" />,
      label: 'Completed',
      color: 'text-green-600'
    },
    cancelled: {
      icon: <XCircle className="h-4 w-4 text-red-600" />,
      label: 'Cancelled',
      color: 'text-red-600'
    }
  };

  const config = typeConfig[activity.type] || typeConfig.new;

  return (
    <div className="flex items-start gap-3 pb-3 border-b last:border-b-0" style={{ borderColor: 'var(--app-border)' }}>
      <div className="mt-0.5">{config.icon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className={`font-medium text-sm ${config.color}`}>{config.label}</span>
          <span className="app-copy text-xs">by {activity.customerName}</span>
        </div>
        <p className="app-copy text-sm mt-1">
          {activity.parkingName} • {formatDate(activity.bookingDate)} at {formatTime(activity.startTime)}
        </p>
        <p className="app-copy-soft text-xs mt-1">
          ₹{activity.amount.toLocaleString('en-IN')} • {formatRelativeTime(activity.createdAt)}
        </p>
      </div>
    </div>
  );
}

// Empty State Component
function EmptyState({ message }) {
  return (
    <div className="text-center py-8">
      <p className="app-copy-soft text-sm">{message}</p>
    </div>
  );
}

// Utility Functions
function formatDateShort(dateStr) {
  if (!dateStr) return '';
  // "2026-05-10" -> "05-10"
  return dateStr.slice(5);
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  // "2026-05-10" -> "10 May 2026"
  const [year, month, day] = dateStr.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${parseInt(day)} ${months[parseInt(month) - 1]} ${year}`;
}

function formatTime(timeStr) {
  if (!timeStr) return '';
  // "14:30" -> "2:30 PM"
  const [hours, minutes] = timeStr.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${String(minutes).padStart(2, '0')} ${period}`;
}

function formatRelativeTime(timestamp) {
  if (!timestamp) return '';
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}
