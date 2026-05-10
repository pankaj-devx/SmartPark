# Owner Analytics - Quick Reference Card

**Last Updated:** 10 May 2026

---

## API Endpoint

```
GET /api/analytics/owner
```

### Query Parameters
- `dateRange` - Number of days (7, 30, 90)
- `startDate` - Start date (YYYY-MM-DD)
- `endDate` - End date (YYYY-MM-DD)
- `parkingId` - Specific parking ID

### Example Requests
```bash
# Last 30 days (default)
GET /api/analytics/owner

# Last 7 days
GET /api/analytics/owner?dateRange=7

# Custom date range
GET /api/analytics/owner?startDate=2026-04-01&endDate=2026-04-30

# Specific parking
GET /api/analytics/owner?parkingId=507f1f77bcf86cd799439011

# Combined filters
GET /api/analytics/owner?dateRange=30&parkingId=507f1f77bcf86cd799439011
```

---

## Response Structure

```javascript
{
  "data": {
    // KPI Summary
    "kpis": {
      "totalRevenue": 45000,
      "activeReservations": 12,
      "completedBookings": 28,
      "cancelledBookings": 5,
      "confirmedBookings": 15,
      "averageBookingValue": 1607.14,
      "occupancyRate": 65.2
    },
    
    // Revenue Trend (completed only)
    "revenueTrend": [
      { "date": "2026-05-01", "revenue": 3000, "bookings": 2 },
      { "date": "2026-05-02", "revenue": 4500, "bookings": 3 }
    ],
    
    // Bookings Trend (by status)
    "bookingsTrend": [
      { "date": "2026-05-01", "confirmed": 5, "completed": 2, "cancelled": 1 },
      { "date": "2026-05-02", "confirmed": 7, "completed": 3, "cancelled": 0 }
    ],
    
    // Peak Hours (exclude cancelled)
    "peakHours": [
      { "hour": 9, "bookings": 12 },
      { "hour": 14, "bookings": 15 }
    ],
    
    // Listing Performance
    "listingPerformance": [
      {
        "parkingId": "507f1f77bcf86cd799439011",
        "parkingName": "MG Road Mall",
        "totalBookings": 18,
        "completedBookings": 15,
        "cancelledBookings": 3,
        "revenue": 24000,
        "totalSlots": 50,
        "cancellationRate": "16.7"
      }
    ],
    
    // Customer Insights
    "customerInsights": {
      "uniqueCustomers": 24,
      "repeatCustomers": 8,
      "averageSlotsPerBooking": "1.2",
      "averageBookingDuration": "3.5"
    },
    
    // Recent Activity
    "recentActivity": [
      {
        "id": "507f1f77bcf86cd799439011",
        "type": "completed",
        "customerName": "Rajesh Kumar",
        "parkingName": "MG Road Mall",
        "bookingDate": "2026-05-10",
        "startTime": "14:30",
        "amount": 1500,
        "status": "completed",
        "createdAt": "2026-05-10T09:00:00.000Z"
      }
    ],
    
    // Occupancy Stats
    "occupancyStats": {
      "totalSlots": 150,
      "reservedSlots": 98,
      "availableSlots": 52,
      "occupancyRate": 65.2
    }
  }
}
```

---

## Business Rules

### Revenue Calculation
```javascript
// ONLY completed successful bookings
status = 'completed' 
AND paymentStatus = 'paid' 
AND bookingStatus != 'cancelled'
```

### Booking Status Categories
```javascript
// Confirmed
status IN ['confirmed', 'active', 'ongoing']

// Completed
status = 'completed'

// Cancelled
status = 'cancelled'

// Pending
status = 'pending'

// Failed
status IN ['payment_failed', 'expired', 'refunded']
```

### Peak Hours
```javascript
// Exclude cancelled bookings
status != 'cancelled'
GROUP BY HOUR(startTime)
```

### Cancellation Rate
```javascript
(cancelledBookings / totalBookings) × 100
```

### Average Booking Value
```javascript
totalRevenue / completedBookings
```

### Occupancy Rate
```javascript
(reservedSlots / totalSlots) × 100
```

---

## Frontend Usage

### Import
```javascript
import { fetchOwnerAnalytics } from '../features/analytics/analyticsApi.js';
```

### Fetch Analytics
```javascript
// Default (last 30 days)
const data = await fetchOwnerAnalytics();

// With filters
const data = await fetchOwnerAnalytics({
  dateRange: '7',
  parkingId: '507f1f77bcf86cd799439011'
});
```

### Component Example
```jsx
function OwnerDashboard() {
  const [analytics, setAnalytics] = useState(null);
  const [dateRange, setDateRange] = useState('30');
  
  useEffect(() => {
    async function load() {
      const data = await fetchOwnerAnalytics({ dateRange });
      setAnalytics(data);
    }
    load();
  }, [dateRange]);
  
  return (
    <div>
      <h1>Total Revenue: ₹{analytics?.kpis.totalRevenue}</h1>
      {/* ... */}
    </div>
  );
}
```

---

## Database Queries

### Revenue Stats
```javascript
await Booking.aggregate([
  { 
    $match: {
      parking: { $in: parkingIds },
      status: 'completed',
      paymentStatus: 'paid',
      bookingStatus: { $ne: 'cancelled' }
    }
  },
  {
    $group: {
      _id: null,
      totalRevenue: { $sum: '$totalAmount' },
      count: { $sum: 1 }
    }
  }
]);
```

### Booking Status Counts
```javascript
await Booking.aggregate([
  { $match: { parking: { $in: parkingIds } } },
  {
    $group: {
      _id: '$status',
      count: { $sum: 1 }
    }
  }
]);
```

