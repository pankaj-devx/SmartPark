import { RatingStars } from './RatingStars.jsx';

/**
 * ReviewList — renders a list of reviews with user name, rating, comment, and date.
 *
 * Props:
 *   reviews  {object[]}  — array of serialized review objects
 *   emptyMessage {string} — message shown when there are no reviews
 */
export function ReviewList({ reviews = [], emptyMessage = 'No reviews yet.' }) {
  if (reviews.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
        <p className="text-sm text-slate-500">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {reviews.map((review) => (
        <ReviewCard key={review.id} review={review} />
      ))}
    </div>
  );
}

function ReviewCard({ review }) {
  const userName =
    typeof review.user === 'object' ? review.user?.name : 'Anonymous';

  const date = review.createdAt
    ? new Date(review.createdAt).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    : '';

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-950">{userName}</p>
          <RatingStars rating={review.rating} size="h-3.5 w-3.5" />
        </div>
        <time className="shrink-0 text-xs text-slate-400" dateTime={review.createdAt}>
          {date}
        </time>
      </div>
      {review.comment ? (
        <p className="mt-3 text-sm leading-6 text-slate-600">{review.comment}</p>
      ) : null}
    </article>
  );
}
