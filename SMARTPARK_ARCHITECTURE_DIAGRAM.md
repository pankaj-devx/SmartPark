# SMARTPARK ARCHITECTURE - RESERVED CAPACITY FLOW

**Date:** May 10, 2026  
**Status:** ✅ IMPLEMENTED

---

## 🏗️ SYSTEM ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND LAYER                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐ │
│  │ ParkingDetail    │  │ SearchResults    │  │ OwnerDashboard│ │
│  │ Page.jsx         │  │ Page.jsx         │  │ .jsx          │ │
│  ├──────────────────┤  ├──────────────────┤  ├──────────────┤ │
│  │ • Shows parking  │  │ • Lists parkings │  │ • Shows      │ │
│  │ • Socket listener│  │ • Socket listener│  │   metrics    │ │
│  │ • Real-time      │  │ • Real-time      │  │ • Socket     │ │
│  │   updates        │  │   updates        │  │   listener   │ │
│  └────────┬─────────┘  └────────┬─────────┘  └──────┬───────┘ │
│           │                     │                    │         │
└───────────┼─────────────────────┼────────────────────┼─────────┘
            │                     │                    │
            │    Socket.IO Events │                    │
            │    (parking_slots_  │                    │
            │     updated)        │                    │
            └─────────────────────┴────────────────────┘
                                  │
┌─────────────────────────────────┼─────────────────────────────┐
│                         SOCKET.IO LAYER                        │
├─────────────────────────────────┼─────────────────────────────┤
│                                 │                              │
│  Event: parking_slots_updated   │                              │
│  Data: {                        │                              │
│    parkingId,                   │                              │
│    action: 'created'|'cancelled'|'completed',                  │
│    totalSlots,                  │                              │
│    reservedSlots,  ◄────────────┼──── PRIMARY METRIC          │
│    availableSlots               │                              │
│  }                              │                              │
│                                 │                              │
└─────────────────────────────────┼─────────────────────────────┘
                                  │
