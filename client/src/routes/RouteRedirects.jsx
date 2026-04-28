import { Navigate } from 'react-router-dom';
import { getDefaultRouteForRole } from '../app/navigation.js';
import { useAuth } from '../features/auth/useAuth.js';
import { DashboardPage } from '../pages/DashboardPage.jsx';

export function RoleEntryRedirect() {
  const { user } = useAuth();

  return <Navigate replace to={getDefaultRouteForRole(user?.role)} />;
}

export function DashboardRoute({ activeSection = 'overview' }) {
  const { user } = useAuth();

  if (user?.role && user.role !== 'driver') {
    return <Navigate replace to={getDefaultRouteForRole(user.role)} />;
  }

  return <DashboardPage activeSection={activeSection} />;
}
