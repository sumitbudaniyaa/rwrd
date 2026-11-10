import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Shield01Icon,
  RefreshIcon,
  Search01Icon,
  FilterIcon,
  Cancel01Icon,
  EyeIcon,
  HeadsetIcon,
} from '@hugeicons/core-free-icons';
import { SlideUp, FadeIn, MotionButton } from '@tiptable/ui';
import { createPortal } from 'react-dom';
import { Badge } from '../components/Badge.js';
import { api, type PortalAuditLogItem } from '../services/api.js';

const PAGE_SIZE = 25;

export const AuditLogScreen: React.FC = () => {
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [page, setPage] = useState(0);
  const [inspectingLog, setInspectingLog] = useState<PortalAuditLogItem | null>(null);

  const {
    data: auditData,
    isLoading,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['portal-audit', search, actionFilter, page],
    queryFn: () => {
      const params: { limit: number; offset: number; search?: string; action?: string } = {
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      };
      if (search.trim()) params.search = search.trim();
      if (actionFilter !== 'ALL') params.action = actionFilter;
      return api.getPortalAuditLogs(params);
    },
  });

  const logs = auditData?.logs || [];

  const getActionBadgeVariant = (
    action: string,
  ): 'neutral' | 'success' | 'warning' | 'danger' | 'accent' => {
    if (
      action.includes('CREATED') ||
      action.includes('PROVISIONED') ||
      action.includes('GENERATED')
    ) {
      return 'success';
    }
    if (action.includes('UPDATED') || action.includes('MODIFIED')) {
      return 'warning';
    }
    if (action.includes('DELETED') || action.includes('SUSPENDED') || action.includes('VOID')) {
      return 'danger';
    }
    if (action.includes('IMPERSONATION') || action.includes('DIAGNOSTIC')) {
      return 'accent';
    }
    return 'neutral';
  };

  const getActorRoleBadgeVariant = (role: string | null): 'neutral' | 'accent' | 'warning' => {
    if (role === 'super_admin') return 'accent';
    if (role === 'finance') return 'warning';
    return 'neutral';
  };

  return (
    <div className="space-y-6 max-w-7xl font-sans">
      {/* Header */}
      <SlideUp delay={0.05}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-stone-900 p-5 rounded-2xl border border-stone-200/80 dark:border-stone-800 shadow-2xs transition-colors duration-200">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <HugeiconsIcon
                  icon={Shield01Icon}
                  className="w-5 h-5 text-stone-800 dark:text-stone-200"
                  strokeWidth={1.5}
                />
                Company Portal Global Audit Log
              </h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/70 dark:border-emerald-800">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Immutable Platform Records
              </span>
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
              Tamper-evident record of actions performed strictly by Company Portal staff and
              platform operations (excluding restaurant-level tenant audits).
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => refetch()}
              disabled={isFetching}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 border border-stone-200 dark:border-stone-700 rounded-lg bg-white dark:bg-stone-900 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors h-8.5 cursor-pointer disabled:opacity-50"
            >
              <HugeiconsIcon
                icon={RefreshIcon}
                className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`}
                strokeWidth={1.5}
              />
              <span>Refresh Log</span>
            </button>
          </div>
        </div>
      </SlideUp>

      {/* Toolbar / Filters */}
      <SlideUp delay={0.1}>
        <div className="p-3 bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 rounded-xl shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3 transition-colors duration-200">
          <div className="flex items-center gap-2.5 w-full sm:w-auto flex-1 max-w-lg">
            <div className="relative w-full">
              <HugeiconsIcon
                icon={Search01Icon}
                className="w-3.5 h-3.5 text-stone-400 dark:text-stone-500 absolute left-2.5 top-1/2 -translate-y-1/2"
                strokeWidth={1.5}
              />
              <input
                type="text"
                placeholder="Search action, staff member, email, or establishment..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(0);
                }}
                className="w-full pl-8 pr-3 py-1 text-xs rounded-xl border border-stone-200/90 dark:border-stone-700 hover:border-stone-300 dark:hover:border-stone-600 bg-stone-50/70 dark:bg-stone-800/60 focus:bg-white dark:focus:bg-stone-800 focus:border-stone-400 dark:focus:border-stone-500 focus:shadow-[0_0_0_3px_rgba(0,0,0,0.04)] outline-none transition-all duration-200 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 h-8"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <div className="flex items-center gap-1.5 text-xs text-stone-500 dark:text-stone-400">
              <HugeiconsIcon icon={FilterIcon} className="w-3.5 h-3.5" strokeWidth={1.5} />
              <span>Action:</span>
            </div>
            <select
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setPage(0);
              }}
              className="text-xs px-2.5 py-1 rounded-lg border border-stone-200/90 dark:border-stone-700 bg-stone-50/70 dark:bg-stone-800 text-stone-900 dark:text-stone-100 outline-none h-8 cursor-pointer"
            >
              <option value="ALL">All Actions</option>
              <option value="PLAN_PRICE_UPDATED">PLAN_PRICE_UPDATED</option>
              <option value="RESTAURANT_CREATED">RESTAURANT_CREATED</option>
              <option value="RESTAURANT_SUSPENDED">RESTAURANT_SUSPENDED</option>
              <option value="RESTAURANT_REACTIVATED">RESTAURANT_REACTIVATED</option>
              <option value="RESTAURANT_DELETED">RESTAURANT_DELETED</option>
              <option value="INVOICE_GENERATED">INVOICE_GENERATED</option>
              <option value="INVOICE_STATUS_UPDATED">INVOICE_STATUS_UPDATED</option>
              <option value="IMPERSONATION_STARTED">IMPERSONATION_STARTED</option>
              <option value="FEATURE_FLAG_CREATED">FEATURE_FLAG_CREATED</option>
              <option value="FEATURE_FLAG_UPDATED">FEATURE_FLAG_UPDATED</option>
              <option value="FEATURE_FLAG_DELETED">FEATURE_FLAG_DELETED</option>
              <option value="DIAGNOSTIC_SUITE_EXECUTED">DIAGNOSTIC_SUITE_EXECUTED</option>
            </select>
          </div>
        </div>
      </SlideUp>

      {/* Audit Log Table */}
      <SlideUp delay={0.15}>
        <div className="bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 rounded-xl shadow-2xs overflow-hidden transition-colors duration-200">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50/80 dark:bg-stone-800/80 text-stone-500 dark:text-stone-400 border-b border-stone-200 dark:border-stone-800 text-[11px] uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-2.5 px-4">Timestamp</th>
                  <th className="py-2.5 px-4">Portal Actor</th>
                  <th className="py-2.5 px-4">Action</th>
                  <th className="py-2.5 px-4">Entity &amp; Target</th>
                  <th className="py-2.5 px-4">Network IP</th>
                  <th className="py-2.5 px-4 text-right">State Diff</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                {isLoading ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-12 text-center text-stone-400 dark:text-stone-500 text-xs"
                    >
                      Loading Company Portal audit trail...
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-12 text-center text-stone-400 dark:text-stone-500 text-xs"
                    >
                      No company portal audit records found matching your filter criteria.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr
                      key={log.id}
                      className="hover:bg-stone-50/50 dark:hover:bg-stone-800/40 transition-colors"
                    >
                      <td className="py-3 px-4 font-mono text-[11px] text-stone-500 dark:text-stone-400 whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 flex items-center justify-center text-stone-600 dark:text-stone-300 shrink-0">
                            <HugeiconsIcon
                              icon={HeadsetIcon}
                              className="w-3 h-3"
                              strokeWidth={1.5}
                            />
                          </div>
                          <div>
                            <p className="font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                              <span>{log.actorName || 'Platform Staff'}</span>
                              {log.actorRole && (
                                <Badge variant={getActorRoleBadgeVariant(log.actorRole)}>
                                  {log.actorRole}
                                </Badge>
                              )}
                            </p>
                            <p className="text-[10px] text-stone-400 dark:text-stone-500 font-mono">
                              {log.actorEmail || 'staff@tiptable.in'}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <Badge variant={getActionBadgeVariant(log.action)}>{log.action}</Badge>
                      </td>

                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium text-stone-900 dark:text-stone-100 capitalize">
                            {log.entityType.replace(/_/g, ' ')}
                          </p>
                          {log.restaurantName ? (
                            <p className="text-[10px] text-stone-500 dark:text-stone-400 font-mono">
                              Target: {log.restaurantName}
                            </p>
                          ) : (
                            <p className="text-[10px] text-stone-400 dark:text-stone-500 italic">
                              Global Platform Target
                            </p>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4 font-mono text-[11px] text-stone-500 dark:text-stone-400">
                        {log.ipAddress || '&mdash;'}
                      </td>

                      <td className="py-3 px-4 text-right">
                        {log.beforeState || log.afterState ? (
                          <button
                            type="button"
                            onClick={() => setInspectingLog(log)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-lg text-stone-700 dark:text-stone-300 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 transition-colors cursor-pointer"
                          >
                            <HugeiconsIcon icon={EyeIcon} className="w-3 h-3" strokeWidth={1.5} />
                            <span>Inspect Diff</span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-stone-400 dark:text-stone-500 italic">
                            No state change
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="p-3 border-t border-stone-200/80 dark:border-stone-800 flex items-center justify-between text-xs text-stone-500 dark:text-stone-400">
            <span>
              Showing Page {page + 1} ({logs.length} records)
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page === 0 || isLoading}
                onClick={() => setPage((p) => Math.max(p - 1, 0))}
                className="px-2.5 py-1 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 hover:bg-stone-50 dark:hover:bg-stone-700 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={logs.length < PAGE_SIZE || isLoading}
                onClick={() => setPage((p) => p + 1)}
                className="px-2.5 py-1 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 hover:bg-stone-50 dark:hover:bg-stone-700 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </SlideUp>

      {/* Snapshot Diff Modal */}
      {inspectingLog &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 dark:bg-black/70 backdrop-blur-xs animate-fade-in font-sans">
            <FadeIn>
              <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200/90 dark:border-stone-800 shadow-xl max-w-2xl w-full p-6 space-y-4 transition-colors duration-200">
                <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
                  <div>
                    <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                      <HugeiconsIcon
                        icon={Shield01Icon}
                        className="w-4 h-4 text-stone-800 dark:text-stone-200"
                      />
                      Audit State Diff: {inspectingLog.action}
                    </h3>
                    <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5 font-mono">
                      Actor: {inspectingLog.actorName || inspectingLog.actorEmail} &bull;{' '}
                      {new Date(inspectingLog.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setInspectingLog(null)}
                    className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 cursor-pointer"
                  >
                    <HugeiconsIcon icon={Cancel01Icon} className="w-4 h-4" strokeWidth={1.5} />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <p className="font-semibold text-stone-700 dark:text-stone-300 mb-1.5 flex items-center justify-between">
                      <span>Before State</span>
                      <span className="text-[10px] text-stone-400 font-mono">Immutable</span>
                    </p>
                    <pre className="p-3 rounded-xl bg-stone-50 dark:bg-stone-950/60 border border-stone-200/80 dark:border-stone-800 text-[11px] font-mono text-stone-800 dark:text-stone-200 overflow-x-auto max-h-64 whitespace-pre-wrap">
                      {inspectingLog.beforeState
                        ? JSON.stringify(inspectingLog.beforeState, null, 2)
                        : '(None / Initial Creation)'}
                    </pre>
                  </div>

                  <div>
                    <p className="font-semibold text-stone-700 dark:text-stone-300 mb-1.5 flex items-center justify-between">
                      <span>After State</span>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">
                        Snapshot
                      </span>
                    </p>
                    <pre className="p-3 rounded-xl bg-stone-50 dark:bg-stone-950/60 border border-stone-200/80 dark:border-stone-800 text-[11px] font-mono text-stone-800 dark:text-stone-200 overflow-x-auto max-h-64 whitespace-pre-wrap">
                      {inspectingLog.afterState
                        ? JSON.stringify(inspectingLog.afterState, null, 2)
                        : '(Deleted / Voided)'}
                    </pre>
                  </div>
                </div>

                <div className="pt-3 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between text-xs text-stone-400">
                  <span className="font-mono text-[11px]">
                    Target: {inspectingLog.entityType}:{inspectingLog.entityId}
                  </span>
                  <MotionButton variant="primary" size="sm" onClick={() => setInspectingLog(null)}>
                    Close Diff Viewer
                  </MotionButton>
                </div>
              </div>
            </FadeIn>
          </div>,
          document.body,
        )}
    </div>
  );
};
