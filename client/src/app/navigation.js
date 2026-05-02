import {
  BarChart3,
  Bell,
  Bookmark,
  CircleUserRound,
  ClipboardList,
  LayoutDashboard,
  MapPinned,
  ReceiptText,
  ShieldCheck,
  TrendingUp,
  Users
} from 'lucide-react';

export const driverNavItems = [
  { label: 'Home', to: '/dashboard', icon: LayoutDashboard },
  { label: 'My Dashboard', to: '/dashboard/analytics', icon: TrendingUp },
  { label: 'Discover', to: '/parkings', icon: MapPinned },
  { label: 'Map', to: '/map', icon: MapPinned },
  { label: 'Reservations', to: '/bookings', icon: ClipboardList },
  { label: 'Saved', to: '/saved', icon: Bookmark },
  { label: 'Account', to: '/settings', icon: CircleUserRound }
];

export const ownerNavItems = [
  { label: 'Overview', to: '/owner/overview', icon: LayoutDashboard },
  { label: 'Analytics', to: '/owner/analytics', icon: TrendingUp },
  { label: 'Listings', to: '/owner/listings', icon: MapPinned },
  { label: 'Reservations', to: '/owner/reservations', icon: ClipboardList },
  { label: 'Occupancy', to: '/owner/occupancy', icon: BarChart3 },
  { label: 'Earnings', to: '/owner/earnings', icon: ReceiptText },
  { label: 'Reviews', to: '/owner/reviews', icon: Bell },
  { label: 'Settings', to: '/owner/settings', icon: CircleUserRound }
];

export const adminNavItems = [
  { label: 'Overview', to: '/admin/overview', icon: LayoutDashboard },
  { label: 'Analytics', to: '/admin/analytics', icon: TrendingUp },
  { label: 'Approvals', to: '/admin/approvals', icon: ShieldCheck },
  { label: 'Bookings', to: '/admin/bookings', icon: ClipboardList },
  { label: 'Users', to: '/admin/users', icon: Users },
  { label: 'Reviews', to: '/admin/reviews', icon: Bell },
  { label: 'Reports', to: '/admin/reports', icon: ReceiptText },
  { label: 'Settings', to: '/admin/settings', icon: CircleUserRound }
];

export function getDefaultRouteForRole(role) {
  if (role === 'owner') {
    return '/owner/overview';
  }

  if (role === 'admin') {
    return '/admin/overview';
  }

  return '/dashboard';
}

export function getRoleNavItems(role) {
  if (role === 'owner') {
    return ownerNavItems;
  }

  if (role === 'admin') {
    return adminNavItems;
  }

  return driverNavItems;
}
