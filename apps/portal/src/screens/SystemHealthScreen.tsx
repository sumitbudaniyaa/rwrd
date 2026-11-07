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
import { SlideUp, FadeIn, Badge, MotionButton } from '@tiptable/ui';
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-stone-900 flex items-center gap-2">
              <HugeiconsIcon
                icon={Activity01Icon}
                className="w-6 h-6 text-stone-800"
                strokeWidth={1.5}
              />
              System Status & Feature Flags
            </h1>
            <p className="text-sm text-stone-500 mt-1">
              Operational backing services health, telemetry worker queues, and tenant feature flag
              overrides.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {!isSuperAdmin && <Badge variant="neutral">Read-only Infrastructure View</Badge>}
            {activeTab === 'flags' && isSuperAdmin && (
              <MotionButton
                type="button"
                variant="primary"
                onClick={() => setIsFlagModalOpen(true)}
                className="!px-3.5 !py-2 !text-xs !bg-stone-900 hover:!bg-stone-800"
              >
                <HugeiconsIcon icon={Add01Icon} className="w-4 h-4 mr-1.5" strokeWidth={1.5} />
                Add Flag Override
              </MotionButton>
            )}
            <button
              type="button"
              onClick={() => {
                if (activeTab === 'health') refetchHealth();
                else refetchFlags();
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-stone-600 hover:text-stone-900 border border-stone-200 rounded-lg bg-stone-50 hover:bg-stone-100 transition-colors"
            >
              <HugeiconsIcon icon={RefreshIcon} className="w-3.5 h-3.5" strokeWidth={1.5} />
              Refresh
            </button>
          </div>
        </div>
      </SlideUp>

      {/* Notifications */}
      {successMessage && (
        <FadeIn>
          <div className="flex items-center justify-between p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm">
            <div className="flex items-center gap-2.5">
              <HugeiconsIcon
                icon={CheckmarkCircle02Icon}
                className="w-5 h-5 text-emerald-600 shrink-0"
                strokeWidth={1.5}
              />
              <span>{successMessage}</span>
            </div>
            <button
              onClick={() => setSuccessMessage(null)}
              className="text-emerald-700 hover:text-emerald-900"
            >
              <HugeiconsIcon icon={Cancel01Icon} className="w-4 h-4" strokeWidth={1.5} />
            </button>
          </div>
        </FadeIn>
      )}

      {errorMessage && (
        <FadeIn>
          <div className="flex items-center justify-between p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-sm">
            <div className="flex items-center gap-2.5">
              <HugeiconsIcon
                icon={AlertCircleIcon}
                className="w-5 h-5 text-rose-600 shrink-0"
                strokeWidth={1.5}
              />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-rose-700 hover:text-rose-900"
            >
              <HugeiconsIcon icon={Cancel01Icon} className="w-4 h-4" strokeWidth={1.5} />
            </button>
          </div>
        </FadeIn>
      )}

      {/* Tabs */}
      <SlideUp delay={0.1}>
        <div className="flex items-center gap-2 border-b border-stone-200">
          <button
            type="button"
            onClick={() => setActiveTab('health')}
            className={`pb-3 px-3 text-sm font-semibold transition-colors relative ${
              activeTab === 'health'
                ? 'text-stone-900 border-b-2 border-stone-900'
                : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            Infrastructure Diagnostics
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('flags')}
            className={`pb-3 px-3 text-sm font-semibold transition-colors relative ${
              activeTab === 'flags'
                ? 'text-stone-900 border-b-2 border-stone-900'
                : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            Tenant Feature Flags ({flags.length})
          </button>
        </div>
      </SlideUp>

      {/* Tab 1: System Health */}
      {activeTab === 'health' && (
        <SlideUp delay={0.15}>
          <div className="space-y-4">
            {/* Overall Status Banner */}
            <div className="p-4 rounded-2xl bg-white border border-stone-200 shadow-xs flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span
                  className={`w-3.5 h-3.5 rounded-full animate-pulse ${
                    healthData?.status === 'healthy' ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                />
                <div>
                  <h3 className="text-sm font-bold text-stone-900">
                    Platform Core Services:{' '}
                    <span className="capitalize">
                      {isLoadingHealth ? 'Checking...' : healthData?.status || 'Operational'}
                    </span>
                  </h3>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Environment:{' '}
                    <span className="font-mono">{healthData?.environment || 'production'}</span>{' '}
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* API Service */}
              <div className="p-5 bg-white border border-stone-200 rounded-2xl shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                    API Gateway
                  </span>
                  <HugeiconsIcon
                    icon={CloudServerIcon}
                    className="w-5 h-5 text-indigo-600"
                    strokeWidth={1.5}
                  />
                </div>
                <div>
                  <p className="text-lg font-bold text-stone-900">
                    {healthData?.components.api.status === 'healthy' ? 'Healthy' : 'Degraded'}
                  </p>
                  <p className="text-xs text-stone-500 font-mono mt-0.5">
                    Uptime:{' '}
                    {healthData ? formatUptime(healthData.components.api.uptimeSeconds) : '...'}
                  </p>
                </div>
                <div className="pt-2 border-t border-stone-100 text-[11px] text-stone-500 space-y-1">
                  <div className="flex justify-between">
                    <span>Memory RSS</span>
                    <span className="font-mono text-stone-800">
                      {healthData?.components.api.memoryUsageMb} MB
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Heap Used</span>
                    <span className="font-mono text-stone-800">
                      {healthData?.components.api.heapUsedMb} MB
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Node Runtime</span>
                    <span className="font-mono text-stone-800">
                      {healthData?.components.api.nodeVersion}
                    </span>
                  </div>
                </div>
              </div>

              {/* PostgreSQL */}
              <div className="p-5 bg-white border border-stone-200 rounded-2xl shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                    Database
                  </span>
                  <HugeiconsIcon
                    icon={DatabaseIcon}
                    className="w-5 h-5 text-emerald-600"
                    strokeWidth={1.5}
                  />
                </div>
                <div>
                  <p className="text-lg font-bold text-stone-900">
                    {healthData?.components.database.status === 'healthy' ? 'Connected' : 'Offline'}
                  </p>
                  <p className="text-xs text-stone-500 font-mono mt-0.5">
                    {healthData?.components.database.engine}
                  </p>
                </div>
                <div className="pt-2 border-t border-stone-100 text-[11px] text-stone-500 space-y-1">
                  <div className="flex justify-between">
                    <span>Ping Latency</span>
                    <span className="font-mono text-emerald-600 font-semibold">
                      {healthData?.components.database.latencyMs} ms
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tenancy RLS</span>
                    <span className="font-mono text-stone-800">Enforced</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Crypto Cipher</span>
                    <span className="font-mono text-stone-800">AES-256-GCM</span>
                  </div>
                </div>
              </div>

              {/* Redis */}
              <div className="p-5 bg-white border border-stone-200 rounded-2xl shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                    Cache & Limiters
                  </span>
                  <HugeiconsIcon
                    icon={Activity01Icon}
                    className="w-5 h-5 text-rose-600"
                    strokeWidth={1.5}
                  />
                </div>
                <div>
                  <p className="text-lg font-bold text-stone-900">
                    {healthData?.components.redis.status === 'healthy' ? 'Operational' : 'Degraded'}
                  </p>
                  <p className="text-xs text-stone-500 font-mono mt-0.5">
                    {healthData?.components.redis.engine}
                  </p>
                </div>
                <div className="pt-2 border-t border-stone-100 text-[11px] text-stone-500 space-y-1">
                  <div className="flex justify-between">
                    <span>Redis Latency</span>
                    <span className="font-mono text-emerald-600 font-semibold">
                      {healthData?.components.redis.latencyMs} ms
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Rate Limiter</span>
                    <span className="font-mono text-stone-800">Sliding Window</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Session Realm</span>
                    <span className="font-mono text-stone-800">Isolated</span>
                  </div>
                </div>
              </div>

              {/* Background Queues */}
              <div className="p-5 bg-white border border-stone-200 rounded-2xl shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                    Queue Workers
                  </span>
                  <HugeiconsIcon
                    icon={Flag01Icon}
                    className="w-5 h-5 text-amber-600"
                    strokeWidth={1.5}
                  />
                </div>
                <div>
                  <p className="text-lg font-bold text-stone-900 capitalize">
                    {healthData?.components.workers.status}
                  </p>
                  <p className="text-xs text-stone-500 font-mono mt-0.5">
                    Queue: {healthData?.components.workers.queue}
                  </p>
                </div>
                <div className="pt-2 border-t border-stone-100 text-[11px] text-stone-500 space-y-1">
                  <div className="flex justify-between">
                    <span>Active Jobs</span>
                    <span className="font-mono text-stone-800">
                      {healthData?.components.workers.activeJobs}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Completed</span>
                    <span className="font-mono text-emerald-600 font-semibold">
                      {healthData?.components.workers.completedJobs}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Failed Jobs</span>
                    <span className="font-mono text-stone-800">
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
          <div className="space-y-4">
            {/* Flag Presets Documentation */}
            <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-600">
              <p className="font-semibold text-stone-900 mb-1.5">
                Standard Platform Feature Flags:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {PRESET_FLAG_KEYS.map((p) => (
                  <div key={p.key} className="flex items-start gap-2">
                    <span className="font-mono font-semibold text-stone-800 bg-white px-1.5 py-0.5 rounded border border-stone-200 shrink-0">
                      {p.key}
                    </span>
                    <span className="text-stone-500 text-[11px]">{p.desc}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Flags Table */}
            <div className="bg-white border border-stone-200 rounded-2xl shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 uppercase font-semibold">
                    <tr>
                      <th className="py-3 px-4">Restaurant</th>
                      <th className="py-3 px-4">Flag Key</th>
                      <th className="py-3 px-4">State</th>
                      <th className="py-3 px-4">Configuration JSON</th>
                      <th className="py-3 px-4">Last Updated</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {isLoadingFlags ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-stone-400">
                          Loading feature flags...
                        </td>
                      </tr>
                    ) : flags.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-stone-400">
                          No tenant feature flag overrides configured.
                        </td>
                      </tr>
                    ) : (
                      flags.map((flag) => (
                        <tr key={flag.id} className="hover:bg-stone-50/50 transition-colors">
                          <td className="py-3 px-4">
                            <p className="font-semibold text-stone-900">{flag.restaurantName}</p>
                            <p className="text-[11px] text-stone-400 font-mono">
                              /{flag.restaurantSlug}
                            </p>
                          </td>
                          <td className="py-3 px-4 font-mono font-semibold text-stone-800">
                            {flag.key}
                          </td>
                          <td className="py-3 px-4">
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
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                    : 'bg-stone-100 text-stone-500 border-stone-200 hover:bg-stone-200'
                                }`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    flag.enabled ? 'bg-emerald-600' : 'bg-stone-400'
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
                          <td className="py-3 px-4 font-mono text-[11px] text-stone-500 max-w-xs truncate">
                            {flag.configJson ? JSON.stringify(flag.configJson) : '-'}
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px] text-stone-400">
                            {new Date(flag.updatedAt).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {isSuperAdmin && (
                              <button
                                type="button"
                                disabled={deleteFlagMutation.isPending}
                                onClick={() => deleteFlagMutation.mutate(flag.id)}
                                className="p-1 text-stone-400 hover:text-rose-600 rounded-md hover:bg-stone-100 transition-colors"
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
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-sm animate-fade-in">
            <FadeIn>
              <div className="bg-white rounded-2xl border border-stone-200 shadow-xl max-w-md w-full p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                  <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
                    <HugeiconsIcon
                      icon={Flag01Icon}
                      className="w-5 h-5 text-stone-800"
                      strokeWidth={1.5}
                    />
                    Configure Flag Override
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsFlagModalOpen(false)}
                    className="text-stone-400 hover:text-stone-600"
                  >
                    <HugeiconsIcon icon={Cancel01Icon} className="w-5 h-5" strokeWidth={1.5} />
                  </button>
                </div>

                <form onSubmit={handleCreateFlagSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Select Restaurant
                    </label>
                    <select
                      value={formRestaurantId}
                      onChange={(e) => setFormRestaurantId(e.target.value)}
                      required
                      className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-lg text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900 focus:bg-white"
                    >
                      <option value="">-- Choose Restaurant --</option>
                      {restaurantsData?.restaurants.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name} ({r.slug})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Feature Flag Key
                    </label>
                    <select
                      value={formKey}
                      onChange={(e) => setFormKey(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-lg text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900 focus:bg-white"
                    >
                      {PRESET_FLAG_KEYS.map((p) => (
                        <option key={p.key} value={p.key}>
                          {p.key}
                        </option>
                      ))}
                      <option value="custom">-- Custom Flag Key --</option>
                    </select>
                  </div>

                  {formKey === 'custom' && (
                    <div>
                      <label className="block text-xs font-semibold text-stone-700 mb-1">
                        Custom Flag Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. experimental_qr_design"
                        value={formCustomKey}
                        onChange={(e) => setFormCustomKey(e.target.value)}
                        required
                        className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-lg text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900 focus:bg-white"
                      />
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="flagEnabled"
                      checked={formEnabled}
                      onChange={(e) => setFormEnabled(e.target.checked)}
                      className="rounded border-stone-300 text-stone-900 focus:ring-stone-900"
                    />
                    <label htmlFor="flagEnabled" className="text-xs font-semibold text-stone-700">
                      Flag Enabled
                    </label>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Config JSON (Optional)
                    </label>
                    <textarea
                      rows={3}
                      value={formConfigJson}
                      onChange={(e) => setFormConfigJson(e.target.value)}
                      placeholder='{"threshold": 100}'
                      className="w-full px-3 py-2 text-xs font-mono bg-stone-50 border border-stone-200 rounded-lg text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900 focus:bg-white"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
                    <button
                      type="button"
                      onClick={() => setIsFlagModalOpen(false)}
                      className="px-3 py-1.5 text-xs text-stone-600 hover:text-stone-900 font-medium"
                    >
                      Cancel
                    </button>
                    <MotionButton
                      type="submit"
                      variant="primary"
                      disabled={upsertFlagMutation.isPending}
                      className="!px-4 !py-2 !text-xs !bg-stone-900 hover:!bg-stone-800"
                    >
                      {upsertFlagMutation.isPending ? 'Saving...' : 'Apply Override'}
                    </MotionButton>
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
