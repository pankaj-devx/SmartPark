export function getBookingSubmitPlan({ form, isAuthenticated }) {
  if (isAuthenticated) {
    return {
      kind: 'submit'
    };
  }

  return {
    kind: 'auth_required',
    draft: {
      bookingDate: form.bookingDate,
      startTime: form.startTime,
      endTime: form.endTime,
      vehicleType: form.vehicleType,
      slotCount: Number(form.slotCount)
    }
  };
}
