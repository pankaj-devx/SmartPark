# Booking Verification System

## Overview

The SmartPark booking verification system enables OWNER and ADMIN roles to view, manage, and verify bookings using `bookingCode` as the central identifier. This system provides role-based access control with comprehensive booking details for operational management.

## Architecture

### Backend Components

#### 1. Enhanced Booking Serialization

**Admin Booking Serialization** (`server/src/services/admin.service.js`)
```javascript
function serializeAdminBooking(booking) {
  return {
    id: booking._id?.toString?.() ?? booking.id,
    bookingCode: booking.bookingCode,
    user: booking.user?._id?.toString?.() ?? booking.user?.toString?.() ?? booking.user?.id,
    userName: booking.user?.name ?? '',
    userEmail: booking.user?.email ?? '',
    userRole: booking.user?.role ?? '',
    parking: booking.parking?._id?.toString?.() ?? booking.parking?.toString?.() ?? booking.parking?.id,
    parkingTitle: booking.parking?.title ?? '',
    parkingCity: booking.parking?.city ?? '',
    parkingState: booking.parking?.state ?? '',
    vehicleType: booking.vehicleType,
    bookingDate: booking.bookingDate,
    startTime: booking.startTime,
    endTime: booking.endTime,
    slotCount: booking.slotCount,
    totalAmount: booking.totalAmount,
    status: booking.status,
    createdAt: booking.createdAt,
    updatedAt: booking.updatedAt
  };
}
```

**Owner Booking Serialization** (`server/src/services/owner.service.js`)
```javascript
function serializeOwnerBooking(booking) {
  return {
    id: booking._id?.toString?.() ?? booking.id,
    bookingCode: booking.bookingCode,
    user: booking.user?._id?.toString?.() ?? booking.user?.toString?.() ?? booking.user?.id,
    userName: booking.user?.name ?? '',
    userEmail: booking.user?.email ?? '',
    userPhone: booking.user?.phone ?? '',
    userRole: booking.user?.role ?? '',
    parking: booking.parking?._id?.toString?.() ?? booking.parking?.toString?.() ?? booking.parking?.id,
    parkingTitle: booking.parking?.title ?? '',
    parkingCity: booking.parking?.city ?? '',
    parkingState: booking.parking?.state ?? '',
    parkingAddress: booking.parking?.address ?? '',
    vehicleType: booking.vehicleType,
    bookingDate: booking.bookingDate,
    startTime: booking.startTime,
    endTime: booking.endTime,
    slotCount: booking.slotCount,
    totalAmount: booking.totalAmount,
    status: booking.status,
    paymentStatus: booking.paymentStatus ?? 'pending',
    createdAt: booking.createdAt,
    updatedAt: booking.updatedAt
  };
}
```

#### 2. Booking Verification Service

**Location:** `server/src/services/owner.service.js`

```javascript
/**
 * Verify a booking by bookingCode with role-based access control
 * - OWNER: Can only verify bookings for their own parking
 * - ADMIN: Can verify any booking
 */
export async function verifyBookingByCode(bookingCode, user, deps = {}) {
  const BookingModel = deps.BookingModel ?? Booking;
  
  if (!bookingCode || typeof bookingCode !== 'string') {
    throw createHttpError(400, 'Booking code is required');
  }

  // Find booking by code and populate user and parking details
  let bookingQuery = BookingModel.findOne({ 
    bookingCode: bookingCode.toUpperCase().trim() 
  });

  if (typeof bookingQuery.populate === 'function') {
    bookingQuery = bookingQuery
      .populate('user', 'name email phone role')
      .populate('parking', 'title city state address owner');
  }

  const booking = await bookingQuery.lean();

  if (!booking) {
    throw createHttpError(404, 'Invalid booking code');
  }

  // Role-based access control
  if (user.role === 'owner') {
    const ownerId = booking.parking?.owner?.toString?.() ?? booking.parking?.owner;
    const userId = user._id.toString();

    if (ownerId !== userId) {
      throw createHttpError(403, 'You can only verify bookings for your own parking');
    }
  }
  // Admin can verify any booking

  return serializeOwnerBooking(booking);
}
```

#### 3. API Endpoints

**Owner Routes** (`server/src/routes/owner.routes.js`)
```
GET    /owner/bookings          - List bookings for owner's parking
POST   /owner/bookings/verify   - Verify booking by code (owner-restricted)
PATCH  /owner/bookings/:id/complete - Complete a booking
```

**Admin Routes** (`server/src/routes/admin.routes.js`)
```
GET    /admin/bookings          - List all bookings (system-wide)
POST   /admin/bookings/verify   - Verify booking by code (admin-unrestricted)
PATCH  /admin/bookings/:id/cancel - Cancel any booking
```

#### 4. Validation Schema

**Location:** `server/src/validators/owner.validator.js`

```javascript
export const verifyBookingSchema = z.object({
  bookingCode: z.string().min(1, 'Booking code is required').trim().toUpperCase()
});
```

### Frontend Components

#### 1. API Client Functions

**Owner API** (`client/src/features/owner/ownerApi.js`)
```javascript
export async function verifyOwnerBooking(bookingCode) {
  const response = await apiClient.post('/owner/bookings/verify', { bookingCode });
  return response.data.data.booking;
}
```

**Admin API** (`client/src/features/admin/adminApi.js`)
```javascript
export async function verifyAdminBooking(bookingCode) {
  const response = await apiClient.post('/admin/bookings/verify', { bookingCode });
  return response.data.data.booking;
}
```

#### 2. UI Components

