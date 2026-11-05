import React from 'react';
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react';
import {
  QrCodeIcon,
  UserGroupIcon,
  SentIcon,
  StarIcon,
  ArrowRight01Icon,
} from '@hugeicons/core-free-icons';
import { MotionCard, SlideUp, StaggerList, Badge, MotionButton } from '@tiptable/ui';

interface StatItem {
  title: string;
  value: string;
  change: string;
  icon: IconSvgElement;
  badgeVariant: 'neutral' | 'success' | 'warning' | 'danger' | 'accent';
}

export const DashboardOverview: React.FC = () => {
  const stats: StatItem[] = [
    {
      title: 'QR Scans',
      value: '1,429',
      change: '+12% this week',
      icon: QrCodeIcon,
      badgeVariant: 'neutral',
    },
    {
      title: 'Staff Views',
      value: '984',
      change: '+8% this week',
      icon: UserGroupIcon,
      badgeVariant: 'neutral',
    },
    {
      title: 'Tips Initiated', // Invariant: Label everything as "tips initiated", never "tips received"
      value: '432',
      change: '₹34,850 initiated volume',
      icon: SentIcon,
      badgeVariant: 'success',
    },
    {
      title: 'Google Review Taps',
      value: '187',
      change: '+24% this week',
      icon: StarIcon,
      badgeVariant: 'warning',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <SlideUp>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-stone-900 tracking-tight">
              Good morning, Sarah
            </h2>
            <p className="mt-1 text-sm text-stone-500">
              Here is your restaurant&apos;s direct tipping and Google review performance overview.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <MotionButton variant="outline" size="sm">
              Download QR Kit
            </MotionButton>
            <MotionButton variant="primary" size="sm">
              Manage Staff
            </MotionButton>
          </div>
        </div>
      </SlideUp>

      {/* Metric Cards Grid */}
      <StaggerList className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {stats.map((stat) => (
          <MotionCard key={stat.title} hoverable className="p-5">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-medium text-stone-500 uppercase tracking-wider">
                {stat.title}
              </span>
              <div className="w-8 h-8 rounded-lg bg-stone-50 border border-stone-200/60 flex items-center justify-center text-stone-600">
                <HugeiconsIcon icon={stat.icon} className="w-4 h-4" strokeWidth={1.5} />
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-semibold text-stone-900 tracking-tight">
                {stat.value}
              </span>
              <Badge variant={stat.badgeVariant}>{stat.change}</Badge>
            </div>
          </MotionCard>
        ))}
      </StaggerList>

      {/* Quick Actions & Recent Tip Intents Section */}
      <SlideUp delay={100}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Tip Activity (Tips Initiated) */}
          <MotionCard className="lg:col-span-2 p-6">
            <div className="flex items-center justify-between pb-4 border-b border-stone-100 mb-4">
              <div>
                <h3 className="text-sm font-semibold text-stone-900">Recent Tips Initiated</h3>
                <p className="text-xs text-stone-400 mt-0.5">
                  Direct peer-to-peer UPI intents generated across tables
                </p>
              </div>
              <Badge variant="neutral">Real-time telemetry</Badge>
            </div>

            <div className="divide-y divide-stone-100">
              {[
                {
                  staff: 'Rahul Sharma',
                  role: 'Head Server',
                  amount: '₹100',
                  table: 'Table 4',
                  time: '2 mins ago',
                },
                {
                  staff: 'Priya Patel',
                  role: 'Server',
                  amount: '₹50',
                  table: 'Table 12',
                  time: '14 mins ago',
                },
                {
                  staff: 'Amit Kumar',
                  role: 'Bartender',
                  amount: '₹200',
                  table: 'Bar 2',
                  time: '28 mins ago',
                },
              ].map((row, idx) => (
                <div key={idx} className="py-3 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center font-medium text-stone-700">
                      {row.staff.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-stone-900">{row.staff}</p>
                      <p className="text-[11px] text-stone-400">
                        {row.role} • {row.table}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-stone-900">{row.amount}</p>
                    <p className="text-[10px] text-stone-400">{row.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </MotionCard>

          {/* Quick Onboarding & Tips */}
          <MotionCard className="p-6 flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
                <HugeiconsIcon icon={QrCodeIcon} className="w-5 h-5" strokeWidth={1.5} />
              </div>
              <h3 className="text-sm font-semibold text-stone-900">Table QR Codes</h3>
              <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                Generate high-resolution SVG or print-ready PDF placards with custom table numbers.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-stone-100">
              <MotionButton variant="outline" size="sm" className="w-full justify-between">
                <span>Export Print Placards</span>
                <HugeiconsIcon icon={ArrowRight01Icon} className="w-4 h-4" strokeWidth={1.5} />
              </MotionButton>
            </div>
          </MotionCard>
        </div>
      </SlideUp>
    </div>
  );
};
