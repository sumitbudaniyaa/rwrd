import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  DashboardSquare01Icon,
  Store01Icon,
  Invoice01Icon,
  UserGroupIcon,
  Shield01Icon,
  Activity01Icon,
  Logout01Icon,
  SecurityCheckIcon,
} from '@hugeicons/core-free-icons';
import { Badge } from '@tiptable/ui';
import { useAuth } from '../context/AuthContext.js';

interface NavItem {
  name: string;
  to: string;
  icon: typeof DashboardSquare01Icon;
  end: boolean;
}

const navItems: NavItem[] = [
  { name: 'Platform Overview', to: '/portal', icon: DashboardSquare01Icon, end: true },
  { name: 'Restaurants', to: '/portal/restaurants', icon: Store01Icon, end: false },
  { name: 'Billing & Plans', to: '/portal/billing', icon: Invoice01Icon, end: false },
  { name: 'Inbound Leads', to: '/portal/leads', icon: UserGroupIcon, end: false },
  { name: 'Global Audit', to: '/portal/audit', icon: Shield01Icon, end: false },
  { name: 'System Status', to: '/portal/health', icon: Activity01Icon, end: false },
];

export const PortalLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/portal/login');
  };

  const getRoleBadgeVariant = (role?: string): 'neutral' | 'accent' | 'warning' | 'success' => {
    if (role === 'super_admin') return 'accent';
    if (role === 'finance') return 'success';
    return 'warning';
  };

  const formatRoleLabel = (role?: string): string => {
    if (role === 'super_admin') return 'Super Admin';
    if (role === 'finance') return 'Finance';
    if (role === 'support') return 'Support';
    return role || 'Platform Staff';
  };

  return (
    <div className="min-h-screen bg-[#FAFAF9] flex flex-col md:flex-row text-stone-900 font-sans">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-60 bg-white border-r border-stone-200/80 flex flex-col shrink-0">
        {/* Brand Header */}
        <div className="p-5 border-b border-stone-200/70">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-stone-900 flex items-center justify-center text-white font-bold text-xs tracking-tight shadow-2xs font-mono">
              R
            </div>
            <div>
              <span className="font-bold text-sm tracking-tight text-stone-900 block lowercase">
                rwrd
              </span>
              <span className="text-[10px] font-semibold text-stone-400 block tracking-wider uppercase">
                Control Plane
              </span>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-stone-50 border border-stone-200/70 text-[11px] text-stone-600">
            <HugeiconsIcon icon={SecurityCheckIcon} className="w-3.5 h-3.5 text-stone-500" />
            <span className="font-medium">Platform Staff Realm</span>
          </div>
        </div>

        {/* Nav Links */}
        <nav className="p-3 flex-1 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-stone-900 text-white shadow-2xs'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100/70'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <HugeiconsIcon
                    icon={item.icon}
                    className={`w-4 h-4 ${isActive ? 'text-white' : 'text-stone-400'}`}
                    strokeWidth={1.5}
                  />
                  <span>{item.name}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User Profile & Logout */}
        <div className="p-3.5 border-t border-stone-200/70 bg-white">
          <div className="flex items-center justify-between mb-2.5">
            <div className="truncate mr-2">
              <span className="text-xs font-semibold text-stone-900 block truncate">
                {user?.fullName || 'Platform Staff'}
              </span>
              <span className="text-[10px] text-stone-400 block truncate font-mono">
                {user?.email}
              </span>
            </div>
            <Badge variant={getRoleBadgeVariant(user?.role)}>{formatRoleLabel(user?.role)}</Badge>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-50 rounded-lg transition-colors border border-stone-200"
          >
            <HugeiconsIcon icon={Logout01Icon} className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-6 md:p-8 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
};
