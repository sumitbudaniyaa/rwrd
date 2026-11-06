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
import { MotionCard, SlideUp, StaggerList, FadeIn, Badge, MotionButton } from '@tiptable/ui';
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
    <div className="space-y-8 max-w-7xl">
      {/* Header & Controls */}
      <SlideUp>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-stone-900 tracking-tight">
              Analytics & Telemetry
            </h1>
            <p className="mt-1 text-sm text-stone-500">
              Track diner QR scans, waitstaff interactions, Google review taps, and tips initiated.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <MotionButton
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              disabled={isExporting || isLoading}
              className="flex items-center gap-2"
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
        <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-3 rounded-2xl border border-stone-200">
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
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  filterType === opt.id
                    ? 'bg-stone-900 text-white shadow-sm'
                    : 'text-stone-600 hover:bg-stone-100'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {filterType === 'custom' && (
            <div className="flex items-center gap-2 text-xs">
              <label className="flex items-center gap-1 text-stone-600">
                <span>From:</span>
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="px-2 py-1 rounded-lg border border-stone-200 bg-stone-50 text-stone-800 text-xs focus:ring-1 focus:ring-indigo-600"
                />
              </label>
              <label className="flex items-center gap-1 text-stone-600">
                <span>To:</span>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="px-2 py-1 rounded-lg border border-stone-200 bg-stone-50 text-stone-800 text-xs focus:ring-1 focus:ring-indigo-600"
                />
              </label>
            </div>
          )}
        </div>
      </SlideUp>

      {exportError && (
        <FadeIn>
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
            <HugeiconsIcon icon={AlertCircleIcon} className="w-4 h-4 text-red-500 shrink-0" />
            <span>{exportError}</span>
          </div>
        </FadeIn>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="p-12 text-center text-stone-400 text-sm">Loading analytics metrics...</div>
      )}

      {/* Error State */}
      {isError && (
        <div className="p-8 text-center bg-white border border-red-200 rounded-2xl">
          <p className="text-sm font-medium text-red-700">Failed to load analytics data.</p>
          <MotionButton variant="outline" size="sm" onClick={() => refetch()} className="mt-4">
            Retry
          </MotionButton>
        </div>
      )}

      {/* Metrics Grid */}
      {analytics && (
        <>
          <StaggerList className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Total Scans */}
            <MotionCard hoverable className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-stone-500 uppercase tracking-wider">
                  Total Scans
                </span>
                <div className="w-8 h-8 rounded-lg bg-stone-50 border border-stone-200/60 flex items-center justify-center text-stone-600">
                  <HugeiconsIcon icon={QrCodeIcon} className="w-4 h-4" strokeWidth={1.5} />
                </div>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-semibold text-stone-900 tracking-tight">
                  {analytics.metrics.scans.toLocaleString('en-IN')}
                </span>
                <Badge variant="neutral">Placard Scans</Badge>
              </div>
            </MotionCard>

            {/* Staff Views */}
            <MotionCard hoverable className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-stone-500 uppercase tracking-wider">
                  Staff Page Views
                </span>
                <div className="w-8 h-8 rounded-lg bg-stone-50 border border-stone-200/60 flex items-center justify-center text-stone-600">
                  <HugeiconsIcon icon={UserGroupIcon} className="w-4 h-4" strokeWidth={1.5} />
                </div>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-semibold text-stone-900 tracking-tight">
                  {analytics.metrics.staffViews.toLocaleString('en-IN')}
                </span>
                <Badge variant="neutral">Diner Visits</Badge>
              </div>
            </MotionCard>

            {/* Tips Initiated (Invariant: Never "Tips received") */}
            <MotionCard hoverable className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-stone-500 uppercase tracking-wider">
                  Tips Initiated
                </span>
                <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                  <HugeiconsIcon icon={SentIcon} className="w-4 h-4" strokeWidth={1.5} />
                </div>
              </div>
              <div className="flex items-baseline justify-between">
                <div>
                  <span className="text-2xl font-semibold text-stone-900 tracking-tight">
                    {analytics.metrics.tipsInitiatedCount.toLocaleString('en-IN')}
                  </span>
                  <div className="text-xs text-stone-500 mt-0.5">
                    ₹{analytics.metrics.tipsInitiatedVolumeInr.toLocaleString('en-IN')} initiated
                  </div>
                </div>
                <Badge variant="accent">Initiated</Badge>
              </div>
            </MotionCard>

            {/* Google Review Taps */}
            <MotionCard hoverable className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-stone-500 uppercase tracking-wider">
                  Review Taps
                </span>
                <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
                  <HugeiconsIcon icon={StarIcon} className="w-4 h-4" strokeWidth={1.5} />
                </div>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-semibold text-stone-900 tracking-tight">
                  {analytics.metrics.reviewTaps.toLocaleString('en-IN')}
                </span>
                <Badge variant="warning">Google Direct</Badge>
              </div>
            </MotionCard>
          </StaggerList>

          {/* Daily Activity Timeline */}
          <SlideUp delay={100}>
            <div className="bg-white border border-stone-200 rounded-2xl p-6">
              <h2 className="text-sm font-semibold text-stone-900 mb-1">
                Daily Telemetry Breakdown
              </h2>
              <p className="text-xs text-stone-500 mb-5">
                Activity trends across days in the selected period.
              </p>

              {analytics.dailyTimeline.length === 0 ? (
                <p className="text-xs text-stone-400 py-4 text-center">
                  No telemetry recorded in this date range.
                </p>
              ) : (
                <div className="divide-y divide-stone-100 max-h-64 overflow-y-auto">
                  {analytics.dailyTimeline.map((day) => (
                    <div
                      key={day.date}
                      className="py-2.5 flex items-center justify-between text-xs text-stone-600 hover:bg-stone-50 px-2 rounded-lg"
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
                          <strong className="text-indigo-600">{day.tipsInitiatedCount}</strong> tips
                          initiated (₹{day.tipsInitiatedVolumeInr.toLocaleString('en-IN')})
                        </span>
                        <span>
                          <strong className="text-amber-600">{day.reviewTaps}</strong> reviews
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
            <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
              <div className="p-6 border-b border-stone-200">
                <h2 className="text-sm font-semibold text-stone-900">
                  Waitstaff Tips Initiated Performance
                </h2>
                <p className="text-xs text-stone-500 mt-1">
                  Individual waiter tipping activity initiated through customer table scans.
                </p>
              </div>

              {analytics.staffBreakdown.length === 0 ? (
                <div className="p-8 text-center text-xs text-stone-400">
                  No staff tipping activity recorded in this period.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-stone-50 text-stone-500 border-b border-stone-200">
                      <tr>
                        <th className="py-3 px-6 font-medium">Waitstaff Member</th>
                        <th className="py-3 px-6 font-medium">Role</th>
                        <th className="py-3 px-6 font-medium text-right">Tips Initiated</th>
                        <th className="py-3 px-6 font-medium text-right">Volume Initiated</th>
                        <th className="py-3 px-6 font-medium text-right">Avg. Tip Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {analytics.staffBreakdown.map((s) => (
                        <tr key={s.staffId} className="hover:bg-stone-50/60">
                          <td className="py-3.5 px-6 font-medium text-stone-900">
                            {s.displayName}
                          </td>
                          <td className="py-3.5 px-6 text-stone-500">{s.roleLabel}</td>
                          <td className="py-3.5 px-6 text-right font-medium text-stone-900">
                            {s.tipsInitiatedCount}
                          </td>
                          <td className="py-3.5 px-6 text-right font-semibold text-indigo-600">
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
            <div className="p-4 bg-stone-50 border border-stone-200 rounded-2xl text-xs text-stone-500 flex items-start gap-3">
              <HugeiconsIcon
                icon={AlertCircleIcon}
                className="w-4 h-4 text-stone-400 shrink-0 mt-0.5"
              />
              <div>
                <strong className="text-stone-700">Direct Non-Custodial UPI Invariant: </strong>
                All tip numbers represent payment intents initiated by diners directly to staff UPI
                VPAs using deep links. TipTable never holds, intercepts, or settles customer funds.
              </div>
            </div>
          </SlideUp>
        </>
      )}
    </div>
  );
};
