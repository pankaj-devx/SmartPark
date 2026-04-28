import { LogOut, Menu, Moon, PanelLeftClose, PanelLeftOpen, ParkingCircle, SunMedium } from 'lucide-react';
import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../features/auth/useAuth.js';
import { useTheme } from '../features/theme/useTheme.js';

export function RoleWorkspaceLayout({ items, roleLabel, title, subtitle }) {
  const { logout, user } = useAuth();
  const { resolvedTheme, toggleTheme } = useTheme();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(() => readWorkspacePreference(roleLabel));

  function toggleDesktopCollapsed() {
    setIsDesktopCollapsed((current) => {
      const next = !current;
      writeWorkspacePreference(roleLabel, next);
      return next;
    });
  }

  return (
    <div className="app-shell">
      <div className={`mx-auto grid max-w-7xl gap-6 px-4 py-6 ${isDesktopCollapsed ? 'lg:grid-cols-[84px_minmax(0,1fr)]' : 'lg:grid-cols-[240px_minmax(0,1fr)]'}`}>
        <aside className={`app-panel lg:sticky lg:top-6 lg:h-fit ${isSidebarOpen ? 'block' : 'hidden'} lg:block`}>
          <div className="border-b pb-4" style={{ borderColor: 'var(--app-border)' }}>
            <div className="flex items-center justify-between gap-3">
              <div className={`inline-flex items-center gap-2 rounded-md bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-700 ${isDesktopCollapsed ? 'w-full justify-center px-2' : ''}`}>
                <ParkingCircle className="h-4 w-4" aria-hidden="true" />
                {!isDesktopCollapsed ? `${roleLabel} workspace` : null}
              </div>
              <button aria-label="Collapse workspace sidebar" className="hidden rounded-md p-2 lg:inline-flex" onClick={toggleDesktopCollapsed} style={{ color: 'var(--app-text-soft)' }} type="button">
                {isDesktopCollapsed ? <PanelLeftOpen className="h-4 w-4" aria-hidden="true" /> : <PanelLeftClose className="h-4 w-4" aria-hidden="true" />}
              </button>
            </div>
            {!isDesktopCollapsed ? (
              <>
                <h1 className="app-heading mt-4 text-xl font-bold">{title}</h1>
                <p className="app-copy mt-2 text-sm">{subtitle}</p>
              </>
            ) : null}
          </div>

          <nav className="mt-4 hidden gap-2 lg:grid">
            {items.map((item) => (
              <NavItem collapsed={isDesktopCollapsed} item={item} key={item.to} onNavigate={() => setIsSidebarOpen(false)} />
            ))}
          </nav>

          <div className="app-card-muted mt-4 hidden lg:block">
            {!isDesktopCollapsed ? <p className="app-heading text-sm font-semibold">{user?.name}</p> : null}
            {!isDesktopCollapsed ? <p className="app-copy-soft mt-1 text-xs uppercase">{user?.role}</p> : null}
            <div className={`mt-3 flex items-center gap-2 ${isDesktopCollapsed ? 'justify-center' : ''}`}>
              <button className="inline-flex items-center gap-2 text-sm font-semibold" onClick={toggleTheme} style={{ color: 'var(--app-text-muted)' }} type="button">
                {resolvedTheme === 'dark' ? <SunMedium className="h-4 w-4" aria-hidden="true" /> : <Moon className="h-4 w-4" aria-hidden="true" />}
                {!isDesktopCollapsed ? (resolvedTheme === 'dark' ? 'Light mode' : 'Dark mode') : null}
              </button>
            </div>
            <button className={`mt-3 inline-flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-slate-950 ${isDesktopCollapsed ? 'w-full justify-center' : ''}`} onClick={logout} type="button">
              <LogOut className="h-4 w-4" aria-hidden="true" />
              {!isDesktopCollapsed ? 'Sign out' : null}
            </button>
          </div>
        </aside>

        <div className="min-w-0">
          <div className="mb-4 flex items-center justify-between gap-3 lg:hidden">
            <button className="inline-flex items-center gap-2 rounded-xl border bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-100" onClick={() => setIsSidebarOpen((current) => !current)} style={{ borderColor: 'var(--app-border)', color: 'var(--app-text-muted)' }} type="button">
              <Menu className="h-4 w-4" aria-hidden="true" />
              {isSidebarOpen ? 'Hide sections' : 'Show sections'}
            </button>
            <div className="text-right">
              <p className="app-heading text-sm font-semibold">{title}</p>
              <p className="app-copy-soft text-xs">{roleLabel} workspace</p>
            </div>
          </div>
          <nav className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-2 lg:hidden">
            {items.map((item) => (
              <NavItem item={item} key={item.to} mobile onNavigate={() => setIsSidebarOpen(false)} />
            ))}
          </nav>
          <Outlet />
        </div>
      </div>
    </div>
  );
}

function NavItem({ collapsed = false, item, mobile = false, onNavigate }) {
  const Icon = item.icon;

  return (
    <NavLink
      className={({ isActive }) =>
        [
          'inline-flex items-center gap-2 rounded-md text-sm font-semibold transition',
          mobile ? 'shrink-0 px-3 py-2' : collapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2.5',
          isActive ? 'bg-slate-950 text-white shadow-sm' : ''
        ].join(' ')
      }
      style={({ isActive }) => (!isActive ? { color: 'var(--app-text-muted)' } : undefined)}
      end={item.to === '/admin/overview' || item.to === '/owner/overview'}
      onClick={onNavigate}
      to={item.to}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      {!collapsed || mobile ? item.label : null}
    </NavLink>
  );
}

function readWorkspacePreference(roleLabel) {
  if (typeof localStorage === 'undefined') {
    return false;
  }

  try {
    return localStorage.getItem(`smartpark_workspace_${roleLabel.toLowerCase()}_collapsed`) === 'true';
  } catch {
    return false;
  }
}

function writeWorkspacePreference(roleLabel, value) {
  if (typeof localStorage === 'undefined') {
    return;
  }

  localStorage.setItem(`smartpark_workspace_${roleLabel.toLowerCase()}_collapsed`, String(value));
}