**Owner Booking Card** (`client/src/features/parkings/OwnerParkingDashboard.jsx`)
- Displays `bookingCode` prominently with blue badge styling
- Shows user details (name, email, phone)
- Shows parking details (title, city, state, address)
- Displays booking details (date, time, vehicle type, slots, amount)
- Provides "Complete" action for active bookings

**Admin Booking Display** (`client/src/features/admin/AdminDashboardPage.jsx`)
- Displays `bookingCode` prominently with blue badge styling
- Shows comprehensive user information
- Shows parking location details
- Provides filtering by status, parking, and user
- Provides search functionality
- Provides "Cancel" action for active bookings

## Role-Based Access Control

### OWNER Role
- **View Bookings:** Can only see bookings for their own parking listings
- **Verify Bookings:** Can only verify bookings for their own parking
- **Complete Bookings:** Can mark bookings as completed
- **Access Restriction:** Cannot access bookings for other owners' parking

### ADMIN Role
- **View Bookings:** Can see ALL bookings across the entire platform
- **Verify Bookings:** Can verify ANY booking without restriction
- **Cancel Bookings:** Can cancel any booking
- **Full Access:** No ownership restrictions

## Booking Code Display

### Badge Styling
```css
.booking-code-badge {
  background: #e5f3ff;
  color: #007bff;
  padding: 6px 12px;
  border-radius: 6px;
  border: 1px solid #b3d9ff;
  font-weight: 600;
}
```

### Display Format
```
Booking Code: BOOK-XXXXXXXX
```

## Data Flow

### 1. Owner Booking List
```
Client Request → GET /owner/bookings
                ↓
Owner Service → Fetch bookings for owner's parking
                ↓
Populate user and parking details
                ↓
Serialize with serializeOwnerBooking()
                ↓
Return enriched booking data
```

### 2. Admin Booking List
```
Client Request → GET /admin/bookings?status=confirmed
                ↓
Admin Service → Fetch all bookings (filtered)
                ↓
Populate user and parking details
                ↓
Serialize with serializeAdminBooking()
                ↓
Return enriched booking data
```

### 3. Booking Verification
```
Client Request → POST /owner/bookings/verify
                 { bookingCode: "BOOK-XXXXXXXX" }
                ↓
Verify Service → Find booking by code
                ↓
Check role-based access
                ↓
If OWNER: Verify ownership
If ADMIN: Allow access
                ↓
Return full booking details
```

## Security Features

### 1. Input Validation
- Booking code is required and trimmed
- Booking code is converted to uppercase
- Zod schema validation on all endpoints

### 2. Access Control
- Owner can only access their own parking bookings
- Admin has unrestricted access
- 403 Forbidden for unauthorized access attempts
- 404 Not Found for invalid booking codes

### 3. Data Population
- User details populated from User model
- Parking details populated from Parking model
- Owner ID checked for ownership verification

## Error Handling

### Common Error Responses

**400 Bad Request**
```json
{
  "success": false,
  "error": "Booking code is required"
}
```

**403 Forbidden**
```json
{
  "success": false,
  "error": "You can only verify bookings for your own parking"
}
```

**404 Not Found**
```json
{
  "success": false,
  "error": "Invalid booking code"
}
```

## Usage Examples

### Owner Verification Flow
1. Owner receives booking code from customer: `BOOK-A9F3K2D1`
2. Owner enters code in verification input
3. System validates code and checks ownership
4. If valid and owned, displays full booking details
5. Owner can complete the booking

### Admin Verification Flow
1. Admin receives booking code: `BOOK-4F92KD8A`
2. Admin enters code in verification input
3. System validates code (no ownership check)
4. Displays full booking details with user and parking info
5. Admin can cancel or manage the booking

## Benefits

### For Owners
- **Easy Verification:** Simple code-based lookup
- **Customer Service:** Quick access to booking details
- **Operational Efficiency:** No need to search through lists
- **Security:** Can only access their own bookings

### For Admins
- **Platform Oversight:** View all bookings system-wide
- **Support Operations:** Quickly resolve customer issues
- **Monitoring:** Track booking patterns and issues
- **Full Control:** Manage any booking when needed

### For Drivers
- **Proof of Booking:** Unique code for verification
- **Easy Communication:** Share code with parking owner
- **Dispute Resolution:** Code serves as booking reference

## Future Enhancements

### Potential Features
1. **QR Code Generation:** Generate QR codes for booking codes
2. **SMS Notifications:** Send booking code via SMS
3. **Real-time Verification:** WebSocket-based instant verification
4. **Booking History:** Track verification attempts
5. **Analytics:** Monitor verification patterns
6. **Mobile App:** Dedicated mobile verification interface

## Testing Checklist

### Backend Tests
- [ ] Owner can verify their own bookings
- [ ] Owner cannot verify other owners' bookings
- [ ] Admin can verify any booking
- [ ] Invalid booking code returns 404
- [ ] Missing booking code returns 400
- [ ] Booking details are fully populated
- [ ] Role-based access control works correctly

### Frontend Tests
- [ ] Booking code displays prominently
- [ ] User details are visible
- [ ] Parking details are visible
- [ ] Verification input works
- [ ] Error messages display correctly
- [ ] Badge styling is consistent
- [ ] Responsive design works on mobile

## Conclusion

The booking verification system provides a secure, role-based approach to managing bookings in SmartPark. By using `bookingCode` as the central identifier and implementing proper access controls, the system ensures that owners can efficiently manage their parking operations while admins maintain platform-wide oversight.
