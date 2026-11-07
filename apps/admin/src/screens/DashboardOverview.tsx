import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react';
import {
  QrCodeIcon,
  UserGroupIcon,
  SentIcon,
  StarIcon,
  ArrowRight01Icon,
} from '@hugeicons/core-free-icons';
import { SlideUp, StaggerList, Badge } from '@tiptable/ui';
import { MotionButton } from '../components/motion/button.js';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../services/api.js';

interface StatItem {
  title: string;
  value: string;
  change: string;
  icon: IconSvgElement;
  badgeVariant: 'neutral' | 'success' | 'warning' | 'danger' | 'accent';
}

export const DashboardOverview: React.FC = () => {
  const navigate = useNavigate();
  const { user, restaurant } = useAuth();

  const getSalutation = () => {
    const hour = new Date().getHours();
    if (hour >= 4 && hour < 12) return 'good morning';
    if (hour >= 12 && hour < 17) return 'good afternoon';
    return 'good evening';
  };

  const firstName = user?.fullName?.trim() ? user.fullName.trim().split(' ')[0] : '';
  const greeting = firstName ? `${getSalutation()}, ${firstName}` : getSalutation();

  const { data: analytics, isLoading } = useQuery({
    queryKey: ['admin-overview-analytics', restaurant?.id],
    queryFn: () => {
      if (!restaurant?.id) return Promise.reject(new Error('Restaurant not selected'));
      return api.getAnalytics(restaurant.id, {});
    },
    enabled: Boolean(restaurant?.id),
    staleTime: 30000,
  });

  const stats: StatItem[] = [
    {
      title: 'QR Scans',
      value: isLoading ? '...' : (analytics?.metrics?.scans ?? 0).toLocaleString('en-IN'),
      change: (analytics?.metrics?.scans ?? 0) > 0 ? 'Live telemetry' : 'No scans yet',
      icon: QrCodeIcon,
      badgeVariant: 'neutral',
    },
    {
      title: 'Staff Views',
      value: isLoading ? '...' : (analytics?.metrics?.staffViews ?? 0).toLocaleString('en-IN'),
      change: (analytics?.metrics?.staffViews ?? 0) > 0 ? 'Live telemetry' : 'No views yet',
      icon: UserGroupIcon,
      badgeVariant: 'neutral',
    },
    {
      title: 'Tips Initiated', // Invariant: Label everything as "tips initiated", never "tips received"
      value: isLoading
        ? '...'
        : (analytics?.metrics?.tipsInitiatedCount ?? 0).toLocaleString('en-IN'),
      change: `₹${(analytics?.metrics?.tipsInitiatedVolumeInr ?? 0).toLocaleString('en-IN')} initiated volume`,
      icon: SentIcon,
      badgeVariant: 'success',
    },
    {
      title: 'Google Review Taps',
      value: isLoading ? '...' : (analytics?.metrics?.reviewTaps ?? 0).toLocaleString('en-IN'),
      change: (analytics?.metrics?.reviewTaps ?? 0) > 0 ? 'Live telemetry' : 'No taps yet',
      icon: StarIcon,
      badgeVariant: 'warning',
    },
  ];

  const activeStaff = analytics?.staffBreakdown?.filter((s) => s.tipsInitiatedCount > 0) || [];

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Welcome Banner: Minimal Editorial Serif Heading */}
      <SlideUp>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-stone-200/60">
          <div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif tracking-tight text-stone-900 font-normal leading-[1.08] text-left">
              {greeting}
            </h1>
            <p className="mt-1.5 text-xs sm:text-sm text-stone-500 font-sans tracking-tight">
              Here is your restaurant&apos;s direct tipping and Google review performance overview.
            </p>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <MotionButton
              variant="primary"
              size="sm"
              onClick={() => navigate('/admin/staff')}
              className="px-4 py-2"
            >
              Manage Staff
            </MotionButton>
          </div>
        </div>
      </SlideUp>

      {/* Metric Cards Grid */}
      <StaggerList className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.title}
            className="rounded-2xl border border-stone-200/70 bg-white/90 backdrop-blur-xs p-5 shadow-2xs hover:shadow-xs hover:border-stone-300/80 transition-all duration-200 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">
                {stat.title}
              </span>
              <div className="w-8 h-8 rounded-xl bg-stone-50 border border-stone-200/60 flex items-center justify-center text-stone-600 shadow-2xs">
                <HugeiconsIcon icon={stat.icon} className="w-4 h-4" strokeWidth={1.5} />
              </div>
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-3xl font-semibold text-stone-900 tracking-tight font-sans">
                {stat.value}
              </span>
              <Badge variant={stat.badgeVariant}>{stat.change}</Badge>
            </div>
          </div>
        ))}
      </StaggerList>

      {/* Quick Actions & Recent Tip Intents Section */}
      <SlideUp delay={100}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Recent Tip Activity (Tips Initiated) */}
          <div className="lg:col-span-2 rounded-2xl border border-stone-200/70 bg-white/90 backdrop-blur-xs p-6 shadow-2xs">
            <div className="flex items-center justify-between pb-4 border-b border-stone-100 mb-3">
              <div>
                <h3 className="text-base font-semibold text-stone-900 tracking-tight">
                  recent tips initiated
                </h3>
                <p className="text-xs text-stone-400 mt-0.5">
                  Direct peer-to-peer UPI intents generated across tables
                </p>
              </div>
              <Badge variant="neutral">Real-time telemetry</Badge>
            </div>

            {isLoading ? (
              <div className="py-12 text-center text-xs text-stone-400">Loading telemetry...</div>
            ) : activeStaff.length > 0 ? (
              <div className="divide-y divide-stone-100">
                {activeStaff.slice(0, 5).map((row) => (
                  <div key={row.staffId} className="py-3 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-stone-100 border border-stone-200/50 flex items-center justify-center font-medium text-stone-700 text-xs">
                        {row.displayName.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-stone-900 text-sm tracking-tight">
                          {row.displayName}
                        </p>
                        <p className="text-[11px] text-stone-400">
                          {row.roleLabel} • {row.tipsInitiatedCount} tip
                          {row.tipsInitiatedCount === 1 ? '' : 's'} initiated
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-stone-900 text-sm">
                        ₹{row.tipsInitiatedVolumeInr.toLocaleString('en-IN')}
                      </p>
                      <p className="text-[10px] text-stone-400">
                        Avg ₹{row.averageTipInr.toLocaleString('en-IN')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-10 px-4 flex flex-col items-center justify-center text-center">
                <div className="w-10 h-10 rounded-2xl bg-stone-100 border border-stone-200/70 flex items-center justify-center text-stone-400 mb-3 shadow-2xs">
                  <HugeiconsIcon icon={SentIcon} className="w-5 h-5" strokeWidth={1.5} />
                </div>
                <p className="font-medium text-stone-900 text-sm tracking-tight">
                  No tips initiated yet
                </p>
                <p className="text-xs text-stone-500 mt-1 max-w-sm leading-relaxed">
                  Direct peer-to-peer UPI intents generated across tables will appear here in real
                  time.
                </p>
                <div className="mt-4 flex items-center gap-2">
                  <MotionButton
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('/admin/qr')}
                    className="text-xs px-3 py-1.5"
                  >
                    Export QR Kit
                  </MotionButton>
                  <MotionButton
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate('/admin/staff')}
                    className="text-xs px-3 py-1.5"
                  >
                    Manage Staff
                  </MotionButton>
                </div>
              </div>
            )}
          </div>

          {/* Quick Onboarding & Tips Placard Card */}
          <div className="rounded-2xl border border-stone-200/70 bg-white/90 backdrop-blur-xs p-6 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-stone-100 border border-stone-200/70 text-stone-900 flex items-center justify-center mb-4 shadow-2xs">
                <HugeiconsIcon icon={QrCodeIcon} className="w-5 h-5" strokeWidth={1.5} />
              </div>
              <h3 className="text-base font-semibold text-stone-900 tracking-tight">
                table QR codes
              </h3>
              <p className="text-xs text-stone-500 mt-1.5 leading-relaxed">
                Generate high-resolution SVG or print-ready PDF placards with custom table numbers.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-stone-100">
              <MotionButton
                variant="outline"
                size="sm"
                onClick={() => navigate('/admin/qr')}
                className="w-full justify-between"
              >
                <span>Export Print Placards</span>
                <HugeiconsIcon icon={ArrowRight01Icon} className="w-4 h-4" strokeWidth={1.5} />
              </MotionButton>
            </div>
          </div>
        </div>
      </SlideUp>
    </div>
  );
};
