import { Link, Outlet } from 'react-router-dom';
import { LogOut, ParkingCircle, UserRound } from 'lucide-react';
import { useAuth } from '../features/auth/useAuth.js';

export function AppLayout() {
  const { isAuthenticated, logout, user } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <ParkingCircle className="h-7 w-7 text-brand-600" aria-hidden="true" />
            <span>SmartPark</span>
          </Link>
          <nav className="flex items-center gap-4 text-sm text-slate-600">
            <Link className="hover:text-slate-950" to="/">
              Search
            </Link>
            <Link className="hover:text-slate-950" to="/parkings">
              Parkings
            </Link>
            {isAuthenticated ? (
              <>
                {(user?.role === 'owner' || user?.role === 'admin') && (
                  <Link className="hover:text-slate-950" to="/owner/parkings">
                    Owner
                  </Link>
                )}
                {user?.role === 'admin' && (
                  <Link className="hover:text-slate-950" to="/admin">
                    Admin
                  </Link>
                )}
                <Link className="hover:text-slate-950" to="/bookings">
                  Bookings
                </Link>
                <Link className="inline-flex items-center gap-1 hover:text-slate-950" to="/dashboard">
                  <UserRound className="h-4 w-4" aria-hidden="true" />
                  {user?.name}
                </Link>
                <button className="inline-flex items-center gap-1 hover:text-slate-950" type="button" onClick={logout}>
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link className="hover:text-slate-950" to="/register">
                  Register
                </Link>
                <Link className="rounded-md bg-brand-600 px-3 py-2 font-semibold text-white hover:bg-brand-700" to="/login">
                  Sign in
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
