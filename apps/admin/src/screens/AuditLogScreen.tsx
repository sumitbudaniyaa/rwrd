import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Shield01Icon,
  FilterIcon,
  RefreshIcon,
  InformationCircleIcon,
  UserIcon,
  ComputerIcon,
  HeadsetIcon,
  Cancel01Icon,
} from '@hugeicons/core-free-icons';
import { SlideUp, FadeIn, Badge } from '@tiptable/ui';
import { MotionButton } from '../components/motion/button.js';
import { useAuth } from '../context/AuthContext.js';
import { api, type AuditLogItem } from '../services/api.js';

const PAGE_SIZE = 25;

export const AuditLogScreen: React.FC = () => {
  const { restaurant } = useAuth();
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const [page, setPage] = useState<number>(0);
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

  const {
    data: auditData,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['admin-audit', restaurant?.id, entityFilter, page],
    queryFn: () => {
      if (!restaurant?.id) throw new Error('Restaurant not selected');
      const params: { limit: number; offset: number; entityType?: string } = {
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      };
      if (entityFilter !== 'all') {
        params.entityType = entityFilter;
      }
      return api.getAuditLogs(restaurant.id, params);
    },
    enabled: Boolean(restaurant?.id),
  });

  const getActionBadgeVariant = (
    action: string,
  ): 'neutral' | 'success' | 'warning' | 'danger' | 'accent' => {
    if (action.includes('CREATED') || action.includes('PROVISIONED')) return 'success';
    if (action.includes('ROTATED') || action.includes('UPDATED')) return 'warning';
    if (action.includes('DELETED') || action.includes('SUSPENDED')) return 'danger';
    return 'neutral';
  };

  const getActorIcon = (actorType: string) => {
    if (actorType === 'platform_user') return HeadsetIcon;
    if (actorType === 'system') return ComputerIcon;
    return UserIcon;
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <SlideUp>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-stone-200/60">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif tracking-tight text-stone-900 font-normal leading-[1.08] text-left">
                audit trail & history
              </h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-stone-100 text-stone-600 border border-stone-200/70 shadow-2xs">
                <HugeiconsIcon icon={Shield01Icon} className="w-3 h-3 text-stone-500" />
                Immutable
              </span>
            </div>
            <p className="mt-1.5 text-xs sm:text-sm text-stone-500 font-sans tracking-tight">
              Tamper-evident record of configuration changes, QR rotations, and waitstaff actions.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <MotionButton
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="px-3.5 py-2 flex items-center gap-2"
              aria-label="Refresh audit logs"
            >
              <HugeiconsIcon icon={RefreshIcon} className="w-4 h-4 text-stone-600" />
              <span>Refresh</span>
            </MotionButton>
          </div>
        </div>
      </SlideUp>

      {/* Filter Tabs */}
      <SlideUp delay={50}>
        <div className="flex flex-wrap items-center justify-between gap-4 bg-white/90 backdrop-blur-xs p-3.5 rounded-2xl border border-stone-200/70 shadow-2xs">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-stone-400 uppercase tracking-wider mr-2 flex items-center gap-1">
              <HugeiconsIcon icon={FilterIcon} className="w-3.5 h-3.5" />
              Filter By:
            </span>
            {(
              [
                { id: 'all', label: 'All Events' },
                { id: 'staff', label: 'Staff' },
                { id: 'restaurant', label: 'Settings' },
                { id: 'qr_token', label: 'QR Tokens' },
                { id: 'table', label: 'Tables' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setEntityFilter(tab.id);
                  setPage(0);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                  entityFilter === tab.id
                    ? 'bg-stone-900 text-stone-50 shadow-2xs'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100/70'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="text-xs text-stone-500">Showing page {page + 1}</div>
        </div>
      </SlideUp>

      {/* Loading State */}
      {isLoading && (
        <div className="p-16 text-center text-stone-400 text-sm flex flex-col items-center justify-center">
          <div className="w-6 h-6 border-2 border-stone-900 border-t-transparent rounded-full animate-spin mb-2" />
          <span>Loading audit logs...</span>
        </div>
      )}

      {/* Error State */}
      {isError && (
        <div className="p-8 text-center bg-white/90 backdrop-blur-xs border border-rose-200/80 rounded-2xl shadow-2xs">
          <p className="text-sm font-medium text-rose-700">Failed to load audit logs.</p>
          <MotionButton variant="outline" size="sm" onClick={() => refetch()} className="mt-4">
            Retry
          </MotionButton>
        </div>
      )}

      {/* Audit Logs Table */}
      {auditData && (
        <SlideUp delay={100}>
          <div className="rounded-2xl border border-stone-200/70 bg-white/90 backdrop-blur-xs shadow-2xs overflow-hidden">
            {auditData.logs.length === 0 ? (
              <div className="p-16 text-center text-xs text-stone-400">
                No audit events recorded for the selected filter.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-stone-50/60 text-stone-500 border-b border-stone-100 font-semibold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3.5 px-6 font-semibold">Timestamp</th>
                      <th className="py-3.5 px-6 font-semibold">Action</th>
                      <th className="py-3.5 px-6 font-semibold">Actor</th>
                      <th className="py-3.5 px-6 font-semibold">Entity</th>
                      <th className="py-3.5 px-6 font-semibold text-right">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {auditData.logs.map((log) => {
                      const ActorIcon = getActorIcon(log.actorType);
                      return (
                        <tr key={log.id} className="hover:bg-stone-50/60 transition-colors">
                          <td className="py-3.5 px-6 text-stone-600 font-mono whitespace-nowrap">
                            {new Date(log.createdAt).toLocaleString('en-IN', {
                              dateStyle: 'short',
                              timeStyle: 'medium',
                            })}
                          </td>
                          <td className="py-3.5 px-6">
                            <Badge variant={getActionBadgeVariant(log.action)}>{log.action}</Badge>
                          </td>
                          <td className="py-3.5 px-6">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-lg bg-stone-100 border border-stone-200/60 flex items-center justify-center text-stone-600 shrink-0 shadow-2xs">
                                <HugeiconsIcon icon={ActorIcon} className="w-3.5 h-3.5" />
                              </div>
                              <div>
                                <span className="font-medium text-stone-900 block text-xs tracking-tight">
                                  {log.actorName}
                                </span>
                                {log.actorEmail && (
                                  <span className="text-[11px] text-stone-400 font-mono">
                                    {log.actorEmail}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-6">
                            <span className="capitalize font-medium text-stone-800">
                              {log.entityType}
                            </span>
                            <span className="text-[11px] text-stone-400 block font-mono">
                              {log.entityId.slice(0, 8)}...
                            </span>
                          </td>
                          <td className="py-3.5 px-6 text-right">
                            {log.beforeState || log.afterState ? (
                              <button
                                type="button"
                                onClick={() => setSelectedLog(log)}
                                className="px-3 py-1 rounded-xl text-xs font-medium bg-stone-100 hover:bg-stone-200/70 text-stone-700 transition-colors cursor-pointer"
                              >
                                Inspect Diff
                              </button>
                            ) : (
                              <span className="text-stone-300">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            <div className="p-4 border-t border-stone-100 bg-stone-50/50 flex items-center justify-between text-xs text-stone-500">
              <div>
                Showing {auditData.logs.length} of {auditData.pagination.count} events on page
              </div>
              <div className="flex items-center gap-2">
                <MotionButton
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                >
                  Previous
                </MotionButton>
                <MotionButton
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={auditData.logs.length < PAGE_SIZE}
                >
                  Next
                </MotionButton>
              </div>
            </div>
          </div>
        </SlideUp>
      )}

      {/* State Diff Modal */}
      {selectedLog &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-sm">
            <FadeIn>
              <div className="bg-white/95 backdrop-blur-md rounded-2xl max-w-2xl w-full border border-stone-200/80 shadow-2xl overflow-hidden">
                <div className="p-5 border-b border-stone-100 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge variant={getActionBadgeVariant(selectedLog.action)}>
                        {selectedLog.action}
                      </Badge>
                      <span className="text-xs font-mono text-stone-400">
                        ID: {selectedLog.id.slice(0, 8)}
                      </span>
                    </div>
                    <p className="text-xs text-stone-500 mt-1">
                      Executed by <strong>{selectedLog.actorName}</strong> on{' '}
                      {new Date(selectedLog.createdAt).toLocaleString('en-IN')}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedLog(null)}
                    className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 cursor-pointer"
                    aria-label="Close diff modal"
                  >
                    <HugeiconsIcon icon={Cancel01Icon} className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                  {/* Meta details */}
                  <div className="grid grid-cols-2 gap-3 p-3.5 bg-stone-50/80 rounded-xl text-xs text-stone-600 border border-stone-100 shadow-2xs">
                    <div>
                      <span className="text-stone-400 block">Entity:</span>
                      <span className="font-medium text-stone-900 capitalize">
                        {selectedLog.entityType} ({selectedLog.entityId})
                      </span>
                    </div>
                    <div>
                      <span className="text-stone-400 block">IP Address:</span>
                      <span className="font-mono text-stone-900">
                        {selectedLog.ipAddress || 'Internal / N/A'}
                      </span>
                    </div>
                  </div>

                  {/* Before / After State Diff */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Before */}
                    <div>
                      <h3 className="text-xs font-semibold text-stone-700 mb-2">before change</h3>
                      <div className="p-3 bg-stone-50/80 border border-stone-200/70 rounded-xl text-xs font-mono overflow-x-auto min-h-[140px] text-stone-800 shadow-2xs">
                        {selectedLog.beforeState ? (
                          <pre>{JSON.stringify(selectedLog.beforeState, null, 2)}</pre>
                        ) : (
                          <span className="text-stone-400 italic">None (New Record Created)</span>
                        )}
                      </div>
                    </div>

                    {/* After */}
                    <div>
                      <h3 className="text-xs font-semibold text-stone-700 mb-2">after change</h3>
                      <div className="p-3 bg-stone-50/80 border border-stone-200/70 rounded-xl text-xs font-mono overflow-x-auto min-h-[140px] text-stone-800 shadow-2xs">
                        {selectedLog.afterState ? (
                          <pre>{JSON.stringify(selectedLog.afterState, null, 2)}</pre>
                        ) : (
                          <span className="text-stone-400 italic">None (Record Deleted)</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Privacy & Redaction Alert */}
                  <div className="p-3.5 bg-stone-100/80 border border-stone-200 rounded-xl text-xs text-stone-700 flex items-start gap-2.5">
                    <HugeiconsIcon
                      icon={InformationCircleIcon}
                      className="w-4 h-4 text-stone-600 shrink-0 mt-0.5"
                    />
                    <span className="leading-relaxed">
                      <strong>Automated Redaction:</strong> Sensitive credentials (passwords,
                      encryption keys, recovery codes, and plain VPAs) are securely sanitized before
                      persistence.
                    </span>
                  </div>
                </div>

                <div className="p-4 border-t border-stone-100 bg-stone-50/50 flex justify-end">
                  <MotionButton variant="outline" size="sm" onClick={() => setSelectedLog(null)}>
                    Close
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
