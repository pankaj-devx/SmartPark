import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Camera, Clock, MapPin, ShieldCheck } from 'lucide-react';
import { BookingModal } from '../bookings/BookingModal.jsx';
import { useAuth } from '../auth/useAuth.js';
import { getApiErrorMessage } from '../../lib/getApiErrorMessage.js';
import { fetchParkingById } from './parkingApi.js';

export function ParkingDetailPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const { isAuthenticated } = useAuth();
  const [parking, setParking] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isBookingOpen, setIsBookingOpen] = useState(false);

  useEffect(() => {
    async function loadParking() {
      setError('');
      setIsLoading(true);

      try {
        setParking(await fetchParkingById(id));
      } catch (apiError) {
        setError(getApiErrorMessage(apiError, 'Unable to load parking details'));
      } finally {
        setIsLoading(false);
      }
    }

    loadParking();
  }, [id]);

  function handleBookingSuccess(booking) {
    setParking((current) =>
      current
        ? {
            ...current,
            availableSlots: Math.max(0, current.availableSlots - booking.slotCount)
          }
        : current
    );
  }

  return (
    <section className="mx-auto max-w-5xl px-4 py-8">
      <Link className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-slate-950" to="/parkings">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to results
      </Link>

      {isLoading ? <div className="h-72 animate-pulse rounded-lg bg-slate-200" /> : null}
      {error ? <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}

      {parking ? (
        <article className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="relative grid min-h-64 place-items-center bg-slate-100 px-6 text-center">
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
              <h2 className="text-lg font-semibold text-slate-950">About this space</h2>
              <p className="mt-3 leading-7 text-slate-600">{parking.description}</p>

              {parking.images?.length ? (
                <div className="mt-6 grid grid-cols-3 gap-3">
                  {parking.images.map((image) => (
                    <img alt={image.caption || parking.title} className="aspect-video rounded-md object-cover" key={image.id} src={image.url} />
                  ))}
                </div>
              ) : null}

              <div className="mt-6 flex flex-wrap gap-2">
                {parking.amenities.map((amenity) => (
                  <span className="rounded-md bg-slate-100 px-3 py-2 text-sm text-slate-700" key={amenity}>
                    {amenity}
                  </span>
                ))}
              </div>
            </div>

            <aside className="rounded-lg border border-slate-200 p-4">
              <p className="text-2xl font-bold text-slate-950">Rs {parking.hourlyPrice}/hr</p>
              <div className="mt-4 grid gap-3 text-sm text-slate-700">
                <p className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-brand-600" aria-hidden="true" />
                  {parking.availableSlots} of {parking.totalSlots} slots available
                </p>
                <p className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-brand-600" aria-hidden="true" />
                  {parking.isOpen24x7 ? 'Open 24x7' : `${parking.operatingHours.open} to ${parking.operatingHours.close}`}
                </p>
              </div>
              {isAuthenticated ? (
                <button
                  className="mt-5 w-full rounded-md bg-brand-600 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70"
                  disabled={parking.availableSlots < 1}
                  onClick={() => setIsBookingOpen(true)}
                  type="button"
                >
                  Reserve slot
                </button>
              ) : (
                <Link className="mt-5 block rounded-md bg-brand-600 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-brand-700" to="/login">
                  Sign in to reserve
                </Link>
              )}
            </aside>
          </div>
        </article>
      ) : null}

      {parking && isBookingOpen ? (
        <BookingModal
          initialValues={{
            date: searchParams.get('date') ?? '',
            startTime: searchParams.get('startTime') ?? '',
            endTime: searchParams.get('endTime') ?? ''
          }}
          onClose={() => setIsBookingOpen(false)}
          onSuccess={handleBookingSuccess}
          parking={parking}
        />
      ) : null}
    </section>
  );
}
