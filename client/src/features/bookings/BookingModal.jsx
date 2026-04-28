import { useMemo, useState } from 'react';
import { CalendarCheck, X } from 'lucide-react';
import { getApiErrorMessage } from '../../lib/getApiErrorMessage.js';
import { createBooking } from './bookingApi.js';
import { calculateEstimatedTotal, getBookingDurationHours, validateBookingForm } from './bookingUtils.js';

export function BookingModal({ initialValues = {}, onClose, onSuccess, parking }) {
  const [form, setForm] = useState(() => ({
    bookingDate: initialValues.date ?? '',
    startTime: initialValues.startTime ?? '',
    endTime: initialValues.endTime ?? '',
    vehicleType: parking.vehicleTypes?.[0] ?? '',
    slotCount: 1
  }));
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState(null);

  const durationHours = getBookingDurationHours(form.startTime, form.endTime);
  const estimatedTotal = useMemo(
    () =>
      calculateEstimatedTotal({
        endTime: form.endTime,
        hourlyPrice: parking.hourlyPrice,
        slotCount: form.slotCount,
        startTime: form.startTime
      }),
    [form.endTime, form.slotCount, form.startTime, parking.hourlyPrice]
  );

  function updateField(event) {
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
      setConfirmation(booking);
      onSuccess(booking);
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Unable to reserve this time slot'));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-slate-950/50 px-4 py-8">
      <div className="max-h-full w-full max-w-lg overflow-y-auto rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-slate-950">{confirmation ? 'Booking confirmed' : 'Reserve slot'}</h2>
          <button aria-label="Close booking modal" className="rounded-md p-1 text-slate-500 hover:bg-slate-100" onClick={onClose} type="button">
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
            </dl>
            <button className="mt-5 w-full rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700" onClick={onClose} type="button">
              Done
            </button>
          </div>
        ) : (
          <form className="grid gap-4 p-5" onSubmit={handleSubmit}>
            <Field label="Booking date" name="bookingDate" onChange={updateField} required type="date" value={form.bookingDate} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Start time" name="startTime" onChange={updateField} required type="time" value={form.startTime} />
              <Field label="End time" name="endTime" onChange={updateField} required type="time" value={form.endTime} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Vehicle type
                <select className="rounded-md border border-slate-300 px-3 py-2" name="vehicleType" onChange={updateField} required value={form.vehicleType}>
                  {parking.vehicleTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </label>
              <Field label="Slots" min="1" max={parking.availableSlots} name="slotCount" onChange={updateField} required type="number" value={form.slotCount} />
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <dl className="grid gap-2 text-sm text-slate-700">
                <SummaryItem label="Duration" value={durationHours ? `${durationHours} hour${durationHours === 1 ? '' : 's'}` : 'Select time'} />
                <SummaryItem label="Hourly rate" value={`Rs ${parking.hourlyPrice}`} />
                <SummaryItem label="Estimated total" value={`Rs ${estimatedTotal}`} />
              </dl>
            </div>

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
              {isSubmitting ? 'Reserving...' : 'Confirm reservation'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function Field({ label, ...props }) {
  return (
    <label className="grid gap-2 text-sm font-medium text-slate-700">
      {label}
      <input className="rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100" {...props} />
    </label>
  );
}

function SummaryItem({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-semibold capitalize text-slate-950">{value}</dd>
    </div>
  );
}
