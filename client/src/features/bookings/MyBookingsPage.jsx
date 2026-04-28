import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, RotateCcw, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getApiErrorMessage } from '../../lib/getApiErrorMessage.js';
import { fetchParkingById } from '../parkings/parkingApi.js';
import { cancelBooking, fetchMyBookings } from './bookingApi.js';
import { groupBookingsByStatus } from './bookingUtils.js';

const statusStyles = {
  pending: 'bg-amber-50 text-amber-700',
  confirmed: 'bg-brand-50 text-brand-700',
  cancelled: 'bg-red-50 text-red-700',
  completed: 'bg-slate-100 text-slate-700'
};

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
      setError(getApiErrorMessage(apiError, 'Unable to load your bookings'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    Promise.resolve().then(loadBookings);
  }, [loadBookings]);

  async function confirmCancel() {
    if (!cancelTarget) {
      return;
    }

    setError('');

    try {
      const updated = await cancelBooking(cancelTarget.id);
      setBookings((current) =>
        current.map((booking) =>
          booking.id === updated.id
            ? {
                ...booking,
                ...updated
              }
            : booking
        )
      );
      setCancelTarget(null);
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Unable to cancel this booking'));
    }
  }

  return (
    <section className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase text-brand-700">Reservations</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-950">My bookings</h1>
        </div>
        <Link className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100" to="/parkings">
          Book again
        </Link>
      </div>

      {error ? <p className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
      {isLoading ? <BookingSkeleton /> : null}

      {!isLoading && bookings.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center">
          <CalendarDays className="mx-auto h-8 w-8 text-slate-400" aria-hidden="true" />
          <h2 className="mt-3 text-lg font-semibold text-slate-950">No bookings yet</h2>
          <p className="mt-2 text-sm text-slate-600">Reserve an approved parking space to see it here.</p>
        </div>
      ) : null}

      {!isLoading && bookings.length > 0 ? (
        <div className="grid gap-8">
          <BookingSection bookings={groupedBookings.upcoming} onCancel={setCancelTarget} title="Upcoming" />
          <BookingSection bookings={groupedBookings.cancelled} title="Cancelled" />
          <BookingSection bookings={groupedBookings.completed} title="Completed" />
        </div>
      ) : null}

      {cancelTarget ? (
        <div className="fixed inset-0 z-40 grid place-items-center bg-slate-950/50 px-4">
          <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">Cancel booking?</h2>
                <p className="mt-2 text-sm text-slate-600">This will release the reserved slot back to the listing.</p>
              </div>
              <button aria-label="Close cancellation dialog" className="rounded-md p-1 text-slate-500 hover:bg-slate-100" onClick={() => setCancelTarget(null)} type="button">
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <div className="mt-5 flex gap-3">
              <button className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700" onClick={confirmCancel} type="button">
                Cancel booking
              </button>
              <button className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100" onClick={() => setCancelTarget(null)} type="button">
                Keep booking
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function BookingSection({ bookings, onCancel, title }) {
  if (bookings.length === 0) {
    return null;
  }

  return (
    <section>
      <h2 className="mb-3 text-xl font-semibold text-slate-950">{title}</h2>
      <div className="grid gap-4 md:grid-cols-2">
        {bookings.map((booking) => (
          <BookingCard booking={booking} key={booking.id} onCancel={onCancel} />
        ))}
      </div>
    </section>
  );
}

function BookingCard({ booking, onCancel }) {
  const parking = booking.parkingDetail;

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold text-slate-950">{parking?.title ?? 'Parking listing'}</h3>
          <p className="mt-1 text-sm text-slate-600">
            {booking.bookingDate} · {booking.startTime}-{booking.endTime}
          </p>
        </div>
        <span className={`rounded-md px-2 py-1 text-xs font-semibold capitalize ${statusStyles[booking.status] ?? statusStyles.completed}`}>
          {booking.status}
        </span>
      </div>

      <dl className="mt-4 grid gap-3 text-sm text-slate-700 sm:grid-cols-3">
        <SummaryItem label="Slots" value={booking.slotCount} />
        <SummaryItem label="Vehicle" value={booking.vehicleType} />
        <SummaryItem label="Amount" value={`Rs ${booking.totalAmount}`} />
      </dl>

      <div className="mt-5 flex flex-wrap gap-2">
        {parking ? (
          <Link className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100" to={`/parkings/${parking.id}`}>
            View parking
          </Link>
        ) : null}
        {(booking.status === 'confirmed' || booking.status === 'pending') && onCancel ? (
          <button className="inline-flex items-center gap-2 rounded-md border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50" onClick={() => onCancel(booking)} type="button">
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Cancel
          </button>
        ) : null}
      </div>
    </article>
  );
}

function SummaryItem({ label, value }) {
  return (
    <div>
      <dt className="text-slate-500">{label}</dt>
      <dd className="mt-1 font-semibold capitalize text-slate-950">{value}</dd>
    </div>
  );
}

function BookingSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
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
