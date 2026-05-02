import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, Car, Clock, IndianRupee, MapPin, ParkingCircle, RotateCcw, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getApiErrorMessage } from '../../lib/getApiErrorMessage.js';
import { fetchParkingById } from '../parkings/parkingApi.js';
import { cancelBooking, fetchMyBookings } from './bookingApi.js';
import {
  formatBookingDate,
  formatTime12h,
  getComputedStatus,
  groupBookingsByStatus
} from './bookingUtils.js';

// Status badge styles — keyed by computedStatus
const statusConfig = {
  upcoming:  { label: 'Upcoming',  className: 'bg-blue-50 text-blue-700 border border-blue-200' },
  ongoing:   { label: 'Ongoing',   className: 'bg-green-50 text-green-700 border border-green-200' },
  completed: { label: 'Completed', className: 'bg-slate-100 text-slate-600 border border-slate-200' },
  cancelled: { label: 'Cancelled', className: 'bg-red-50 text-red-700 border border-red-200' },
  // Fallback for any stored status not yet mapped
  pending:   { label: 'Pending',   className: 'bg-amber-50 text-amber-700 border border-amber-200' },
  confirmed: { label: 'Confirmed', className: 'bg-brand-50 text-brand-700 border border-brand-200' }
};

function StatusBadge({ status }) {
  const cfg = statusConfig[status] ?? statusConfig.confirmed;
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}

