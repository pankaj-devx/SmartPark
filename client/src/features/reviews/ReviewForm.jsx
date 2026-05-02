import { useState } from 'react';
import { X } from 'lucide-react';
import { getApiErrorMessage } from '../../lib/getApiErrorMessage.js';
import { submitReview } from './reviewApi.js';
import { InteractiveRatingStars } from './RatingStars.jsx';

/**
 * ReviewForm — modal form for submitting a review.
 *
 * Props:
 *   booking  {object}   — the completed booking being reviewed
 *   parking  {object}   — parking detail (for display)
 *   onClose  {function} — called when the modal should close
 *   onSuccess {function} — called with the new review after submission
 */
export function ReviewForm({ booking, parking, onClose, onSuccess }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    if (rating === 0) {
      setError('Please select a star rating before submitting.');
      return;
    }

    setIsSubmitting(true);

    try {
      const review = await submitReview({
        bookingId: booking.id,
        rating,
        comment: comment.trim()
      });
      onSuccess(review);
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Unable to submit your review. Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  const parkingTitle = parking?.title ?? 'this parking';

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 px-4 py-8">
      <div className="app-modal w-full max-w-md rounded-lg">
        {/* Header */}
        <div className="app-divider flex items-center justify-between border-b px-5 py-4">
          <h2 className="app-heading text-lg font-semibold">Leave a review</h2>
          <button
            aria-label="Close review form"
            className="rounded-md p-1 hover:bg-slate-100"
            onClick={onClose}
            style={{ color: 'var(--app-text-soft)' }}
            type="button"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <form className="grid gap-5 p-5" onSubmit={handleSubmit}>
          {/* Parking info */}
          <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-sm font-semibold text-slate-950">{parkingTitle}</p>
            <p className="mt-0.5 text-xs text-slate-500">
              {booking.bookingDate} · {booking.startTime}–{booking.endTime}
            </p>
          </div>

          {/* Star rating */}
          <div className="grid gap-2">
            <label className="text-sm font-medium" style={{ color: 'var(--app-text-muted)' }}>
              Your rating <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            <InteractiveRatingStars value={rating} onChange={setRating} size="h-8 w-8" />
            {rating > 0 ? (
              <p className="text-xs text-slate-500">
                {['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'][rating]}
              </p>
            ) : null}
          </div>

          {/* Comment */}
          <label className="grid gap-2 text-sm font-medium" style={{ color: 'var(--app-text-muted)' }}>
            Comment <span className="font-normal text-slate-400">(optional)</span>
            <textarea
              className="app-input min-h-[100px] resize-y"
              maxLength={1000}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share your experience at this parking space…"
              value={comment}
            />
            <span className="text-right text-xs text-slate-400">{comment.length}/1000</span>
          </label>

          {error ? (
            <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <div className="flex gap-3">
            <button
              className="flex-1 rounded-md bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={isSubmitting || rating === 0}
              type="submit"
            >
              {isSubmitting ? 'Submitting…' : 'Submit review'}
            </button>
            <button
              className="rounded-md border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              onClick={onClose}
              type="button"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
