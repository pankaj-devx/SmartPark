import { createBrowserRouter } from 'react-router-dom';
import { AppLayout } from '../app/AppLayout.jsx';
import { LoginPage } from '../features/auth/LoginPage.jsx';
import { RegisterPage } from '../features/auth/RegisterPage.jsx';
import { OwnerParkingDashboard } from '../features/parkings/OwnerParkingDashboard.jsx';
import { ParkingDetailPage } from '../features/parkings/ParkingDetailPage.jsx';
import { SearchResultsPage } from '../features/parkings/SearchResultsPage.jsx';
import { DashboardPage } from '../pages/DashboardPage.jsx';
import { HomePage } from '../pages/HomePage.jsx';
import { NotFoundPage } from '../pages/NotFoundPage.jsx';
import { ProtectedRoute } from './ProtectedRoute.jsx';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'parkings', element: <SearchResultsPage /> },
      { path: 'parkings/:id', element: <ParkingDetailPage /> },
      { path: 'login', element: <LoginPage /> },
      { path: 'register', element: <RegisterPage /> },
      {
        path: 'dashboard',
        element: (
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        )
      },
      {
        path: 'owner/parkings',
        element: (
          <ProtectedRoute roles={['owner', 'admin']}>
            <OwnerParkingDashboard />
          </ProtectedRoute>
        )
      },
      { path: '*', element: <NotFoundPage /> }
    ]
  }
]);
