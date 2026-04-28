import { useCallback, useEffect, useState } from 'react';
import { BarChart3, CheckCircle2, Edit3, Trash2 } from 'lucide-react';
import { getApiErrorMessage } from '../../lib/getApiErrorMessage.js';
import { completeOwnerBooking, fetchOwnerBookings } from '../owner/ownerApi.js';
import { createParking, deleteParking, updateParking, uploadParkingImages } from './parkingApi.js';
import { ParkingForm } from './ParkingForm.jsx';

const statusStyles = {
  pending: 'bg-amber-50 text-amber-700',
  approved: 'bg-brand-50 text-brand-700',
  rejected: 'bg-red-50 text-red-700'
};

export function OwnerParkingDashboard() {
  const [bookingFilters, setBookingFilters] = useState({ status: '', parking: '' });
  const [error, setError] = useState('');
  const [editingParking, setEditingParking] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [ownerBookings, setOwnerBookings] = useState([]);
  const [ownerSummary, setOwnerSummary] = useState(null);
  const [parkings, setParkings] = useState([]);

  const loadMine = useCallback(async () => {
    setError('');
    setIsLoading(true);

    try {
      const bookingData = await fetchOwnerBookings(toBookingParams(bookingFilters));
      setParkings(bookingData.parkings);
      setOwnerBookings(bookingData.bookings);
      setOwnerSummary(bookingData.summary);
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Unable to load your owner dashboard'));
    } finally {
      setIsLoading(false);
    }
  }, [bookingFilters]);

  useEffect(() => {
    Promise.resolve().then(loadMine);
  }, [loadMine]);

  async function handleCreate(payload, imageFiles = []) {
    setError('');

    try {
      let parking = await createParking(payload);

      if (imageFiles.length > 0) {
        parking = await uploadParkingImages(parking.id, imageFiles);
      }

      await loadMine();
      setEditingParking(parking);
      return parking;
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Unable to create parking listing'));
      return null;
    }
  }

  async function handleUpdate(payload, imageFiles = []) {
    setError('');

    try {
      let parking = await updateParking(editingParking.id, payload);

      if (imageFiles.length > 0) {
        parking = await uploadParkingImages(parking.id, imageFiles);
      }

      await loadMine();
      setEditingParking(null);
      return parking;
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Unable to update parking listing'));
      return null;
    }
  }

  async function handleDelete(id) {
    setError('');

    try {
      await deleteParking(id);
      await loadMine();
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Unable to delete parking listing'));
    }
  }

  async function handleCompleteBooking(id) {
    setError('');

    try {
      await completeOwnerBooking(id);
      await loadMine();
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Unable to complete booking'));
    }
  }

  function handleMediaChange(parking) {
    setParkings((current) => current.map((item) => (item.id === parking.id ? parking : item)));
    setEditingParking(parking);
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-10">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-950">Owner parking dashboard</h1>
        <p className="mt-2 text-slate-600">Create spaces, monitor reservations, and complete active bookings.</p>
      </div>

      {error ? <p className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}

      {ownerSummary ? (
        <div className="mb-6 grid gap-4 md:grid-cols-4">
          <SummaryCard label="Occupied now" value={ownerSummary.occupiedSlotsNow} />
          <SummaryCard label="Available now" value={ownerSummary.availableSlotsNow} />
          <SummaryCard label="Upcoming reservations" value={ownerSummary.upcomingReservations} />
          <SummaryCard label="Estimated revenue" value={`Rs ${ownerSummary.estimatedRevenue}`} />
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold text-slate-950">{editingParking ? 'Edit parking' : 'Create parking'}</h2>
          <ParkingForm
            key={editingParking?.id ?? 'create'}
            initialParking={editingParking}
            onCancel={editingParking ? () => setEditingParking(null) : undefined}
            onMediaChange={handleMediaChange}
            onSubmit={editingParking ? handleUpdate : handleCreate}
            submitLabel={editingParking ? 'Update listing' : 'Create listing'}
          />
        </div>

        <div className="grid gap-6">
          <section>
            <h2 className="mb-4 text-xl font-semibold text-slate-950">Your listings</h2>
            {isLoading ? <p className="text-sm text-slate-600">Loading your dashboard...</p> : null}
            <div className="grid gap-4">
              {parkings.map((parking) => (
                <article key={parking.id} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                  {parking.coverImage ? (
                    <img alt={parking.coverImage.caption || parking.title} className="mb-4 aspect-video w-full rounded-md object-cover" src={parking.coverImage.url} />
                  ) : null}
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-semibold text-slate-950">{parking.title}</h3>
                      <p className="mt-1 text-sm text-slate-600">
                        {parking.city}, {parking.state} - Rs {parking.hourlyPrice}/hr
                      </p>
                    </div>
                    <span className={`rounded-md px-2 py-1 text-xs font-semibold capitalize ${statusStyles[parking.verificationStatus] ?? 'bg-slate-100 text-slate-700'}`}>
                      {parking.verificationStatus === 'pending' ? 'pending review' : parking.verificationStatus}
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-slate-600">
                    {parking.availableSlots}/{parking.totalSlots} slots available
                  </p>
                  {parking.rejectionReason ? (
                    <p className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-700">Rejection reason: {parking.rejectionReason}</p>
                  ) : null}
                  <div className="mt-4 flex gap-2">
                    <button className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100" type="button" onClick={() => setEditingParking(parking)}>
                      <Edit3 className="h-4 w-4" aria-hidden="true" />
                      Edit
                    </button>
                    <button className="inline-flex items-center gap-2 rounded-md border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50" type="button" onClick={() => handleDelete(parking.id)}>
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
            {!isLoading && parkings.length === 0 ? <p className="rounded-md border border-slate-200 bg-white p-6 text-slate-600">No parking listings yet.</p> : null}
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-950">Reservation operations</h2>
                <p className="mt-1 text-sm text-slate-600">Monitor and complete bookings across your listings.</p>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  Status
                  <select className="rounded-md border border-slate-300 px-3 py-2" onChange={(event) => setBookingFilters((current) => ({ ...current, status: event.target.value }))} value={bookingFilters.status}>
                    <option value="">All</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="completed">Completed</option>
                    <option value="pending">Pending</option>
                  </select>
                </label>
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  Parking
                  <select className="rounded-md border border-slate-300 px-3 py-2" onChange={(event) => setBookingFilters((current) => ({ ...current, parking: event.target.value }))} value={bookingFilters.parking}>
                    <option value="">All listings</option>
                    {parkings.map((parking) => (
                      <option key={parking.id} value={parking.id}>{parking.title}</option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            {ownerSummary?.perListingEarnings?.length ? (
              <div className="mb-4 grid gap-3 md:grid-cols-2">
                {ownerSummary.perListingEarnings.map((item) => (
                  <div className="rounded-md border border-slate-200 p-3" key={item.parking}>
                    <p className="text-sm font-semibold text-slate-950">{item.title}</p>
                    <p className="mt-1 text-sm text-slate-600">{item.bookings} revenue bookings - Rs {item.estimatedRevenue}</p>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="grid gap-3">
              {ownerBookings.map((booking) => (
                <OwnerBookingCard
                  booking={booking}
                  key={booking.id}
                  onComplete={handleCompleteBooking}
                  parking={parkings.find((item) => item.id === booking.parking)}
                />
              ))}
            </div>
            {!isLoading && ownerBookings.length === 0 ? <p className="rounded-md border border-slate-200 p-5 text-sm text-slate-600">No bookings match these filters.</p> : null}
          </section>
        </div>
      </div>
    </section>
  );
}

function SummaryCard({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <BarChart3 className="mb-3 h-5 w-5 text-brand-600" aria-hidden="true" />
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-950">{value}</p>
    </div>
  );
}

function OwnerBookingCard({ booking, onComplete, parking }) {
  return (
    <article className="rounded-lg border border-slate-200 p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h3 className="font-semibold text-slate-950">{parking?.title ?? 'Parking listing'}</h3>
          <p className="mt-1 text-sm text-slate-600">{booking.bookingDate} - {booking.startTime}-{booking.endTime}</p>
          <p className="mt-2 text-sm text-slate-600">{booking.slotCount} slots - {booking.vehicleType} - Rs {booking.totalAmount}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className={`rounded-md px-2 py-1 text-xs font-semibold capitalize ${bookingStatusClass(booking.status)}`}>{booking.status}</span>
          {booking.status === 'confirmed' || booking.status === 'pending' ? (
            <button className="inline-flex items-center gap-2 rounded-md bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700" onClick={() => onComplete(booking.id)} type="button">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              Complete
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function bookingStatusClass(status) {
  const classes = {
    pending: 'bg-amber-50 text-amber-700',
    confirmed: 'bg-brand-50 text-brand-700',
    cancelled: 'bg-red-50 text-red-700',
    completed: 'bg-slate-100 text-slate-700'
  };

  return classes[status] ?? classes.completed;
}

function toBookingParams(filters) {
  return Object.fromEntries(Object.entries(filters).filter(([, value]) => value));
}
