import React from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Store01Icon,
  QrCodeIcon,
  SentIcon,
  UserGroupIcon,
  ArrowRight01Icon,
  Shield01Icon,
} from '@hugeicons/core-free-icons';
import { MotionCard, SlideUp, StaggerList, Badge, MotionButton } from '@tiptable/ui';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';

export const DashboardOverview: React.FC = () => {
  const { user } = useAuth();

  const stats = [
    {
      title: 'Active Restaurants',
      value: '24',
      badge: '+3 this month',
      variant: 'success' as const,
      icon: Store01Icon,
    },
    {
      title: 'Global Scans (Today)',
      value: '4,892',
      badge: 'Live',
      variant: 'neutral' as const,
      icon: QrCodeIcon,
    },
    {
      title: 'Tips Initiated (Today)',
      value: '₹1,42,800',
      badge: '1,280 intents',
      variant: 'accent' as const,
      icon: SentIcon,
    },
    {
      title: 'Inbound Demo Leads',
      value: '7',
      badge: '3 pending',
      variant: 'warning' as const,
      icon: UserGroupIcon,
    },
  ];

  return (
    <div className="space-y-8 max-w-7xl">
      {/* Welcome Banner */}
      <SlideUp>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-stone-900 tracking-tight">
              Control Plane Dashboard
            </h1>
            <p className="mt-1 text-sm text-stone-500">
              Welcome back, <strong>{user?.fullName}</strong>. Global tenant metrics and operational
              health across India.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link to="/portal/restaurants">
              <MotionButton
                variant="primary"
                size="sm"
                className="bg-stone-900 hover:bg-stone-800 text-white"
              >
                Manage Restaurants
              </MotionButton>
            </Link>
          </div>
        </div>
      </SlideUp>

      {/* KPI Cards Grid */}
      <StaggerList className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {stats.map((s) => (
          <MotionCard
            key={s.title}
            hoverable
            className="p-5 bg-white border border-stone-200 rounded-2xl"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-stone-500 uppercase tracking-wider">
                {s.title}
              </span>
              <div className="w-8 h-8 rounded-lg bg-stone-50 border border-stone-200/60 flex items-center justify-center text-stone-700">
                <HugeiconsIcon icon={s.icon} className="w-4 h-4" strokeWidth={1.5} />
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-semibold text-stone-900 tracking-tight">
                {s.value}
              </span>
              <Badge variant={s.variant}>{s.badge}</Badge>
            </div>
          </MotionCard>
        ))}
      </StaggerList>

      {/* Operations Quick Links */}
      <SlideUp delay={100}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <MotionCard className="p-6 bg-white border border-stone-200 rounded-2xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                <HugeiconsIcon icon={Store01Icon} className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-semibold text-stone-900">Tenant Management</h2>
            </div>
            <p className="text-xs text-stone-500 mb-4 leading-relaxed">
              Onboard new dining establishments, configure flat monthly plans, manage active status,
              or launch support impersonation.
            </p>
            <Link
              to="/portal/restaurants"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800"
            >
              <span>View all restaurants</span>
              <HugeiconsIcon icon={ArrowRight01Icon} className="w-3.5 h-3.5" />
            </Link>
          </MotionCard>

          <MotionCard className="p-6 bg-white border border-stone-200 rounded-2xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                <HugeiconsIcon icon={UserGroupIcon} className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-semibold text-stone-900">Inbound Leads Pipeline</h2>
            </div>
            <p className="text-xs text-stone-500 mb-4 leading-relaxed">
              Track restaurant demo requests from the marketing landing page, update qualification
              stages, and assign account reps.
            </p>
            <Link
              to="/portal/leads"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 hover:text-emerald-800"
            >
              <span>Review inbound requests</span>
              <HugeiconsIcon icon={ArrowRight01Icon} className="w-3.5 h-3.5" />
            </Link>
          </MotionCard>

          <MotionCard className="p-6 bg-white border border-stone-200 rounded-2xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-700">
                <HugeiconsIcon icon={Shield01Icon} className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-semibold text-stone-900">Platform Security & Audit</h2>
            </div>
            <p className="text-xs text-stone-500 mb-4 leading-relaxed">
              Inspect tamper-evident platform-wide event stream, staff sign-ins, privilege
              delegations, and API rate limiting status.
            </p>
            <Link
              to="/portal/audit"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-700 hover:text-stone-900"
            >
              <span>Inspect global audit log</span>
              <HugeiconsIcon icon={ArrowRight01Icon} className="w-3.5 h-3.5" />
            </Link>
          </MotionCard>
        </div>
      </SlideUp>
    </div>
  );
};