export function MyBookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [cancelTarget, setCancelTarget] = useState(null);

  const groupedBookings = useMemo(() => groupBookingsByStatus(bookings), [bookings]);

  const loadBookings = useCallback(async () => {
    setError('');
    setIsLoading(true);

    try {
      const bookingRows = await fetchMyBookings();
      const parkingIds = [...new Set(bookingRows.map((b) => b.parking))];
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
      setBookings(bookingRows.map((b) => ({ ...b, parkingDetail: parkingMap[b.parking] })));
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Unable to load your bookings'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  async function confirmCancel() {
    if (!cancelTarget) return;
    setError('');

    try {
      const updated = await cancelBooking(cancelTarget.id);
      setBookings((current) =>
        current.map((b) => (b.id === updated.id ? { ...b, ...updated } : b))
      );
      setCancelTarget(null);
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Unable to cancel this booking'));
    }
  }

  return (
    <section className="mx-auto max-w-6xl px-4 py-10">
      {/* Page header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase text-brand-700">Reservations</p>
          <h1 className="mt-2 text-3xl font-bold" style={{ color: 'var(--app-text)' }}>My Bookings</h1>
        </div>
        <Link
          className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          to="/parkings"
        >
          Find parking
        </Link>
      </div>

      {error ? (
        <p className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>
      ) : null}

      {isLoading ? <BookingSkeleton /> : null}

      {!isLoading && bookings.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center">
          <CalendarDays className="mx-auto h-8 w-8 text-slate-400" aria-hidden="true" />
          <h2 className="mt-3 text-lg font-semibold text-slate-950">No bookings yet</h2>
          <p className="mt-2 text-sm text-slate-600">Reserve an approved parking space to see it here.</p>
          <Link className="mt-4 inline-block rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700" to="/parkings">
            Browse parking spaces
          </Link>
        </div>
      ) : null}

      {!isLoading && bookings.length > 0 ? (
        <div className="grid gap-10">
          <BookingGroup
            bookings={groupedBookings.ongoing}
            emptyHidden
            onCancel={setCancelTarget}
            title="Ongoing"
            titleClass="text-green-700"
          />
          <BookingGroup
            bookings={groupedBookings.upcoming}
            emptyHidden
            onCancel={setCancelTarget}
            title="Upcoming"
            titleClass="text-blue-700"
          />
          <BookingGroup
            bookings={groupedBookings.completed}
            emptyHidden
            title="Completed"
            titleClass="text-slate-600"
          />
          <BookingGroup
            bookings={groupedBookings.cancelled}
            emptyHidden
            title="Cancelled"
            titleClass="text-red-600"
          />
        </div>
      ) : null}

      {/* Cancel confirmation dialog */}
      {cancelTarget ? (
        <div className="fixed inset-0 z-40 grid place-items-center bg-slate-950/50 px-4">
          <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">Cancel booking?</h2>
                <p className="mt-1 text-sm text-slate-600">
                  {cancelTarget.parkingDetail?.title
                    ? `Booking at ${cancelTarget.parkingDetail.title} on ${formatBookingDate(cancelTarget.bookingDate)}.`
                    : 'This will release the reserved slot back to the listing.'}
                </p>
              </div>
              <button
                aria-label="Close cancellation dialog"
                className="rounded-md p-1 text-slate-500 hover:bg-slate-100"
                onClick={() => setCancelTarget(null)}
                type="button"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <div className="mt-5 flex gap-3">
              <button
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                onClick={confirmCancel}
                type="button"
              >
                Yes, cancel
              </button>
              <button
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                onClick={() => setCancelTarget(null)}
                type="button"
              >
                Keep booking
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function BookingGroup({ bookings, emptyHidden = false, onCancel, title, titleClass = '' }) {
  if (emptyHidden && bookings.length === 0) return null;

  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <h2 className={`text-lg font-bold ${titleClass}`}>{title}</h2>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
          {bookings.length}
        </span>
      </div>

      {bookings.length === 0 ? (
        <p className="text-sm text-slate-500">No {title.toLowerCase()} bookings.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {bookings.map((booking) => (
            <BookingCard booking={booking} key={booking.id} onCancel={onCancel} />
          ))}
        </div>
      )}
    </section>
  );
}

function BookingCard({ booking, onCancel }) {
  const parking = booking.parkingDetail;
  const computedStatus = getComputedStatus(booking);
  const isUpcoming = computedStatus === 'upcoming';

  return (
    <article className="flex flex-col rounded-xl border bg-white shadow-sm" style={{ borderColor: 'var(--app-border)' }}>
      {/* Card header */}
      <div className="flex items-start justify-between gap-3 border-b px-5 py-4" style={{ borderColor: 'var(--app-border)' }}>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <ParkingCircle className="h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
            <h3 className="truncate font-semibold" style={{ color: 'var(--app-text)' }}>
              {parking?.title ?? 'Parking space'}
            </h3>
          </div>
          {parking?.address || parking?.city ? (
            <p className="mt-0.5 truncate text-xs" style={{ color: 'var(--app-text-muted)' }}>
              {[parking.address, parking.city].filter(Boolean).join(', ')}
            </p>
          ) : null}
        </div>
        <StatusBadge status={computedStatus} />
      </div>

      {/* Time section */}
      <div className="grid grid-cols-2 gap-3 px-5 py-4">
        <div className="flex items-start gap-2">
          <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
          <div>
            <p className="text-xs font-medium text-slate-500">Date</p>
            <p className="mt-0.5 text-sm font-semibold" style={{ color: 'var(--app-text)' }}>
              {formatBookingDate(booking.bookingDate)}
            </p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <Clock className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
          <div>
            <p className="text-xs font-medium text-slate-500">Time</p>
            <p className="mt-0.5 text-sm font-semibold" style={{ color: 'var(--app-text)' }}>
              {formatTime12h(booking.startTime)} – {formatTime12h(booking.endTime)}
            </p>
          </div>
        </div>
      </div>

      {/* Details row */}
      <div className="flex flex-wrap items-center gap-3 border-t px-5 py-3" style={{ borderColor: 'var(--app-border)' }}>
        <DetailChip icon={IndianRupee} label={`₹${booking.totalAmount?.toLocaleString('en-IN')}`} />
        <DetailChip icon={Car} label={booking.vehicleType} />
        <DetailChip icon={ParkingCircle} label={`${booking.slotCount} slot${booking.slotCount === 1 ? '' : 's'}`} />
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2 px-5 py-4">
        {parking ? (
          <Link
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            to={`/parkings/${parking.id}`}
          >
            <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
            View parking
          </Link>
        ) : null}
        {parking ? (
          <Link
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            to={`/parkings/${parking.id}?date=${booking.bookingDate}&startTime=${booking.startTime}&endTime=${booking.endTime}&vehicleType=${booking.vehicleType}`}
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            Rebook
          </Link>
        ) : null}
        {isUpcoming && onCancel ? (
          <button
            className="inline-flex items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-100"
            onClick={() => onCancel(booking)}
            type="button"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
            Cancel
          </button>
        ) : null}
      </div>
    </article>
  );
}

function DetailChip({ icon: Icon, label }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold capitalize text-slate-700">
      <Icon className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
      {label}
    </span>
  );
}

function BookingSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {[0, 1, 2, 3].map((item) => (
        <div className="animate-pulse rounded-xl border border-slate-200 bg-white p-5" key={item}>
          <div className="flex items-start justify-between gap-4">
            <div className="h-5 w-2/3 rounded bg-slate-200" />
            <div className="h-5 w-16 rounded-full bg-slate-200" />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="h-10 rounded bg-slate-100" />
            <div className="h-10 rounded bg-slate-100" />
          </div>
          <div className="mt-4 h-8 rounded bg-slate-100" />
        </div>
      ))}
    </div>
  );
}
