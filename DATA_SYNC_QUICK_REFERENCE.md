# SmartPark Data Synchronization - Quick Reference

## 🚀 Quick Start

### Using Data Sync Hooks

```javascript
import { useUserBookings, useOwnerBookings, useAdminBookings, useParkingDetails } from '../hooks/useDataSync.js';

// In your component
const { bookings, isLoading, error, refetch } = useUserBookings();

// Manual refresh
<button onClick={refetch}>Refresh</button>
```

## 📋 Available Hooks

### 1. useUserBookings()
```javascript
const { bookings, isLoading, error, refetch, setBookings } = useUserBookings();
```
- **Auto-fetches** on mount
- **Returns** array of user bookings
- **Use for** My Bookings page

### 2. useOwnerBookings(filters)
```javascript
const { bookings, summary, parkings, isLoading, error, refetch } = useOwnerBookings({ status: 'confirmed' });
```
- **Auto-fetches** on mount and filter changes
- **Returns** bookings, summary stats, and parking list
- **Use for** Owner Dashboard

### 3. useAdminBookings(filters)
```javascript
const { bookings, isLoading, error, refetch } = useAdminBookings({ status: 'pending' });
```
- **Auto-fetches** on mount and filter changes
- **Returns** all system bookings
- **Use for** Admin Dashboard

### 4. useParkingDetails(parkingId)
```javascript
const { parking, isLoading, error, refetch } = useParkingDetails(parkingId);
```
- **Auto-fetches** on mount and parkingId change
- **Returns** parking details with updated slots
- **Use for** Parking Detail Page

## 🔄 When to Refetch

### After Mutations
Always refetch after:
- ✅ Creating a booking
- ✅ Cancelling a booking
- ✅ Completing a booking
- ✅ Creating/updating/deleting parking
- ✅ Approving/rejecting parking
- ✅ Blocking/unblocking users

### Pattern
```javascript
async function handleAction() {
  try {
    await performAction();
    await refetch(); // Always refetch after mutation
  } catch (error) {
    // Handle error
  }
}
```

## 📊 Console Logging

All operations log to console for debugging:

```javascript
[DataSync] Fetching user bookings...
[DataSync] User bookings updated: 5 bookings
[BookingModal] Creating booking...
[BookingModal] Booking created: BOOK-A9F3K2D1
[ParkingDetailPage] Parking data refreshed: { availableSlots: 8 }
[OwnerDashboard] Completing booking: 123
[AdminDashboard] Cancelling booking: 456
```

## 🎨 UI Patterns

### Loading State
```javascript
{isLoading ? (
  <div>Loading...</div>
) : (
  <div>{/* Your content */}</div>
)}
```

### Error Display
```javascript
{error ? (
  <p className="text-red-700">{error}</p>
) : null}
```

### Refresh Button
```javascript
<button
  disabled={isLoading}
  onClick={refetch}
>
  {isLoading ? 'Refreshing...' : 'Refresh'}
</button>
```

## 🔧 Common Patterns

### User Creates Booking
```javascript
// In BookingModal
async function handleSubmit() {
  const booking = await createBooking(data);
  onSuccess(booking); // Triggers parent refresh
}

// In ParkingDetailPage
async function handleBookingSuccess(booking) {
  const refreshed = await fetchParkingById(id);
  setParking(refreshed); // Updates available slots
}
```

### Owner Completes Booking
```javascript
async function handleCompleteBooking(id) {
  await completeOwnerBooking(id);
  await loadMine(); // Refetches all owner data
}
```

### Admin Cancels Booking
```javascript
async function handleCancelBooking(booking) {
  await cancelAdminBooking(booking.id);
  await loadDashboard(); // Refetches all admin data
}
```

## ⚡ Optimistic Updates

For instant feedback, update UI immediately then refetch:

```javascript
async function handleCancel(booking) {
  // Optimistic update
  setBookings(current => 
    current.map(b => 
      b.id === booking.id 
        ? { ...b, status: 'cancelled' } 
        : b
    )
  );
  
  // Actual API call
  await cancelBooking(booking.id);
  
  // Refetch for consistency
  await refetch();
}
```

## 🐛 Debugging Checklist

If data isn't updating:

1. ✅ Check console logs for errors
2. ✅ Verify refetch is being called
3. ✅ Check network tab for API responses
4. ✅ Verify backend returns updated data
5. ✅ Try manual refresh button
6. ✅ Check if filters are hiding data

## 📱 Component Examples

### User Bookings Page
```javascript
export function MyBookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadBookings = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchMyBookings();
      setBookings(data);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  async function handleCancel(id) {
    await cancelBooking(id);
    await loadBookings(); // Refetch
  }

  return (
    <div>
      <button onClick={loadBookings}>Refresh</button>
      {/* Render bookings */}
    </div>
  );
}
```

### Owner Dashboard
```javascript
export function OwnerDashboard() {
  const loadMine = useCallback(async () => {
    const data = await fetchOwnerBookings();
    setParkings(data.parkings);
    setBookings(data.bookings);
  }, []);

  useEffect(() => {
    loadMine();
  }, [loadMine]);

  async function handleComplete(id) {
    await completeOwnerBooking(id);
    await loadMine(); // Refetch all
  }

  return (
    <div>
      <button onClick={loadMine}>Refresh</button>
      {/* Render dashboard */}
    </div>
  );
}
```

### Admin Dashboard
```javascript
export function AdminDashboard() {
  const loadDashboard = useCallback(async () => {
    const [dashboard, bookings] = await Promise.all([
      fetchAdminDashboard(),
      fetchAdminBookings()
    ]);
    setDashboard(dashboard);
    setBookings(bookings);
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  async function handleCancel(id) {
    await cancelAdminBooking(id);
    await loadDashboard(); // Refetch all
  }

  return (
    <div>
      <button onClick={loadDashboard}>Refresh</button>
      {/* Render dashboard */}
    </div>
  );
}
```

## 🎯 Best Practices

1. **Always refetch after mutations** - Ensures data consistency
2. **Use optimistic updates** - Provides instant feedback
3. **Log all operations** - Makes debugging easier
4. **Show loading states** - Improves UX
5. **Handle errors gracefully** - Provide fallback behavior
6. **Provide manual refresh** - Give users control

## 📚 Full Documentation

See `docs/data-synchronization-system.md` for complete details.
