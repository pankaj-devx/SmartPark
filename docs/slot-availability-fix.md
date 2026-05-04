# Parking Slot Availability Fix

## Problem

The owner dashboard was showing incorrect available slot counts. When bookings were made for future times, the dashboard displayed:
- **Currently available: 120** (showing all slots as available)
- **Upcoming reservation load: 2** (correctly showing 2 future bookings)

This created confusion because the "available" count didn't reflect that slots were already reserved for upcoming bookings.

## Root Cause

The `computeLiveAvailableSlotsForMany()` function was only calculating slots occupied by **currently ongoing bookings** (bookings happening RIGHT NOW), not accounting for **all active bookings** (including future reservations).

### Previous Logic (INCORRECT)
```javascript
// Only looked at bookings happening at this exact moment
bookingDate: todayStr,  // Only TODAY
startTime: { $lte: currentTime },  // Already started
endTime: { $gt: currentTime }  // Not yet ended
```

This meant:
- If you booked slots for 3 PM and it's currently 10 AM, those slots showed as "available"
- The database `availableSlots` field was correct (decremented on booking)
- But the owner dashboard recalculated slots using the flawed logic above

## Solution

Changed the slot calculation to use the **database's `availableSlots` field** directly, which is automatically maintained by the booking system:

### New Logic (CORRECT)
```javascript
export async function computeLiveAvailableSlotsForMany(parkings, deps = {}) {
  const ParkingModel = deps.ParkingModel ?? Parking;
  const parkingIds = parkings.map((p) => new mongoose.Types.ObjectId(p.id.toString()));

  // Get the actual availableSlots from the database
  const parkingDocs = await ParkingModel.find({ _id: { $in: parkingIds } })
    .select('_id availableSlots')
    .lean();

  const result = new Map();
  for (const doc of parkingDocs) {
    result.set(doc._id.toString(), doc.availableSlots);
  }

  return result;
}
```

### Why This Works

The `availableSlots` field in the database is **automatically maintained** by the booking system:

1. **Booking Creation**: `availableSlots` is decremented atomically
   ```javascript
   { $inc: { availableSlots: -input.slotCount } }
   ```

2. **Booking Cancellation**: `availableSlots` is incremented back
   ```javascript
   { $inc: { availableSlots: booking.slotCount } }
   ```

3. **Booking Completion**: `availableSlots` is restored
   ```javascript
   { $inc: { availableSlots: booking.slotCount } }
   ```

This means `availableSlots` **always reflects the true available capacity** accounting for:
- ✅ Current ongoing bookings
- ✅ Future upcoming bookings
- ✅ All active reservations (pending + confirmed)

## Changes Made

### 1. Updated `computeLiveAvailableSlotsForMany()` 
**File:** `server/src/services/booking.service.js`

Changed from complex aggregation logic to simple database read:
- Removed time-based filtering
- Removed booking aggregation
- Now reads `availableSlots` directly from Parking model

### 2. Updated `computeLiveAvailableSlots()` (singular)
**File:** `server/src/services/booking.service.js`

Made consistent with the plural version:
- Reads `availableSlots` from database
- No longer calculates based on current time

### 3. Updated `buildOwnerSummary()`
**File:** `server/src/services/owner.service.js`

Fixed the "Currently available" calculation:
```javascript
// OLD (INCORRECT): Calculated as totalSlots - occupiedNow
const availableSlotsNow = Math.max(0, totalSlots - occupiedSlotsNow);

// NEW (CORRECT): Sum of availableSlots from all parkings
const availableSlotsNow = parkings.reduce((sum, parking) => sum + parking.availableSlots, 0);
```

## Expected Behavior After Fix

### Scenario: Owner has 3 parking listings
- **bike parking**: 50 total slots
- **college parking**: 50 total slots  
- **station parking**: 20 total slots
- **Total**: 120 slots

### User books 2 slots for future time (e.g., 3 PM today, current time is 10 AM)

**Owner Dashboard Should Show:**
- ✅ **Currently occupied: 0** (no bookings happening RIGHT NOW)
- ✅ **Currently available: 118** (120 - 2 reserved slots)
- ✅ **Upcoming reservation load: 2** (2 future bookings)

**Occupancy by Listing:**
- ✅ **bike parking**: 50/50 slots available (if no bookings)
- ✅ **college parking**: 48/50 slots available (if 2 slots booked here)
- ✅ **station parking**: 20/20 slots available (if no bookings)

## Testing

### Test Case 1: Future Booking
1. Create a booking for 2 slots at a future time
2. Check owner dashboard immediately
3. **Expected**: Available slots should decrease by 2
4. **Expected**: Occupied now should be 0 (booking hasn't started)

### Test Case 2: Ongoing Booking
1. Create a booking for current time window
2. Check owner dashboard
3. **Expected**: Available slots should decrease by 2
4. **Expected**: Occupied now should increase by 2

### Test Case 3: Booking Cancellation
1. Cancel a booking
2. Check owner dashboard
3. **Expected**: Available slots should increase back
4. **Expected**: Upcoming reservations should decrease

### Test Case 4: Multiple Listings
1. Create bookings across different parking listings
2. Check owner dashboard
3. **Expected**: Each listing shows correct available slots
4. **Expected**: Total available reflects all reservations

## Benefits

1. **Accurate Availability**: Owners see true available capacity
2. **Better Planning**: Owners can make informed decisions about capacity
3. **Consistent Data**: Dashboard matches database state
4. **Simpler Logic**: Removed complex time-based calculations
5. **Better Performance**: Simple database read vs complex aggregation

## Related Files

- `server/src/services/booking.service.js` - Slot calculation functions
- `server/src/services/owner.service.js` - Owner summary calculation
- `client/src/features/parkings/OwnerParkingDashboard.jsx` - Owner UI

## Notes

- The "Currently occupied" metric still uses time-based calculation (correct behavior)
- This shows how many slots are occupied by ongoing bookings RIGHT NOW
- The "Currently available" metric now uses database `availableSlots` (fixed behavior)
- This shows how many slots are truly available for new bookings

## Deployment

After deploying this fix:
1. Existing bookings will immediately show correct availability
2. No database migration needed
3. No data cleanup required
4. Owners should refresh their dashboard to see updated counts
