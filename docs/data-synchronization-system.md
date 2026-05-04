# SmartPark Data Synchronization System

## Overview

The SmartPark data synchronization system ensures all parts of the application (User, Owner, Admin) always display updated data after any change. This prevents stale UI and provides a consistent user experience across all roles.

## Architecture

### Centralized Data Fetching

All data fetching is centralized through custom React hooks in `client/src/hooks/useDataSync.js`:

```javascript
// User bookings
const { bookings, isLoading, error, refetch } = useUserBookings();

// Owner bookings
const { bookings, summary, parkings, isLoading, error, refetch } = useOwnerBookings(filters);

// Admin bookings
const { bookings, isLoading, error, refetch } = useAdminBookings(filters);

// Parking details
const { parking, isLoading, error, refetch } = useParkingDetails(parkingId);
```

### Key Features

1. **Automatic Data Fetching**: Data is fetched automatically on component mount
2. **Manual Refresh**: All hooks provide a `refetch()` function for manual updates
3. **Loading States**: Built-in loading state management
4. **Error Handling**: Centralized error handling with descriptive messages
5. **Debug Logging**: Console logs for tracking data flow

## Data Flow

### User Booking Flow

```
User creates booking
    ↓
BookingModal.handleSubmit()
    ↓
await createBooking()
    ↓
onSuccess(booking) → triggers parent refresh
    ↓
ParkingDetailPage.handleBookingSuccess()
    ↓
await fetchParkingById() → updates availableSlots
    ↓
MyBookingsPage auto-refreshes on next visit
```

### Owner Dashboard Flow

```
Owner completes booking
    ↓
OwnerDashboard.handleCompleteBooking()
    ↓
await completeOwnerBooking(id)
    ↓
await loadMine() → refetches all owner data
    ↓
UI updates with new booking status
    ↓
Available slots restored
```

### Admin Dashboard Flow

```
Admin cancels booking
    ↓
AdminDashboard.handleCancelBooking()
    ↓
await cancelAdminBooking(id)
    ↓
await loadDashboard() → refetches all admin data
    ↓
UI updates across all sections
    ↓
Booking list, parking slots, summary all updated
```

## Implementation Details

### 1. Booking Creation (User Side)

**File:** `client/src/features/bookings/BookingModal.jsx`

```javascript
async function handleSubmit(event) {
  event.preventDefault();
  setIsSubmitting(true);

  try {
    console.log('[BookingModal] Creating booking...');
    const booking = await createBooking({ ... });
    console.log('[BookingModal] Booking created:', booking.bookingCode);
    
    const paymentOrder = await createPaymentOrder({ ... });

    if (paymentOrder.testPayment) {
      console.log('[BookingModal] Test payment confirmed, triggering data sync');
      setConfirmation(paymentOrder.booking);
      onSuccess(paymentOrder.booking); // Triggers parent refresh
      return;
    }

    const paidBooking = await openRazorpayCheckout(paymentOrder, parking.title);
    console.log('[BookingModal] Payment completed, triggering data sync');
    setConfirmation(paidBooking);
    onSuccess(paidBooking); // Triggers parent refresh
  } catch (apiError) {
    console.error('[BookingModal] Booking failed:', apiError);
    setError(getApiErrorMessage(apiError, 'Unable to reserve this time slot'));
  } finally {
    setIsSubmitting(false);
  }
}
```

**Parent Handler:** `client/src/features/parkings/ParkingDetailPage.jsx`

```javascript
async function handleBookingSuccess(booking) {
  console.log('[ParkingDetailPage] Booking successful, refreshing data...');
  clearGuestBookingIntent(id);
  setIsBookingOpen(false);

  // Refetch parking to get updated availableSlots
  try {
    const refreshed = await fetchParkingById(id);
    setParking(refreshed);
    console.log('[ParkingDetailPage] Parking data refreshed:', {
      availableSlots: refreshed.availableSlots,
      totalSlots: refreshed.totalSlots
    });
  } catch (err) {
    console.error('[ParkingDetailPage] Failed to refresh parking data:', err);
    // Fallback: optimistic update
    setParking((current) =>
      current
        ? { ...current, availableSlots: Math.max(0, current.availableSlots - booking.slotCount) }
        : current
    );
  }
}
```