### Peak Hours
```javascript
await Booking.aggregate([
  { 
    $match: {
      parking: { $in: parkingIds },
      status: { $ne: 'cancelled' }
    }
  },
  {
    $group: {
      _id: {
        $toInt: {
          $substr: [{ $ifNull: ['$startTime', '00:00'] }, 0, 2]
        }
      },
      count: { $sum: 1 }
    }
  },
  { $sort: { count: -1 } },
  { $limit: 10 }
]);
```

---

## Constants

```javascript
// server/src/services/analytics.service.js

const COMPLETED_BOOKING_STATUS = 'completed';
const CONFIRMED_STATUSES = ['confirmed', 'active', 'ongoing'];
const CANCELLED_STATUS = 'cancelled';
const FAILED_STATUSES = ['payment_failed', 'expired', 'refunded'];
const REVENUE_BOOKING_STATUSES = ['confirmed', 'completed']; // Legacy
```

---

## Color Palette

```javascript
// KPI Card Colors
const colors = {
  green: 'bg-green-50 text-green-600',   // Revenue, Completed
  blue: 'bg-blue-50 text-blue-600',       // Active, Confirmed
  red: 'bg-red-50 text-red-600',          // Cancelled
  purple: 'bg-purple-50 text-purple-600', // Avg Value
  orange: 'bg-orange-50 text-orange-600'  // Occupancy
};

// Chart Colors
const chartColors = {
  revenue: '#10b981',    // Green
  confirmed: '#3b82f6',  // Blue
  completed: '#10b981',  // Green
  cancelled: '#ef4444'   // Red
};
```

---

## Utility Functions

### Format Date
```javascript
// "2026-05-10" → "10 May 2026"
function formatDate(dateStr) {
  const [year, month, day] = dateStr.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${parseInt(day)} ${months[parseInt(month) - 1]} ${year}`;
}
```

### Format Time
```javascript
// "14:30" → "2:30 PM"
function formatTime(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${String(minutes).padStart(2, '0')} ${period}`;
}
```

### Format Relative Time
```javascript
// "2026-05-10T09:00:00.000Z" → "2h ago"
function formatRelativeTime(timestamp) {
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}
```

---

## Testing

### Manual Test
```bash
# 1. Create completed booking
# 2. Check analytics
# Expected: Revenue increases, completed count increases

# 3. Create cancelled booking
# 4. Check analytics
# Expected: Cancelled count increases, revenue unchanged
```

### Automated Test
```javascript
describe('Owner Analytics', () => {
  it('should exclude cancelled bookings from revenue', async () => {
    // Create completed booking
    const completed = await createBooking({ status: 'completed' });
    
    // Create cancelled booking
    const cancelled = await createBooking({ status: 'cancelled' });
    
    // Fetch analytics
    const analytics = await getOwnerAnalytics(ownerId);
    
    // Verify
    expect(analytics.kpis.totalRevenue).toBe(completed.totalAmount);
    expect(analytics.kpis.completedBookings).toBe(1);
    expect(analytics.kpis.cancelledBookings).toBe(1);
  });
});
```

---

## Common Issues

### Issue: Revenue includes cancelled bookings
**Solution:** Check booking status filter in revenue query
```javascript
// Correct
status: 'completed',
bookingStatus: { $ne: 'cancelled' }

// Wrong
status: { $in: ['confirmed', 'completed'] }
```

### Issue: Peak hours shows cancelled bookings
**Solution:** Add cancelled exclusion filter
```javascript
// Correct
status: { $ne: 'cancelled' }

// Wrong
// No filter
```

### Issue: Empty charts
**Solution:** Check date range filter
```javascript
// Ensure bookings exist in date range
bookingDate: { $gte: startDate, $lte: endDate }
```

---

## Performance Tips

1. **Use Parallel Queries**
```javascript
const [revenue, bookings, peakHours] = await Promise.all([
  calculateRevenue(),
  calculateBookings(),
  calculatePeakHours()
]);
```

2. **Use Lean Queries**
```javascript
await Booking.find().lean(); // Faster
```

3. **Use Indexes**
```javascript
// Ensure indexes on:
// - parking
// - bookingDate
// - status
// - paymentStatus
```

4. **Limit Results**
```javascript
.limit(10) // For recent activity
.limit(90) // For trends
```

---

## Security

### Authorization
```javascript
// Only owner can access their analytics
authenticate, // Verify user logged in
authorizeRoles('owner'), // Verify user is owner
// Then filter by owner's parkings
```

### Data Isolation
```javascript
// Always filter by owner's parkings
const parkings = await Parking.find({ owner: ownerId });
const parkingIds = parkings.map(p => p._id);
// Use parkingIds in all queries
```

---

## Monitoring

### Key Metrics to Monitor
- Response time (should be < 2s)
- Query count (should use parallel execution)
- Memory usage (should not leak)
- Error rate (should be < 1%)

### Logging
```javascript
console.log('[Analytics] Fetching for owner:', ownerId);
console.log('[Analytics] Date range:', startDate, 'to', endDate);
console.log('[Analytics] Query time:', queryTime, 'ms');
```

---

## Support

### Documentation
- `OWNER_ANALYTICS_UPGRADE_REPORT.md` - Full implementation details
- `OWNER_ANALYTICS_VISUAL_GUIDE.md` - UI/UX guide
- `OWNER_ANALYTICS_TEST_CHECKLIST.md` - Testing guide
- `OWNER_ANALYTICS_COMPLETION_SUMMARY.md` - Executive summary

### Files
- Backend: `server/src/services/analytics.service.js`
- Controller: `server/src/controllers/analytics.controller.js`
- Frontend: `client/src/pages/OwnerDashboard.jsx`
- API: `client/src/features/analytics/analyticsApi.js`

---

**Quick Reference Version:** 1.0  
**Last Updated:** 10 May 2026  
**Status:** Production Ready ✅
