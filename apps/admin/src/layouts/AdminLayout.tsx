import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react';
import {
  DashboardSquare01Icon,
  UserGroupIcon,
  QrCodeIcon,
  Analytics01Icon,
  Settings01Icon,
  Shield01Icon,
  Logout01Icon,
} from '@hugeicons/core-free-icons';
import { Badge, MotionButton, cn } from '@tiptable/ui';
import { useAuth } from '../context/AuthContext.js';

interface NavItem {
  label: string;
  path: string;
  icon: IconSvgElement;
}

const navItems: NavItem[] = [
  { label: 'Overview', path: '/admin', icon: DashboardSquare01Icon },
  { label: 'Staff Roster', path: '/admin/staff', icon: UserGroupIcon },
  { label: 'QR Management', path: '/admin/qr', icon: QrCodeIcon },
  { label: 'Analytics', path: '/admin/analytics', icon: Analytics01Icon },
  { label: 'Settings', path: '/admin/settings', icon: Settings01Icon },
  { label: 'Audit Log', path: '/admin/audit', icon: Shield01Icon },
];

export const AdminLayout: React.FC = () => {
  const navigate = useNavigate();
  const { user, restaurant, logout, logoutAll } = useAuth();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login');
  };

  const handleLogoutAll = async () => {
    await logoutAll();
    navigate('/admin/login');
  };

  const userInitials =
    user?.fullName
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'AD';

  const userRoleDisplay = user?.role
    ? user.role.charAt(0).toUpperCase() + user.role.slice(1)
    : 'Staff';

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 flex font-sans">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-white border-r border-stone-200 flex flex-col justify-between p-5 select-none">
        <div>
          {/* Brand Header */}
          <div className="flex items-center gap-3 px-2 py-2 mb-6">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-semibold text-lg">
              T
            </div>
            <div>
              <span className="font-semibold text-stone-900 text-sm tracking-tight block">
                TipTable
              </span>
              <span className="text-[11px] font-medium text-stone-500 uppercase tracking-wider block">
                Restaurant Admin
              </span>
            </div>
          </div>

          {/* Restaurant Tenant Selector Pill */}
          <div className="mb-6 px-3 py-2.5 rounded-xl bg-stone-50 border border-stone-200/80 flex items-center justify-between">
            <div className="truncate pr-2">
              <span className="text-xs font-medium text-stone-900 block truncate">
                {restaurant?.name || 'The Bombay Canteen'}
              </span>
              <span className="text-[10px] text-stone-500 font-mono block">Tenant: active</span>
            </div>
            <Badge variant="success">Live</Badge>
          </div>

          {/* Nav Links */}
          <nav className="space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/admin'}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-colors',
                    isActive
                      ? 'bg-indigo-50 text-indigo-700 font-semibold'
                      : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900',
                  )
                }
              >
                <HugeiconsIcon
                  icon={item.icon}
                  className="w-4 h-4 flex-shrink-0"
                  strokeWidth={1.5}
                />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        {/* User Profile & Sign Out Footer */}
        <div className="pt-4 border-t border-stone-100 relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 truncate pr-2">
              <div className="w-8 h-8 rounded-full bg-stone-200 flex items-center justify-center text-xs font-medium text-stone-700">
                {userInitials}
              </div>
              <div className="truncate">
                <p className="text-xs font-medium text-stone-900 truncate">
                  {user?.fullName || 'Sarah Miller'}
                </p>
                <p className="text-[11px] text-stone-500 truncate">{userRoleDisplay}</p>
              </div>
            </div>
            <MotionButton
              variant="ghost"
              size="sm"
              onClick={() => setShowLogoutConfirm(!showLogoutConfirm)}
              aria-label="Sign out options"
              className="p-1.5 h-8 w-8 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg"
            >
              <HugeiconsIcon icon={Logout01Icon} className="w-4 h-4" strokeWidth={1.5} />
            </MotionButton>
          </div>

          {showLogoutConfirm && (
            <div className="absolute bottom-14 left-0 right-0 p-3 bg-white border border-stone-200 rounded-xl shadow-lg space-y-2 z-30">
              <p className="text-xs font-medium text-stone-800">Session Options</p>
              <button
                type="button"
                onClick={handleLogout}
                className="w-full text-left px-2.5 py-1.5 text-xs text-stone-700 hover:bg-stone-50 rounded-lg"
              >
                Sign out of this session
              </button>
              <button
                type="button"
                onClick={handleLogoutAll}
                className="w-full text-left px-2.5 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-lg font-medium"
              >
                Log out of all devices
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <header className="h-16 bg-white border-b border-stone-200 px-8 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-base font-semibold text-stone-900">Restaurant Management</h1>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="accent">Production Mode</Badge>
          </div>
        </header>

        <div className="p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
