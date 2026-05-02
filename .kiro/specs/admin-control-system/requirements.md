# Requirements Document

## Introduction

The Admin Control System (Phase 9) extends SmartPark's existing admin foundation into a complete, production-ready administration layer. The project already has partial admin infrastructure: an `AdminDashboardPage` with overview, approvals, bookings, users, and reports sections; an `admin.service.js` with parking moderation and booking listing; and protected admin routes. Phase 9 completes the missing capabilities — user block/unblock actions, booking cancellation by admin, a dedicated admin service layer on the frontend, and the safety rules that enforce blocked-user and approval-gating constraints across the platform.

The implementation must extend existing modules without breaking authentication, booking, search, maps, or owner dashboard functionality.

## Glossary

- **Admin_Dashboard**: The React workspace at `/admin/*` rendered by `AdminDashboardPage`.
- **Admin_Service**: The backend service module `server/src/services/admin.service.js` that encapsulates all admin business logic.
- **Admin_API**: The frontend API module `client/src/features/admin/adminApi.js` that calls admin endpoints.
- **Admin_Controller**: The backend controller `server/src/controllers/admin.controller.js`.
- **Admin_Routes**: The Express router `server/src/routes/admin.routes.js` mounted at `/api/admin`.
- **Auth_Middleware**: The `authenticate` middleware that validates JWT tokens and attaches `req.user`.
- **Role_Middleware**: The `authorizeRoles` middleware that enforces role-based access.
- **User_Model**: The Mongoose model in `server/src/models/user.model.js` representing platform accounts.
- **Parking_Model**: The Mongoose model in `server/src/models/parking.model.js` representing parking listings.
- **Booking_Model**: The Mongoose model in `server/src/models/booking.model.js` representing reservations.
- **Blocked_User**: A user whose `status` field is `"suspended"` in the User_Model.
- **Pending_Parking**: A parking listing whose `verificationStatus` is `"pending"`.
- **Approved_Parking**: A parking listing whose `verificationStatus` is `"approved"`.
- **Rejected_Parking**: A parking listing whose `verificationStatus` is `"rejected"`.
- **Admin_Serializer**: The `serializeAdminUser` and `serializeAdminBooking` functions in Admin_Service.

---

## Requirements

### Requirement 1: Admin Route Protection

**User Story:** As a platform operator, I want all admin API endpoints to be protected by authentication and role checks, so that only admin accounts can access sensitive management operations.

#### Acceptance Criteria

1. THE Admin_Routes SHALL apply Auth_Middleware and Role_Middleware (role `"admin"`) to every route registered under `/api/admin`.
2. WHEN a request reaches any `/api/admin` route without a valid JWT, THE Admin_Routes SHALL respond with HTTP 401.
3. WHEN a request reaches any `/api/admin` route with a valid JWT for a non-admin role, THE Admin_Routes SHALL respond with HTTP 403.
4. WHEN a request reaches any `/api/admin` route with a valid JWT for an admin role, THE Admin_Routes SHALL pass the request to the appropriate controller handler.

---

### Requirement 2: Dashboard Statistics

**User Story:** As an admin, I want to see a summary of platform activity on the dashboard, so that I can understand the current state of the marketplace at a glance.

#### Acceptance Criteria

1. WHEN an admin calls `GET /api/admin/dashboard`, THE Admin_Controller SHALL return a response containing `summary`, `parkings`, `users`, and `userMetrics` fields.
2. THE Admin_Service SHALL compute `summary.pendingApprovals` as the count of Parking_Model documents with `verificationStatus === "pending"`.
3. THE Admin_Service SHALL compute `summary.approvedListings` as the count of Parking_Model documents with `verificationStatus === "approved"`.
4. THE Admin_Service SHALL compute `summary.totalBookings` as the count of all Booking_Model documents.
5. THE Admin_Service SHALL compute `summary.totalUsers` as the count of all User_Model documents.
6. THE Admin_Service SHALL compute `summary.inactiveListings` as the count of Parking_Model documents with `isActive === false`.
7. THE Admin_Service SHALL compute `userMetrics` containing counts of users grouped by `role` (`drivers`, `owners`, `admins`) and by `status === "suspended"` (`suspended`).
8. THE Admin_Service SHALL include a `parkings` object grouping all parking listings into `pending`, `approved`, and `rejected` arrays.
9. THE Admin_Service SHALL include a `users` array containing all User_Model documents serialized through Admin_Serializer.

