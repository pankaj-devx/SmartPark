# Implementation Plan: Admin Control System (Phase 9)

## Overview

Extend the existing admin layer with five backend service functions, five controller handlers, five new routes, one validator schema, one booking guard, five frontend API functions, and three UI additions (block/unblock buttons, delete button, cancel button). No new files, models, middleware, or pages are created — every change is an append or targeted edit to an existing module.

## Tasks

- [x] 1. Add suspended-user guard to `booking.service.js`
  - Insert the `user.status === 'suspended'` check as the very first statement inside `createBooking`, before any DB reads or transaction start
  - Throw `createHttpError(403, 'Your account has been suspended. You cannot create new bookings.')`
  - _Requirements: 6.1, 6.2_

  - [ ]* 1.1 Write property test for suspended-user booking rejection (P8)
    - **Property 8: Suspended users cannot create bookings**
    - Generate random valid booking inputs paired with a user whose `status` is `'suspended'`; assert `createBooking` rejects with HTTP 403 before any `BookingModel` or `ParkingModel` method is called
    - **Validates: Requirements 6.1, 6.2**

- [x] 2. Add `adminUserIdParamSchema` to `admin.validator.js`
  - Append `export const adminUserIdParamSchema` using `z.object({ id: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid user ID format') })`
  - _Requirements: 4.3, 4.5_

- [x] 3. Add new service functions to `admin.service.js`
  - [x] 3.1 Add `listAdminUsers`
    - Import `mongoose` at the top of the file if not already imported
    - Implement `listAdminUsers(deps = {})`: query `UserModel.find({}).sort({ createdAt: -1, _id: 1 }).lean()`, map through `serializeAdminUser`, return the array
    - Export the function
    - _Requirements: 3.1, 3.2_

  - [ ]* 3.2 Write property test for user list sort order (P5)
    - **Property 5: User list is sorted by createdAt descending**
    - Generate random arrays of user objects with random `createdAt` timestamps; assert the returned array is sorted descending by `createdAt`
    - **Validates: Requirements 3.2**

  - [x] 3.3 Add `blockAdminUser`
    - Implement `blockAdminUser(id, requestingAdminId, deps = {})`: validate ObjectId, guard against self-block (`id === requestingAdminId` → HTTP 400), call `UserModel.findByIdAndUpdate(id, { status: 'suspended' }, { new: true })`, throw 404 if null, return `serializeAdminUser(user)`
    - Export the function
    - _Requirements: 4.1, 4.4_

  - [x] 3.4 Add `unblockAdminUser`
    - Implement `unblockAdminUser(id, deps = {})`: validate ObjectId, call `UserModel.findByIdAndUpdate(id, { status: 'active' }, { new: true })`, throw 404 if null, return `serializeAdminUser(user)`
    - Export the function
    - _Requirements: 4.2, 4.3_

  - [ ]* 3.5 Write property test for block/unblock round-trip (P6)
    - **Property 6: Block then unblock is a round-trip restoring active status**
    - Generate random user IDs and initial statuses; mock `UserModel.findByIdAndUpdate` to apply the update; assert that `blockAdminUser` → `unblockAdminUser` always yields `status === 'active'`, and `blockAdminUser` alone yields `status === 'suspended'`
    - **Validates: Requirements 4.1, 4.2**

  - [x] 3.6 Add `deleteAdminParking`
    - Implement `deleteAdminParking(id, deps = {})`: validate ObjectId, call `ParkingModel.findByIdAndDelete(id)`, throw 404 if null, return `{ deleted: true, id }`
    - Export the function
    - _Requirements: 9.1, 9.2_

  - [x] 3.7 Add `cancelAdminBooking`
    - Add `withTransaction` import/reference (already used in the file via `booking.service.js` pattern — implement a local `withTransaction` helper in `admin.service.js` matching the one in `booking.service.js`, or import it if it is exported)
    - Implement `cancelAdminBooking(id, deps = {})` using the transaction pattern from the design: validate ObjectId, fetch booking in session, guard terminal states (HTTP 400), set `status = 'cancelled'`, save, increment `availableSlots`, return `serializeAdminBooking(booking)`
    - Export the function
    - _Requirements: 12.1, 12.2, 12.3_

  - [ ]* 3.8 Write property test for admin cancel terminal-state guard (P12)
    - **Property 12: Admin cancel rejects terminal-state bookings**
    - Generate bookings with `status` of `'cancelled'` or `'completed'`; assert `cancelAdminBooking` throws HTTP 400 and that neither `booking.save` nor `ParkingModel.findByIdAndUpdate` is called
    - **Validates: Requirements 12.3**

  - [ ]* 3.9 Write property test for admin cancel active bookings (P13)
    - **Property 13: Admin cancel sets status to cancelled for active bookings**
    - Generate bookings with `status` of `'pending'` or `'confirmed'` and a random `slotCount`; assert `cancelAdminBooking` sets `status` to `'cancelled'` and calls `ParkingModel.findByIdAndUpdate` with `{ $inc: { availableSlots: slotCount } }`
    - **Validates: Requirements 12.1**

