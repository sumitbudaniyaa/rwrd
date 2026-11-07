import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  QrCodeIcon,
  UserGroupIcon,
  SentIcon,
  StarIcon,
  Download01Icon,
  Calendar01Icon,
  AlertCircleIcon,
} from '@hugeicons/core-free-icons';
import { SlideUp, StaggerList, FadeIn, Badge } from '@tiptable/ui';
import { MotionButton } from '../components/motion/button.js';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../services/api.js';

type DateFilterType = 'today' | '7d' | '30d' | 'custom';

export const AnalyticsScreen: React.FC = () => {
  const { restaurant } = useAuth();
  const [filterType, setFilterType] = useState<DateFilterType>('30d');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportError, setExportError] = useState<string | null>(null);

  // Compute startDate & endDate strings based on active filter
  const getDateRange = () => {
    const now = new Date();
    if (filterType === 'today') {
      const todayStr = now.toISOString().slice(0, 10);
      return { startDate: todayStr, endDate: todayStr };
    }
    if (filterType === '7d') {
      const past = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return {
        startDate: past.toISOString().slice(0, 10),
        endDate: now.toISOString().slice(0, 10),
      };
    }
    if (filterType === '30d') {
      const past = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return {
        startDate: past.toISOString().slice(0, 10),
        endDate: now.toISOString().slice(0, 10),
      };
    }
    // Custom
    return {
      startDate: customStart || undefined,
      endDate: customEnd || undefined,
    };
  };

  const activeRange = getDateRange();

  const {
    data: analytics,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['admin-analytics', restaurant?.id, filterType, customStart, customEnd],
    queryFn: () => {
      if (!restaurant?.id) throw new Error('Restaurant not selected');
      const params: { startDate?: string; endDate?: string } = {};
      if (activeRange.startDate) params.startDate = activeRange.startDate;
      if (activeRange.endDate) params.endDate = activeRange.endDate;
      return api.getAnalytics(restaurant.id, params);
    },
    enabled: Boolean(restaurant?.id),
  });

  const handleExportCsv = async () => {
    if (!restaurant?.id) return;
    try {
      setIsExporting(true);
      setExportError(null);
      const params: { startDate?: string; endDate?: string } = {};
      if (activeRange.startDate) params.startDate = activeRange.startDate;
      if (activeRange.endDate) params.endDate = activeRange.endDate;
      await api.downloadAnalyticsCsv(restaurant.id, params);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Failed to export CSV report');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header & Controls */}
      <SlideUp>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-stone-200/60">
          <div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif tracking-tight text-stone-900 font-normal leading-[1.08] text-left">
              analytics & telemetry
            </h1>
            <p className="mt-1.5 text-xs sm:text-sm text-stone-500 font-sans tracking-tight">
              Track diner QR scans, waitstaff interactions, Google review taps, and tips initiated.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <MotionButton
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              disabled={isExporting || isLoading}
              className="px-3.5 py-2"
              aria-label="Export Analytics CSV"
            >
              <HugeiconsIcon icon={Download01Icon} className="w-4 h-4 text-stone-600" />
              <span>{isExporting ? 'Exporting...' : 'Export CSV'}</span>
            </MotionButton>
          </div>
        </div>
      </SlideUp>

      {/* Date Range Selector Pills */}
      <SlideUp delay={50}>
        <div className="flex flex-wrap items-center justify-between gap-4 bg-white/90 backdrop-blur-xs p-3.5 rounded-2xl border border-stone-200/70 shadow-2xs">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-stone-400 uppercase tracking-wider mr-2 flex items-center gap-1">
              <HugeiconsIcon icon={Calendar01Icon} className="w-3.5 h-3.5" />
              Period:
            </span>
            {(
              [
                { id: 'today', label: 'Today' },
                { id: '7d', label: 'Last 7 Days' },
                { id: '30d', label: 'Last 30 Days' },
                { id: 'custom', label: 'Custom' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setFilterType(opt.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                  filterType === opt.id
                    ? 'bg-stone-900 text-stone-50 shadow-2xs'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100/70'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {filterType === 'custom' && (
            <div className="flex items-center gap-2 text-xs">
              <label className="flex items-center gap-1.5 text-stone-600">
                <span>From:</span>
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="px-2.5 py-1 rounded-xl border border-stone-200 bg-stone-50/80 text-stone-800 text-xs focus:outline-none focus:border-stone-400 focus:bg-white transition-all"
                />
              </label>
              <label className="flex items-center gap-1.5 text-stone-600">
                <span>To:</span>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="px-2.5 py-1 rounded-xl border border-stone-200 bg-stone-50/80 text-stone-800 text-xs focus:outline-none focus:border-stone-400 focus:bg-white transition-all"
                />
              </label>
            </div>
          )}
        </div>
      </SlideUp>

      {exportError && (
        <FadeIn>
          <div className="p-3.5 bg-rose-50 border border-rose-200/80 rounded-2xl text-xs text-rose-700 flex items-center gap-2 shadow-2xs">
            <HugeiconsIcon icon={AlertCircleIcon} className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{exportError}</span>
          </div>
        </FadeIn>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="p-16 text-center text-stone-400 text-sm flex flex-col items-center justify-center">
          <div className="w-6 h-6 border-2 border-stone-900 border-t-transparent rounded-full animate-spin mb-2" />
          <span>Loading analytics metrics...</span>
        </div>
      )}

      {/* Error State */}
      {isError && (
        <div className="p-8 text-center bg-white/90 backdrop-blur-xs border border-rose-200/80 rounded-2xl shadow-2xs">
          <p className="text-sm font-medium text-rose-700">Failed to load analytics data.</p>
          <MotionButton variant="outline" size="sm" onClick={() => refetch()} className="mt-4">
            Retry
          </MotionButton>
        </div>
      )}

      {/* Metrics Grid */}
      {analytics && (
        <>
          <StaggerList className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Scans */}
            <div className="rounded-2xl border border-stone-200/70 bg-white/90 backdrop-blur-xs p-5 shadow-2xs hover:shadow-xs hover:border-stone-300/80 transition-all duration-200 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">
                  Total Scans
                </span>
                <div className="w-8 h-8 rounded-xl bg-stone-50 border border-stone-200/60 flex items-center justify-center text-stone-600 shadow-2xs">
                  <HugeiconsIcon icon={QrCodeIcon} className="w-4 h-4" strokeWidth={1.5} />
                </div>
              </div>
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-3xl font-semibold text-stone-900 tracking-tight font-sans">
                  {analytics.metrics.scans.toLocaleString('en-IN')}
                </span>
                <Badge variant="neutral">Placard Scans</Badge>
              </div>
            </div>

            {/* Staff Views */}
            <div className="rounded-2xl border border-stone-200/70 bg-white/90 backdrop-blur-xs p-5 shadow-2xs hover:shadow-xs hover:border-stone-300/80 transition-all duration-200 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">
                  Staff Page Views
                </span>
                <div className="w-8 h-8 rounded-xl bg-stone-50 border border-stone-200/60 flex items-center justify-center text-stone-600 shadow-2xs">
                  <HugeiconsIcon icon={UserGroupIcon} className="w-4 h-4" strokeWidth={1.5} />
                </div>
              </div>
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-3xl font-semibold text-stone-900 tracking-tight font-sans">
                  {analytics.metrics.staffViews.toLocaleString('en-IN')}
                </span>
                <Badge variant="neutral">Diner Visits</Badge>
              </div>
            </div>

            {/* Tips Initiated (Invariant: Never "Tips received") */}
            <div className="rounded-2xl border border-stone-200/70 bg-white/90 backdrop-blur-xs p-5 shadow-2xs hover:shadow-xs hover:border-stone-300/80 transition-all duration-200 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">
                  Tips Initiated
                </span>
                <div className="w-8 h-8 rounded-xl bg-stone-50 border border-stone-200/60 flex items-center justify-center text-stone-600 shadow-2xs">
                  <HugeiconsIcon icon={SentIcon} className="w-4 h-4" strokeWidth={1.5} />
                </div>
              </div>
              <div className="flex items-baseline justify-between gap-2">
                <div>
                  <span className="text-3xl font-semibold text-stone-900 tracking-tight font-sans">
                    {analytics.metrics.tipsInitiatedCount.toLocaleString('en-IN')}
                  </span>
                  <div className="text-xs text-stone-500 mt-1">
                    ₹{analytics.metrics.tipsInitiatedVolumeInr.toLocaleString('en-IN')} initiated
                  </div>
                </div>
                <Badge variant="success">Initiated</Badge>
              </div>
            </div>

            {/* Google Review Taps */}
            <div className="rounded-2xl border border-stone-200/70 bg-white/90 backdrop-blur-xs p-5 shadow-2xs hover:shadow-xs hover:border-stone-300/80 transition-all duration-200 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">
                  Review Taps
                </span>
                <div className="w-8 h-8 rounded-xl bg-stone-50 border border-stone-200/60 flex items-center justify-center text-stone-600 shadow-2xs">
                  <HugeiconsIcon icon={StarIcon} className="w-4 h-4" strokeWidth={1.5} />
                </div>
              </div>
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-3xl font-semibold text-stone-900 tracking-tight font-sans">
                  {analytics.metrics.reviewTaps.toLocaleString('en-IN')}
                </span>
                <Badge variant="warning">Google Direct</Badge>
              </div>
            </div>
          </StaggerList>

          {/* Daily Activity Timeline */}
          <SlideUp delay={100}>
            <div className="rounded-2xl border border-stone-200/70 bg-white/90 backdrop-blur-xs shadow-2xs p-6">
              <h2 className="text-base font-semibold text-stone-900 tracking-tight mb-1">
                daily telemetry breakdown
              </h2>
              <p className="text-xs text-stone-500 mb-5">
                Activity trends across days in the selected period.
              </p>

              {analytics.dailyTimeline.length === 0 ? (
                <p className="text-xs text-stone-400 py-6 text-center">
                  No telemetry recorded in this date range.
                </p>
              ) : (
                <div className="divide-y divide-stone-100 max-h-64 overflow-y-auto">
                  {analytics.dailyTimeline.map((day) => (
                    <div
                      key={day.date}
                      className="py-3 flex items-center justify-between text-xs text-stone-600 hover:bg-stone-50/70 px-2.5 rounded-xl transition-colors"
                    >
                      <span className="font-mono font-medium text-stone-900">{day.date}</span>
                      <div className="flex items-center gap-6">
                        <span>
                          <strong className="text-stone-900">{day.scans}</strong> scans
                        </span>
                        <span>
                          <strong className="text-stone-900">{day.staffViews}</strong> staff views
                        </span>
                        <span>
                          <strong className="text-stone-950 font-semibold">
                            {day.tipsInitiatedCount}
                          </strong>{' '}
                          tips initiated (₹{day.tipsInitiatedVolumeInr.toLocaleString('en-IN')})
                        </span>
                        <span>
                          <strong className="text-amber-700">{day.reviewTaps}</strong> reviews
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </SlideUp>

          {/* Waitstaff Performance Breakdown Table */}
          <SlideUp delay={150}>
            <div className="rounded-2xl border border-stone-200/70 bg-white/90 backdrop-blur-xs shadow-2xs overflow-hidden">
              <div className="p-6 border-b border-stone-100">
                <h2 className="text-base font-semibold text-stone-900 tracking-tight">
                  waitstaff tips initiated performance
                </h2>
                <p className="text-xs text-stone-500 mt-1">
                  Individual waiter tipping activity initiated through customer table scans.
                </p>
              </div>

              {analytics.staffBreakdown.length === 0 ? (
                <div className="p-12 text-center text-xs text-stone-400">
                  No staff tipping activity recorded in this period.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-stone-50/60 text-stone-500 border-b border-stone-100 font-semibold uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="py-3.5 px-6">Waitstaff Member</th>
                        <th className="py-3.5 px-6">Role</th>
                        <th className="py-3.5 px-6 text-right">Tips Initiated</th>
                        <th className="py-3.5 px-6 text-right">Volume Initiated</th>
                        <th className="py-3.5 px-6 text-right">Avg. Tip Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {analytics.staffBreakdown.map((s) => (
                        <tr key={s.staffId} className="hover:bg-stone-50/60 transition-colors">
                          <td className="py-3.5 px-6 font-medium text-stone-900">
                            {s.displayName}
                          </td>
                          <td className="py-3.5 px-6 text-stone-500">{s.roleLabel}</td>
                          <td className="py-3.5 px-6 text-right font-medium text-stone-900">
                            {s.tipsInitiatedCount}
                          </td>
                          <td className="py-3.5 px-6 text-right font-semibold text-stone-950">
                            ₹{s.tipsInitiatedVolumeInr.toLocaleString('en-IN')}
                          </td>
                          <td className="py-3.5 px-6 text-right text-stone-600">
                            ₹{s.averageTipInr.toLocaleString('en-IN')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </SlideUp>

          {/* Legal / Non-Custodial Compliance Notice */}
          <SlideUp delay={200}>
            <div className="p-4 bg-stone-50/70 border border-stone-200/70 rounded-2xl text-xs text-stone-500 flex items-start gap-3 shadow-2xs">
              <HugeiconsIcon
                icon={AlertCircleIcon}
                className="w-4 h-4 text-stone-400 shrink-0 mt-0.5"
              />
              <div className="leading-relaxed">
                <strong className="text-stone-800">Direct Non-Custodial UPI Invariant: </strong>
                All tip numbers represent payment intents initiated by diners directly to staff UPI
                VPAs using deep links. rwrd never holds, intercepts, or settles customer funds.
              </div>
            </div>
          </SlideUp>
        </>
      )}
    </div>
  );
};
