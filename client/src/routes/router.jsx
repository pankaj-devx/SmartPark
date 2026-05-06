import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from '../app/AppLayout.jsx';
import { adminNavItems, ownerNavItems } from '../app/navigation.js';
import { RoleWorkspaceLayout } from '../app/RoleWorkspaceLayout.jsx';
import { LoginPage } from '../features/auth/LoginPage.jsx';
import { RegisterPage } from '../features/auth/RegisterPage.jsx';
import { AdminDashboardPage } from '../features/admin/AdminDashboardPage.jsx';
import { AdminReviewsPanel } from '../features/reviews/AdminReviewsPanel.jsx';
import { MyBookingsPage } from '../features/bookings/MyBookingsPage.jsx';
import { NotificationsPage } from '../features/notifications/NotificationsPage.jsx';
import { OwnerParkingDetail } from '../features/owner/OwnerParkingDetail.jsx';
import { OwnerParkingDashboard } from '../features/parkings/OwnerParkingDashboard.jsx';
import { OwnerReviewsPanel } from '../features/reviews/OwnerReviewsPanel.jsx';
import { ParkingDetailPage } from '../features/parkings/ParkingDetailPage.jsx';
import { SearchResultsPage } from '../features/parkings/SearchResultsPage.jsx';
import { MapPage } from '../pages/MapPage.jsx';
import { NotFoundPage } from '../pages/NotFoundPage.jsx';
import { DriverDashboard } from '../pages/DriverDashboard.jsx';
import { OwnerDashboard } from '../pages/OwnerDashboard.jsx';
import { DashboardRoute, RoleEntryRedirect, RoleHomeRoute } from './RouteRedirects.jsx';
import { ProtectedRoute } from './ProtectedRoute.jsx';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <RoleHomeRoute /> },
      { path: 'parkings', element: <SearchResultsPage /> },
      { path: 'parkings/:id', element: <ParkingDetailPage /> },
      { path: 'map', element: <MapPage /> },
      {
        path: 'notifications',
        element: (
          <ProtectedRoute>
            <NotificationsPage />
          </ProtectedRoute>
        )
      },
      { path: 'login', element: <LoginPage /> },
      { path: 'register', element: <RegisterPage /> },
      {
        path: 'bookings',
        element: (
          <ProtectedRoute>
            <MyBookingsPage />
          </ProtectedRoute>
        )
      },
      {
        path: 'saved',
        element: (
          <ProtectedRoute>
            <DashboardRoute activeSection="saved" />
          </ProtectedRoute>
        )
      },
      {
        path: 'activity',
        element: (
          <ProtectedRoute>
            <DashboardRoute activeSection="activity" />
          </ProtectedRoute>
        )
      },
      {
        path: 'notifications',
        element: (
          <ProtectedRoute>
            <DashboardRoute activeSection="notifications" />
          </ProtectedRoute>
        )
      },
      {
        path: 'profile',
        element: (
          <ProtectedRoute>
            <DashboardRoute activeSection="profile" />
          </ProtectedRoute>
        )
      },
      {
        path: 'settings',
        element: (
          <ProtectedRoute>
            <DashboardRoute activeSection="settings" />
          </ProtectedRoute>
        )
      },
      {
        path: 'admin',
        element: (
          <ProtectedRoute roles={['admin']}>
            <RoleWorkspaceLayout
              items={adminNavItems}
              roleLabel="Admin"
              subtitle="Moderation, booking oversight, and reporting in one focused workspace."
              title="Operations hub"
            />
          </ProtectedRoute>
        ),
        children: [
          { index: true, element: <Navigate replace to="/admin/overview" /> },
          { path: 'overview', element: <AdminDashboardPage activeSection="overview" /> },
          { path: 'analytics', element: <AdminDashboardPage activeSection="analytics" /> },
          { path: 'approvals', element: <AdminDashboardPage activeSection="approvals" /> },
          { path: 'parkings', element: <AdminDashboardPage activeSection="parkings" /> },
          { path: 'bookings', element: <AdminDashboardPage activeSection="bookings" /> },
          { path: 'users', element: <AdminDashboardPage activeSection="users" /> },
          { path: 'reviews', element: <AdminReviewsPanel /> },
          { path: 'reports', element: <AdminDashboardPage activeSection="reports" /> },
          { path: 'settings', element: <AdminDashboardPage activeSection="settings" /> },
          { path: 'profile', element: <Navigate replace to="/admin/settings" /> }
        ]
      },
      {
        path: 'dashboard',
        element: (
          <ProtectedRoute>
            <DashboardRoute activeSection="overview" />
          </ProtectedRoute>
        )
      },
      {
        path: 'dashboard/analytics',
        element: (
          <ProtectedRoute roles={['driver']}>
            <DriverDashboard />
          </ProtectedRoute>
        )
      },
      {
        path: 'owner',
        element: (
          <ProtectedRoute roles={['owner', 'admin']}>
            <RoleWorkspaceLayout
              items={ownerNavItems}
              roleLabel="Owner"
              subtitle="Manage listings, reservations, and revenue without driver clutter."
              title="Parking operations"
            />
          </ProtectedRoute>
        ),
        children: [
          { index: true, element: <Navigate replace to="/owner/overview" /> },
          { path: 'overview', element: <OwnerParkingDashboard activeSection="overview" /> },
          { path: 'dashboard', element: <Navigate replace to="/owner/overview" /> },
          { path: 'analytics', element: <OwnerDashboard /> },
          { path: 'listings', element: <OwnerParkingDashboard activeSection="listings" /> },
          { path: 'reservations', element: <OwnerParkingDashboard activeSection="reservations" /> },
          { path: 'occupancy', element: <OwnerParkingDashboard activeSection="occupancy" /> },
          { path: 'earnings', element: <OwnerParkingDashboard activeSection="earnings" /> },
          { path: 'reviews', element: <OwnerReviewsPanel /> },
          { path: 'settings', element: <OwnerParkingDashboard activeSection="settings" /> },
          { path: 'profile', element: <Navigate replace to="/owner/settings" /> }
        ]
      },
      {
        path: 'owner/parkings',
        element: <Navigate replace to="/owner/listings" />
      },
      {
        // Owner parking detail — full-width page, outside the workspace sidebar layout
        path: 'owner/parking/:id',
        element: (
          <ProtectedRoute roles={['owner', 'admin']}>
            <OwnerParkingDetail />
          </ProtectedRoute>
        )
      },
      {
        path: 'app',
        element: (
          <ProtectedRoute>
            <RoleEntryRedirect />
          </ProtectedRoute>
        )
      },
      { path: '*', element: <NotFoundPage /> }
    ]
  }
]);