### 2. Booking Cancellation (User Side)

**File:** `client/src/features/bookings/MyBookingsPage.jsx`

```javascript
async function confirmCancel() {
  if (!cancelTarget) return;
  setError('');

  try {
    console.log('[MyBookingsPage] Cancelling booking:', cancelTarget.id);
    const updated = await cancelBooking(cancelTarget.id);
    
    // Optimistic update
    setBookings((current) =>
      current.map((b) => (b.id === updated.id ? { ...b, ...updated } : b))
    );
    
    setCancelTarget(null);
    console.log('[MyBookingsPage] Booking cancelled, data updated');
    
    // Refetch to ensure consistency
    await loadBookings();
  } catch (apiError) {
    setError(getApiErrorMessage(apiError, 'Unable to cancel this booking'));
  }
}
```

### 3. Owner Dashboard Updates

**File:** `client/src/features/parkings/OwnerParkingDashboard.jsx`

```javascript
async function handleCompleteBooking(id) {
  setError('');

  try {
    console.log('[OwnerDashboard] Completing booking:', id);
    await completeOwnerBooking(id);
    console.log('[OwnerDashboard] Booking completed, refreshing data...');
    await loadMine(); // Refetches all owner data
  } catch (apiError) {
    setError(getApiErrorMessage(apiError, 'Unable to complete booking'));
  }
}

async function handleCreate(payload, imageFiles = []) {
  setError('');

  try {
    console.log('[OwnerDashboard] Creating parking...');
    let parking = await createParking(payload);

    if (imageFiles.length > 0) {
      parking = await uploadParkingImages(parking.id, imageFiles);
    }

    console.log('[OwnerDashboard] Parking created, refreshing data...');
    await loadMine(); // Refetches all owner data
    setEditingParking(parking);
    return parking;
  } catch (apiError) {
    setError(getApiErrorMessage(apiError, 'Unable to create parking listing'));
    return null;
  }
}
```

### 4. Admin Dashboard Updates

**File:** `client/src/features/admin/AdminDashboardPage.jsx`

```javascript
async function handleCancelBooking(booking) {
  setError('');

  try {
    console.log('[AdminDashboard] Cancelling booking:', booking.id);
    const updated = await cancelAdminBooking(booking.id);
    
    // Optimistic update
    setBookings((current) => current.map((b) => (b.id === updated.id ? updated : b)));
    
    console.log('[AdminDashboard] Booking cancelled, refreshing data...');
    
    // Refetch to ensure consistency across all sections
    await loadDashboard();
  } catch (apiError) {
    setError(getApiErrorMessage(apiError, 'Unable to cancel booking'));
  }
}

async function applyParkingUpdate(action) {
  setError('');

  try {
    console.log('[AdminDashboard] Applying parking update...');
    const parking = await action();
    
    // Optimistic update
    setDashboard((current) => replaceParking(current, parking));
    
    setRejectTarget(null);
    setRejectReason('');
    console.log('[AdminDashboard] Parking updated, refreshing data...');
    
    // Refetch to ensure consistency
    await loadDashboard();
  } catch (apiError) {
    setError(getApiErrorMessage(apiError, 'Unable to update listing moderation status'));
  }
}
```

## Manual Refresh Buttons

All dashboards include manual refresh buttons for user-initiated updates:

### User Bookings Page
```jsx
<button
  className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
  disabled={isLoading}
  onClick={loadBookings}
  type="button"
>
  <svg className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} ...>
    {/* Refresh icon */}
  </svg>
  {isLoading ? 'Refreshing...' : 'Refresh'}
</button>
```

