import React from 'react';
import { useNavigate } from 'react-router-dom';
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

interface StatItem {
  title: string;
  value: string;
  change: string;
  icon: IconSvgElement;
  badgeVariant: 'neutral' | 'success' | 'warning' | 'danger' | 'accent';
}

export const DashboardOverview: React.FC = () => {
  const navigate = useNavigate();

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
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Welcome Banner: Minimal Editorial Serif Heading */}
      <SlideUp>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-stone-200/60">
          <div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif tracking-tight text-stone-900 font-normal leading-[1.08] text-left">
              good morning, Sarah
            </h1>
            <p className="mt-1.5 text-xs sm:text-sm text-stone-500 font-sans tracking-tight">
              Here is your restaurant&apos;s direct tipping and Google review performance overview.
            </p>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <MotionButton
              variant="outline"
              size="sm"
              onClick={() => navigate('/admin/qr')}
              className="px-3.5 py-2"
            >
              Download QR Kit
            </MotionButton>
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
                  Recent Tips Initiated
                </h3>
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
                    <div className="w-9 h-9 rounded-full bg-stone-100 border border-stone-200/50 flex items-center justify-center font-medium text-stone-700 text-xs">
                      {row.staff.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-stone-900 text-sm tracking-tight">
                        {row.staff}
                      </p>
                      <p className="text-[11px] text-stone-400">
                        {row.role} • {row.table}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-stone-900 text-sm">{row.amount}</p>
                    <p className="text-[10px] text-stone-400">{row.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Onboarding & Tips Placard Card */}
          <div className="rounded-2xl border border-stone-200/70 bg-white/90 backdrop-blur-xs p-6 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-stone-100 border border-stone-200/70 text-stone-900 flex items-center justify-center mb-4 shadow-2xs">
                <HugeiconsIcon icon={QrCodeIcon} className="w-5 h-5" strokeWidth={1.5} />
              </div>
              <h3 className="text-base font-semibold text-stone-900 tracking-tight">
                Table QR Codes
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
