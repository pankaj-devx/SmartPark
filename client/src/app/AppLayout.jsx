import { Link, NavLink, Outlet } from 'react-router-dom';
import { LogOut, ParkingCircle } from 'lucide-react';
import { driverNavItems, getDefaultRouteForRole } from './navigation.js';
import { useAuth } from '../features/auth/useAuth.js';

export function AppLayout() {
  const { isAuthenticated, logout, user } = useAuth();
  const isDriver = user?.role === 'driver';
  const isWorkspaceRole = user?.role === 'owner' || user?.role === 'admin';
  const driverLinks = isAuthenticated && isDriver ? driverNavItems : [];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <ParkingCircle className="h-7 w-7 text-brand-600" aria-hidden="true" />
            <span>SmartPark</span>
          </Link>

          {!isAuthenticated ? (
            <nav className="flex items-center gap-4 text-sm text-slate-600">
              <Link className="hover:text-slate-950" to="/">
                Search
              </Link>
              <Link className="hover:text-slate-950" to="/parkings">
                Parkings
              </Link>
              <Link className="hover:text-slate-950" to="/register">
                Register
              </Link>
              <Link className="rounded-md bg-brand-600 px-3 py-2 font-semibold text-white hover:bg-brand-700" to="/login">
                Sign in
              </Link>
            </nav>
          ) : null}

          {driverLinks.length > 0 ? (
            <nav className="hidden flex-1 items-center justify-center gap-2 lg:flex">
              {driverLinks.map((item) => (
                <NavLink
                  key={item.to}
                  className={({ isActive }) =>
                    [
                      'rounded-md px-3 py-2 text-sm font-semibold transition',
                      isActive ? 'bg-slate-950 text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
                    ].join(' ')
                  }
                  to={item.to}
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          ) : null}

          {isAuthenticated ? (
            <div className="ml-auto flex items-center gap-3 text-sm text-slate-600">
              {isWorkspaceRole ? (
                <Link className="rounded-md border border-slate-300 px-3 py-2 font-semibold text-slate-700 hover:bg-slate-100" to={getDefaultRouteForRole(user?.role)}>
                  {user?.role === 'admin' ? 'Admin workspace' : 'Owner workspace'}
                </Link>
              ) : null}
              <button className="inline-flex items-center gap-1 hover:text-slate-950" type="button" onClick={logout}>
                <LogOut className="h-4 w-4" aria-hidden="true" />
                Sign out
              </button>
            </div>
          ) : null}
        </div>

        {driverLinks.length > 0 ? (
          <nav className="flex gap-2 overflow-x-auto border-t border-slate-200 px-4 py-3 lg:hidden">
            {driverLinks.map((item) => (
              <NavLink
                key={item.to}
                className={({ isActive }) =>
                  [
                    'shrink-0 rounded-md px-3 py-2 text-sm font-semibold transition',
                    isActive ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  ].join(' ')
                }
                to={item.to}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        ) : null}
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