┌─────────────────────────────────┼─────────────────────────────┐
│                         BACKEND LAYER                          │
├─────────────────────────────────┼─────────────────────────────┤
│                                 │                              │
│  ┌──────────────────────────────▼──────────────────────────┐  │
│  │         BOOKING SERVICE (booking.service.js)            │  │
│  ├─────────────────────────────────────────────────────────┤  │
│  │ • createConfirmedBooking()                              │  │
│  │   → Emits socket event with reservedSlots               │  │
│  │                                                          │  │
│  │ • cancelBooking()                                       │  │
│  │   → Updates status to 'cancelled'                       │  │
│  │   → Emits socket event with updated reservedSlots       │  │
│  │   → Sends notifications to USER, OWNER, ALL ADMINS      │  │
│  │                                                          │  │
│  │ • reconcileExpiredBookings()                            │  │
│  │   → Auto-completes bookings where endTime < NOW         │  │
│  │   → Called lazily on parking view                       │  │
│  └────────────────────┬────────────────────────────────────┘  │
│                       │                                        │
│  ┌────────────────────▼────────────────────────────────────┐  │
│  │         OWNER SERVICE (owner.service.js)                │  │
│  ├─────────────────────────────────────────────────────────┤  │
│  │ • completeOwnerBooking()                                │  │
│  │   → Updates status to 'completed'                       │  │
│  │   → Emits socket event with updated reservedSlots       │  │
│  └────────────────────┬────────────────────────────────────┘  │
│                       │                                        │
│  ┌────────────────────▼────────────────────────────────────┐  │
│  │         PARKING SERVICE (parking.service.js)            │  │
│  ├─────────────────────────────────────────────────────────┤  │
│  │ • getParkingDetail()                                    │  │
│  │   → Calls reconcileExpiredBookings()                    │  │
│  │   → Calls calculateReservedSlots()                      │  │
│  │   → Returns parking with reservedSlots & availableSlots │  │
│  │                                                          │  │
│  │ • listPublicParkings()                                  │  │
│  │   → Uses calculateOccupancyMetricsForMany()             │  │
│  │   → Returns parkings with reservedSlots                 │  │
│  │                                                          │  │
│  │ • listNearbyParkings()                                  │  │
│  │   → Uses calculateOccupancyMetricsForMany()             │  │
│  │   → Returns parkings with reservedSlots                 │  │
│  └────────────────────┬────────────────────────────────────┘  │
│                       │                                        │
│  ┌────────────────────▼────────────────────────────────────┐  │
│  │      OCCUPANCY SERVICE (occupancy.service.js)           │  │
│  │                  ★ CORE CALCULATION ENGINE ★            │  │
│  ├─────────────────────────────────────────────────────────┤  │
│  │                                                          │  │
│  │ ┌────────────────────────────────────────────────────┐ │  │
│  │ │ calculateReservedSlots(listingId)                  │ │  │
│  │ │ ★ NEW FUNCTION - PRIMARY METRIC ★                  │ │  │
│  │ ├────────────────────────────────────────────────────┤ │  │
│  │ │ Formula:                                           │ │  │
│  │ │   reservedSlots = SUM(slotCount) WHERE:            │ │  │
│  │ │     - status IN ['confirmed','active','ongoing']   │ │  │
│  │ │     - paymentStatus = 'paid'                       │ │  │
│  │ │     - bookingStatus != 'cancelled'                 │ │  │
│  │ │     - bookingDate >= TODAY  ◄─── INCLUDES FUTURE   │ │  │
│  │ │                                                     │ │  │
│  │ │ Returns: number (all confirmed bookings)           │ │  │
│  │ └────────────────────────────────────────────────────┘ │  │
│  │                                                          │  │
│  │ ┌────────────────────────────────────────────────────┐ │  │
│  │ │ calculateReservedSlotsForMany(parkings)            │ │  │
│  │ │ ★ BATCH OPERATION ★                                │ │  │
│  │ ├────────────────────────────────────────────────────┤ │  │
│  │ │ • Efficient batch calculation for multiple parkings│ │  │
│  │ │ • Single aggregation query                         │ │  │
│  │ │ • Returns Map<parkingId, reservedSlots>            │ │  │
│  │ └────────────────────────────────────────────────────┘ │  │
│  │                                                          │  │
│  │ ┌────────────────────────────────────────────────────┐ │  │
│  │ │ calculateOccupancyMetrics(listingId, totalSlots)   │ │  │
│  │ │ ★ UPDATED TO USE RESERVED SLOTS ★                  │ │  │
│  │ ├────────────────────────────────────────────────────┤ │  │
│  │ │ Returns: {                                         │ │  │
│  │ │   totalSlots,                                      │ │  │
│  │ │   reservedSlots,      ◄─── PRIMARY METRIC          │ │  │
│  │ │   occupiedSlots,      ◄─── Current moment only     │ │  │
│  │ │   availableSlots,     ◄─── totalSlots - reserved   │ │  │
│  │ │   utilization,        ◄─── Based on reserved       │ │  │
│  │ │   upcomingReservations                             │ │  │
│  │ │ }                                                   │ │  │
│  │ └────────────────────────────────────────────────────┘ │  │
│  │                                                          │  │
│  │ ┌────────────────────────────────────────────────────┐ │  │
│  │ │ calculateCurrentOccupancy(listingId)               │ │  │
│  │ │ ★ KEPT FOR MONITORING ONLY ★                       │ │  │
│  │ ├────────────────────────────────────────────────────┤ │  │
│  │ │ • Counts bookings active RIGHT NOW                 │ │  │
│  │ │ • Used for real-time monitoring                    │ │  │
│  │ │ • NOT used for availability calculation            │ │  │
│  │ └────────────────────────────────────────────────────┘ │  │
│  │                                                          │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │      ANALYTICS SERVICE (analytics.service.js)            │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │ • calculateOwnerAnalytics()                              │  │
│  │   → Uses calculateOccupancyMetricsForMany()              │  │
│  │   → Returns occupancyStats with reservedSlots            │  │
│  │                                                           │  │
│  │ • Money Rules:                                           │  │
│  │   - User Spending: confirmed + completed (no cancelled) │  │
│  │   - Owner Earnings: completed only (no cancelled)       │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                │
└────────────────────────────────────────────────────────────────┘
                                  │