---

### Requirement 3: User Management — List Users

**User Story:** As an admin, I want to view all registered users with their name, email, role, and status, so that I can identify accounts that need moderation.

#### Acceptance Criteria

1. WHEN an admin calls `GET /api/admin/users`, THE Admin_Controller SHALL return a `users` array from Admin_Service.
2. THE Admin_Service SHALL return all User_Model documents sorted by `createdAt` descending.
3. THE Admin_Serializer SHALL include `id`, `name`, `email`, `role`, `phone`, `status`, and `createdAt` for each user.
4. THE Admin_Serializer SHALL NOT include `passwordHash` or any other credential field in the serialized output.

---

### Requirement 4: User Management — Block and Unblock

**User Story:** As an admin, I want to block or unblock user accounts, so that I can prevent abusive or fraudulent users from accessing the platform.

#### Acceptance Criteria

1. WHEN an admin calls `PATCH /api/admin/users/:id/block`, THE Admin_Controller SHALL set the target user's `status` to `"suspended"` and return the updated serialized user.
2. WHEN an admin calls `PATCH /api/admin/users/:id/unblock`, THE Admin_Controller SHALL set the target user's `status` to `"active"` and return the updated serialized user.
3. IF the target user does not exist, THEN THE Admin_Controller SHALL respond with HTTP 404.
4. IF an admin attempts to block their own account, THEN THE Admin_Controller SHALL respond with HTTP 400 and a descriptive error message.
5. THE Admin_Routes SHALL register `PATCH /users/:id/block` and `PATCH /users/:id/unblock` endpoints protected by Auth_Middleware and Role_Middleware.

---

### Requirement 5: Blocked User Login Prevention

**User Story:** As a platform operator, I want blocked users to be unable to log in, so that suspended accounts cannot access the platform.

#### Acceptance Criteria

1. WHEN a user with `status === "suspended"` attempts to log in, THE Auth_Service SHALL reject the login attempt with HTTP 403 and the message `"This account is suspended"`.
2. WHILE a user session is active and the user's `status` is changed to `"suspended"`, THE Auth_Middleware SHALL reject subsequent authenticated requests with HTTP 401 because the user record will no longer pass the `status !== "active"` check.

---

### Requirement 6: Blocked User Booking Prevention

**User Story:** As a platform operator, I want blocked users to be unable to create new bookings, so that suspended accounts cannot exploit the booking system.

#### Acceptance Criteria

1. WHEN a user with `status === "suspended"` attempts to create a booking, THE Booking_Service SHALL reject the request with HTTP 403 and a descriptive error message.
2. THE Booking_Service SHALL check the requesting user's `status` field before processing any booking creation.

---

### Requirement 7: Parking Management — List Parkings

**User Story:** As an admin, I want to view all parking listings grouped by verification status, so that I can efficiently manage the moderation queue.

#### Acceptance Criteria

1. WHEN an admin calls `GET /api/admin/parkings`, THE Admin_Controller SHALL return a `parkings` object with `pending`, `approved`, and `rejected` arrays.
2. THE Admin_Service SHALL return all Parking_Model documents sorted by `createdAt` descending.
3. THE Admin_Service SHALL serialize each parking using the existing `serializeParking` function from `parking.service.js`.

---

### Requirement 8: Parking Management — Approve and Reject

**User Story:** As an admin, I want to approve or reject pending parking listings, so that only verified listings appear in search results.

#### Acceptance Criteria

