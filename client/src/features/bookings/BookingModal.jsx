import { useMemo, useState } from 'react';
import { CalendarCheck, X } from 'lucide-react';
import { getApiErrorMessage } from '../../lib/getApiErrorMessage.js';
import { createBooking, createPaymentOrder, verifyPayment } from './bookingApi.js';
import { getBookingSubmitPlan } from './bookingIntent.js';
import { calculateEstimatedTotal, formatDuration, getBookingDurationHours, validateBookingForm } from './bookingUtils.js';

export function BookingModal({ initialValues = {}, isAuthenticated = false, onClose, onRequireAuth, onSuccess, parking }) {
  const [form, setForm] = useState(() => {
    const types = parking.vehicleTypes ?? [];
    return {
      bookingDate: initialValues.date ?? '',
      startTime: initialValues.startTime ?? '',
      endTime: initialValues.endTime ?? '',
      // Pre-select when there is exactly one option (unambiguous).
      // For multiple options the user must choose explicitly; for zero options
      // (data not yet loaded) stay empty — the select will be empty anyway.
      vehicleType: initialValues.vehicleType?.trim() || (types.length === 1 ? types[0] : ''),
      slotCount: initialValues.slotCount ?? 1,
      coupon: ''
    };
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState(null);

  // Today's date string "YYYY-MM-DD" — used as the min value for the date picker
  const todayStr = new Date().toISOString().slice(0, 10);

  const durationHours = getBookingDurationHours(form.startTime, form.endTime);

  // Inline time error: same time = zero duration
  const timeRangeError =
    form.startTime && form.endTime && form.startTime === form.endTime
      ? 'Start and end time cannot be the same.'
      : '';

  // Effective hourly rate for the selected vehicle type
  const effectiveRate = (form.vehicleType && parking.pricing?.[form.vehicleType])
    ? parking.pricing[form.vehicleType]
    : parking.hourlyPrice;

  const estimatedTotal = useMemo(
    () =>
      calculateEstimatedTotal({
        endTime: form.endTime,
        hourlyPrice: parking.hourlyPrice,
        pricing: parking.pricing,
        slotCount: form.slotCount,
        startTime: form.startTime,
        vehicleType: form.vehicleType
      }),
    [form.endTime, form.slotCount, form.startTime, form.vehicleType, parking.hourlyPrice, parking.pricing]
  );

  function updateField(event) {
    setError('');
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const validationError = validateBookingForm(form);

    if (validationError) {
      setError(validationError);
      return;
    }

    const submitPlan = getBookingSubmitPlan({ form, isAuthenticated });
    if (submitPlan.kind === 'auth_required') {
      onRequireAuth?.(submitPlan.draft);
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      const booking = await createBooking({
        parking: parking.id,
        vehicleType: form.vehicleType,
        bookingDate: form.bookingDate,
        startTime: form.startTime,
        endTime: form.endTime,
        slotCount: Number(form.slotCount)
      });
      const paymentOrder = await createPaymentOrder({
        bookingId: booking.id,
        coupon: form.coupon || undefined
      });

      if (paymentOrder.testPayment) {
        setConfirmation(paymentOrder.booking);
        onSuccess(paymentOrder.booking);
        return;
      }

      const paidBooking = await openRazorpayCheckout(paymentOrder, parking.title);
      setConfirmation(paidBooking);
      onSuccess(paidBooking);
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Unable to reserve this time slot'));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-slate-950/50 px-4 py-8">
      <div className="app-modal max-h-full w-full max-w-lg overflow-y-auto rounded-lg">
        <div className="app-divider flex items-center justify-between border-b px-5 py-4">
          <h2 className="app-heading text-lg font-semibold">{confirmation ? 'Booking confirmed' : 'Reserve slot'}</h2>
          <button aria-label="Close booking modal" className="rounded-md p-1 hover:bg-slate-100" onClick={onClose} style={{ color: 'var(--app-text-soft)' }} type="button">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {confirmation ? (
          <div className="p-5">
            <div className="rounded-lg border border-brand-100 bg-brand-50 p-4 text-brand-700">
              <CalendarCheck className="mb-3 h-6 w-6" aria-hidden="true" />
              <p className="font-semibold">Your parking reservation is ready.</p>
              <p className="mt-2 text-sm">
                {confirmation.bookingDate}, {confirmation.startTime}-{confirmation.endTime} for {confirmation.slotCount} slot
                {confirmation.slotCount === 1 ? '' : 's'}.
              </p>
            </div>
            <dl className="mt-4 grid gap-3 text-sm">
              <SummaryItem label="Vehicle" value={confirmation.vehicleType} />
              <SummaryItem label="Amount" value={`Rs ${confirmation.totalAmount}`} />
              <SummaryItem label="Status" value={confirmation.status} />
              <SummaryItem label="Payment" value={confirmation.paymentStatus} />
            </dl>
            <button className="mt-5 w-full rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700" onClick={onClose} type="button">
              Done
            </button>
          </div>
        ) : (
          <form className="grid gap-4 p-5" onSubmit={handleSubmit}>
            <Field label="Booking date" name="bookingDate" onChange={updateField} required type="date" min={todayStr} value={form.bookingDate} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Start time"
                name="startTime"
                onChange={updateField}
                required
                type="time"
                min={form.bookingDate === todayStr ? new Date().toTimeString().slice(0, 5) : undefined}
                value={form.startTime}
              />
              <Field label="End time" name="endTime" onChange={updateField} required type="time" value={form.endTime} />
            </div>
            {timeRangeError ? (
              <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {timeRangeError}
              </p>
            ) : null}
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium" style={{ color: 'var(--app-text-muted)' }}>
                Vehicle type
                <select
                  className="app-input"
                  name="vehicleType"
                  onChange={updateField}
                  required
                  value={form.vehicleType}
                >
                  {/* Placeholder shown when no value is selected yet */}
                  {!form.vehicleType ? (
                    <option value="">Select vehicle type</option>
                  ) : null}
                  {(parking.vehicleTypes ?? []).map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </label>
              <Field label="Slots" min="1" max={parking.availableSlots} name="slotCount" onChange={updateField} required type="number" value={form.slotCount} />
            </div>

            <div className="app-card-muted rounded-lg">
              <dl className="app-copy grid gap-2 text-sm">
                <SummaryItem
                  label="Duration"
                  value={
                    durationHours === null
                      ? 'Select times'
                      : formatDuration(durationHours)
                  }
                />
                <SummaryItem
                  label="Hourly rate"
                  value={
                    form.vehicleType
                      ? `Rs ${effectiveRate}/hr (${form.vehicleType})`
                      : `Rs ${parking.hourlyPrice}/hr`
                  }
                />
                <SummaryItem label="Estimated total" value={`Rs ${estimatedTotal}`} />
              </dl>
            </div>

            <Field label="Coupon code" name="coupon" onChange={updateField} placeholder="Optional" type="text" value={form.coupon} />

            {error ? (
              <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error.includes('time slot') ? 'That time overlaps with another booking. Try a different slot.' : error}
              </p>
            ) : null}

            <button
              className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={isSubmitting || parking.availableSlots < 1}
              type="submit"
            >
              {isSubmitting ? 'Processing...' : isAuthenticated ? 'Book and pay' : 'Continue to sign in'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

async function openRazorpayCheckout(paymentOrder, parkingTitle) {
  await loadRazorpayCheckout();

  return new Promise((resolve, reject) => {
    const checkout = new window.Razorpay({
      key: paymentOrder.keyId,
      amount: paymentOrder.amount,
      currency: paymentOrder.currency,
      name: 'SmartPark',
      description: parkingTitle,
      order_id: paymentOrder.orderId,
      handler: async (response) => {
        try {
          const booking = await verifyPayment({
            bookingId: paymentOrder.booking.id,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature
          });
          resolve(booking);
        } catch (error) {
          reject(error);
        }
      },
      modal: {
        ondismiss: () => reject(new Error('Payment was cancelled'))
      },
      prefill: {},
      theme: {
        color: '#2563eb'
      }
    });

    checkout.on('payment.failed', () => {
      reject(new Error('Payment failed. Please try again.'));
    });

    checkout.open();
  });
}

function loadRazorpayCheckout() {
  if (window.Razorpay) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = resolve;
    script.onerror = () => reject(new Error('Unable to load payment checkout'));
    document.body.appendChild(script);
  });
}

function Field({ label, ...props }) {
  return (
    <label className="grid gap-2 text-sm font-medium" style={{ color: 'var(--app-text-muted)' }}>
      {label}
      <input className="app-input" {...props} />
    </label>
  );
}

function SummaryItem({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="app-copy-soft">{label}</dt>
      <dd className="app-heading font-semibold capitalize">{value}</dd>
    </div>
  );
}