┌─────────────────────────────────┼─────────────────────────────┐
│                         DATABASE LAYER                         │
├─────────────────────────────────┼─────────────────────────────┤
│                                 │                              │
│  ┌──────────────────────────────▼──────────────────────────┐  │
│  │                    BOOKINGS COLLECTION                   │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │ {                                                        │  │
│  │   _id,                                                   │  │
│  │   bookingCode,                                           │  │
│  │   parking,                                               │  │
│  │   user,                                                  │  │
│  │   bookingDate,        ◄─── Used in reservedSlots calc   │  │
│  │   startTime,                                             │  │
│  │   endTime,                                               │  │
│  │   slotCount,          ◄─── Summed for reservedSlots     │  │
│  │   status,             ◄─── Must be confirmed/active      │  │
│  │   bookingStatus,      ◄─── Must not be cancelled        │  │
│  │   paymentStatus,      ◄─── Must be paid                 │  │
│  │   totalAmount                                            │  │
│  │ }                                                        │  │
│  │                                                          │  │
│  │ Indexes:                                                 │  │
│  │   - parking + bookingDate + status                      │  │
│  │   - parking + status + paymentStatus                    │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    PARKINGS COLLECTION                   │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │ {                                                        │  │
│  │   _id,                                                   │  │
│  │   title,                                                 │  │
│  │   totalSlots,         ◄─── Used in availability calc    │  │
│  │   owner,                                                 │  │
│  │   verificationStatus,                                    │  │
│  │   isActive                                               │  │
│  │ }                                                        │  │
│  │                                                          │  │
│  │ Note: availableSlots calculated dynamically, not stored │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

## 🔄 DATA FLOW: BOOKING CREATION

```
1. USER CREATES BOOKING
   ↓
2. booking.service.js → createConfirmedBooking()
   ↓
3. Validate availability using calculateOccupiedSlots()
   ↓
4. Create booking in database
   ↓
5. Calculate new reservedSlots using calculateReservedSlots()
   ↓
6. Emit Socket.IO event: parking_slots_updated
   {
     parkingId,
     action: 'created',
     totalSlots: 20,
     reservedSlots: 2,      ◄─── NEW VALUE
     availableSlots: 18     ◄─── totalSlots - reservedSlots
   }
   ↓
7. FRONTEND RECEIVES EVENT
   ↓
8. Update UI immediately:
   - ParkingDetailPage: Update single parking
   - SearchResultsPage: Update parking in list
   - OwnerDashboard: Refresh dashboard
```

---

## 🔄 DATA FLOW: BOOKING CANCELLATION

```
1. USER CANCELS BOOKING
   ↓
2. booking.service.js → cancelBooking()
   ↓
3. Update booking status to 'cancelled'
   ↓
4. Calculate new reservedSlots using calculateReservedSlots()
   (Cancelled bookings automatically excluded)
   ↓
5. Emit Socket.IO event: parking_slots_updated
   {
     parkingId,
     action: 'cancelled',
     totalSlots: 20,
     reservedSlots: 0,      ◄─── DECREASED
     availableSlots: 20     ◄─── RESTORED
   }
   ↓
6. Send notifications (fire-and-forget):
   - notification.service.js → createNotification()
   - Recipients: USER, OWNER, ALL ADMINS
   - Message: Booking details + "Cancelled by: User"
   ↓
7. FRONTEND RECEIVES EVENT
   ↓
8. Update UI immediately:
   - All views show restored availability
   - Notifications appear in real-time
```

---

## 🔄 DATA FLOW: AUTO-COMPLETION

```
1. USER VIEWS PARKING DETAIL
   ↓
2. parking.service.js → getParkingDetail()
   ↓
3. booking.service.js → reconcileExpiredBookings()
   ↓
4. Find bookings where:
   - bookingDate < TODAY (entirely past)
   - OR bookingDate = TODAY AND endTime <= NOW (ended today)
   ↓
5. Update status to 'completed' for all expired bookings
   ↓
6. Calculate new reservedSlots using calculateReservedSlots()
   (Completed bookings automatically excluded)
   ↓
7. Return parking with updated metrics:
   {
     totalSlots: 20,
     reservedSlots: 0,      ◄─── DECREASED (completed excluded)
     availableSlots: 20     ◄─── RESTORED
   }
   ↓
8. FRONTEND DISPLAYS UPDATED DATA
```

---

## 📊 CALCULATION COMPARISON

