import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Activity01Icon,
  CloudServerIcon,
  DatabaseIcon,
  Flag01Icon,
  CheckmarkCircle02Icon,
  AlertCircleIcon,
  Cancel01Icon,
  Add01Icon,
  RefreshIcon,
  Delete01Icon,
} from '@hugeicons/core-free-icons';
import { SlideUp, FadeIn } from '@tiptable/ui';
import { Badge } from '../components/Badge.js';
import { useAuth } from '../context/AuthContext.js';
import { api, type UpsertFeatureFlagInput } from '../services/api.js';

type Tab = 'health' | 'flags';

const PRESET_FLAG_KEYS = [
  { key: 'google_reviews_booster', desc: 'Prompts diners to leave Google review after tipping' },
  { key: 'multi_staff_tips', desc: 'Allows splitting tip among multiple floor team members' },
  { key: 'custom_tip_presets', desc: 'Enables custom INR tip preset denominations' },
  {
    key: 'instant_payout_webhooks',
    desc: 'Dispatches real-time webhook events on tip intent creation',
  },
];

export const SystemHealthScreen: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const isSuperAdmin = user?.role === 'super_admin';

  const [activeTab, setActiveTab] = useState<Tab>('health');
  const [isFlagModalOpen, setIsFlagModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form State for Flag Modal
  const [formRestaurantId, setFormRestaurantId] = useState('');
  const [formKey, setFormKey] = useState('google_reviews_booster');
  const [formCustomKey, setFormCustomKey] = useState('');
  const [formEnabled, setFormEnabled] = useState(true);
  const [formConfigJson, setFormConfigJson] = useState('{}');

  // Fetch System Health
  const {
    data: healthData,
    isLoading: isLoadingHealth,
    refetch: refetchHealth,
  } = useQuery({
    queryKey: ['portal-system-health'],
    queryFn: () => api.getSystemHealth(),
    refetchInterval: 30000,
  });

  // Fetch Feature Flags
  const {
    data: flagsData,
    isLoading: isLoadingFlags,
    refetch: refetchFlags,
  } = useQuery({
    queryKey: ['portal-feature-flags'],
    queryFn: () => api.getFeatureFlags(),
  });

  // Fetch Restaurants for Flag Form
  const { data: restaurantsData } = useQuery({
    queryKey: ['portal-restaurants-flags-dropdown'],
    queryFn: () => api.getRestaurants({ limit: 100 }),
    enabled: isFlagModalOpen,
  });

  // Upsert Flag Mutation
  const upsertFlagMutation = useMutation({
    mutationFn: (data: UpsertFeatureFlagInput) => api.upsertFeatureFlag(data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['portal-feature-flags'] });
      setIsFlagModalOpen(false);
      setFormRestaurantId('');
      setFormConfigJson('{}');
      setSuccessMessage(`Feature flag "${res.flag.key}" saved for ${res.flag.restaurantName}.`);
    },
    onError: (err) => {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to save feature flag.');
    },
  });

  // Toggle Flag Mutation
  const toggleFlagMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      api.updateFeatureFlag(id, { enabled }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['portal-feature-flags'] });
      setSuccessMessage(
        `Feature flag "${res.flag.key}" is now ${res.flag.enabled ? 'enabled' : 'disabled'}.`,
      );
    },
    onError: (err) => {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to toggle feature flag.');
    },
  });

  // Delete Flag Mutation
  const deleteFlagMutation = useMutation({
    mutationFn: (id: string) => api.deleteFeatureFlag(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal-feature-flags'] });
      setSuccessMessage('Feature flag override deleted successfully.');
    },
    onError: (err) => {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to delete feature flag.');
    },
  });

  const flags = flagsData?.flags || [];

  const handleCreateFlagSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formRestaurantId) {
      setErrorMessage('Please select a target restaurant.');
      return;
    }

    const keyToUse = formKey === 'custom' ? formCustomKey.trim() : formKey;
    if (!keyToUse) {
      setErrorMessage('Feature flag key is required.');
      return;
    }

    let parsedConfig: Record<string, unknown> | undefined;
    if (formConfigJson.trim() && formConfigJson.trim() !== '{}') {
      try {
        parsedConfig = JSON.parse(formConfigJson);
      } catch {
        setErrorMessage('Config JSON must be valid JSON.');
        return;
      }
    }

    const payload: UpsertFeatureFlagInput = {
      restaurantId: formRestaurantId,
      key: keyToUse,
      enabled: formEnabled,
    };
    if (parsedConfig) {
      payload.configJson = parsedConfig;
    }

    upsertFlagMutation.mutate(payload);
  };

  const formatUptime = (seconds: number): string => {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${d > 0 ? `${d}d ` : ''}${h > 0 ? `${h}h ` : ''}${m}m ${s}s`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <SlideUp delay={0.05}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <HugeiconsIcon
                icon={Activity01Icon}
                className="w-5 h-5 text-stone-900 dark:text-stone-100"
                strokeWidth={1.5}
              />
              System Status &amp; Feature Flags
            </h1>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              Operational backing services health, telemetry worker queues, and tenant feature flag
              overrides.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {!isSuperAdmin && <Badge variant="neutral">Read-only Infrastructure View</Badge>}
            {activeTab === 'flags' && isSuperAdmin && (
              <button
                type="button"
                onClick={() => setIsFlagModalOpen(true)}
                className="px-3 py-1.5 text-xs bg-stone-900 hover:bg-black text-white dark:bg-white dark:hover:bg-stone-100 dark:text-stone-900 font-medium rounded-lg shadow-2xs flex items-center gap-1.5 transition-all"
              >
                <HugeiconsIcon icon={Add01Icon} className="w-3.5 h-3.5" strokeWidth={1.5} />
                Add Flag Override
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                if (activeTab === 'health') refetchHealth();
                else refetchFlags();
              }}
              className="inline-flex items-center gap-1.5 h-8 px-2.5 text-xs font-medium text-stone-700 dark:text-stone-300 bg-white dark:bg-stone-900 border border-stone-200/90 dark:border-stone-700 rounded-lg hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors shadow-2xs"
            >
              <HugeiconsIcon
                icon={RefreshIcon}
                className="w-3.5 h-3.5 text-stone-500 dark:text-stone-400"
                strokeWidth={1.5}
              />
              Refresh
            </button>
          </div>
        </div>
      </SlideUp>

      {/* Notifications */}
      {successMessage && (
        <FadeIn>
          <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-500/10 dark:bg-emerald-950/40 border border-emerald-500/20 dark:border-emerald-900 text-emerald-900 dark:text-emerald-200 text-xs">
            <div className="flex items-center gap-2">
              <HugeiconsIcon
                icon={CheckmarkCircle02Icon}
                className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0"
                strokeWidth={1.5}
              />
              <span>{successMessage}</span>
            </div>
            <button
              onClick={() => setSuccessMessage(null)}
              className="text-emerald-700 hover:text-emerald-900 dark:hover:text-emerald-100"
            >
              <HugeiconsIcon icon={Cancel01Icon} className="w-3.5 h-3.5" strokeWidth={1.5} />
            </button>
          </div>
        </FadeIn>
      )}

      {errorMessage && (
        <FadeIn>
          <div className="flex items-center justify-between p-3 rounded-lg bg-rose-500/10 dark:bg-rose-950/40 border border-rose-500/20 dark:border-rose-900 text-rose-900 dark:text-rose-200 text-xs">
            <div className="flex items-center gap-2">
              <HugeiconsIcon
                icon={AlertCircleIcon}
                className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0"
                strokeWidth={1.5}
              />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-rose-700 hover:text-rose-900 dark:hover:text-rose-100"
            >
              <HugeiconsIcon icon={Cancel01Icon} className="w-3.5 h-3.5" strokeWidth={1.5} />
            </button>
          </div>
        </FadeIn>
      )}

      {/* Tabs */}
      <SlideUp delay={0.1}>
        <div className="flex items-center gap-1 border-b border-stone-200 dark:border-stone-800">
          <button
            type="button"
            onClick={() => setActiveTab('health')}
            className={`pb-2.5 px-3 text-xs font-semibold transition-colors relative ${
              activeTab === 'health'
                ? 'text-stone-900 dark:text-stone-100 border-b-2 border-stone-900 dark:border-stone-100'
                : 'text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200'
            }`}
          >
            Infrastructure Diagnostics
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('flags')}
            className={`pb-2.5 px-3 text-xs font-semibold transition-colors relative ${
              activeTab === 'flags'
                ? 'text-stone-900 dark:text-stone-100 border-b-2 border-stone-900 dark:border-stone-100'
                : 'text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200'
            }`}
          >
            Tenant Feature Flags ({flags.length})
          </button>
        </div>
      </SlideUp>

      {/* Tab 1: System Health */}
      {activeTab === 'health' && (
        <SlideUp delay={0.15}>
          <div className="space-y-3.5">
            {/* Overall Status Banner */}
            <div className="p-3.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 shadow-2xs flex items-center justify-between transition-colors duration-200">
              <div className="flex items-center gap-3">
                <span
                  className={`w-2.5 h-2.5 rounded-full animate-pulse ${
                    healthData?.status === 'healthy' ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                />
                <div>
                  <h3 className="text-xs font-bold text-stone-900 dark:text-stone-100">
                    Platform Core Services:{' '}
                    <span className="capitalize">
                      {isLoadingHealth ? 'Checking...' : healthData?.status || 'Operational'}
                    </span>
                  </h3>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
                    Environment:{' '}
                    <span className="font-mono text-stone-700 dark:text-stone-300">
                      {healthData?.environment || 'production'}
                    </span>{' '}
                    &bull; Last probed:{' '}
                    {healthData?.timestamp
                      ? new Date(healthData.timestamp).toLocaleTimeString()
                      : 'Just now'}
                  </p>
                </div>
              </div>
              <Badge variant={healthData?.status === 'healthy' ? 'success' : 'warning'}>
                {healthData?.status === 'healthy' ? 'All Systems Go' : 'Degraded'}
              </Badge>
            </div>

            {/* Diagnostic Component Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* API Service */}
              <div className="p-4 bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 rounded-xl shadow-2xs space-y-2.5 transition-colors duration-200">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
                    API Gateway
                  </span>
                  <HugeiconsIcon
                    icon={CloudServerIcon}
                    className="w-4 h-4 text-stone-700 dark:text-stone-300"
                    strokeWidth={1.5}
                  />
                </div>
                <div>
                  <p className="text-base font-bold text-stone-900 dark:text-stone-100">
                    {healthData?.components.api.status === 'healthy' ? 'Healthy' : 'Degraded'}
                  </p>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400 font-mono mt-0.5">
                    Uptime:{' '}
                    {healthData ? formatUptime(healthData.components.api.uptimeSeconds) : '...'}
                  </p>
                </div>
                <div className="pt-2 border-t border-stone-100 dark:border-stone-800 text-[11px] text-stone-500 dark:text-stone-400 space-y-1">
                  <div className="flex justify-between">
                    <span>Memory RSS</span>
                    <span className="font-mono text-stone-800 dark:text-stone-200">
                      {healthData?.components.api.memoryUsageMb} MB
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Heap Used</span>
                    <span className="font-mono text-stone-800 dark:text-stone-200">
                      {healthData?.components.api.heapUsedMb} MB
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Node Runtime</span>
                    <span className="font-mono text-stone-800 dark:text-stone-200">
                      {healthData?.components.api.nodeVersion}
                    </span>
                  </div>
                </div>
              </div>

              {/* PostgreSQL */}
              <div className="p-4 bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 rounded-xl shadow-2xs space-y-2.5 transition-colors duration-200">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
                    Database
                  </span>
                  <HugeiconsIcon
                    icon={DatabaseIcon}
                    className="w-4 h-4 text-stone-700 dark:text-stone-300"
                    strokeWidth={1.5}
                  />
                </div>
                <div>
                  <p className="text-base font-bold text-stone-900 dark:text-stone-100">
                    {healthData?.components.database.status === 'healthy' ? 'Connected' : 'Offline'}
                  </p>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400 font-mono mt-0.5">
                    {healthData?.components.database.engine}
                  </p>
                </div>
                <div className="pt-2 border-t border-stone-100 dark:border-stone-800 text-[11px] text-stone-500 dark:text-stone-400 space-y-1">
                  <div className="flex justify-between">
                    <span>Ping Latency</span>
                    <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                      {healthData?.components.database.latencyMs} ms
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tenancy RLS</span>
                    <span className="font-mono text-stone-800 dark:text-stone-200">Enforced</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Crypto Cipher</span>
                    <span className="font-mono text-stone-800 dark:text-stone-200">
                      AES-256-GCM
                    </span>
                  </div>
                </div>
              </div>

              {/* Redis */}
              <div className="p-4 bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 rounded-xl shadow-2xs space-y-2.5 transition-colors duration-200">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
                    Cache &amp; Limiters
                  </span>
                  <HugeiconsIcon
                    icon={Activity01Icon}
                    className="w-4 h-4 text-stone-700 dark:text-stone-300"
                    strokeWidth={1.5}
                  />
                </div>
                <div>
                  <p className="text-base font-bold text-stone-900 dark:text-stone-100">
                    {healthData?.components.redis.status === 'healthy' ? 'Operational' : 'Degraded'}
                  </p>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400 font-mono mt-0.5">
                    {healthData?.components.redis.engine}
                  </p>
                </div>
                <div className="pt-2 border-t border-stone-100 dark:border-stone-800 text-[11px] text-stone-500 dark:text-stone-400 space-y-1">
                  <div className="flex justify-between">
                    <span>Redis Latency</span>
                    <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                      {healthData?.components.redis.latencyMs} ms
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Rate Limiter</span>
                    <span className="font-mono text-stone-800 dark:text-stone-200">
                      Sliding Window
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Session Realm</span>
                    <span className="font-mono text-stone-800 dark:text-stone-200">Isolated</span>
                  </div>
                </div>
              </div>

              {/* Background Queues */}
              <div className="p-4 bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 rounded-xl shadow-2xs space-y-2.5 transition-colors duration-200">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
                    Queue Workers
                  </span>
                  <HugeiconsIcon
                    icon={Flag01Icon}
                    className="w-4 h-4 text-stone-700 dark:text-stone-300"
                    strokeWidth={1.5}
                  />
                </div>
                <div>
                  <p className="text-base font-bold text-stone-900 dark:text-stone-100 capitalize">
                    {healthData?.components.workers.status}
                  </p>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400 font-mono mt-0.5">
                    Queue: {healthData?.components.workers.queue}
                  </p>
                </div>
                <div className="pt-2 border-t border-stone-100 dark:border-stone-800 text-[11px] text-stone-500 dark:text-stone-400 space-y-1">
                  <div className="flex justify-between">
                    <span>Active Jobs</span>
                    <span className="font-mono text-stone-800 dark:text-stone-200">
                      {healthData?.components.workers.activeJobs}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Completed</span>
                    <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                      {healthData?.components.workers.completedJobs}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Failed Jobs</span>
                    <span className="font-mono text-stone-800 dark:text-stone-200">
                      {healthData?.components.workers.failedJobs}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </SlideUp>
      )}

      {/* Tab 2: Feature Flags */}
      {activeTab === 'flags' && (
        <SlideUp delay={0.15}>
          <div className="space-y-3.5">
            {/* Flag Presets Documentation */}
            <div className="p-3 bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 rounded-lg text-xs text-stone-600 dark:text-stone-300 transition-colors duration-200">
              <p className="font-semibold text-stone-900 dark:text-stone-100 mb-1 text-[11px]">
                Standard Platform Feature Flags:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                {PRESET_FLAG_KEYS.map((p) => (
                  <div key={p.key} className="flex items-start gap-1.5">
                    <span className="font-mono font-semibold text-stone-900 dark:text-stone-100 bg-white dark:bg-stone-900 px-1.5 py-0.5 rounded border border-stone-200 dark:border-stone-700 shrink-0 text-[10px]">
                      {p.key}
                    </span>
                    <span className="text-stone-500 dark:text-stone-400 text-[11px]">{p.desc}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Flags Table */}
            <div className="bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 rounded-xl shadow-2xs overflow-hidden transition-colors duration-200">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-50/70 dark:bg-stone-800/80 border-b border-stone-200 dark:border-stone-800 text-stone-500 dark:text-stone-400 uppercase text-[10px] tracking-wider font-semibold">
                    <tr>
                      <th className="py-2.5 px-3.5">Restaurant</th>
                      <th className="py-2.5 px-3.5">Flag Key</th>
                      <th className="py-2.5 px-3.5">State</th>
                      <th className="py-2.5 px-3.5">Configuration JSON</th>
                      <th className="py-2.5 px-3.5">Last Updated</th>
                      <th className="py-2.5 px-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                    {isLoadingFlags ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="py-8 text-center text-stone-400 dark:text-stone-500"
                        >
                          Loading feature flags...
                        </td>
                      </tr>
                    ) : flags.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="py-8 text-center text-stone-400 dark:text-stone-500"
                        >
                          No tenant feature flag overrides configured.
                        </td>
                      </tr>
                    ) : (
                      flags.map((flag) => (
                        <tr
                          key={flag.id}
                          className="hover:bg-stone-50/60 dark:hover:bg-stone-800/50 transition-colors"
                        >
                          <td className="py-2.5 px-3.5">
                            <p className="font-semibold text-stone-900 dark:text-stone-100">
                              {flag.restaurantName}
                            </p>
                            <p className="text-[11px] text-stone-400 dark:text-stone-500 font-mono">
                              /{flag.restaurantSlug}
                            </p>
                          </td>
                          <td className="py-2.5 px-3.5 font-mono font-semibold text-stone-800 dark:text-stone-200">
                            {flag.key}
                          </td>
                          <td className="py-2.5 px-3.5">
                            {isSuperAdmin ? (
                              <button
                                type="button"
                                disabled={toggleFlagMutation.isPending}
                                onClick={() =>
                                  toggleFlagMutation.mutate({
                                    id: flag.id,
                                    enabled: !flag.enabled,
                                  })
                                }
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors ${
                                  flag.enabled
                                    ? 'bg-emerald-500/10 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-500/20 dark:border-emerald-800 hover:bg-emerald-500/20 dark:hover:bg-emerald-900/60'
                                    : 'bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400 border-stone-200 dark:border-stone-700 hover:bg-stone-200 dark:hover:bg-stone-700'
                                }`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    flag.enabled
                                      ? 'bg-emerald-600 dark:bg-emerald-400'
                                      : 'bg-stone-400 dark:text-stone-500'
                                  }`}
                                />
                                {flag.enabled ? 'Enabled' : 'Disabled'}
                              </button>
                            ) : (
                              <Badge variant={flag.enabled ? 'success' : 'neutral'}>
                                {flag.enabled ? 'Enabled' : 'Disabled'}
                              </Badge>
                            )}
                          </td>
                          <td className="py-2.5 px-3.5 font-mono text-[11px] text-stone-500 dark:text-stone-400 max-w-xs truncate">
                            {flag.configJson ? JSON.stringify(flag.configJson) : '-'}
                          </td>
                          <td className="py-2.5 px-3.5 font-mono text-[11px] text-stone-400 dark:text-stone-500">
                            {new Date(flag.updatedAt).toLocaleDateString()}
                          </td>
                          <td className="py-2.5 px-3.5 text-right">
                            {isSuperAdmin && (
                              <button
                                type="button"
                                disabled={deleteFlagMutation.isPending}
                                onClick={() => deleteFlagMutation.mutate(flag.id)}
                                className="p-1 text-stone-400 dark:text-stone-500 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                                title="Remove override"
                              >
                                <HugeiconsIcon
                                  icon={Delete01Icon}
                                  className="w-4 h-4"
                                  strokeWidth={1.5}
                                />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </SlideUp>
      )}

      {/* Configure Feature Flag Modal */}
      {isFlagModalOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 dark:bg-black/70 backdrop-blur-xs animate-fade-in font-sans">
            <FadeIn>
              <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200/90 dark:border-stone-800 shadow-xl max-w-md w-full p-5 space-y-3.5 transition-colors duration-200">
                <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-2.5">
                  <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                    <HugeiconsIcon
                      icon={Flag01Icon}
                      className="w-4 h-4 text-stone-900 dark:text-stone-100"
                      strokeWidth={1.5}
                    />
                    Configure Flag Override
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsFlagModalOpen(false)}
                    className="p-1 text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                  >
                    <HugeiconsIcon icon={Cancel01Icon} className="w-4 h-4" strokeWidth={1.5} />
                  </button>
                </div>

                <form onSubmit={handleCreateFlagSubmit} className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-medium text-stone-700 dark:text-stone-300 mb-1">
                      Select Restaurant
                    </label>
                    <select
                      value={formRestaurantId}
                      onChange={(e) => setFormRestaurantId(e.target.value)}
                      required
                      className="w-full h-8.5 px-3 text-xs bg-stone-50/70 dark:bg-stone-800/60 border border-stone-200/90 dark:border-stone-700 hover:border-stone-300 dark:hover:border-stone-600 rounded-xl text-stone-900 dark:text-stone-100 focus:bg-white dark:focus:bg-stone-800 focus:border-stone-400 dark:focus:border-stone-500 focus:shadow-[0_0_0_3px_rgba(0,0,0,0.04)] dark:focus:shadow-[0_0_0_3px_rgba(255,255,255,0.04)] outline-none transition-all duration-200"
                    >
                      <option value="">-- Choose Restaurant --</option>
                      {restaurantsData?.restaurants.map((r) => (
                        <option key={r.id} value={r.id} className="dark:bg-stone-800">
                          {r.name} ({r.slug})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-stone-700 dark:text-stone-300 mb-1">
                      Feature Flag Key
                    </label>
                    <select
                      value={formKey}
                      onChange={(e) => setFormKey(e.target.value)}
                      className="w-full h-8.5 px-3 text-xs bg-stone-50/70 dark:bg-stone-800/60 border border-stone-200/90 dark:border-stone-700 hover:border-stone-300 dark:hover:border-stone-600 rounded-xl text-stone-900 dark:text-stone-100 focus:bg-white dark:focus:bg-stone-800 focus:border-stone-400 dark:focus:border-stone-500 focus:shadow-[0_0_0_3px_rgba(0,0,0,0.04)] dark:focus:shadow-[0_0_0_3px_rgba(255,255,255,0.04)] outline-none transition-all duration-200"
                    >
                      {PRESET_FLAG_KEYS.map((p) => (
                        <option key={p.key} value={p.key} className="dark:bg-stone-800">
                          {p.key}
                        </option>
                      ))}
                      <option value="custom" className="dark:bg-stone-800">
                        -- Custom Flag Key --
                      </option>
                    </select>
                  </div>

                  {formKey === 'custom' && (
                    <div>
                      <label className="block text-[11px] font-medium text-stone-700 dark:text-stone-300 mb-1">
                        Custom Flag Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. experimental_qr_design"
                        value={formCustomKey}
                        onChange={(e) => setFormCustomKey(e.target.value)}
                        required
                        className="w-full h-8.5 px-3 text-xs bg-stone-50/70 dark:bg-stone-800/60 border border-stone-200/90 dark:border-stone-700 hover:border-stone-300 dark:hover:border-stone-600 rounded-xl text-stone-900 dark:text-stone-100 focus:bg-white dark:focus:bg-stone-800 focus:border-stone-400 dark:focus:border-stone-500 focus:shadow-[0_0_0_3px_rgba(0,0,0,0.04)] dark:focus:shadow-[0_0_0_3px_rgba(255,255,255,0.04)] outline-none transition-all duration-200"
                      />
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="flagEnabled"
                      checked={formEnabled}
                      onChange={(e) => setFormEnabled(e.target.checked)}
                      className="rounded border-stone-300 dark:border-stone-700 text-stone-900 dark:text-stone-100 focus:ring-stone-900 dark:focus:ring-stone-100"
                    />
                    <label
                      htmlFor="flagEnabled"
                      className="text-xs font-medium text-stone-700 dark:text-stone-300"
                    >
                      Flag Enabled
                    </label>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-stone-700 dark:text-stone-300 mb-1">
                      Config JSON (Optional)
                    </label>
                    <textarea
                      rows={3}
                      value={formConfigJson}
                      onChange={(e) => setFormConfigJson(e.target.value)}
                      placeholder='{"threshold": 100}'
                      className="w-full px-3 py-2 text-xs font-mono bg-stone-50/70 dark:bg-stone-800/60 border border-stone-200/90 dark:border-stone-700 hover:border-stone-300 dark:hover:border-stone-600 rounded-xl text-stone-900 dark:text-stone-100 focus:bg-white dark:focus:bg-stone-800 focus:border-stone-400 dark:focus:border-stone-500 focus:shadow-[0_0_0_3px_rgba(0,0,0,0.04)] dark:focus:shadow-[0_0_0_3px_rgba(255,255,255,0.04)] outline-none transition-all duration-200 resize-none"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100 dark:border-stone-800">
                    <button
                      type="button"
                      onClick={() => setIsFlagModalOpen(false)}
                      className="px-3 py-1.5 text-xs text-stone-700 dark:text-stone-300 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg hover:bg-stone-50 dark:hover:bg-stone-700/80 font-medium transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={upsertFlagMutation.isPending}
                      className="px-3.5 py-1.5 text-xs font-medium text-white dark:text-stone-900 bg-stone-900 hover:bg-black dark:bg-white dark:hover:bg-stone-100 rounded-lg transition-all shadow-2xs disabled:opacity-50 cursor-pointer"
                    >
                      {upsertFlagMutation.isPending ? 'Saving...' : 'Apply Override'}
                    </button>
                  </div>
                </form>
              </div>
            </FadeIn>
          </div>,
          document.body,
        )}
    </div>
  );
};