- [x] 4. Checkpoint — service layer complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Add new controller handlers to `admin.controller.js`
  - [x] 5.1 Import new service functions
    - Add `listAdminUsers`, `blockAdminUser`, `unblockAdminUser`, `deleteAdminParking`, `cancelAdminBooking` to the import from `'../services/admin.service.js'`
    - _Requirements: 3.1, 4.1, 4.2, 9.1, 12.1_

  - [x] 5.2 Add `getUsers` handler
    - Implement `export const getUsers = asyncHandler(async (_req, res) => { ... })` calling `listAdminUsers()` and returning `{ success: true, data: { users } }`
    - _Requirements: 3.1_

  - [x] 5.3 Add `blockUser` handler
    - Implement `export const blockUser = asyncHandler(async (req, res) => { ... })` calling `blockAdminUser(req.params.id, req.user._id.toString())` and returning `{ success: true, data: { user } }`
    - _Requirements: 4.1, 4.4_

  - [x] 5.4 Add `unblockUser` handler
    - Implement `export const unblockUser = asyncHandler(async (req, res) => { ... })` calling `unblockAdminUser(req.params.id)` and returning `{ success: true, data: { user } }`
    - _Requirements: 4.2_

  - [x] 5.5 Add `deleteParking` handler
    - Implement `export const deleteParking = asyncHandler(async (req, res) => { ... })` calling `deleteAdminParking(req.params.id)` and returning `{ success: true, data: result }`
    - _Requirements: 9.1_

  - [x] 5.6 Add `cancelBooking` handler
    - Implement `export const cancelBooking = asyncHandler(async (req, res) => { ... })` calling `cancelAdminBooking(req.params.id)` and returning `{ success: true, data: { booking } }`
    - _Requirements: 12.1_

- [x] 6. Register new routes in `admin.routes.js`
  - Import `getUsers`, `blockUser`, `unblockUser`, `deleteParking`, `cancelBooking` from `'../controllers/admin.controller.js'`
  - Import `adminUserIdParamSchema` from `'../validators/admin.validator.js'`
  - Append the five new route registrations:
    - `adminRoutes.get('/users', getUsers)`
    - `adminRoutes.patch('/users/:id/block', validateRequest(adminUserIdParamSchema, 'params'), blockUser)`
    - `adminRoutes.patch('/users/:id/unblock', validateRequest(adminUserIdParamSchema, 'params'), unblockUser)`
    - `adminRoutes.delete('/parkings/:id', deleteParking)`
    - `adminRoutes.patch('/bookings/:id/cancel', cancelBooking)`
  - _Requirements: 3.1, 4.5, 9.3, 12.4_

- [x] 7. Checkpoint — backend complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Add new API functions to `adminApi.js`
  - Append `fetchAdminUsers`, `blockAdminUser`, `unblockAdminUser`, `deleteAdminParking`, and `cancelAdminBooking` following the existing `apiClient` pattern
  - `fetchAdminUsers`: GET `/admin/users`, return `response.data.data.users`
  - `blockAdminUser(id)`: PATCH `/admin/users/${id}/block`, return `response.data.data.user`
  - `unblockAdminUser(id)`: PATCH `/admin/users/${id}/unblock`, return `response.data.data.user`
  - `deleteAdminParking(id)`: DELETE `/admin/parkings/${id}`, return `response.data.data`
  - `cancelAdminBooking(id)`: PATCH `/admin/bookings/${id}/cancel`, return `response.data.data.booking`
  - _Requirements: 13.1, 13.2, 13.3, 13.4_

  - [ ]* 8.1 Write property test for Admin API error propagation (P17)
    - **Property 17: Admin API error propagation**
    - Mock `apiClient` to reject with random HTTP error objects; assert each of the five new functions (and the existing ones) re-throws the original error without swallowing it
    - **Validates: Requirements 13.4**