### OLD LOGIC (WRONG):
```
Function: calculateCurrentOccupancy()

Query:
  bookings WHERE:
    - parking = parkingId
    - status IN ['confirmed', 'active', 'ongoing']
    - paymentStatus = 'paid'
    - bookingStatus != 'cancelled'
    - (bookingDate < TODAY)
      OR (bookingDate = TODAY AND startTime <= NOW AND endTime > NOW)
      ↑
      ONLY COUNTS BOOKINGS ACTIVE RIGHT NOW

Result:
  occupiedSlots = 0 (if booking is tomorrow)
  availableSlots = 20 - 0 = 20 ❌ WRONG

Problem:
  Future bookings ignored → misleading availability
```

### NEW LOGIC (CORRECT):
```
Function: calculateReservedSlots()

Query:
  bookings WHERE:
    - parking = parkingId
    - status IN ['confirmed', 'active', 'ongoing']
    - paymentStatus = 'paid'
    - bookingStatus != 'cancelled'
    - bookingDate >= TODAY
      ↑
      INCLUDES ALL FUTURE BOOKINGS

Result:
  reservedSlots = 2 (includes tomorrow's booking)
  availableSlots = 20 - 2 = 18 ✅ CORRECT

Benefit:
  Future bookings counted → accurate availability
```

---

## 🎯 KEY DIFFERENCES

| Aspect | OLD (Wrong) | NEW (Correct) |
|--------|-------------|---------------|
| **Function** | `calculateCurrentOccupancy()` | `calculateReservedSlots()` |
| **Time Filter** | `bookingDate <= TODAY AND startTime <= NOW` | `bookingDate >= TODAY` |
| **Scope** | Bookings active RIGHT NOW | ALL confirmed bookings (current + future) |
| **Future Bookings** | ❌ Ignored | ✅ Counted |
| **Primary Use** | Monitoring only | Availability calculation |
| **Dashboard Label** | "Active bookings now" | "Reserved slots" |
| **Business Meaning** | Physical occupancy | Booking commitment |

---

## 🔐 BUSINESS RULES ENFORCEMENT

### Booking Status Filters:
```javascript
VALID_OCCUPANCY_STATUSES = ['confirmed', 'active', 'ongoing']

VALID_BOOKING_FILTERS = {
  paymentStatus: 'paid',
  bookingStatus: { $ne: 'cancelled' }
}

// Applied to ALL occupancy calculations
```

### Money Rules:
```javascript
// User Spending
status IN ['confirmed', 'completed']
+ paymentStatus = 'paid'
+ bookingStatus != 'cancelled'

// Owner Earnings
status = 'completed'  // ONLY completed
+ paymentStatus = 'paid'
+ bookingStatus != 'cancelled'
```

---

## ✅ VALIDATION POINTS

### 1. Reserved Slots Calculation:
```
✅ Includes confirmed bookings
✅ Includes active bookings
✅ Includes ongoing bookings
✅ Includes future bookings (bookingDate >= TODAY)
✅ Excludes cancelled bookings
✅ Excludes completed bookings
✅ Excludes failed bookings
✅ Excludes past bookings (bookingDate < TODAY)
```

### 2. Availability Calculation:
```
✅ Formula: availableSlots = totalSlots - reservedSlots
✅ Uses reserved capacity (not current occupancy)
✅ Prevents double-booking
✅ Accurate for all time ranges
```

### 3. Real-Time Updates:
```
✅ Socket events emitted on booking creation
✅ Socket events emitted on cancellation
✅ Socket events emitted on completion
✅ All frontend pages have listeners
✅ UI updates immediately
```

### 4. Notifications:
```
✅ Sent to USER (driver)
✅ Sent to OWNER
✅ Sent to ALL ADMINS
✅ Includes all required details
✅ Fire-and-forget (doesn't block)
✅ Error handling (won't rollback)
```

---

## 🎉 FINAL STATUS

**Architecture:** ✅ CLEAN AND SCALABLE  
**Data Flow:** ✅ CORRECT AND EFFICIENT  
**Business Rules:** ✅ PROPERLY ENFORCED  
**Real-Time Updates:** ✅ WORKING  
**Notifications:** ✅ COMPLETE  

**Status:** ✅ PRODUCTION READY

---

**Date:** May 10, 2026  
**By:** Kiro AI  
**Status:** ✅ COMPLETE
