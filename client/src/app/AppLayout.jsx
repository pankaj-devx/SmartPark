import { Link, NavLink, Outlet } from 'react-router-dom';
import { LogOut, Moon, ParkingCircle, SunMedium } from 'lucide-react';
import { driverNavItems, getDefaultRouteForRole } from './navigation.js';
import { useAuth } from '../features/auth/useAuth.js';
import { useTheme } from '../features/theme/useTheme.js';
import { NotificationBell } from '../features/notifications/NotificationBell.jsx';

export function AppLayout() {
  const { isAuthenticated, logout, user } = useAuth();
  const { resolvedTheme, toggleTheme } = useTheme();
  const isDriver = user?.role === 'driver';
  const isWorkspaceRole = user?.role === 'owner' || user?.role === 'admin';
  const driverLinks = isAuthenticated && isDriver ? driverNavItems : [];

  return (
    <div className="app-shell">
      <header className="border-b" style={{ borderColor: 'var(--app-border)', background: 'var(--app-surface)' }}>
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <ParkingCircle className="h-7 w-7 text-brand-600" aria-hidden="true" />
            <span>SmartPark</span>
          </Link>

          {!isAuthenticated ? (
            <nav className="hidden items-center gap-4 text-sm md:flex" style={{ color: 'var(--app-text-muted)' }}>
              <Link className="hover:text-slate-950" to="/">
                Explore
              </Link>
              <Link className="hover:text-slate-950" to="/parkings">
                All spaces
              </Link>
              <Link className="hover:text-slate-950" to="/map">
                Map view
              </Link>
              <Link className="hover:text-slate-950" to="/register?role=owner">
                List your space
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
                      'rounded-xl px-3 py-2 text-sm font-semibold transition',
                      isActive ? 'bg-slate-950 text-white' : 'hover:text-slate-950'
                    ].join(' ')
                  }
                  style={({ isActive }) => (!isActive ? { color: 'var(--app-text-muted)' } : undefined)}
                  to={item.to}
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          ) : null}

          <div className="ml-auto flex items-center gap-2 text-sm">
            <button
              aria-label={resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 font-semibold"
              onClick={toggleTheme}
              style={{ borderColor: 'var(--app-border)', color: 'var(--app-text-muted)' }}
              type="button"
            >
              {resolvedTheme === 'dark' ? <SunMedium className="h-4 w-4" aria-hidden="true" /> : <Moon className="h-4 w-4" aria-hidden="true" />}
              <span className="hidden sm:inline">{resolvedTheme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
            </button>

            {isAuthenticated ? (
            <div className="flex items-center gap-3 text-sm" style={{ color: 'var(--app-text-muted)' }}>
              {/* Notification bell — visible to all authenticated users */}
              <NotificationBell />

              {isWorkspaceRole ? (
                <Link className="rounded-xl border px-3 py-2 font-semibold hover:bg-slate-100" style={{ borderColor: 'var(--app-border)', color: 'var(--app-text-muted)' }} to={getDefaultRouteForRole(user?.role)}>
                  {user?.role === 'admin' ? 'Admin workspace' : 'Owner workspace'}
                </Link>
              ) : null}
              <button className="inline-flex items-center gap-1 hover:text-slate-950" type="button" onClick={logout}>
                <LogOut className="h-4 w-4" aria-hidden="true" />
                Sign out
              </button>
            </div>
            ) : (
              <Link className="rounded-md bg-brand-600 px-3 py-2 font-semibold text-white hover:bg-brand-700 md:hidden" to="/login">
                Sign in
              </Link>
            )}
          </div>
        </div>

          {driverLinks.length > 0 ? (
          <nav className="flex gap-2 overflow-x-auto border-t px-4 py-3 lg:hidden" style={{ borderColor: 'var(--app-border)' }}>
            {driverLinks.map((item) => (
              <NavLink
                key={item.to}
                className={({ isActive }) =>
                  [
                    'shrink-0 rounded-xl px-3 py-2 text-sm font-semibold transition',
                    isActive ? 'bg-slate-950 text-white' : ''
                  ].join(' ')
                }
                style={({ isActive }) => (!isActive ? { background: 'var(--app-surface-muted)', color: 'var(--app-text-muted)' } : undefined)}
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