- [x] 9. Update `AdminDashboardPage.jsx` — Users section (block/unblock)
  - Import `useAuth` from `'../../features/auth/useAuth.js'` at the top of the file
  - Import `blockAdminUser` and `unblockAdminUser` from `'./adminApi.js'`
  - In `AdminDashboardPage`, destructure `const { user: currentUser } = useAuth()` and pass `currentAdminId={currentUser?.id}` to `AdminUsers`
  - In `AdminUsers`, accept `currentAdminId` prop and add an `onBlock` / `onUnblock` prop pair
  - For each user row: render a "Block" button when `user.status === 'active' && user.id !== currentAdminId`; render an "Unblock" button when `user.status === 'suspended'`
  - On click, call the appropriate API function, then update state by replacing the user in `dashboard.users` with the returned updated user (pure state update, no mutation); on error, call `setError(getApiErrorMessage(...))`
  - Wire the handlers in `AdminDashboardPage` and pass them down to `AdminUsers`
  - _Requirements: 14.2, 14.3, 14.4, 14.5, 14.6, 14.7_

  - [ ]* 9.1 Write property test for block/unblock button visibility (P14)
    - **Property 14: Block/unblock button visibility is mutually exclusive and self-exclusive**
    - Generate random arrays of users with random `status` values and a random `currentAdminId`; render `AdminUsers` with React Testing Library; assert that for each user row: "Block" appears iff `status === 'active' && id !== currentAdminId`; "Unblock" appears iff `status === 'suspended'`; neither button appears for the current admin's own row
    - **Validates: Requirements 14.2, 14.3, 14.7**

- [x] 10. Update `AdminDashboardPage.jsx` — Approvals section (delete parking)
  - Import `deleteAdminParking` from `'./adminApi.js'`
  - Add an `onDelete` prop to `ModerationSection` and `AdminApprovals`
  - In each parking card inside `ModerationSection`, render a "Delete" button that calls `onDelete(parking)`
  - In `AdminDashboardPage`, implement `handleDeleteParking(parking)`: call `deleteAdminParking(parking.id)`, then update `dashboard` state by filtering the parking out of all three arrays (`pending`, `approved`, `rejected`) and recalculating `summary` counts; on error, call `setError(getApiErrorMessage(...))`
  - Pass `onDelete={handleDeleteParking}` through `applyParkingUpdate`-style wiring to `AdminApprovals` → `ModerationSection`
  - _Requirements: 15.5, 15.6_

  - [ ]* 10.1 Write property test for parking moderation button visibility (P15)
    - **Property 15: Parking moderation buttons match verificationStatus**
    - Generate random parking arrays with random `verificationStatus` values; render `ModerationSection` for each status group with React Testing Library; assert that pending cards show Approve + Reject + Delete, approved cards show Reject + Toggle + Delete, rejected cards show Approve + Toggle + Delete
    - **Validates: Requirements 15.2, 15.3, 15.4**

- [x] 11. Update `AdminDashboardPage.jsx` — Bookings section (cancel booking)
  - Import `cancelAdminBooking` from `'./adminApi.js'`
  - Add an `onCancel` prop to `AdminBookings`
  - In each booking row inside `AdminBookings`, render a "Cancel" button when `booking.status === 'pending' || booking.status === 'confirmed'`
  - In `AdminDashboardPage`, implement `handleCancelBooking(booking)`: call `cancelAdminBooking(booking.id)`, then update `bookings` state by replacing the matching booking with the returned updated booking; on error, call `setError(getApiErrorMessage(...))`
  - Pass `onCancel={handleCancelBooking}` to `AdminBookings`
  - _Requirements: 16.2, 16.3, 16.4_

  - [ ]* 11.1 Write property test for cancel button visibility (P16)
    - **Property 16: Cancel button appears only for cancellable bookings**
    - Generate random booking arrays with random `status` values; render `AdminBookings` with React Testing Library; assert that a "Cancel" button is present iff `booking.status === 'pending' || booking.status === 'confirmed'`
    - **Validates: Requirements 16.2**

- [x] 12. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- The `withTransaction` helper in `admin.service.js` (task 3.7) should mirror the private `withTransaction` in `booking.service.js` — check whether it is exported before deciding to duplicate or import it
- Property tests use **fast-check** with the tag format `// Feature: admin-control-system, Property N: <property_text>`
- Frontend property tests (P14, P15, P16) require Vitest + React Testing Library; backend property tests (P5, P6, P8, P12, P13) use Vitest + fast-check with mocked Mongoose models via dependency injection
- The `cancelAdminBooking` slot restoration (`$inc: { availableSlots: booking.slotCount }`) only applies to bookings with `status === 'pending'` or `'confirmed'`; the guard in task 3.7 ensures terminal-state bookings never reach that code path
