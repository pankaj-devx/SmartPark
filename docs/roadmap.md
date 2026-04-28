# Implementation Roadmap

## Phase 1: Architecture And Planning

Status: Complete when the planning docs are reviewed.

Outputs:

- PRD and MVP scope.
- Actor analysis.
- User flows.
- Feature modules.
- Database entities.
- API contracts.
- Folder structure.
- Risk and edge-case list.

Suggested commit message:

```text
docs: add phase 1 product and architecture plan
```

## Phase 2: Scaffold Repository

Goals:

- Create `client` React app with Vite and Tailwind.
- Create `server` Express app with MVC structure.
- Add root workspace scripts.
- Add environment examples.
- Add linting and formatting basics.

Done criteria:

- `npm install` works.
- Backend health endpoint runs locally.
- Frontend dev server runs locally.
- Folder structure matches Phase 1 docs.

## Phase 3: Authentication

Goals:

- Register, login, current user.
- Password hashing.
- JWT issuing and verification.
- Role-based route protection.
- Frontend auth pages and protected routes.

Done criteria:

- User can register and log in.
- Token-authenticated requests work.
- Owner/admin-only endpoints reject drivers.

## Phase 4: Parking Listing CRUD

Goals:

- Listing model.
- Owner listing CRUD.
- Basic listing UI.
- Listing ownership protection.

Done criteria:

- Owner can create, edit, pause, and view listings.
- Non-owner cannot modify another owner listing.

## Phase 5: Search And Filters

Goals:

- Public listing search API.
- Text, location, price, amenity filters.
- Frontend search experience.

Done criteria:

- Users can find active listings.
- Search results are paginated and performant.

## Phase 6: Slot Detail View

Goals:

- Listing detail page.
- Slot availability preview.
- Map display.
- Rules and amenities.

Done criteria:

- Public users can inspect listing details.
- Logged-in users can start a booking flow.

## Phase 7: Booking System

Goals:

- Booking model and service.
- Conflict prevention.
- Booking lifecycle.
- Driver booking history.

Done criteria:

- Overlapping bookings for the same slot are rejected.
- Non-overlapping bookings succeed.

## Phase 8: Owner Dashboard

Goals:

- Owner dashboard summary.
- Listing and booking management.

Done criteria:

- Owners can view active listings and upcoming bookings.

## Phase 9: Admin Dashboard

Goals:

- Admin users list.
- Listing moderation.
- Booking visibility.

Done criteria:

- Admin can suspend users and moderate listings.

## Phase 10: Maps Integration

Goals:

- Leaflet map components.
- Location picker for owners.
- Map search display.

Done criteria:

- Search and detail pages show usable maps.

## Phase 11: Notifications

Goals:

- Notification model.
- Booking notification events.
- Frontend notification list.

Done criteria:

- Users receive in-app booking events.

## Phase 12: Testing

Goals:

- Backend integration tests.
- Booking conflict tests.
- Frontend component smoke tests.

Done criteria:

- Critical auth, listing, and booking paths are covered.

## Phase 13: UI Polish

Goals:

- Responsive layouts.
- Loading and error states.
- Accessibility pass.

Done criteria:

- Main workflows feel ready for demo.

## Phase 14: Deployment

Goals:

- Vercel frontend deployment.
- Render backend deployment.
- MongoDB Atlas setup.
- Environment variable documentation.

Done criteria:

- Production build is deployed and reachable.

## Phase 15: Advanced Features

Goals:

- Payments.
- Analytics.
- AI recommendations.

Done criteria:

- Advanced feature specs are defined before implementation.

