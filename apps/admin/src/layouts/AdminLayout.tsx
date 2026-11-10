import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { FloatingMenu, type MenuItem } from '../components/ui/liquid-morph-floating-menu.js';
import logoImage from '../assets/logo.png';

export const AdminLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, restaurant, logout, impersonation, exitImpersonation } = useAuth();

  const hasPaid = Boolean(user?.hasActivePlan || user?.subscriptionStatus === 'active');
  const isReviewLinkMissing =
    !restaurant?.googleReviewUrl || restaurant.googleReviewUrl.trim() === '';
  const showReviewBanner = hasPaid && isReviewLinkMissing;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
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
      active:
        location.pathname === '/' ||
        location.pathname === '/admin' ||
        location.pathname === '/admin/',
      onClick: () => navigate('/'),
    },
    {
      label: 'Staff Roster',
      active:
        location.pathname.startsWith('/staff') || location.pathname.startsWith('/admin/staff'),
      onClick: () => navigate('/staff'),
    },
    {
      label: 'QR Management',
      active: location.pathname.startsWith('/qr') || location.pathname.startsWith('/admin/qr'),
      onClick: () => navigate('/qr'),
    },
    {
      label: 'Analytics',
      active:
        location.pathname.startsWith('/analytics') ||
        location.pathname.startsWith('/admin/analytics'),
      onClick: () => navigate('/analytics'),
    },
    {
      label: 'Settings',
      active:
        location.pathname.startsWith('/settings') ||
        location.pathname.startsWith('/admin/settings'),
      onClick: () => navigate('/settings'),
    },
    {
      label: 'Audit Log',
      active:
        location.pathname.startsWith('/audit') || location.pathname.startsWith('/admin/audit'),
      onClick: () => navigate('/audit'),
    },
    {
      label: 'Log Out',
      isDanger: true,
      onClick: handleLogout,
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

      {/* Missing Google Review Link Banner */}
      {showReviewBanner && (
        <div
          role="alert"
          aria-label="Google review link missing notification"
          className="bg-[#FFE862]/25 border-b border-[#FFE862]/80 px-6 sm:px-8 py-2.5 text-xs text-stone-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-2xs z-40 sticky top-0"
        >
          <div className="flex items-center gap-2">
            <span className="text-base select-none" aria-hidden="true">
              ⭐
            </span>
            <span>
              <strong>Google Review Link Missing:</strong> Add your Google review link so diners can
              leave 5-star ratings directly when scanning table QR codes.
            </span>
          </div>
          <button
            type="button"
            onClick={() => navigate('/settings')}
            className="px-3.5 py-1 bg-stone-900 hover:bg-black text-white rounded-lg text-xs font-semibold transition-colors shrink-0 cursor-pointer self-start sm:self-auto"
          >
            Add Review Link
          </button>
        </div>
      )}

      {/* Top Header Navigation */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200 px-6 sm:px-8 py-3.5 flex items-center justify-between shadow-xs">
        {/* Left: Brand */}
        <div className="flex items-center gap-2.5">
          <span className="sr-only">rwrd</span>
          <img src={logoImage} alt="rwrd" className="h-8 w-auto object-contain select-none" />
          <span className="px-2 py-0.5 rounded-md text-[9px] font-semibold tracking-wider text-stone-500 bg-stone-100 uppercase border border-stone-200/60 hidden sm:inline-block">
            Admin
          </span>
        </div>

        {/* Right: User Session */}
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-stone-200 flex items-center justify-center text-xs font-semibold text-stone-700">
              {userInitials}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-xs font-semibold text-stone-900 truncate max-w-[120px]">
                {user?.fullName || 'Admin'}
              </p>
              <p className="text-[11px] text-stone-500 capitalize">{userRoleDisplay}</p>
            </div>
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
