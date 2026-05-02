import { useEffect, useState } from 'react';
import { AlertTriangle, Star } from 'lucide-react';
import { getApiErrorMessage } from '../../lib/getApiErrorMessage.js';
import { fetchOwnerReviews } from './reviewApi.js';
import { RatingStars } from './RatingStars.jsx';
import { ReviewList } from './ReviewList.jsx';

/**
 * OwnerReviewsPanel — shows all reviews for the owner's parkings.
 * Embedded inside OwnerParkingDashboard as the "reviews" section.
 */
export function OwnerReviewsPanel() {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError('');

      try {
        const result = await fetchOwnerReviews();
        if (!cancelled) setData(result);
      } catch (apiError) {
        if (!cancelled) setError(getApiErrorMessage(apiError, 'Unable to load reviews'));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  if (isLoading) {
    return <ReviewsSkeleton />;
  }

  if (error) {
    return (
      <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
        {error}
      </p>
    );
  }

  const { reviews = [], stats = {}, parkings = [] } = data ?? {};
  const lowRatingParkings = parkings.filter((p) => p.totalReviews > 0 && p.averageRating < 3);

  return (
    <div className="grid gap-6">
      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Overall rating"
          value={
            <span className="flex items-center gap-2">
              <Star className="h-5 w-5 fill-amber-400 text-amber-400" aria-hidden="true" />
              {stats.averageRating ?? 0}
            </span>
          }
        />
        <StatCard label="Total reviews" value={stats.totalReviews ?? 0} />
        <StatCard label="Listings reviewed" value={parkings.filter((p) => p.totalReviews > 0).length} />
      </div>

      {/* Low rating alert */}
      {lowRatingParkings.length > 0 ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" aria-hidden="true" />
            <p className="text-sm font-semibold text-amber-800">Listings needing attention</p>
          </div>
          <ul className="mt-2 grid gap-1">
            {lowRatingParkings.map((p) => (
              <li key={p.id} className="text-sm text-amber-700">
                {p.title} — {p.averageRating} ★ ({p.totalReviews} review{p.totalReviews === 1 ? '' : 's'})
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* Per-listing breakdown */}
      {parkings.length > 0 ? (
        <section className="app-panel">
          <h2 className="app-heading text-lg font-semibold">Per-listing performance</h2>
          <div className="mt-4 grid gap-3">
            {parkings.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-4 rounded-md border border-slate-200 p-3">
                <p className="text-sm font-semibold text-slate-950">{p.title}</p>
                <div className="flex items-center gap-3">
                  <RatingStars rating={p.averageRating} size="h-3.5 w-3.5" showValue />
                  <span className="text-xs text-slate-500">
                    {p.totalReviews} review{p.totalReviews === 1 ? '' : 's'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* Recent reviews */}
      <section className="app-panel">
        <h2 className="app-heading text-lg font-semibold">Recent feedback</h2>
        <p className="app-copy mt-1 text-sm">Latest reviews from drivers across all your listings.</p>
        <div className="mt-4">
          <ReviewList
            reviews={reviews.slice(0, 20)}
            emptyMessage="No reviews yet. Reviews will appear here once drivers complete bookings at your listings."
          />
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="app-stat">
      <p className="app-copy-soft text-sm">{label}</p>
      <p className="app-heading mt-2 text-2xl font-bold">{value}</p>
    </div>
  );
}

function ReviewsSkeleton() {
  return (
    <div className="grid gap-4">
      {[0, 1, 2].map((i) => (
        <div key={i} className="animate-pulse rounded-lg border border-slate-200 bg-white p-4">
          <div className="h-4 w-1/3 rounded bg-slate-200" />
          <div className="mt-3 h-3 w-1/2 rounded bg-slate-100" />
          <div className="mt-2 h-3 w-2/3 rounded bg-slate-100" />
        </div>
      ))}
    </div>
  );
}
