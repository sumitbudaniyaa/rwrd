import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Shield01Icon,
  FilterIcon,
  RefreshIcon,
  UserIcon,
  ComputerIcon,
  HeadsetIcon,
} from '@hugeicons/core-free-icons';
import { SlideUp, Badge } from '@tiptable/ui';
import { MotionButton } from '../components/motion/button.js';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../services/api.js';

const PAGE_SIZE = 25;

export const AuditLogScreen: React.FC = () => {
  const { restaurant } = useAuth();
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const [page, setPage] = useState<number>(0);

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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
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
          <motion.div layoutRoot className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-stone-400 uppercase tracking-wider mr-2 flex items-center gap-1 select-none">
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
            ).map((tab) => {
              const isSelected = entityFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setEntityFilter(tab.id);
                    setPage(0);
                  }}
                  className={`relative px-3 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer select-none outline-none focus:outline-none ${
                    isSelected
                      ? 'text-stone-50'
                      : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100/70'
                  }`}
                >
                  {isSelected && (
                    <motion.span
                      layoutId="audit-entity-filter-active-pill"
                      className="absolute inset-0 bg-stone-900 rounded-xl shadow-2xs -z-0"
                      transition={{
                        type: 'spring',
                        stiffness: 245,
                        damping: 36,
                        mass: 1.2,
                      }}
                    />
                  )}
                  <span className="relative z-10 transition-colors duration-150">{tab.label}</span>
                </button>
              );
            })}
          </motion.div>

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
    </div>
  );
};
