import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Bookmark, BookmarkCheck, Camera, Clock, Map, MapPin, ShieldCheck, Star } from 'lucide-react';
import { BookingModal } from '../bookings/BookingModal.jsx';
import { isSavedParking, recordRecentlyViewedParking, toggleSavedParking } from '../account/accountExperience.js';
import { clearGuestBookingIntent, getGuestBookingIntent, saveGuestBookingIntent } from '../account/guestSession.js';
import { useAuth } from '../auth/useAuth.js';
import { AuthModal } from '../auth/AuthModal.jsx';
import { getApiErrorMessage } from '../../lib/getApiErrorMessage.js';
import { fetchParkingById } from './parkingApi.js';
import { fetchParkingReviews } from '../reviews/reviewApi.js';
import { RatingStars } from '../reviews/RatingStars.jsx';
import { ReviewList } from '../reviews/ReviewList.jsx';

export function ParkingDetailPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const { isAuthenticated } = useAuth();
  const [parking, setParking] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isBookingOpen, setIsBookingOpen] = useState(() => searchParams.get('intent') === 'reserve');
  const [isSaved, setIsSaved] = useState(false);
  const [bookingDraft, setBookingDraft] = useState(() => getGuestBookingIntent(id));
  const [authModalConfig, setAuthModalConfig] = useState({ isOpen: false, pendingAction: null, title: '' });
  const [reviewData, setReviewData] = useState(null);

  useEffect(() => {
    async function loadParking() {
      setError('');
      setIsLoading(true);

      try {
        const parkingDetail = await fetchParkingById(id);
        setParking(parkingDetail);
        setIsSaved(isSavedParking(parkingDetail.id));
        recordRecentlyViewedParking(parkingDetail);
      } catch (apiError) {
        setError(getApiErrorMessage(apiError, 'Unable to load parking details'));
      } finally {
        setIsLoading(false);
      }
    }

    loadParking();
  }, [id]);

  useEffect(() => {
    async function loadReviews() {
      try {
        const data = await fetchParkingReviews(id);
        setReviewData(data);
      } catch {
        // Reviews are non-critical — silently ignore errors
      }
    }

    loadReviews();
  }, [id]);
  async function handleBookingSuccess(booking) {
    console.log('[ParkingDetailPage] Booking successful, refreshing data...');
    clearGuestBookingIntent(id);
    setIsBookingOpen(false);

    // Refetch the parking from the API so availableSlots reflects the server's
    // authoritative value (which includes reconciliation of any expired bookings)
    // rather than an optimistic client-side decrement that could drift.
    try {
      const refreshed = await fetchParkingById(id);
      setParking(refreshed);
      console.log('[ParkingDetailPage] Parking data refreshed:', {
        availableSlots: refreshed.availableSlots,
        totalSlots: refreshed.totalSlots
      });
    } catch (err) {
      console.error('[ParkingDetailPage] Failed to refresh parking data:', err);
      // Fallback: apply optimistic decrement if the refetch fails
      setParking((current) =>
        current
          ? { ...current, availableSlots: Math.max(0, current.availableSlots - booking.slotCount) }
          : current
      );
    }
  }

  function handleToggleSaved() {
    if (!parking) {
      return;
    }

    if (!isAuthenticated) {
      setAuthModalConfig({
        isOpen: true,
        title: 'Sign in to save parking',
        pendingAction: () => {
          toggleSavedParking(parking);
          setIsSaved(true);
        }
      });
      return;
    }

    toggleSavedParking(parking);
    setIsSaved((current) => !current);
  }

  function handleReserveClick() {
    setIsBookingOpen(true);
  }

  function handleAuthSuccess() {
    if (authModalConfig.pendingAction) {
      authModalConfig.pendingAction();
    }
  }

  function handleRequireAuth(draft) {
    saveGuestBookingIntent({
      ...draft,
      parkingId: id
    });
    setBookingDraft(draft);
    setIsBookingOpen(false);
    setAuthModalConfig({
      isOpen: true,
      title: 'Sign in to complete your reservation',
      pendingAction: () => setIsBookingOpen(true)
    });
  }

  return (
    <section className="mx-auto max-w-5xl px-4 py-8">
      <Link className="app-link mb-5 inline-flex items-center gap-2 text-sm font-semibold" to="/parkings">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to results
      </Link>

      {isLoading ? <div className="h-72 animate-pulse rounded-lg" style={{ background: 'var(--app-surface-subtle)' }} /> : null}
      {error ? <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}

      {parking ? (
        <article className="app-panel overflow-hidden p-0">
          <div className="relative grid min-h-64 place-items-center px-6 text-center" style={{ background: 'var(--app-surface-muted)' }}>
            {parking.coverImage ? (
              <img alt={parking.coverImage.caption || parking.title} className="absolute inset-0 h-full w-full object-cover" src={parking.coverImage.url} />
            ) : null}
            <div className={`relative ${parking.coverImage ? 'rounded-lg bg-white/90 p-5 shadow-sm' : ''}`}>
              {!parking.coverImage ? <Camera className="mx-auto mb-3 h-8 w-8 text-slate-400" aria-hidden="true" /> : null}
              <p className="text-sm font-medium uppercase text-brand-700">{parking.parkingType} parking</p>
              <h1 className="mt-3 text-3xl font-bold text-slate-950">{parking.title}</h1>
              <p className="mt-3 flex items-center justify-center gap-2 text-slate-600">
                <MapPin className="h-5 w-5" aria-hidden="true" />
                {[parking.address, parking.area, parking.city, parking.state].filter(Boolean).join(', ')}
              </p>
            </div>
          </div>

          <div className="grid gap-6 p-6 lg:grid-cols-[1fr_280px]">
            <div>
              <h2 className="app-heading text-lg font-semibold">About this space</h2>
              <p className="app-copy mt-3 leading-7">{parking.description}</p>

              {parking.images?.length ? (
                <div className="mt-6 grid grid-cols-3 gap-3">
                  {parking.images.map((image) => (
                    <img alt={image.caption || parking.title} className="aspect-video rounded-md object-cover" key={image.id} src={image.url} />
                  ))}
                </div>
              ) : null}

              <div className="mt-6 flex flex-wrap gap-2">
                {parking.amenities.map((amenity) => (
                  <span className="app-pill rounded-md px-3 py-2 text-sm" key={amenity}>
                    {amenity}
                  </span>
                ))}
              </div>
            </div>

            <aside className="app-card-muted rounded-lg">
              {/* Pricing — show per-vehicle rates when available, else flat rate */}
              {parking.pricing && Object.keys(parking.pricing).length > 0 ? (
                <div>
                  {parking.vehicleTypes.map((type) => (
                    <p key={type} className="app-heading text-xl font-bold">
                      Rs {parking.pricing[type] ?? parking.hourlyPrice}/hr
                      <span className="ml-2 text-sm font-normal" style={{ color: 'var(--app-text-muted)' }}>
                        ({type})
                      </span>
                    </p>
                  ))}
                </div>
              ) : (
                <p className="app-heading text-2xl font-bold">Rs {parking.hourlyPrice}/hr</p>
              )}
              <div className="app-copy mt-4 grid gap-3 text-sm">
                <p className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-brand-600" aria-hidden="true" />
                  {parking.availableSlots} of {parking.totalSlots} slots available
                </p>
                <p className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-brand-600" aria-hidden="true" />
                  {parking.isOpen24x7 ? 'Open 24x7' : `${parking.operatingHours.open} to ${parking.operatingHours.close}`}
                </p>
                {reviewData?.stats?.totalReviews > 0 ? (
                  <p className="flex items-center gap-2">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" aria-hidden="true" />
                    {reviewData.stats.averageRating} · {reviewData.stats.totalReviews} review{reviewData.stats.totalReviews === 1 ? '' : 's'}
                  </p>
                ) : null}
              </div>
              <button className="mt-4 inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold hover:bg-slate-100" onClick={handleToggleSaved} style={{ borderColor: 'var(--app-border-strong)', color: 'var(--app-text-muted)' }} type="button">
                {isSaved ? <BookmarkCheck className="h-4 w-4 text-brand-700" aria-hidden="true" /> : <Bookmark className="h-4 w-4" aria-hidden="true" />}
                {isSaved ? 'Saved to favorites' : 'Save parking'}
              </button>

              {/* View on Map — only shown when coordinates are available */}
              {parking.latitude != null && parking.longitude != null ? (
                <Link
                  className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold hover:bg-slate-100"
                  style={{ borderColor: 'var(--app-border-strong)', color: 'var(--app-text-muted)' }}
                  to={`/map?lat=${parking.latitude}&lng=${parking.longitude}&id=${parking.id}`}
                >
                  <Map className="h-4 w-4" aria-hidden="true" />
                  View on Map
                </Link>
              ) : null}

              <button
                className="mt-5 w-full rounded-md bg-brand-600 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70"
                disabled={parking.availableSlots < 1}
                onClick={handleReserveClick}
                type="button"
              >
                Reserve slot
              </button>
            </aside>
          </div>

          {/* ── Reviews section ──────────────────────────────────────── */}
          <div className="border-t p-6" style={{ borderColor: 'var(--app-border)' }}>
            <div className="mb-4 flex items-center gap-3">
              <h2 className="app-heading text-lg font-semibold">Reviews</h2>
              {reviewData?.stats?.totalReviews > 0 ? (
                <div className="flex items-center gap-2">
                  <RatingStars rating={reviewData.stats.averageRating} size="h-4 w-4" showValue />
                  <span className="text-sm text-slate-500">
                    ({reviewData.stats.totalReviews} review{reviewData.stats.totalReviews === 1 ? '' : 's'})
                  </span>
                </div>
              ) : null}
            </div>
            <ReviewList
              reviews={reviewData?.reviews ?? []}
              emptyMessage="No reviews yet. Be the first to review after your visit."
            />
          </div>
        </article>
      ) : null}

      <AuthModal 
        isOpen={authModalConfig.isOpen} 
        onClose={() => setAuthModalConfig({ isOpen: false, pendingAction: null, title: '' })} 
        onSuccess={handleAuthSuccess}
        title={authModalConfig.title}
      />

      {parking && isBookingOpen ? (
        <BookingModal
          initialValues={{
            date: bookingDraft?.bookingDate ?? searchParams.get('date') ?? '',
            startTime: bookingDraft?.startTime ?? searchParams.get('startTime') ?? '',
            endTime: bookingDraft?.endTime ?? searchParams.get('endTime') ?? '',
            vehicleType: bookingDraft?.vehicleType ?? '',
            slotCount: bookingDraft?.slotCount ?? 1
          }}
          isAuthenticated={isAuthenticated}
          onClose={() => setIsBookingOpen(false)}
          onRequireAuth={handleRequireAuth}
          onSuccess={handleBookingSuccess}
          parking={parking}
        />
      ) : null}
    </section>
  );
}
