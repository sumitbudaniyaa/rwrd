import React, { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { HugeiconsIcon } from '@hugeicons/react';
import { Logout01Icon } from '@hugeicons/core-free-icons';
import { MotionButton } from '../components/motion/button.js';
import { useAuth } from '../context/AuthContext.js';
import { FloatingMenu, type MenuItem } from '../components/ui/liquid-morph-floating-menu.js';
import logoImage from '../assets/logo.png';

export const AdminLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, logoutAll, impersonation, exitImpersonation } = useAuth();
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

  const adminTabs: MenuItem[] = [
    {
      label: 'Overview',
      active: location.pathname === '/admin' || location.pathname === '/admin/',
      onClick: () => navigate('/admin'),
    },
    {
      label: 'Staff Roster',
      active: location.pathname.startsWith('/admin/staff'),
      onClick: () => navigate('/admin/staff'),
    },
    {
      label: 'QR Management',
      active: location.pathname.startsWith('/admin/qr'),
      onClick: () => navigate('/admin/qr'),
    },
    {
      label: 'Analytics',
      active: location.pathname.startsWith('/admin/analytics'),
      onClick: () => navigate('/admin/analytics'),
    },
    {
      label: 'Settings',
      active: location.pathname.startsWith('/admin/settings'),
      onClick: () => navigate('/admin/settings'),
    },
    {
      label: 'Audit Log',
      active: location.pathname.startsWith('/admin/audit'),
      onClick: () => navigate('/admin/audit'),
    },
  ];

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 flex flex-col font-sans relative">
      {/* Support Impersonation Banner */}
      {impersonation?.isImpersonated && (
        <div
          role="alert"
          className="bg-amber-500 text-stone-950 px-6 py-2.5 text-xs font-medium flex items-center justify-between border-b border-amber-600 shadow-sm z-50 sticky top-0"
        >
          <div className="flex items-center gap-2.5">
            <span className="text-base" aria-hidden="true">
              ⚠️
            </span>
            <span>
              <strong>Impersonation Mode:</strong> You are viewing this account as Platform Staff
              (Staff ID: {impersonation.impersonatorId || 'Support'}). All actions are strictly
              audited.
            </span>
          </div>
          <button
            type="button"
            onClick={exitImpersonation}
            className="px-3 py-1 bg-stone-950 hover:bg-stone-800 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          >
            Exit Impersonation
          </button>
        </div>
      )}

      {/* Top Header Navigation */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200 px-6 sm:px-8 py-3.5 flex items-center justify-between shadow-xs">
        {/* Left: Brand */}
        <div className="flex items-center gap-2.5">
          <span className="sr-only">rwrd</span>
          <img src={logoImage} alt="rwrd" className="h-8 w-auto object-contain select-none" />
          <span className="text-[11px] font-medium text-stone-400 uppercase tracking-wider hidden sm:inline-block">
            Restaurant Admin
          </span>
        </div>

        {/* Right: User Session */}
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="relative">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-stone-200 flex items-center justify-center text-xs font-semibold text-stone-700">
                {userInitials}
              </div>
              <div className="hidden md:block text-left">
                <p className="text-xs font-semibold text-stone-900 truncate max-w-[120px]">
                  {user?.fullName || 'Sarah Miller'}
                </p>
                <p className="text-[11px] text-stone-500 capitalize">{userRoleDisplay}</p>
              </div>

              <MotionButton
                variant="ghost"
                size="sm"
                onClick={() => setShowLogoutConfirm(!showLogoutConfirm)}
                aria-label="Sign out options"
                className="p-1.5 h-8 w-8 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg cursor-pointer"
              >
                <HugeiconsIcon icon={Logout01Icon} className="w-4 h-4" strokeWidth={1.5} />
              </MotionButton>
            </div>

            {showLogoutConfirm && (
              <div className="absolute right-0 top-11 p-2 w-52 bg-white border border-stone-200/80 rounded-2xl shadow-xl space-y-1 z-50">
                <p className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider px-2 py-1">
                  Session Options
                </p>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full text-left px-2.5 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50 rounded-xl transition-colors cursor-pointer outline-none focus:outline-none"
                >
                  Sign out of this session
                </button>
                <button
                  type="button"
                  onClick={handleLogoutAll}
                  className="w-full text-left px-2.5 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer outline-none focus:outline-none"
                >
                  Log out of all devices
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area - Full width with bottom padding for floating menu */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <div className="p-6 sm:p-8 max-w-7xl w-full mx-auto pb-32">
          <Outlet />
        </div>
      </main>

      {/* Liquid Morph Floating Navigation Menu */}
      <FloatingMenu items={adminTabs} />
    </div>
  );
};
