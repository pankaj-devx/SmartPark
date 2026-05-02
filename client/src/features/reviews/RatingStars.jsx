import { Star } from 'lucide-react';

/**
 * RatingStars — display-only star rating component.
 *
 * Props:
 *   rating   {number}  — value between 0 and 5 (supports decimals for display)
 *   max      {number}  — total stars (default 5)
 *   size     {string}  — Tailwind size class for the star icon (default 'h-4 w-4')
 *   showValue {boolean} — show numeric value next to stars (default false)
 */
export function RatingStars({ rating = 0, max = 5, size = 'h-4 w-4', showValue = false }) {
  const filled = Math.round(rating);

  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${rating} out of ${max} stars`}>
      {Array.from({ length: max }, (_, i) => (
        <Star
          key={i}
          className={`${size} ${i < filled ? 'fill-amber-400 text-amber-400' : 'fill-slate-200 text-slate-200'}`}
          aria-hidden="true"
        />
      ))}
      {showValue ? (
        <span className="ml-1.5 text-sm font-semibold text-slate-700">{rating}</span>
      ) : null}
    </span>
  );
}

/**
 * InteractiveRatingStars — clickable star rating input.
 *
 * Props:
 *   value    {number}   — current selected rating (1–5)
 *   onChange {function} — called with new rating value
 *   size     {string}   — Tailwind size class (default 'h-6 w-6')
 */
export function InteractiveRatingStars({ value = 0, onChange, size = 'h-6 w-6' }) {
  return (
    <span className="inline-flex items-center gap-1" role="group" aria-label="Select rating">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          aria-label={`Rate ${star} star${star === 1 ? '' : 's'}`}
          onClick={() => onChange(star)}
          className="rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        >
          <Star
            className={`${size} transition-colors ${
              star <= value
                ? 'fill-amber-400 text-amber-400'
                : 'fill-slate-200 text-slate-200 hover:fill-amber-200 hover:text-amber-200'
            }`}
            aria-hidden="true"
          />
        </button>
      ))}
    </span>
  );
}
