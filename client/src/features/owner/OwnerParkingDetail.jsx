/**
 * OwnerParkingDetail.jsx
 * ----------------------
 * Owner-only detail page for a single parking listing.
 * Route: /owner/parking/:id
 *
 * Separate from the public ParkingDetailPage — shows owner-specific
 * actions (edit, delete) and full pricing breakdown.
 */

import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Camera,
  Clock,
  Edit3,
  Map,
  MapPin,
  ShieldCheck,
  Trash2
} from 'lucide-react';
import { getApiErrorMessage } from '../../lib/getApiErrorMessage.js';
import { deleteParking, fetchParkingById } from '../parkings/parkingApi.js';

const statusStyles = {
  pending:  'bg-amber-50 text-amber-700 border-amber-200',
  approved: 'bg-brand-50 text-brand-700 border-brand-200',
  rejected: 'bg-red-50 text-red-700 border-red-200'
};

export function OwnerParkingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [parking, setParking] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError('');
      try {
        const data = await fetchParkingById(id);
        if (!cancelled) setParking(data);
      } catch (err) {
        if (!cancelled) setError(getApiErrorMessage(err, 'Unable to load parking details.'));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [id]);

  async function handleDelete() {
    setIsDeleting(true);
    setError('');
    try {
      await deleteParking(id);
      navigate('/owner/listings', { replace: true });
    } catch (err) {
      setError(getApiErrorMessage(err, 'Unable to delete this listing.'));
      setIsDeleting(false);
      setConfirmDelete(false);
    }
  }

  // ── Pricing helper ───────────────────────────────────────────────────────
  function renderPricing() {
    if (!parking) return null;

    const hasPricing = parking.pricing && Object.keys(parking.pricing).length > 0;

    if (hasPricing) {
      return (
        <div className="grid gap-1">
          {parking.vehicleTypes.map((type) => (
            <p key={type} className="app-heading text-xl font-bold">
              Rs {parking.pricing[type] ?? parking.hourlyPrice}/hr
              <span className="ml-2 text-sm font-normal" style={{ color: 'var(--app-text-muted)' }}>
                ({type})
              </span>
            </p>
          ))}
        </div>
      );
    }

    return <p className="app-heading text-2xl font-bold">Rs {parking.hourlyPrice}/hr</p>;
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <section className="mx-auto max-w-5xl px-4 py-8">
      {/* Back link */}
      <Link
        className="app-link mb-5 inline-flex items-center gap-2 text-sm font-semibold"
        to="/owner/listings"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to listings
      </Link>

      {/* Loading skeleton */}
      {isLoading ? (
        <div className="h-72 animate-pulse rounded-xl" style={{ background: 'var(--app-surface-subtle)' }} />
      ) : null}

      {/* Error */}
      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>
      ) : null}

      {parking ? (
        <article className="app-panel overflow-hidden p-0">

          {/* ── Hero / cover image ─────────────────────────────────────── */}
          <div
            className="relative grid min-h-56 place-items-center px-6 text-center"
            style={{ background: 'var(--app-surface-muted)' }}
          >
            {parking.coverImage ? (
              <img
                alt={parking.coverImage.caption || parking.title}
                className="absolute inset-0 h-full w-full object-cover"
                src={parking.coverImage.url}
              />
            ) : null}
            <div className={`relative ${parking.coverImage ? 'rounded-lg bg-white/90 p-5 shadow-sm' : ''}`}>
              {!parking.coverImage ? (
                <Camera className="mx-auto mb-3 h-8 w-8 text-slate-400" aria-hidden="true" />
              ) : null}
              <p className="text-sm font-medium uppercase text-brand-700">{parking.parkingType} parking</p>
              <h1 className="mt-2 text-3xl font-bold text-slate-950">{parking.title}</h1>
              <p className="mt-2 flex items-center justify-center gap-2 text-slate-600">
                <MapPin className="h-4 w-4" aria-hidden="true" />
                {[parking.address, parking.area, parking.city, parking.state].filter(Boolean).join(', ')}
              </p>
            </div>

            {/* Verification badge — top-right */}
            <span
              className={`absolute right-4 top-4 rounded-md border px-2 py-1 text-xs font-semibold capitalize ${
                statusStyles[parking.verificationStatus] ?? 'bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              {parking.verificationStatus === 'pending' ? 'pending review' : parking.verificationStatus}
            </span>
          </div>

          {/* ── Body ──────────────────────────────────────────────────── */}
          <div className="grid gap-6 p-6 lg:grid-cols-[1fr_280px]">

            {/* Left — description + images + amenities */}
            <div>
              <h2 className="app-heading text-lg font-semibold">About this space</h2>
              <p className="app-copy mt-3 leading-7">{parking.description}</p>

              {parking.images?.length > 0 ? (
                <div className="mt-6 grid grid-cols-3 gap-3">
                  {parking.images.map((image) => (
                    <img
                      alt={image.caption || parking.title}
                      className="aspect-video rounded-md object-cover"
                      key={image.id}
                      src={image.url}
                    />
                  ))}
                </div>
              ) : null}

              {parking.amenities?.length > 0 ? (
                <div className="mt-6 flex flex-wrap gap-2">
                  {parking.amenities.map((amenity) => (
                    <span className="app-pill rounded-md px-3 py-2 text-sm" key={amenity}>
                      {amenity}
                    </span>
                  ))}
                </div>
              ) : null}

              {/* Rejection reason */}
              {parking.rejectionReason ? (
                <p className="mt-6 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  <strong>Rejection reason:</strong> {parking.rejectionReason}
                </p>
              ) : null}
            </div>

            {/* Right — pricing + stats + actions */}
            <aside className="app-card-muted rounded-lg">

              {/* Pricing */}
              {renderPricing()}

              {/* Stats */}
              <div className="app-copy mt-4 grid gap-3 text-sm">
                <p className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-brand-600" aria-hidden="true" />
                  {parking.availableSlots} of {parking.totalSlots} slots available
                </p>
                <p className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-brand-600" aria-hidden="true" />
                  {parking.isOpen24x7
                    ? 'Open 24×7'
                    : `${parking.operatingHours?.open ?? '00:00'} – ${parking.operatingHours?.close ?? '23:59'}`}
                </p>
              </div>

              {/* Vehicle types */}
              <div className="mt-4 flex flex-wrap gap-2">
                {parking.vehicleTypes?.map((type) => (
                  <span
                    className="rounded-md border px-2 py-1 text-xs font-medium"
                    key={type}
                    style={{ borderColor: 'var(--app-border-strong)', color: 'var(--app-text-muted)' }}
                  >
                    {type}
                  </span>
                ))}
              </div>

              {/* ── Action buttons ─────────────────────────────────────── */}
              <div className="mt-6 grid gap-2">

                {/* Edit — navigates to listings with this parking pre-selected for editing */}
                <Link
                  className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
                  to={`/owner/listings?edit=${parking.id}`}
                >
                  <Edit3 className="h-4 w-4" aria-hidden="true" />
                  Edit listing
                </Link>

                {/* View on Map */}
                {parking.latitude != null && parking.longitude != null ? (
                  <Link
                    className="inline-flex w-full items-center justify-center gap-2 rounded-md border px-4 py-2.5 text-sm font-semibold hover:bg-slate-100"
                    style={{ borderColor: 'var(--app-border-strong)', color: 'var(--app-text-muted)' }}
                    to={`/map?lat=${parking.latitude}&lng=${parking.longitude}&id=${parking.id}`}
                  >
                    <Map className="h-4 w-4" aria-hidden="true" />
                    View on Map
                  </Link>
                ) : null}

                {/* Delete */}
                {confirmDelete ? (
                  <div className="rounded-md border border-red-200 bg-red-50 p-3">
                    <p className="text-sm text-red-700">Delete this listing permanently?</p>
                    <div className="mt-2 flex gap-2">
                      <button
                        className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                        disabled={isDeleting}
                        onClick={handleDelete}
                        type="button"
                      >
                        {isDeleting ? 'Deleting…' : 'Yes, delete'}
                      </button>
                      <button
                        className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                        onClick={() => setConfirmDelete(false)}
                        type="button"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50"
                    onClick={() => setConfirmDelete(true)}
                    type="button"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                    Delete listing
                  </button>
                )}
              </div>
            </aside>
          </div>
        </article>
      ) : null}
    </section>
  );
}
