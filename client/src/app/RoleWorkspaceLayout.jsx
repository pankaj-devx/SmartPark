import { LogOut, Menu, PanelLeftClose, PanelLeftOpen, ParkingCircle } from 'lucide-react';
import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../features/auth/useAuth.js';

export function RoleWorkspaceLayout({ items, roleLabel, title, subtitle }) {
  const { logout, user } = useAuth();
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
    <div className="min-h-screen bg-slate-50">
      <div className={`mx-auto grid max-w-7xl gap-6 px-4 py-6 ${isDesktopCollapsed ? 'lg:grid-cols-[84px_minmax(0,1fr)]' : 'lg:grid-cols-[240px_minmax(0,1fr)]'}`}>
        <aside className={`rounded-lg border border-slate-200 bg-white p-4 shadow-sm lg:sticky lg:top-6 lg:h-fit ${isSidebarOpen ? 'block' : 'hidden'} lg:block`}>
          <div className="border-b border-slate-200 pb-4">
            <div className="flex items-center justify-between gap-3">
              <div className={`inline-flex items-center gap-2 rounded-md bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-700 ${isDesktopCollapsed ? 'w-full justify-center px-2' : ''}`}>
                <ParkingCircle className="h-4 w-4" aria-hidden="true" />
                {!isDesktopCollapsed ? `${roleLabel} workspace` : null}
              </div>
              <button aria-label="Collapse workspace sidebar" className="hidden rounded-md p-2 text-slate-500 hover:bg-slate-100 lg:inline-flex" onClick={toggleDesktopCollapsed} type="button">
                {isDesktopCollapsed ? <PanelLeftOpen className="h-4 w-4" aria-hidden="true" /> : <PanelLeftClose className="h-4 w-4" aria-hidden="true" />}
              </button>
            </div>
            {!isDesktopCollapsed ? (
              <>
                <h1 className="mt-4 text-xl font-bold text-slate-950">{title}</h1>
                <p className="mt-2 text-sm text-slate-600">{subtitle}</p>
              </>
            ) : null}
          </div>

          <nav className="mt-4 hidden gap-2 lg:grid">
            {items.map((item) => (
              <NavItem collapsed={isDesktopCollapsed} item={item} key={item.to} onNavigate={() => setIsSidebarOpen(false)} />
            ))}
          </nav>

          <div className="mt-4 hidden rounded-md border border-slate-200 bg-slate-50 p-3 lg:block">
            {!isDesktopCollapsed ? <p className="text-sm font-semibold text-slate-950">{user?.name}</p> : null}
            {!isDesktopCollapsed ? <p className="mt-1 text-xs uppercase text-slate-500">{user?.role}</p> : null}
            <button className={`mt-3 inline-flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-slate-950 ${isDesktopCollapsed ? 'w-full justify-center' : ''}`} onClick={logout} type="button">
              <LogOut className="h-4 w-4" aria-hidden="true" />
              {!isDesktopCollapsed ? 'Sign out' : null}
            </button>
          </div>
        </aside>

        <div className="min-w-0">
          <div className="mb-4 flex items-center justify-between gap-3 lg:hidden">
            <button className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100" onClick={() => setIsSidebarOpen((current) => !current)} type="button">
              <Menu className="h-4 w-4" aria-hidden="true" />
              {isSidebarOpen ? 'Hide sections' : 'Show sections'}
            </button>
            <div className="text-right">
              <p className="text-sm font-semibold text-slate-950">{title}</p>
              <p className="text-xs text-slate-500">{roleLabel} workspace</p>
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
          isActive ? 'bg-slate-950 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
        ].join(' ')
      }
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
