import { Navigate } from 'react-router-dom';
import { useAuth } from '../features/auth/useAuth.js';

export function ProtectedRoute({ children, roles = [] }) {
  const { isAuthenticated, isBootstrapping, user } = useAuth();

  if (isBootstrapping) {
    return (
      <section className="mx-auto max-w-6xl px-4 py-12">
        <p className="text-sm text-slate-600">Loading your session...</p>
      </section>
    );
  }

  if (!isAuthenticated) {
    return <Navigate replace to="/login" />;
  }

  if (roles.length > 0 && !roles.includes(user?.role)) {
    return (
      <section className="mx-auto max-w-6xl px-4 py-12">
        <h1 className="text-2xl font-bold text-slate-950">Access denied</h1>
        <p className="mt-2 text-slate-600">Your account role cannot access this page.</p>
      </section>
    );
  }

  return children;
}
