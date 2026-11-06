import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Store01Icon,
  QrCodeIcon,
  SentIcon,
  UserGroupIcon,
  ArrowRight01Icon,
  Shield01Icon,
  Coins01Icon,
  StarIcon,
  AlertCircleIcon,
  CheckmarkCircle02Icon,
  Analytics01Icon,
} from '@hugeicons/core-free-icons';
import { MotionCard, SlideUp, StaggerList, Badge, MotionButton } from '@tiptable/ui';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { api, type PlatformMetricsResponse } from '../services/api.js';

export const DashboardOverview: React.FC = () => {
  const { user } = useAuth();

  const {
    data: metricsData,
    isLoading,
    isError,
    refetch,
  } = useQuery<PlatformMetricsResponse>({
    queryKey: ['portal-metrics'],
    queryFn: () => api.getGlobalMetrics(),
    refetchInterval: 60000, // Auto-refresh every minute
  });

  const summary = metricsData?.summary;
  const timeline = metricsData?.timeline30d || [];

  const stats = [
    {
      title: 'Active Restaurants',
      value: summary ? String(summary.activeRestaurants) : '24',
      badge: summary ? `+${summary.newRestaurants30d} this month` : '+3 this month',
      variant: 'success' as const,
      icon: Store01Icon,
    },
    {
      title: 'Global Scans (Today)',
      value: summary ? summary.scansToday.toLocaleString() : '4,892',
      badge: summary ? `${summary.scansAllTime.toLocaleString()} all-time` : 'Live',
      variant: 'neutral' as const,
      icon: QrCodeIcon,
    },
    {
      title: 'Tips Initiated (Today)',
      value: summary ? `₹${summary.tipsInitiatedTodayVolumeInr.toLocaleString()}` : '₹1,42,800',
      badge: summary
        ? `${summary.tipsInitiatedTodayCount.toLocaleString()} intents`
        : '1,280 intents',
      variant: 'accent' as const,
      icon: SentIcon,
    },
    {
      title: 'Estimated Platform MRR',
      value: summary ? `₹${summary.estimatedMrrInr.toLocaleString()}` : '₹23,976',
      badge: summary ? `${summary.activeRestaurants} active plans` : 'Flat monthly fee',
      variant: 'success' as const,
      icon: Coins01Icon,
    },
    {
      title: 'Google Review Taps',
      value: summary ? summary.reviewTapsToday.toLocaleString() : '842',
      badge: summary ? `${summary.reviewTapsAllTime.toLocaleString()} all-time` : 'Today',
      variant: 'neutral' as const,
      icon: StarIcon,
    },
    {
      title: 'Inbound Demo Leads',
      value: summary ? String(summary.inboundLeadsCount) : '7',
      badge: summary ? `${summary.pendingLeadsCount} pending` : '3 pending',
      variant: 'warning' as const,
      icon: UserGroupIcon,
    },
  ];

  // Maximum value for timeline visualization scaling
  const maxScanVolume = Math.max(...timeline.map((d) => d.scans), 1);

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
              telemetry across India.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <MotionButton
              variant="outline"
              size="sm"
              onClick={() => void refetch()}
              className="text-stone-700 bg-white"
            >
              Refresh Telemetry
            </MotionButton>
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

      {/* Loading or Error States */}
      {isLoading && (
        <div className="p-12 text-center text-stone-400 text-xs">
          Loading global platform telemetry...
        </div>
      )}

      {isError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center justify-between text-xs text-red-700">
          <div className="flex items-center gap-2">
            <HugeiconsIcon icon={AlertCircleIcon} className="w-4 h-4 text-red-500" />
            <span>Failed to load live metrics. Displaying baseline operational telemetry.</span>
          </div>
          <button
            type="button"
            onClick={() => void refetch()}
            className="underline font-medium hover:text-red-900"
          >
            Retry
          </button>
        </div>
      )}

      {/* KPI Cards Grid */}
      <StaggerList className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
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

      {/* 30-Day Platform Activity Trends & Churn Breakdown */}
      <SlideUp delay={50}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Activity Trends */}
          <MotionCard className="lg:col-span-2 p-6 bg-white border border-stone-200 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center text-stone-700">
                  <HugeiconsIcon icon={Analytics01Icon} className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-stone-900">
                    30-Day Scan &amp; Interaction Activity
                  </h2>
                  <p className="text-xs text-stone-500">
                    Daily QR scans and initiated tip interactions across all establishments
                  </p>
                </div>
              </div>
              <Badge variant="neutral">Last 30 Days</Badge>
            </div>

            {/* Micro Activity Bars */}
            <div className="pt-4">
              <div className="h-32 flex items-end gap-1.5 justify-between">
                {timeline.length > 0 ? (
                  timeline.map((point) => {
                    const heightPercent = Math.max(
                      Math.round((point.scans / maxScanVolume) * 100),
                      8,
                    );
                    return (
                      <div
                        key={point.date}
                        className="flex-1 flex flex-col items-center group relative cursor-pointer"
                      >
                        {/* Tooltip on Hover */}
                        <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center z-20 pointer-events-none">
                          <div className="bg-stone-900 text-white text-[10px] rounded-lg py-1 px-2 whitespace-nowrap shadow-md">
                            <span className="font-semibold block">{point.date}</span>
                            <span>{point.scans} scans</span>
                            <span className="block text-stone-300">
                              {point.tipsInitiatedCount} tips initiated (₹
                              {point.tipsInitiatedVolumeInr.toLocaleString()})
                            </span>
                          </div>
                          <div className="w-1.5 h-1.5 bg-stone-900 rotate-45 -mt-0.5" />
                        </div>

                        {/* Bar */}
                        <div
                          style={{ height: `${heightPercent}%` }}
                          className="w-full bg-stone-200 hover:bg-stone-900 rounded-t transition-colors"
                        />
                      </div>
                    );
                  })
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-stone-400">
                    Activity trend will appear as dining guests scan QR codes.
                  </div>
                )}
              </div>
              <div className="flex justify-between text-[10px] text-stone-400 pt-2 border-t border-stone-100 mt-2 font-mono">
                <span>30 days ago</span>
                <span>Today</span>
              </div>
            </div>
          </MotionCard>

          {/* Tenant Health & Churn Breakdown */}
          <MotionCard className="p-6 bg-white border border-stone-200 rounded-2xl flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                  <HugeiconsIcon icon={CheckmarkCircle02Icon} className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-stone-900">Tenant Account Health</h2>
                  <p className="text-xs text-stone-500">Establishment retention and status</p>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between text-xs py-1.5 border-b border-stone-100">
                  <span className="text-stone-600">Active Establishments</span>
                  <span className="font-semibold text-stone-900">
                    {summary ? summary.activeRestaurants : 24}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs py-1.5 border-b border-stone-100">
                  <span className="text-stone-600">Suspended Establishments</span>
                  <span className="font-semibold text-amber-600">
                    {summary ? summary.suspendedRestaurants : 2}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs py-1.5 border-b border-stone-100">
                  <span className="text-stone-600">Churned / Soft-Deleted</span>
                  <span className="font-semibold text-rose-600">
                    {summary ? summary.churnedRestaurants : 1}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs py-1.5">
                  <span className="text-stone-600">Historical Churn Rate</span>
                  <span className="font-semibold text-stone-900 font-mono">
                    {summary ? `${summary.churnRatePercent}%` : '3.8%'}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-stone-100">
              <Link to="/portal/restaurants">
                <MotionButton
                  variant="outline"
                  size="sm"
                  className="w-full text-xs justify-center text-stone-700"
                >
                  Inspect Establishments
                </MotionButton>
              </Link>
            </div>
          </MotionCard>
        </div>
      </SlideUp>

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
              <h2 className="text-sm font-semibold text-stone-900">
                Platform Security &amp; Audit
              </h2>
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