### Owner Dashboard
```jsx
<button
  disabled={isLoading}
  onClick={loadMine}
  type="button"
>
  {isLoading ? 'Refreshing...' : 'Refresh'}
</button>
```

### Admin Dashboard
```jsx
<button
  disabled={isLoading}
  onClick={loadDashboard}
  type="button"
>
  {isLoading ? 'Refreshing...' : 'Refresh'}
</button>
```

## Debug Logging

All data synchronization operations include console logs for debugging:

```javascript
console.log('[DataSync] Fetching user bookings...');
console.log('[DataSync] User bookings updated:', data.length, 'bookings');
console.log('[BookingModal] Creating booking...');
console.log('[BookingModal] Booking created:', booking.bookingCode);
console.log('[ParkingDetailPage] Booking successful, refreshing data...');
console.log('[ParkingDetailPage] Parking data refreshed:', { availableSlots, totalSlots });
console.log('[OwnerDashboard] Completing booking:', id);
console.log('[AdminDashboard] Cancelling booking:', booking.id);
```

## Loading States

All components show loading indicators during data fetching:

```javascript
{isLoading ? (
  <div className="flex items-center gap-2 text-sm text-slate-500">
    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
    Loading...
  </div>
) : null}
```

## Error Handling

Errors are displayed with descriptive messages:

```javascript
{error ? (
  <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
    {error}
  </p>
) : null}
```

## Backend Support

The backend ensures updated data is returned:

### Booking Creation
- Returns updated `availableSlots` in parking response
- Includes `bookingCode` in booking response
- Uses transactions to ensure atomicity

### Booking Cancellation
- Restores `availableSlots` atomically
- Updates booking status
- Returns updated booking object

### Owner Operations
- Populates user and parking details
- Returns updated slot counts
- Includes booking summary

### Admin Operations
- Returns comprehensive booking details
- Includes user and parking information
- Provides system-wide visibility

## Best Practices

1. **Always refetch after mutations**: After creating, updating, or deleting data, always refetch to ensure consistency
2. **Use optimistic updates**: Update UI immediately, then refetch for confirmation
3. **Handle errors gracefully**: Always provide fallback behavior if refetch fails
4. **Log data flow**: Use console logs to track data synchronization
5. **Show loading states**: Always indicate when data is being fetched
6. **Provide manual refresh**: Give users control with refresh buttons

## Testing Data Synchronization

### User Flow Test
1. Create a booking
2. Verify booking appears in "My Bookings"
3. Verify parking shows reduced available slots
4. Cancel booking
5. Verify booking status updates
6. Verify parking shows restored slots

### Owner Flow Test
1. Create a parking listing
2. Verify it appears in owner dashboard
3. Complete a booking
4. Verify booking status updates
5. Verify available slots update
6. Verify summary statistics update

### Admin Flow Test
1. View all bookings
2. Cancel a booking
3. Verify booking status updates across all views
4. Approve a parking listing
5. Verify it moves to approved section
6. Verify summary counts update

## Troubleshooting

### Data Not Updating
1. Check console logs for errors
2. Verify API calls are completing successfully
3. Check network tab for response data
4. Verify refetch is being called after mutations

### Stale Data
1. Click manual refresh button
2. Check if filters are preventing data from showing
3. Verify backend is returning updated data
4. Check for caching issues

### Performance Issues
1. Avoid unnecessary refetches
2. Use optimistic updates for immediate feedback
3. Debounce filter changes
4. Consider pagination for large datasets

## Future Enhancements

1. **WebSocket Integration**: Real-time updates without manual refresh
2. **Optimistic UI**: More aggressive optimistic updates
3. **Cache Management**: Intelligent cache invalidation
4. **Background Sync**: Periodic background data refresh
5. **Offline Support**: Queue mutations for when connection returns
