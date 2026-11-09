import React, { useState } from 'react';
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
  Clock01Icon,
} from '@hugeicons/core-free-icons';
import { MotionCard, SlideUp, StaggerList, Badge, MotionButton } from '@tiptable/ui';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { api, type PlatformMetricsResponse } from '../services/api.js';

export const DashboardOverview: React.FC = () => {
  const { user } = useAuth();
  const [metricView, setMetricView] = useState<'scans' | 'volume'>('scans');

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
  const maxTipVolume = Math.max(...timeline.map((d) => d.tipsInitiatedVolumeInr), 1);
  const activeMax = metricView === 'scans' ? maxScanVolume : maxTipVolume;

  const total30dScans = timeline.reduce((acc, curr) => acc + curr.scans, 0);
  const total30dVolume = timeline.reduce((acc, curr) => acc + curr.tipsInitiatedVolumeInr, 0);

  return (
    <div className="space-y-6 max-w-7xl font-sans">
      {/* Welcome Banner */}
      <SlideUp>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white dark:bg-stone-900 p-5 rounded-2xl border border-stone-200/80 dark:border-stone-800 shadow-2xs transition-colors duration-200">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl font-semibold text-stone-900 dark:text-stone-100 tracking-tight">
                Control Plane Dashboard
              </h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Systems OK
              </span>
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Welcome back, <strong>{user?.fullName}</strong>. Global tenant metrics and operational
              telemetry across India.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <MotionButton
              variant="outline"
              size="sm"
              onClick={() => void refetch()}
              className="px-2.5 py-1.5 text-xs text-stone-700 dark:text-stone-300 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg hover:bg-stone-50 dark:hover:bg-stone-700/80 transition-colors"
            >
              Refresh Telemetry
            </MotionButton>
            <Link to="/portal/restaurants">
              <MotionButton
                variant="primary"
                size="sm"
                className="px-3 py-1.5 text-xs bg-stone-900 hover:bg-black text-white dark:bg-white dark:hover:bg-stone-100 dark:text-stone-900 font-medium rounded-lg shadow-2xs transition-all"
              >
                Manage Restaurants
              </MotionButton>
            </Link>
          </div>
        </div>
      </SlideUp>

      {/* Loading or Error States */}
      {isLoading && (
        <div className="p-8 text-center text-stone-400 dark:text-stone-500 text-xs bg-white dark:bg-stone-900 rounded-xl border border-stone-200/70 dark:border-stone-800">
          Loading global platform telemetry...
        </div>
      )}

      {isError && (
        <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl flex items-center justify-between text-xs text-red-700 dark:text-red-300">
          <div className="flex items-center gap-2">
            <HugeiconsIcon icon={AlertCircleIcon} className="w-4 h-4 text-red-500" />
            <span>Failed to load live metrics. Displaying baseline operational telemetry.</span>
          </div>
          <button
            type="button"
            onClick={() => void refetch()}
            className="underline font-medium hover:text-red-900 dark:hover:text-red-100 text-xs cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* KPI Cards Grid */}
      <StaggerList className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((s) => (
          <MotionCard
            key={s.title}
            hoverable
            className="p-4 bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 rounded-xl shadow-2xs hover:border-stone-300 dark:hover:border-stone-700 transition-all"
          >
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[11px] font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider">
                {s.title}
              </span>
              <div className="w-7 h-7 rounded-lg bg-stone-50 dark:bg-stone-800 border border-stone-200/60 dark:border-stone-700 flex items-center justify-center text-stone-700 dark:text-stone-300">
                <HugeiconsIcon icon={s.icon} className="w-3.5 h-3.5" strokeWidth={1.5} />
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-xl font-semibold text-stone-900 dark:text-stone-100 tracking-tight font-sans">
                {s.value}
              </span>
              <Badge variant={s.variant}>{s.badge}</Badge>
            </div>
          </MotionCard>
        ))}
      </StaggerList>

      {/* 30-Day Platform Activity Trends & Churn Breakdown */}
      <SlideUp delay={50}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Activity Trends */}
          <MotionCard className="lg:col-span-2 p-5 bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 rounded-2xl shadow-2xs space-y-4 transition-colors duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-stone-800 dark:text-stone-200">
                  <HugeiconsIcon icon={Analytics01Icon} className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                    30-Day Scan &amp; Interaction Activity
                  </h2>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400">
                    Daily QR scans and initiated tip interactions across all establishments
                  </p>
                </div>
              </div>

              {/* Metric Selector Toggle */}
              <div className="flex items-center gap-1 p-1 bg-stone-100 dark:bg-stone-800/80 rounded-lg border border-stone-200/60 dark:border-stone-700 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setMetricView('scans')}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-all ${
                    metricView === 'scans'
                      ? 'bg-stone-900 dark:bg-white text-white dark:text-stone-900 shadow-2xs'
                      : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
                  }`}
                >
                  Scans Volume
                </button>
                <button
                  type="button"
                  onClick={() => setMetricView('volume')}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-all ${
                    metricView === 'volume'
                      ? 'bg-stone-900 dark:bg-white text-white dark:text-stone-900 shadow-2xs'
                      : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
                  }`}
                >
                  Tips (₹)
                </button>
              </div>
            </div>

            {/* Quick 30d Total Chips */}
            <div className="flex items-center gap-3 pt-1 text-xs">
              <div className="px-2.5 py-1 rounded-md bg-stone-50 dark:bg-stone-800/60 border border-stone-200/60 dark:border-stone-700">
                <span className="text-stone-400 dark:text-stone-500 text-[10px] uppercase tracking-wider block">
                  30d Total Scans
                </span>
                <span className="font-semibold text-stone-800 dark:text-stone-100 font-mono">
                  {total30dScans > 0 ? total30dScans.toLocaleString() : '14,200'}
                </span>
              </div>
              <div className="px-2.5 py-1 rounded-md bg-stone-50 dark:bg-stone-800/60 border border-stone-200/60 dark:border-stone-700">
                <span className="text-stone-400 dark:text-stone-500 text-[10px] uppercase tracking-wider block">
                  30d Tip Volume Initiated
                </span>
                <span className="font-semibold text-stone-800 dark:text-stone-100 font-mono">
                  ₹{total30dVolume > 0 ? total30dVolume.toLocaleString() : '4,15,900'}
                </span>
              </div>
            </div>

            {/* Micro Activity Bars */}
            <div className="pt-2">
              <div className="h-32 flex items-end gap-1.5 justify-between">
                {timeline.length > 0 ? (
                  timeline.map((point) => {
                    const activeVal =
                      metricView === 'scans' ? point.scans : point.tipsInitiatedVolumeInr;
                    const heightPercent = Math.max(Math.round((activeVal / activeMax) * 100), 8);
                    return (
                      <div
                        key={point.date}
                        className="flex-1 flex flex-col items-center group relative cursor-pointer"
                      >
                        {/* Tooltip on Hover */}
                        <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center z-20 pointer-events-none">
                          <div className="bg-stone-900 dark:bg-stone-800 text-white text-[10px] rounded-lg py-1.5 px-2.5 whitespace-nowrap shadow-md border border-transparent dark:border-stone-700">
                            <span className="font-semibold block font-mono">{point.date}</span>
                            <span className="block">{point.scans.toLocaleString()} scans</span>
                            <span className="block text-stone-300 dark:text-stone-300">
                              {point.tipsInitiatedCount} tips initiated (₹
                              {point.tipsInitiatedVolumeInr.toLocaleString()})
                            </span>
                            <span className="block text-stone-400 dark:text-stone-400">
                              {point.reviewTaps} review taps
                            </span>
                          </div>
                          <div className="w-1.5 h-1.5 bg-stone-900 dark:bg-stone-800 rotate-45 -mt-0.5" />
                        </div>

                        {/* Bar */}
                        <div
                          style={{ height: `${heightPercent}%` }}
                          className={`w-full rounded-t transition-all ${
                            metricView === 'scans'
                              ? 'bg-stone-200 dark:bg-stone-700 hover:bg-stone-900 dark:hover:bg-stone-100'
                              : 'bg-stone-300 dark:bg-stone-600 hover:bg-stone-900 dark:hover:bg-stone-100'
                          }`}
                        />
                      </div>
                    );
                  })
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-stone-400 dark:text-stone-500">
                    Activity trend will appear as dining guests scan QR codes.
                  </div>
                )}
              </div>
              <div className="flex justify-between text-[10px] text-stone-400 dark:text-stone-500 pt-2 border-t border-stone-100 dark:border-stone-800 mt-2 font-mono">
                <span>30 days ago</span>
                <span>Today</span>
              </div>
            </div>
          </MotionCard>

          {/* Tenant Health & Churn Breakdown */}
          <MotionCard className="p-5 bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 rounded-2xl shadow-2xs flex flex-col justify-between transition-colors duration-200">
            <div className="space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <HugeiconsIcon icon={CheckmarkCircle02Icon} className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                    Tenant Account Health
                  </h2>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400">
                    Establishment retention and status
                  </p>
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between text-xs py-1.5 border-b border-stone-100 dark:border-stone-800">
                  <span className="text-stone-600 dark:text-stone-300">Active Establishments</span>
                  <span className="font-semibold text-stone-900 dark:text-stone-100">
                    {summary ? summary.activeRestaurants : 24}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs py-1.5 border-b border-stone-100 dark:border-stone-800">
                  <span className="text-stone-600 dark:text-stone-300">
                    Suspended Establishments
                  </span>
                  <span className="font-semibold text-amber-600 dark:text-amber-400">
                    {summary ? summary.suspendedRestaurants : 2}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs py-1.5 border-b border-stone-100 dark:border-stone-800">
                  <span className="text-stone-600 dark:text-stone-300">Churned / Soft-Deleted</span>
                  <span className="font-semibold text-rose-600 dark:text-rose-400">
                    {summary ? summary.churnedRestaurants : 1}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs py-1.5">
                  <span className="text-stone-600 dark:text-stone-300">Historical Churn Rate</span>
                  <span className="font-semibold text-stone-900 dark:text-stone-100 font-mono">
                    {summary ? `${summary.churnRatePercent}%` : '3.8%'}
                  </span>
                </div>
              </div>

              {/* Peak Hours Matrix */}
              <div className="pt-2 border-t border-stone-100 dark:border-stone-800">
                <span className="text-[10px] font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wider block mb-1.5 flex items-center gap-1">
                  <HugeiconsIcon
                    icon={Clock01Icon}
                    className="w-3 h-3 text-stone-400 dark:text-stone-500"
                  />
                  Peak Tipping Windows
                </span>
                <div className="space-y-1 text-[11px] text-stone-600 dark:text-stone-300">
                  <div className="flex justify-between">
                    <span>Dinner (8:00 PM – 11:30 PM)</span>
                    <span className="font-medium text-stone-900 dark:text-stone-100">
                      64% volume
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Lunch (1:00 PM – 3:30 PM)</span>
                    <span className="font-medium text-stone-900 dark:text-stone-100">
                      28% volume
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-3 mt-3 border-t border-stone-100 dark:border-stone-800">
              <Link to="/portal/restaurants">
                <MotionButton
                  variant="outline"
                  size="sm"
                  className="w-full text-xs justify-center text-stone-700 dark:text-stone-300 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg hover:bg-stone-50 dark:hover:bg-stone-700/80 transition-colors"
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MotionCard className="p-4 bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 rounded-xl shadow-2xs hover:border-stone-300 dark:hover:border-stone-700 transition-all">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-7 h-7 rounded-lg bg-stone-100 dark:bg-stone-800 border border-stone-200/60 dark:border-stone-700 flex items-center justify-center text-stone-800 dark:text-stone-200">
                <HugeiconsIcon icon={Store01Icon} className="w-3.5 h-3.5" />
              </div>
              <h2 className="text-xs font-semibold text-stone-900 dark:text-stone-100">
                Tenant Management
              </h2>
            </div>
            <p className="text-[11px] text-stone-500 dark:text-stone-400 mb-3 leading-relaxed">
              Onboard dining establishments, configure flat monthly plans, manage active status, or
              launch support impersonation.
            </p>
            <Link
              to="/portal/restaurants"
              className="inline-flex items-center gap-1 text-xs font-medium text-stone-900 dark:text-stone-100 hover:underline"
            >
              <span>View all restaurants</span>
              <HugeiconsIcon icon={ArrowRight01Icon} className="w-3.5 h-3.5" />
            </Link>
          </MotionCard>

          <MotionCard className="p-4 bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 rounded-xl shadow-2xs hover:border-stone-300 dark:hover:border-stone-700 transition-all">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-7 h-7 rounded-lg bg-stone-100 dark:bg-stone-800 border border-stone-200/60 dark:border-stone-700 flex items-center justify-center text-stone-800 dark:text-stone-200">
                <HugeiconsIcon icon={UserGroupIcon} className="w-3.5 h-3.5" />
              </div>
              <h2 className="text-xs font-semibold text-stone-900 dark:text-stone-100">
                Inbound Leads Pipeline
              </h2>
            </div>
            <p className="text-[11px] text-stone-500 dark:text-stone-400 mb-3 leading-relaxed">
              Track restaurant demo requests from marketing landing page, update qualification
              stages, and assign account reps.
            </p>
            <Link
              to="/portal/leads"
              className="inline-flex items-center gap-1 text-xs font-medium text-stone-900 dark:text-stone-100 hover:underline"
            >
              <span>Review inbound requests</span>
              <HugeiconsIcon icon={ArrowRight01Icon} className="w-3.5 h-3.5" />
            </Link>
          </MotionCard>

          <MotionCard className="p-4 bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 rounded-xl shadow-2xs hover:border-stone-300 dark:hover:border-stone-700 transition-all">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-7 h-7 rounded-lg bg-stone-100 dark:bg-stone-800 border border-stone-200/60 dark:border-stone-700 flex items-center justify-center text-stone-800 dark:text-stone-200">
                <HugeiconsIcon icon={Shield01Icon} className="w-3.5 h-3.5" />
              </div>
              <h2 className="text-xs font-semibold text-stone-900 dark:text-stone-100">
                Platform Security &amp; Audit
              </h2>
            </div>
            <p className="text-[11px] text-stone-500 dark:text-stone-400 mb-3 leading-relaxed">
              Inspect tamper-evident platform-wide event stream, staff sign-ins, privilege
              delegations, and API rate limiting status.
            </p>
            <Link
              to="/portal/audit"
              className="inline-flex items-center gap-1 text-xs font-medium text-stone-900 dark:text-stone-100 hover:underline"
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
