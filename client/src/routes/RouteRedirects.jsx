import { Navigate } from 'react-router-dom';
import { getDefaultRouteForRole } from '../app/navigation.js';
import { useAuth } from '../features/auth/useAuth.js';
import { DashboardPage } from '../pages/DashboardPage.jsx';
import { DriverHomePage } from '../pages/DriverHomePage.jsx';
import { HomePage } from '../pages/HomePage.jsx';

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

export function RoleHomeRoute() {
  const { isAuthenticated, isBootstrapping, user } = useAuth();

  if (isBootstrapping) {
    return (
      <section className="mx-auto max-w-6xl px-4 py-12">
        <p className="text-sm text-slate-600">Loading your home...</p>
      </section>
    );
  }

  if (!isAuthenticated) {
    return <HomePage />;
  }

  if (user?.role === 'driver') {
    return <DriverHomePage />;
  }

  if (user?.role === 'owner' || user?.role === 'admin') {
    return <Navigate replace to={getDefaultRouteForRole(user.role)} />;
  }

  return <HomePage />;
}
