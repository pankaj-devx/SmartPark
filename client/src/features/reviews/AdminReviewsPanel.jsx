import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { getApiErrorMessage } from '../../lib/getApiErrorMessage.js';
import { deleteReview, fetchAllReviews } from './reviewApi.js';
import { RatingStars } from './RatingStars.jsx';

/**
 * AdminReviewsPanel — admin view of all reviews with delete capability.
 * Embedded inside AdminDashboardPage as the "reviews" section.
 */
export function AdminReviewsPanel() {
  const [reviews, setReviews] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError('');

      try {
        const data = await fetchAllReviews();
        if (!cancelled) setReviews(data);
      } catch (apiError) {
        if (!cancelled) setError(getApiErrorMessage(apiError, 'Unable to load reviews'));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  async function handleDelete(id) {
    setIsDeleting(true);
    setError('');

    try {
      await deleteReview(id);
      setReviews((current) => current.filter((r) => r.id !== id));
      setDeleteTarget(null);
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Unable to delete review'));
    } finally {
      setIsDeleting(false);
    }
  }

  const filtered = reviews.filter((r) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    const userName = typeof r.user === 'object' ? r.user?.name ?? '' : '';
    const parkingTitle = typeof r.parking === 'object' ? r.parking?.title ?? '' : '';
    return [userName, parkingTitle, r.comment, r.id]
      .join(' ')
      .toLowerCase()
      .includes(term);
  });

  return (
    <section className="mx-auto max-w-7xl px-4 py-8">
      <div className="app-panel">
        <h1 className="app-heading text-2xl font-bold">Reviews</h1>
        <p className="app-copy mt-2 text-sm">
          Monitor all driver reviews. Delete inappropriate or abusive content.
        </p>
      </div>

      {error ? (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {/* Search */}
      <div className="mt-4">
        <input
          className="app-input w-full max-w-sm"
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by user, parking, or comment…"
          type="search"
          value={search}
        />
      </div>

      {/* Stats bar */}
      <div className="mt-4 flex items-center gap-4 text-sm text-slate-600">
        <span>{reviews.length} total review{reviews.length === 1 ? '' : 's'}</span>
        {search ? <span>{filtered.length} matching</span> : null}
      </div>

      {/* Table */}
      <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
        {isLoading ? (
          <div className="p-6">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="mb-3 animate-pulse">
                <div className="h-4 w-full rounded bg-slate-200" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm text-slate-500">
              {search ? 'No reviews match your search.' : 'No reviews on the platform yet.'}
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left">
                <th className="px-4 py-3 font-semibold text-slate-700">User</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Parking</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Rating</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Comment</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Date</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((review) => (
                <ReviewRow
                  key={review.id}
                  onDelete={() => setDeleteTarget(review)}
                  review={review}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Delete confirmation dialog */}
      {deleteTarget ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 px-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-5 shadow-xl">
            <h2 className="text-lg font-semibold text-slate-950">Delete review?</h2>
            <p className="mt-2 text-sm text-slate-600">
              This will permanently remove the review by{' '}
              <strong>
                {typeof deleteTarget.user === 'object'
                  ? deleteTarget.user?.name
                  : 'this user'}
              </strong>
              . This action cannot be undone.
            </p>
            <div className="mt-5 flex gap-3">
              <button
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                disabled={isDeleting}
                onClick={() => handleDelete(deleteTarget.id)}
                type="button"
              >
                {isDeleting ? 'Deleting…' : 'Yes, delete'}
              </button>
              <button
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                onClick={() => setDeleteTarget(null)}
                type="button"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function ReviewRow({ review, onDelete }) {
  const userName =
    typeof review.user === 'object' ? review.user?.name ?? '—' : '—';
  const parkingTitle =
    typeof review.parking === 'object' ? review.parking?.title ?? '—' : '—';
  const date = review.createdAt
    ? new Date(review.createdAt).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    : '—';

  return (
    <tr className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
      <td className="px-4 py-3 font-medium text-slate-950">{userName}</td>
      <td className="px-4 py-3 text-slate-600">{parkingTitle}</td>
      <td className="px-4 py-3">
        <RatingStars rating={review.rating} size="h-3.5 w-3.5" showValue />
      </td>
      <td className="max-w-xs px-4 py-3 text-slate-600">
        <p className="line-clamp-2">{review.comment || <span className="italic text-slate-400">No comment</span>}</p>
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-slate-500">{date}</td>
      <td className="px-4 py-3">
        <button
          aria-label={`Delete review by ${userName}`}
          className="inline-flex items-center gap-1.5 rounded-md border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50"
          onClick={onDelete}
          type="button"
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          Delete
        </button>
      </td>
    </tr>
  );
}