1. WHEN an admin calls `PATCH /api/admin/parkings/:id/approve`, THE Admin_Controller SHALL set the parking's `verificationStatus` to `"approved"` and return the updated serialized parking.
2. WHEN an admin calls `PATCH /api/admin/parkings/:id/reject` with a `reason` body, THE Admin_Controller SHALL set the parking's `verificationStatus` to `"rejected"`, store the `rejectionReason`, and return the updated serialized parking.
3. IF the parking does not exist, THEN THE Admin_Controller SHALL respond with HTTP 404.
4. THE `reason` field in the reject request body SHALL be validated as a non-empty string between 3 and 500 characters.
5. THE Admin_Routes SHALL register `PATCH /parkings/:id/approve` and `PATCH /parkings/:id/reject` endpoints.

---

### Requirement 9: Parking Management — Delete Listing

**User Story:** As an admin, I want to delete a parking listing, so that fraudulent or permanently invalid listings can be removed from the platform.

#### Acceptance Criteria

1. WHEN an admin calls `DELETE /api/admin/parkings/:id`, THE Admin_Controller SHALL permanently delete the Parking_Model document and return a success confirmation.
2. IF the parking does not exist, THEN THE Admin_Controller SHALL respond with HTTP 404.
3. THE Admin_Routes SHALL register `DELETE /parkings/:id` protected by Auth_Middleware and Role_Middleware.

---

### Requirement 10: Parking Approval Gate for Search

**User Story:** As a driver, I want search results to show only approved parking listings, so that I never see unverified or rejected spaces.

#### Acceptance Criteria

1. WHEN the Search_Service executes a listing query, THE Search_Service SHALL include `verificationStatus: "approved"` as a mandatory filter condition.
2. THE Search_Service SHALL NOT return listings with `verificationStatus` of `"pending"` or `"rejected"` in any search response.

---

### Requirement 11: Booking Management — List Bookings

**User Story:** As an admin, I want to view all bookings with user and parking details, so that I can monitor booking activity and identify issues.

#### Acceptance Criteria

1. WHEN an admin calls `GET /api/admin/bookings`, THE Admin_Controller SHALL return a `bookings` array from Admin_Service.
2. THE Admin_Service SHALL support optional query filters: `status`, `parking` (ObjectId), and `user` (ObjectId).
3. THE Admin_Service SHALL populate the `user` field with `name` and `email`, and the `parking` field with `title`, `city`, and `state`.
4. THE Admin_Serializer SHALL include `id`, `user`, `userName`, `userEmail`, `parking`, `parkingTitle`, `vehicleType`, `bookingDate`, `startTime`, `endTime`, `slotCount`, `totalAmount`, `status`, `createdAt`, and `updatedAt` for each booking.
5. THE Admin_Routes SHALL register `GET /bookings` with query validation via `adminBookingQuerySchema`.

---

### Requirement 12: Booking Management — Cancel Booking

**User Story:** As an admin, I want to cancel any booking, so that I can resolve disputes or remove invalid reservations.

#### Acceptance Criteria

1. WHEN an admin calls `PATCH /api/admin/bookings/:id/cancel`, THE Admin_Controller SHALL set the booking's `status` to `"cancelled"` and return the updated serialized booking.
2. IF the booking does not exist, THEN THE Admin_Controller SHALL respond with HTTP 404.
3. IF the booking already has `status === "cancelled"` or `status === "completed"`, THEN THE Admin_Controller SHALL respond with HTTP 400 and a descriptive error message.
4. THE Admin_Routes SHALL register `PATCH /bookings/:id/cancel` protected by Auth_Middleware and Role_Middleware.

---

### Requirement 13: Frontend Admin API Service

**User Story:** As a frontend developer, I want a dedicated admin API module, so that all admin HTTP calls are centralized and consistent with the existing `apiClient` pattern.

#### Acceptance Criteria

1. THE Admin_API SHALL export `fetchAdminDashboard`, `fetchAdminUsers`, `blockAdminUser`, `unblockAdminUser`, `fetchAdminParkings`, `approveAdminParking`, `rejectAdminParking`, `toggleAdminParkingActive`, `deleteAdminParking`, `fetchAdminBookings`, and `cancelAdminBooking` functions.
2. WHEN any Admin_API function is called, THE Admin_API SHALL use the shared `apiClient` instance from `client/src/lib/apiClient.js`.
3. THE Admin_API SHALL map each function to the correct HTTP method and endpoint path as defined in Admin_Routes.
4. WHEN an Admin_API call fails, THE Admin_API SHALL propagate the error so callers can handle it with `getApiErrorMessage`.

