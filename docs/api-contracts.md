# API Contracts

Base URL:

```text
/api
```

Authentication:

```http
Authorization: Bearer <jwt>
```

## Standard Response Shape

Success:

```json
{
  "success": true,
  "data": {}
}
```

Error:

```json
{
  "success": false,
  "message": "Human readable error",
  "errors": []
}
```

## Auth

### Register

```http
POST /api/auth/register
```

Request:

```json
{
  "name": "Asha Driver",
  "email": "asha@example.com",
  "password": "StrongPass123!",
  "role": "driver"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_id",
      "name": "Asha Driver",
      "email": "asha@example.com",
      "role": "driver"
    },
    "token": "jwt"
  }
}
```

### Login

```http
POST /api/auth/login
```

Request:

```json
{
  "email": "asha@example.com",
  "password": "StrongPass123!"
}
```

### Current User

```http
GET /api/auth/me
```

Access:

- Authenticated users.

## Listings

### Search Listings

```http
GET /api/listings?city=Pune&lat=18.5204&lng=73.8567&radiusKm=5&startsAt=2026-05-01T09:00:00.000Z&endsAt=2026-05-01T12:00:00.000Z&minPrice=20&maxPrice=150&amenities=cctv,covered
```

Access:

- Public.

### Create Listing

```http
POST /api/listings
```

Access:

- Owner, Admin.

Request:

```json
{
  "title": "Covered Parking Near Station",
  "description": "Secure parking close to the main railway station.",
  "address": {
    "line1": "MG Road",
    "city": "Pune",
    "state": "Maharashtra",
    "postalCode": "411001",
    "country": "India"
  },
  "location": {
    "lat": 18.5204,
    "lng": 73.8567
  },
  "pricePerHour": 60,
  "amenities": ["cctv", "covered"],
  "rules": ["No overnight parking without approval"],
  "totalSlots": 10
}
```

### Get Listing

```http
GET /api/listings/:id
```

Access:

- Public.

### Update Listing

```http
PATCH /api/listings/:id
```

Access:

- Listing owner, Admin.

### Delete Listing

```http
DELETE /api/listings/:id
```

Access:

- Listing owner, Admin.

Behavior:

- Soft delete or pause if future bookings exist.
- Hard delete only when no dependent bookings exist.

## Bookings

### Create Booking

```http
POST /api/bookings
```

Access:

- Driver, Owner, Admin.

Request:

```json
{
  "listingId": "listing_id",
  "slotId": "slot_id",
  "startsAt": "2026-05-01T09:00:00.000Z",
  "endsAt": "2026-05-01T12:00:00.000Z",
  "notes": "Arriving in a compact car"
}
```

Important validation:

- `startsAt` must be before `endsAt`.
- Booking duration must satisfy product limits.
- Slot must belong to listing.
- Slot and listing must be active.
- No overlapping pending or confirmed booking can exist for the selected slot.

### My Bookings

```http
GET /api/bookings/my
```

Access:

- Authenticated users.

### Owner Listing Bookings

```http
GET /api/owner/bookings
```

Access:

- Owner, Admin.

### Cancel Booking

```http
PATCH /api/bookings/:id/cancel
```

Access:

- Booking owner, listing owner, Admin.

## Owner

### Owner Dashboard Summary

```http
GET /api/owner/dashboard
```

Access:

- Owner, Admin.

Response includes:

- Listing count.
- Active booking count.
- Upcoming bookings.
- Estimated revenue.

## Admin

### List Users

```http
GET /api/admin/users
```

Access:

- Admin.

### Update User Status

```http
PATCH /api/admin/users/:id/status
```

Access:

- Admin.

### Moderate Listing

```http
PATCH /api/admin/listings/:id/status
```

Access:

- Admin.

Request:

```json
{
  "status": "active"
}
```

Allowed listing statuses:

- `draft`
- `pending_review`
- `active`
- `paused`
- `rejected`

## Notifications

### List Notifications

```http
GET /api/notifications
```

Access:

- Authenticated users.

### Mark Notification Read

```http
PATCH /api/notifications/:id/read
```

Access:

- Notification owner.
