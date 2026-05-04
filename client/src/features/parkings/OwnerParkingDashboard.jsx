import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { BarChart3, CheckCircle2, Edit3, ExternalLink, Search, Trash2 } from 'lucide-react';
import { getApiErrorMessage } from '../../lib/getApiErrorMessage.js';
import { ProfilePage } from '../../pages/ProfilePage.jsx';
import { completeOwnerBooking, fetchOwnerBookings } from '../owner/ownerApi.js';
import { createParking, deleteParking, updateParking, uploadParkingImages } from './parkingApi.js';
import { ParkingForm } from './ParkingForm.jsx';

const OWNER_CACHE_KEY = 'smartpark_owner_dashboard_cache';
const statusStyles = {
  pending: 'bg-amber-50 text-amber-700',
  approved: 'bg-brand-50 text-brand-700',
  rejected: 'bg-red-50 text-red-700'
};

const cachedData = readOwnerCache();

export function OwnerParkingDashboard({ activeSection = 'dashboard' }) {
  const [searchParams] = useSearchParams();
  const [bookingFilters, setBookingFilters] = useState({ status: '', parking: '', query: '' });
  const [error, setError] = useState('');
  const [editingParking, setEditingParking] = useState(null);
  const [isLoading, setIsLoading] = useState(!cachedData);
  const [ownerBookings, setOwnerBookings] = useState(cachedData?.ownerBookings ?? []);
  const [ownerSummary, setOwnerSummary] = useState(cachedData?.ownerSummary ?? null);
  const [parkings, setParkings] = useState(cachedData?.parkings ?? []);
  const selectedSection = activeSection === 'dashboard' ? 'overview' : activeSection;

  const loadMine = useCallback(async () => {
    setError('');
    setIsLoading(true);

    try {
      console.log('[OwnerDashboard] Loading owner data with filters:', bookingFilters);
      const bookingData = await fetchOwnerBookings(toBookingParams(bookingFilters));
      setParkings(bookingData.parkings);
      setOwnerBookings(bookingData.bookings);
      setOwnerSummary(bookingData.summary);
      console.log('[OwnerDashboard] Owner data loaded:', {
        bookings: bookingData.bookings.length,
        parkings: bookingData.parkings.length
      });
      writeOwnerCache({
        ownerBookings: bookingData.bookings,
        ownerSummary: bookingData.summary,
        parkings: bookingData.parkings
      });
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Unable to load your owner dashboard'));
    } finally {
      setIsLoading(false);
    }
  }, [bookingFilters]);

  useEffect(() => {
    Promise.resolve().then(loadMine);
  }, [loadMine]);

  // When arriving from the detail page via ?edit=<id>, pre-select that parking
  // in the form as soon as the listings have loaded.
  const editIdFromUrl = searchParams.get('edit');
  useEffect(() => {
    if (!editIdFromUrl || parkings.length === 0) return;
    const target = parkings.find((p) => p.id === editIdFromUrl);
    if (target) setEditingParking(target);
  }, [editIdFromUrl, parkings]);

  async function handleCreate(payload, imageFiles = []) {
    setError('');

    try {
      console.log('[OwnerDashboard] Creating parking...');
      let parking = await createParking(payload);

      if (imageFiles.length > 0) {
        parking = await uploadParkingImages(parking.id, imageFiles);
      }

      console.log('[OwnerDashboard] Parking created, refreshing data...');
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
      console.log('[OwnerDashboard] Updating parking:', editingParking.id);
      let parking = await updateParking(editingParking.id, payload);

      if (imageFiles.length > 0) {
        parking = await uploadParkingImages(parking.id, imageFiles);
      }

      console.log('[OwnerDashboard] Parking updated, refreshing data...');
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
      console.log('[OwnerDashboard] Deleting parking:', id);
      await deleteParking(id);
      console.log('[OwnerDashboard] Parking deleted, refreshing data...');
      await loadMine();
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Unable to delete parking listing'));
    }
  }

  async function handleCompleteBooking(id) {
    setError('');

    try {
      console.log('[OwnerDashboard] Completing booking:', id);
      await completeOwnerBooking(id);
      console.log('[OwnerDashboard] Booking completed, refreshing data...');
      await loadMine();
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Unable to complete booking'));
    }
  }

  function handleMediaChange(parking) {
    setParkings((current) => current.map((item) => (item.id === parking.id ? parking : item)));
    setEditingParking(parking);
  }

  const occupancyCards = useMemo(
    () =>
      parkings.map((parking) => ({
        ...parking,
        utilization: parking.totalSlots ? Math.round(((parking.totalSlots - parking.availableSlots) / parking.totalSlots) * 100) : 0
      })),
    [parkings]
  );
  const filteredOwnerBookings = useMemo(() => {
    const term = bookingFilters.query.trim().toLowerCase();

    if (!term) {
      return ownerBookings;
    }

    return ownerBookings.filter((booking) => {
      const parking = parkings.find((item) => item.id === booking.parking);
      return [booking.id, booking.vehicleType, booking.bookingDate, parking?.title]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(term);
    });
  }, [bookingFilters.query, ownerBookings, parkings]);
  const topListing = ownerSummary?.perListingEarnings?.slice().sort((left, right) => right.estimatedRevenue - left.estimatedRevenue)[0] ?? null;

  return (
    <section className="mx-auto max-w-7xl px-4 py-8">
      <div className="app-panel">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium uppercase text-brand-700">Owner control panel</p>
            <h1 className="app-heading mt-2 text-3xl font-bold">Run each space like a small business</h1>
            <p className="app-copy mt-2 max-w-2xl text-sm leading-6">Monitor demand, update listings, resolve active reservations, and keep revenue visibility tight from one operational workspace.</p>
          </div>
          <button
            className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
            disabled={isLoading}
            onClick={loadMine}
            type="button"
          >
            <svg className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {isLoading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {error ? <p className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}

      <div className="mt-6">
        {selectedSection === 'overview' ? <OwnerOverview ownerSummary={ownerSummary} parkings={parkings} topListing={topListing} /> : null}
        {selectedSection === 'listings' ? <OwnerListings editingParking={editingParking} handleCreate={handleCreate} handleDelete={handleDelete} handleMediaChange={handleMediaChange} handleUpdate={handleUpdate} isLoading={isLoading} parkings={parkings} setEditingParking={setEditingParking} /> : null}
        {selectedSection === 'reservations' ? <OwnerReservations bookingFilters={bookingFilters} filteredOwnerBookings={filteredOwnerBookings} handleCompleteBooking={handleCompleteBooking} isLoading={isLoading} parkings={parkings} setBookingFilters={setBookingFilters} /> : null}
        {selectedSection === 'occupancy' ? <OwnerOccupancy isLoading={isLoading} occupancyCards={occupancyCards} ownerSummary={ownerSummary} /> : null}
        {selectedSection === 'earnings' ? <OwnerEarnings ownerSummary={ownerSummary} parkings={parkings} /> : null}
        {selectedSection === 'settings' ? <ProfilePage defaultTab="role" embedded showHeader={false} /> : null}
      </div>
    </section>
  );
}

function OwnerOverview({ ownerSummary, parkings, topListing }) {
  return (
    <div className="grid gap-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Occupied now" value={ownerSummary?.occupiedSlotsNow ?? 0} />
        <SummaryCard label="Available now" value={ownerSummary?.availableSlotsNow ?? 0} />
        <SummaryCard label="Upcoming reservations" value={ownerSummary?.upcomingReservations ?? 0} />
        <SummaryCard label="Estimated revenue" value={`Rs ${ownerSummary?.estimatedRevenue ?? 0}`} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_0.95fr]">
        <Panel title="Listings health" subtitle="See approval status, pricing posture, and listing readiness without leaving overview.">
          {parkings.length === 0 ? (
            <EmptyState description="Create your first listing to start using the owner workspace." title="No listings yet" />
          ) : (
            <div className="grid gap-3">
              {parkings.slice(0, 4).map((parking) => (
                <Link
                  className="block rounded-md border border-slate-200 p-4 transition hover:border-brand-300 hover:shadow-sm"
                  key={parking.id}
                  to={`/owner/parking/${parking.id}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-950">{parking.title}</p>
                      <p className="mt-1 text-sm text-slate-600">
                        {parking.city}, {parking.state} ·{' '}
                        {parking.pricing && Object.keys(parking.pricing).length > 0
                          ? (() => {
                              const rates = parking.vehicleTypes.map((t) => parking.pricing[t] ?? parking.hourlyPrice);
                              const min = Math.min(...rates);
                              const max = Math.max(...rates);
                              return min === max ? `Rs ${min}/hr` : `Rs ${min}–${max}/hr`;
                            })()
                          : `Rs ${parking.hourlyPrice}/hr`}
                      </p>
                    </div>
                    <span className={`rounded-md px-2 py-1 text-xs font-semibold capitalize ${statusStyles[parking.verificationStatus] ?? 'bg-slate-100 text-slate-700'}`}>
                      {parking.verificationStatus}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Operations summary" subtitle="The quickest read on demand, capacity, and revenue pressure across your inventory.">
          <div className="grid gap-3">
            <GuideTile label="Reservation load" text={`${ownerSummary?.bookingCounts?.confirmed ?? 0} confirmed, ${ownerSummary?.bookingCounts?.pending ?? 0} pending, and ${ownerSummary?.bookingCounts?.completed ?? 0} completed reservations are in the current workspace.`} />
            <GuideTile label="Best performing listing" text={topListing ? `${topListing.title} leads with Rs ${topListing.estimatedRevenue} from ${topListing.bookings} booking${topListing.bookings === 1 ? '' : 's'}.` : 'Your top earning listing will appear here as bookings accumulate.'} />
            <GuideTile label="Capacity watch" text={`${ownerSummary?.occupiedSlotsNow ?? 0} slots are occupied right now across ${parkings.length} listing${parkings.length === 1 ? '' : 's'}.`} />
          </div>
        </Panel>
      </div>
    </div>
  );
}

function OwnerListings({ editingParking, handleCreate, handleDelete, handleMediaChange, handleUpdate, isLoading, parkings, setEditingParking }) {
  return (
    <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
      <Panel title={editingParking ? 'Edit listing' : 'Create listing'} subtitle="A dedicated listing editor panel with less clutter.">
        <ParkingForm
          key={editingParking?.id ?? 'create'}
          initialParking={editingParking}
          onCancel={editingParking ? () => setEditingParking(null) : undefined}
          onMediaChange={handleMediaChange}
          onSubmit={editingParking ? handleUpdate : handleCreate}
          submitLabel={editingParking ? 'Update listing' : 'Create listing'}
        />
      </Panel>

      <Panel title="Your listings" subtitle="Focused listing management, approvals context, and editing actions.">
        {isLoading ? <SkeletonGrid /> : null}
        {!isLoading && parkings.length === 0 ? <EmptyState description="Start by publishing a parking space and it will appear here." title="No listings yet" /> : null}
        {!isLoading && parkings.length > 0 ? (
          <div className="grid gap-4">
            {parkings.map((parking) => (
              <article key={parking.id} className="rounded-lg border border-slate-200 p-5">
                {parking.coverImage ? <img alt={parking.coverImage.caption || parking.title} className="mb-4 aspect-video w-full rounded-md object-cover" src={parking.coverImage.url} /> : null}
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-slate-950">{parking.title}</h3>
                    <p className="mt-1 text-sm text-slate-600">
                      {parking.city}, {parking.state} ·{' '}
                      {parking.pricing && Object.keys(parking.pricing).length > 0
                        ? parking.vehicleTypes
                            .map((t) => `Rs ${parking.pricing[t] ?? parking.hourlyPrice}/hr (${t})`)
                            .join(' · ')
                        : `Rs ${parking.hourlyPrice}/hr`}
                    </p>
                  </div>
                  <span className={`rounded-md px-2 py-1 text-xs font-semibold capitalize ${statusStyles[parking.verificationStatus] ?? 'bg-slate-100 text-slate-700'}`}>
                    {parking.verificationStatus === 'pending' ? 'pending review' : parking.verificationStatus}
                  </span>
                </div>
                <p className="mt-3 text-sm text-slate-600">{parking.availableSlots}/{parking.totalSlots} slots available</p>
                {parking.rejectionReason ? <p className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-700">Rejection reason: {parking.rejectionReason}</p> : null}
                <div className="mt-4 flex gap-2">
                  <button className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100" onClick={() => setEditingParking(parking)} type="button">
                    <Edit3 className="h-4 w-4" aria-hidden="true" />
                    Edit
                  </button>
                  <button className="inline-flex items-center gap-2 rounded-md border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50" onClick={() => handleDelete(parking.id)} type="button">
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                    Delete
                  </button>
                  <Link
                    className="ml-auto inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                    to={`/owner/parking/${parking.id}`}
                  >
                    <ExternalLink className="h-4 w-4" aria-hidden="true" />
                    View
                  </Link>
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </Panel>
    </div>
  );
}

function OwnerReservations({ bookingFilters, filteredOwnerBookings, handleCompleteBooking, isLoading, parkings, setBookingFilters }) {
  return (
      <Panel title="Reservations" subtitle="Manage live parking demand with focused filters and completion actions.">
      <div className="mb-4 grid gap-3 lg:grid-cols-[180px_220px_minmax(0,1fr)]">
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
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Search reservation
          <div className="flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2">
            <Search className="h-4 w-4 text-slate-500" aria-hidden="true" />
            <input className="min-w-0 flex-1 outline-none" onChange={(event) => setBookingFilters((current) => ({ ...current, query: event.target.value }))} value={bookingFilters.query} />
          </div>
        </label>
      </div>
      {isLoading ? <SkeletonGrid /> : null}
      {!isLoading && filteredOwnerBookings.length === 0 ? <EmptyState description="Bookings that match your filters will appear in this panel." title="No reservations match these filters" /> : null}
      {!isLoading ? (
        <div className="grid gap-3">
          {filteredOwnerBookings.map((booking) => (
            <OwnerBookingCard booking={booking} key={booking.id} onComplete={handleCompleteBooking} parking={parkings.find((item) => item.id === booking.parking)} />
          ))}
        </div>
      ) : null}
    </Panel>
  );
}

function OwnerOccupancy({ isLoading, occupancyCards, ownerSummary }) {
  return (
    <div className="grid gap-6">
      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard label="Currently occupied" value={ownerSummary?.occupiedSlotsNow ?? 0} />
        <SummaryCard label="Currently available" value={ownerSummary?.availableSlotsNow ?? 0} />
        <SummaryCard label="Upcoming reservation load" value={ownerSummary?.upcomingReservations ?? 0} />
      </div>
      <Panel title="Occupancy by listing" subtitle="Spot strain, unused capacity, and uneven utilization before it turns into missed revenue.">
        {isLoading ? <SkeletonGrid /> : null}
        {!isLoading && occupancyCards.length === 0 ? <EmptyState description="Listing utilization appears here once you publish spaces." title="No occupancy data yet" /> : null}
        {!isLoading && occupancyCards.length > 0 ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {occupancyCards.map((parking) => (
              <article className="rounded-lg border border-slate-200 p-5" key={parking.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-950">{parking.title}</p>
                    <p className="mt-1 text-sm text-slate-600">{parking.availableSlots}/{parking.totalSlots} slots available</p>
                  </div>
                  <span className="rounded-md bg-slate-100 px-2 py-1 text-sm font-semibold text-slate-700">{parking.utilization}% utilized</span>
                </div>
                <div className="mt-4 h-2 rounded-full bg-slate-200">
                  <div className="h-2 rounded-full bg-brand-600" style={{ width: `${parking.utilization}%` }} />
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </Panel>
    </div>
  );
}

function OwnerEarnings({ ownerSummary, parkings }) {
  return (
    <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
      <Panel title="Earnings" subtitle="Track where revenue is coming from and which listings are carrying the business.">
        <div className="grid gap-4 md:grid-cols-2">
          <SummaryCard label="Estimated revenue" value={`Rs ${ownerSummary?.estimatedRevenue ?? 0}`} />
          <SummaryCard label="Revenue listings" value={ownerSummary?.perListingEarnings?.filter((item) => item.estimatedRevenue > 0).length ?? 0} />
        </div>
      </Panel>
      <Panel title="Per-listing breakdown" subtitle="Compare listings side by side so pricing and availability decisions are easier to make.">
        {ownerSummary?.perListingEarnings?.length ? (
          <div className="grid gap-3">
            {ownerSummary.perListingEarnings.map((item) => (
              <div className="rounded-md border border-slate-200 p-4" key={item.parking}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-950">{item.title}</p>
                    <p className="mt-1 text-sm text-slate-600">{item.bookings} revenue bookings</p>
                  </div>
                  <span className="rounded-md bg-slate-100 px-2 py-1 text-sm font-semibold text-slate-700">Rs {item.estimatedRevenue}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState description="Revenue breakdown will appear as completed and confirmed bookings accumulate." title="No earnings yet" />
        )}
        {parkings.length === 0 ? <p className="mt-4 text-sm text-slate-500">Publishing listings is the first step toward revenue insight.</p> : null}
      </Panel>
    </div>
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

function SummaryCard({ label, value }) {
  return (
    <div className="app-stat">
      <BarChart3 className="mb-3 h-5 w-5 text-brand-600" aria-hidden="true" />
      <p className="app-copy-soft text-sm">{label}</p>
      <p className="app-heading mt-2 text-2xl font-bold">{value}</p>
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

function OwnerBookingCard({ booking, onComplete, parking }) {
  return (
    <article className="rounded-lg border border-slate-200 p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="flex-1">
          {booking.bookingCode ? (
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-md bg-blue-50 px-3 py-1.5 border border-blue-200">
              <span className="text-xs font-medium text-blue-600">Booking Code:</span>
              <span className="text-sm font-bold text-blue-900">{booking.bookingCode}</span>
            </div>
          ) : null}
          <h3 className="font-semibold text-slate-950">{parking?.title ?? 'Parking listing'}</h3>
          <p className="mt-1 text-sm text-slate-600">
            <span className="font-medium">Date:</span> {booking.bookingDate} | <span className="font-medium">Time:</span> {booking.startTime}-{booking.endTime}
          </p>
          {booking.userName || booking.userEmail ? (
            <p className="mt-1 text-sm text-slate-600">
              <span className="font-medium">User:</span> {booking.userName || 'N/A'}
              {booking.userEmail ? ` (${booking.userEmail})` : ''}
              {booking.userPhone ? ` - ${booking.userPhone}` : ''}
            </p>
          ) : null}
          <p className="mt-2 text-sm text-slate-600">
            <span className="font-medium">Details:</span> {booking.slotCount} slots · {booking.vehicleType} · Rs {booking.totalAmount}
          </p>
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
  return Object.fromEntries(Object.entries(filters).filter(([key, value]) => key !== 'query' && value));
}

function readOwnerCache() {
  if (typeof sessionStorage === 'undefined') {
    return null;
  }

  try {
    const raw = sessionStorage.getItem(OWNER_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeOwnerCache(value) {
  if (typeof sessionStorage === 'undefined') {
    return;
  }

  sessionStorage.setItem(OWNER_CACHE_KEY, JSON.stringify(value));
}