---

### Requirement 14: Frontend Admin Dashboard — Users Section

**User Story:** As an admin, I want to see a users table with block/unblock buttons, so that I can manage user accounts directly from the dashboard.

#### Acceptance Criteria

1. WHEN the admin navigates to `/admin/users`, THE Admin_Dashboard SHALL display a list of all users with `name`, `email`, `role`, and `status` visible.
2. WHEN a user has `status === "active"`, THE Admin_Dashboard SHALL display a "Block" button for that user row.
3. WHEN a user has `status === "suspended"`, THE Admin_Dashboard SHALL display an "Unblock" button for that user row.
4. WHEN an admin clicks "Block", THE Admin_Dashboard SHALL call `blockAdminUser` and update the displayed user status on success.
5. WHEN an admin clicks "Unblock", THE Admin_Dashboard SHALL call `unblockAdminUser` and update the displayed user status on success.
6. IF a block or unblock action fails, THE Admin_Dashboard SHALL display the error message returned by `getApiErrorMessage`.
7. THE Admin_Dashboard SHALL NOT display a block/unblock button for the currently authenticated admin's own account row.

---

### Requirement 15: Frontend Admin Dashboard — Parkings Section

**User Story:** As an admin, I want to see a parkings table with approve, reject, and delete buttons, so that I can moderate listings from the dashboard.

#### Acceptance Criteria

1. WHEN the admin navigates to `/admin/approvals`, THE Admin_Dashboard SHALL display pending, approved, and rejected parking listings in separate sections.
2. WHEN a parking has `verificationStatus === "pending"`, THE Admin_Dashboard SHALL display "Approve" and "Reject" buttons.
3. WHEN a parking has `verificationStatus === "approved"`, THE Admin_Dashboard SHALL display a "Reject" button and a toggle to deactivate.
4. WHEN a parking has `verificationStatus === "rejected"`, THE Admin_Dashboard SHALL display an "Approve" button and a toggle to reactivate.
5. WHEN an admin clicks "Delete" on any parking, THE Admin_Dashboard SHALL call `deleteAdminParking` and remove the listing from the displayed list on success.
6. IF any parking moderation action fails, THE Admin_Dashboard SHALL display the error message returned by `getApiErrorMessage`.

---

### Requirement 16: Frontend Admin Dashboard — Bookings Section

**User Story:** As an admin, I want to see a bookings table with a cancel button, so that I can manage reservations from the dashboard.

#### Acceptance Criteria

1. WHEN the admin navigates to `/admin/bookings`, THE Admin_Dashboard SHALL display all bookings with `user`, `parking`, `bookingDate`, `startTime`, `endTime`, and `status` visible.
2. WHEN a booking has `status` of `"pending"` or `"confirmed"`, THE Admin_Dashboard SHALL display a "Cancel" button for that booking row.
3. WHEN an admin clicks "Cancel", THE Admin_Dashboard SHALL call `cancelAdminBooking` and update the displayed booking status to `"cancelled"` on success.
4. IF a cancel action fails, THE Admin_Dashboard SHALL display the error message returned by `getApiErrorMessage`.

---

### Requirement 17: Frontend Route Protection for Admin Pages

**User Story:** As a platform operator, I want admin pages to be accessible only to users with the `admin` role, so that drivers and owners cannot access the admin workspace.

#### Acceptance Criteria

1. WHEN a non-admin authenticated user navigates to any `/admin/*` route, THE ProtectedRoute SHALL render an "Access denied" message.
2. WHEN an unauthenticated user navigates to any `/admin/*` route, THE ProtectedRoute SHALL redirect to `/login`.
3. THE router SHALL wrap all `/admin/*` child routes inside a `ProtectedRoute` with `roles={["admin"]}`.
