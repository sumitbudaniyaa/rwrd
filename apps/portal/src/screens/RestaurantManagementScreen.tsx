import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Store01Icon,
  Search01Icon,
  Add01Icon,
  AlertCircleIcon,
  CheckmarkCircle02Icon,
  Cancel01Icon,
  UserCheck01Icon,
} from '@hugeicons/core-free-icons';
import { SlideUp, FadeIn, Badge, MotionButton } from '@tiptable/ui';
import { useAuth } from '../context/AuthContext.js';
import { portalEnv } from '../config/env.js';
import { api, type PortalRestaurantItem, type OnboardRestaurantInput } from '../services/api.js';

type StatusFilter = 'all' | 'active' | 'suspended';

export const RestaurantManagementScreen: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [isOnboardModalOpen, setIsOnboardModalOpen] = useState(false);
  const [suspendTarget, setSuspendTarget] = useState<PortalRestaurantItem | null>(null);
  const [suspensionReason, setSuspensionReason] = useState('');
  const [impersonateTarget, setImpersonateTarget] = useState<PortalRestaurantItem | null>(null);
  const [impersonateReason, setImpersonateReason] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form State for Onboarding
  const [formName, setFormName] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formReviewUrl, setFormReviewUrl] = useState('');
  const [formOwnerName, setFormOwnerName] = useState('');
  const [formOwnerEmail, setFormOwnerEmail] = useState('');
  const [formOwnerPassword, setFormOwnerPassword] = useState('');

  const {
    data: restaurantsData,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['portal-restaurants', search, statusFilter],
    queryFn: () => {
      const params: { search?: string; status?: string } = {};
      if (search) params.search = search;
      if (statusFilter !== 'all') params.status = statusFilter;
      return api.getRestaurants(params);
    },
  });

  // Onboarding Mutation
  const onboardMutation = useMutation({
    mutationFn: (data: OnboardRestaurantInput) => api.onboardRestaurant(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['portal-restaurants'] });
      setIsOnboardModalOpen(false);
      resetForm();
      setSuccessMessage(
        `Successfully onboarded "${data.restaurant.name}". Owner credentials generated for ${data.owner.email}.`,
      );
    },
    onError: (err) => {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to onboard restaurant.');
    },
  });

  // Status Mutation (Suspend / Reactivate)
  const statusMutation = useMutation({
    mutationFn: ({
      id,
      action,
      reason,
    }: {
      id: string;
      action: 'suspend' | 'reactivate';
      reason?: string;
    }) => api.updateRestaurantStatus(id, action, reason),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['portal-restaurants'] });
      setSuspendTarget(null);
      setSuspensionReason('');
      setSuccessMessage(
        vars.action === 'suspend'
          ? 'Restaurant has been suspended.'
          : 'Restaurant has been reactivated.',
      );
    },
    onError: (err) => {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to update restaurant status.');
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteRestaurant(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal-restaurants'] });
      setSuccessMessage('Restaurant has been soft-deleted.');
    },
    onError: (err) => {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to delete restaurant.');
    },
  });

  // Impersonate Mutation
  const impersonateMutation = useMutation({
    mutationFn: (vars: { id: string; reason?: string }) =>
      api.impersonateRestaurant(vars.id, vars.reason),
    onSuccess: (res) => {
      setImpersonateTarget(null);
      setImpersonateReason('');
      setSuccessMessage(
        `Impersonation session established for ${res.restaurant.name}. Launching admin console...`,
      );
      const adminUrl = `${portalEnv.VITE_ADMIN_APP_URL}/admin?impersonate_token=${encodeURIComponent(
        res.impersonationToken,
      )}`;
      window.open(adminUrl, '_blank', 'noopener,noreferrer');
    },
    onError: (err) => {
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to create impersonation session.',
      );
    },
  });

  const handleImpersonateConfirm = () => {
    if (!impersonateTarget) return;
    const payload: { id: string; reason?: string } = {
      id: impersonateTarget.id,
    };
    if (impersonateReason.trim()) {
      payload.reason = impersonateReason.trim();
    }
    impersonateMutation.mutate(payload);
  };

  const resetForm = () => {
    setFormName('');
    setFormSlug('');
    setFormReviewUrl('');
    setFormOwnerName('');
    setFormOwnerEmail('');
    setFormOwnerPassword('');
    setErrorMessage(null);
  };

  const handleNameChange = (val: string) => {
    setFormName(val);
    if (!formSlug) {
      const autoSlug = val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      setFormSlug(autoSlug);
    }
  };

  const handleOnboardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const payload: OnboardRestaurantInput = {
      name: formName.trim(),
      slug: formSlug.trim(),
      googleReviewUrl: formReviewUrl.trim(),
      ownerFullName: formOwnerName.trim(),
      ownerEmail: formOwnerEmail.trim(),
      ownerPassword: formOwnerPassword,
    };

    onboardMutation.mutate(payload);
  };

  const handleSuspendConfirm = () => {
    if (!suspendTarget) return;
    const payload: { id: string; action: 'suspend'; reason?: string } = {
      id: suspendTarget.id,
      action: 'suspend',
    };
    if (suspensionReason.trim()) {
      payload.reason = suspensionReason.trim();
    }
    statusMutation.mutate(payload);
  };

  const handleReactivate = (target: PortalRestaurantItem) => {
    statusMutation.mutate({
      id: target.id,
      action: 'reactivate',
    });
  };

  const handleDelete = (target: PortalRestaurantItem) => {
    if (window.confirm(`Are you sure you want to soft-delete "${target.name}"?`)) {
      deleteMutation.mutate(target.id);
    }
  };

  const isSuperAdmin = user?.role === 'super_admin';

  return (
    <div className="space-y-6 max-w-7xl font-sans">
      {/* Header */}
      <SlideUp>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white dark:bg-stone-900 p-5 rounded-2xl border border-stone-200/80 dark:border-stone-800 shadow-2xs transition-colors duration-200">
          <div>
            <h1 className="text-xl font-semibold text-stone-900 dark:text-stone-100 tracking-tight">
              Restaurant Tenants
            </h1>
            <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">
              Manage dining establishments, configure onboarding, and monitor account health.
            </p>
          </div>

          {isSuperAdmin && (
            <div className="flex items-center gap-2">
              <MotionButton
                variant="primary"
                size="sm"
                onClick={() => {
                  resetForm();
                  setIsOnboardModalOpen(true);
                }}
                className="flex items-center gap-1.5 bg-stone-900 hover:bg-black text-white dark:bg-white dark:hover:bg-stone-100 dark:text-stone-900 px-3 py-1.5 text-xs font-medium rounded-lg shadow-2xs transition-all"
                aria-label="Onboard New Restaurant"
              >
                <HugeiconsIcon
                  icon={Add01Icon}
                  className="w-3.5 h-3.5 text-white dark:text-stone-900"
                />
                <span>Onboard Restaurant</span>
              </MotionButton>
            </div>
          )}
        </div>
      </SlideUp>

      {/* Notifications */}
      {successMessage && (
        <FadeIn>
          <div className="p-3 bg-emerald-500/10 dark:bg-emerald-950/40 border border-emerald-500/20 dark:border-emerald-900 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HugeiconsIcon
                icon={CheckmarkCircle02Icon}
                className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0"
              />
              <span>{successMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setSuccessMessage(null)}
              className="text-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-300"
            >
              <HugeiconsIcon icon={Cancel01Icon} className="w-4 h-4" />
            </button>
          </div>
        </FadeIn>
      )}

      {errorMessage && (
        <FadeIn>
          <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl text-xs text-red-700 dark:text-red-300 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HugeiconsIcon icon={AlertCircleIcon} className="w-4 h-4 text-red-500 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="text-red-400 hover:text-red-700 dark:hover:text-red-300"
            >
              <HugeiconsIcon icon={Cancel01Icon} className="w-4 h-4" />
            </button>
          </div>
        </FadeIn>
      )}

      {/* Search & Status Filters */}
      <SlideUp delay={50}>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-stone-900 p-2.5 rounded-xl border border-stone-200/80 dark:border-stone-800 shadow-2xs transition-colors duration-200">
          <div className="relative flex-1 max-w-md">
            <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-stone-400 dark:text-stone-500">
              <HugeiconsIcon icon={Search01Icon} className="w-3.5 h-3.5" />
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by restaurant name or slug..."
              className="w-full pl-8 pr-3 py-1 text-xs rounded-xl border border-stone-200/90 hover:border-stone-300 dark:border-stone-700 dark:hover:border-stone-600 bg-stone-50/70 dark:bg-stone-800/60 focus:bg-white dark:focus:bg-stone-800 focus:border-stone-400 dark:focus:border-stone-500 focus:shadow-[0_0_0_3px_rgba(0,0,0,0.04)] outline-none transition-all duration-200 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 h-8"
            />
          </div>

          <div className="flex items-center gap-1">
            {(
              [
                { id: 'all', label: 'All' },
                { id: 'active', label: 'Active' },
                { id: 'suspended', label: 'Suspended' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                  statusFilter === tab.id
                    ? 'bg-stone-900 dark:bg-white text-white dark:text-stone-900 shadow-2xs'
                    : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </SlideUp>

      {/* Loading & Error States */}
      {isLoading && (
        <div className="p-8 text-center text-stone-400 dark:text-stone-500 text-xs bg-white dark:bg-stone-900 rounded-xl border border-stone-200/70 dark:border-stone-800">
          Loading restaurants directory...
        </div>
      )}

      {isError && (
        <div className="p-6 text-center bg-white dark:bg-stone-900 border border-red-200 dark:border-red-900 rounded-xl">
          <p className="text-xs font-medium text-red-700 dark:text-red-400">
            Failed to load restaurants.
          </p>
          <MotionButton
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="mt-3 text-xs text-stone-700 dark:text-stone-300 bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-700"
          >
            Retry
          </MotionButton>
        </div>
      )}

      {/* Table */}
      {restaurantsData && (
        <SlideUp delay={100}>
          <div className="bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 rounded-xl overflow-hidden shadow-2xs transition-colors duration-200">
            {restaurantsData.restaurants.length === 0 ? (
              <div className="p-10 text-center text-xs text-stone-400 dark:text-stone-500">
                No restaurant establishments found matching your filter criteria.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-50/80 dark:bg-stone-800/80 text-stone-500 dark:text-stone-400 border-b border-stone-200 dark:border-stone-800 text-[11px] uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="py-2.5 px-4">Establishment</th>
                      <th className="py-2.5 px-4">Slug / Identifier</th>
                      <th className="py-2.5 px-4">Status</th>
                      <th className="py-2.5 px-4">Created At</th>
                      <th className="py-2.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                    {restaurantsData.restaurants.map((rest) => (
                      <tr
                        key={rest.id}
                        className="hover:bg-stone-50/60 dark:hover:bg-stone-800/50 transition-colors"
                      >
                        <td className="py-3 px-4 font-medium text-stone-900 dark:text-stone-100">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-stone-100 dark:bg-stone-800 border border-stone-200/60 dark:border-stone-700 flex items-center justify-center text-stone-700 dark:text-stone-300 shrink-0">
                              <HugeiconsIcon icon={Store01Icon} className="w-3.5 h-3.5" />
                            </div>
                            <div>
                              <span className="block font-semibold text-stone-900 dark:text-stone-100">
                                {rest.name}
                              </span>
                              <span className="text-[10px] text-stone-400 dark:text-stone-500 block truncate max-w-xs font-mono">
                                {rest.googleReviewUrl}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono text-stone-600 dark:text-stone-300">
                          <span className="px-2 py-0.5 rounded-md bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-[11px]">
                            {rest.slug}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {rest.deletedAt ? (
                            <Badge variant="neutral">Deleted</Badge>
                          ) : rest.isSuspended ? (
                            <div className="flex flex-col gap-0.5">
                              <Badge variant="danger">Suspended</Badge>
                              {rest.suspensionReason && (
                                <span className="text-[10px] text-stone-400 dark:text-stone-500 truncate max-w-xs">
                                  {rest.suspensionReason}
                                </span>
                              )}
                            </div>
                          ) : (
                            <Badge variant="success">Active</Badge>
                          )}
                        </td>
                        <td className="py-3 px-4 text-stone-500 dark:text-stone-400 font-mono text-[11px]">
                          {new Date(rest.createdAt).toISOString().slice(0, 10)}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Impersonate button */}
                            <button
                              type="button"
                              onClick={() => setImpersonateTarget(rest)}
                              className="px-2 py-1 rounded-md text-[11px] font-medium bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 transition-colors flex items-center gap-1 cursor-pointer"
                              title="Support Impersonation"
                            >
                              <HugeiconsIcon icon={UserCheck01Icon} className="w-3 h-3" />
                              <span>Impersonate</span>
                            </button>

                            {isSuperAdmin && !rest.deletedAt && (
                              <>
                                {rest.isSuspended ? (
                                  <button
                                    type="button"
                                    onClick={() => handleReactivate(rest)}
                                    className="px-2 py-1 rounded-md text-[11px] font-medium bg-emerald-500/10 hover:bg-emerald-500/20 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border border-emerald-500/20 dark:border-emerald-800 transition-colors"
                                  >
                                    Reactivate
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setSuspendTarget(rest)}
                                    className="px-2 py-1 rounded-md text-[11px] font-medium bg-amber-500/10 hover:bg-amber-500/20 dark:bg-amber-950/40 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-300 border border-amber-500/20 dark:border-amber-800 transition-colors"
                                  >
                                    Suspend
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => handleDelete(rest)}
                                  className="px-2 py-1 rounded-md text-[11px] font-medium bg-rose-500/10 hover:bg-rose-500/20 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-800 dark:text-rose-300 border border-rose-500/20 dark:border-rose-800 transition-colors"
                                >
                                  Delete
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </SlideUp>
      )}

      {/* Onboard Restaurant Modal */}
      {isOnboardModalOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-stone-900/40 dark:bg-black/70 backdrop-blur-xs animate-fade-in font-sans">
            <FadeIn>
              <div className="bg-white dark:bg-stone-900 rounded-xl max-w-lg w-full border border-stone-200/90 dark:border-stone-800 shadow-xl overflow-hidden transition-colors duration-200">
                <div className="p-4 border-b border-stone-200/70 dark:border-stone-800 flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                      Onboard New Restaurant
                    </h2>
                    <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
                      Provisions establishment, root table QR, and initial owner user.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsOnboardModalOpen(false)}
                    className="p-1 rounded-lg text-stone-400 dark:text-stone-500 hover:text-stone-700 dark:hover:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                    aria-label="Close modal"
                  >
                    <HugeiconsIcon icon={Cancel01Icon} className="w-4 h-4" />
                  </button>
                </div>

                <form
                  onSubmit={handleOnboardSubmit}
                  className="p-5 space-y-4 max-h-[75vh] overflow-y-auto"
                >
                  {errorMessage && (
                    <div className="p-2.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-lg text-xs text-red-700 dark:text-red-300 flex items-start gap-2">
                      <HugeiconsIcon
                        icon={AlertCircleIcon}
                        className="w-4 h-4 text-red-500 shrink-0 mt-0.5"
                      />
                      <span>{errorMessage}</span>
                    </div>
                  )}

                  <div className="space-y-2.5">
                    <h3 className="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider">
                      Establishment Profile
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-medium text-stone-700 dark:text-stone-300 mb-1">
                          Restaurant Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={formName}
                          onChange={(e) => handleNameChange(e.target.value)}
                          placeholder="e.g. The Bombay Canteen"
                          className="w-full px-3 py-1.5 text-xs rounded-xl border border-stone-200/90 dark:border-stone-700 hover:border-stone-300 dark:hover:border-stone-600 bg-stone-50/70 dark:bg-stone-800/60 focus:bg-white dark:focus:bg-stone-800 focus:border-stone-400 dark:focus:border-stone-500 focus:shadow-[0_0_0_3px_rgba(0,0,0,0.04)] dark:focus:shadow-[0_0_0_3px_rgba(255,255,255,0.04)] outline-none transition-all duration-200 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 h-8.5"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-stone-700 dark:text-stone-300 mb-1">
                          URL Slug *
                        </label>
                        <input
                          type="text"
                          required
                          value={formSlug}
                          onChange={(e) =>
                            setFormSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
                          }
                          placeholder="e.g. the-bombay-canteen"
                          className="w-full px-3 py-1.5 text-xs font-mono rounded-xl border border-stone-200/90 dark:border-stone-700 hover:border-stone-300 dark:hover:border-stone-600 bg-stone-50/70 dark:bg-stone-800/60 focus:bg-white dark:focus:bg-stone-800 focus:border-stone-400 dark:focus:border-stone-500 focus:shadow-[0_0_0_3px_rgba(0,0,0,0.04)] dark:focus:shadow-[0_0_0_3px_rgba(255,255,255,0.04)] outline-none transition-all duration-200 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 h-8.5"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-stone-700 dark:text-stone-300 mb-1">
                        Google Review Write URL *
                      </label>
                      <input
                        type="url"
                        required
                        value={formReviewUrl}
                        onChange={(e) => setFormReviewUrl(e.target.value)}
                        placeholder="https://maps.app.goo.gl/..."
                        className="w-full px-3 py-1.5 text-xs rounded-xl border border-stone-200/90 dark:border-stone-700 hover:border-stone-300 dark:hover:border-stone-600 bg-stone-50/70 dark:bg-stone-800/60 focus:bg-white dark:focus:bg-stone-800 focus:border-stone-400 dark:focus:border-stone-500 focus:shadow-[0_0_0_3px_rgba(0,0,0,0.04)] dark:focus:shadow-[0_0_0_3px_rgba(255,255,255,0.04)] outline-none transition-all duration-200 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 h-8.5"
                      />
                      <span className="text-[10px] text-stone-400 dark:text-stone-500 mt-1 block">
                        Must be a valid Google Maps / Place review link (un-gated).
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2.5 pt-3 border-t border-stone-100 dark:border-stone-800">
                    <h3 className="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider">
                      Initial Owner Credentials
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-medium text-stone-700 dark:text-stone-300 mb-1">
                          Owner Full Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={formOwnerName}
                          onChange={(e) => setFormOwnerName(e.target.value)}
                          placeholder="e.g. Sameer Seth"
                          className="w-full px-3 py-1.5 text-xs rounded-xl border border-stone-200/90 dark:border-stone-700 hover:border-stone-300 dark:hover:border-stone-600 bg-stone-50/70 dark:bg-stone-800/60 focus:bg-white dark:focus:bg-stone-800 focus:border-stone-400 dark:focus:border-stone-500 focus:shadow-[0_0_0_3px_rgba(0,0,0,0.04)] dark:focus:shadow-[0_0_0_3px_rgba(255,255,255,0.04)] outline-none transition-all duration-200 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 h-8.5"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-stone-700 dark:text-stone-300 mb-1">
                          Owner Email *
                        </label>
                        <input
                          type="email"
                          required
                          value={formOwnerEmail}
                          onChange={(e) => setFormOwnerEmail(e.target.value)}
                          placeholder="owner@establishment.com"
                          className="w-full px-3 py-1.5 text-xs rounded-xl border border-stone-200/90 dark:border-stone-700 hover:border-stone-300 dark:hover:border-stone-600 bg-stone-50/70 dark:bg-stone-800/60 focus:bg-white dark:focus:bg-stone-800 focus:border-stone-400 dark:focus:border-stone-500 focus:shadow-[0_0_0_3px_rgba(0,0,0,0.04)] dark:focus:shadow-[0_0_0_3px_rgba(255,255,255,0.04)] outline-none transition-all duration-200 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 h-8.5"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-stone-700 dark:text-stone-300 mb-1">
                        Initial Temporary Password *
                      </label>
                      <input
                        type="password"
                        required
                        minLength={8}
                        value={formOwnerPassword}
                        onChange={(e) => setFormOwnerPassword(e.target.value)}
                        placeholder="At least 8 characters"
                        className="w-full px-3 py-1.5 text-xs rounded-xl border border-stone-200/90 dark:border-stone-700 hover:border-stone-300 dark:hover:border-stone-600 bg-stone-50/70 dark:bg-stone-800/60 focus:bg-white dark:focus:bg-stone-800 focus:border-stone-400 dark:focus:border-stone-500 focus:shadow-[0_0_0_3px_rgba(0,0,0,0.04)] dark:focus:shadow-[0_0_0_3px_rgba(255,255,255,0.04)] outline-none transition-all duration-200 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 h-8.5"
                      />
                    </div>
                  </div>

                  <div className="pt-3 flex items-center justify-end gap-2 border-t border-stone-100 dark:border-stone-800">
                    <MotionButton
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsOnboardModalOpen(false)}
                      className="px-3 py-1.5 text-xs text-stone-700 dark:text-stone-300 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg hover:bg-stone-50 dark:hover:bg-stone-700/80 transition-colors"
                    >
                      Cancel
                    </MotionButton>
                    <MotionButton
                      type="submit"
                      variant="primary"
                      size="sm"
                      disabled={onboardMutation.isPending}
                      className="bg-stone-900 hover:bg-black text-white dark:bg-white dark:hover:bg-stone-100 dark:text-stone-900 px-3.5 py-1.5 text-xs font-medium rounded-lg shadow-2xs transition-all"
                    >
                      {onboardMutation.isPending ? 'Provisioning...' : 'Provision Restaurant'}
                    </MotionButton>
                  </div>
                </form>
              </div>
            </FadeIn>
          </div>,
          document.body,
        )}

      {/* Suspend Confirmation Modal */}
      {suspendTarget &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-stone-900/40 dark:bg-black/70 backdrop-blur-xs animate-fade-in font-sans">
            <FadeIn>
              <div className="bg-white dark:bg-stone-900 rounded-xl max-w-md w-full border border-stone-200/90 dark:border-stone-800 shadow-xl overflow-hidden p-5 space-y-3.5 transition-colors duration-200">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 dark:bg-amber-950/40 border border-amber-500/20 dark:border-amber-900 flex items-center justify-center text-amber-700 dark:text-amber-400 shrink-0">
                    <HugeiconsIcon icon={AlertCircleIcon} className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                      Suspend &quot;{suspendTarget.name}&quot;
                    </h3>
                    <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
                      Suspension will immediately disable customer QR placards.
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1">
                    Reason for Suspension (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={suspensionReason}
                    onChange={(e) => setSuspensionReason(e.target.value)}
                    placeholder="e.g. Overdue payment on flat monthly plan, temporary operational shutdown..."
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-stone-200/90 dark:border-stone-700 hover:border-stone-300 dark:hover:border-stone-600 bg-stone-50/70 dark:bg-stone-800/60 focus:bg-white dark:focus:bg-stone-800 focus:border-stone-400 dark:focus:border-stone-500 focus:shadow-[0_0_0_3px_rgba(0,0,0,0.04)] outline-none transition-all duration-200 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100 dark:border-stone-800">
                  <MotionButton
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setSuspendTarget(null)}
                    className="px-3 py-1.5 text-xs text-stone-700 dark:text-stone-300 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg hover:bg-stone-50 dark:hover:bg-stone-700/80 transition-colors"
                  >
                    Cancel
                  </MotionButton>
                  <MotionButton
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={handleSuspendConfirm}
                    disabled={statusMutation.isPending}
                    className="bg-amber-600 hover:bg-amber-700 text-white px-3.5 py-1.5 text-xs font-medium rounded-lg shadow-2xs transition-all"
                  >
                    {statusMutation.isPending ? 'Suspending...' : 'Confirm Suspension'}
                  </MotionButton>
                </div>
              </div>
            </FadeIn>
          </div>,
          document.body,
        )}

      {/* Support Impersonation Modal */}
      {impersonateTarget &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-stone-900/40 dark:bg-black/70 backdrop-blur-xs animate-fade-in font-sans">
            <FadeIn>
              <div className="bg-white dark:bg-stone-900 rounded-xl max-w-md w-full border border-stone-200/90 dark:border-stone-800 shadow-xl overflow-hidden p-5 space-y-3.5 transition-colors duration-200">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 flex items-center justify-center text-stone-800 dark:text-stone-200 shrink-0">
                    <HugeiconsIcon icon={UserCheck01Icon} className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                      Enter Support Impersonation Mode: &quot;{impersonateTarget.name}&quot;
                    </h3>
                    <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
                      Delegated live session. All actions are strictly audited.
                    </p>
                  </div>
                </div>

                <div className="p-2.5 bg-amber-500/10 dark:bg-amber-950/40 border border-amber-500/20 dark:border-amber-900 rounded-lg text-xs text-amber-800 dark:text-amber-300 space-y-1">
                  <p className="font-semibold flex items-center gap-1.5 text-[11px]">
                    <HugeiconsIcon
                      icon={AlertCircleIcon}
                      className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0"
                    />
                    <span>Support Delegation Security Notice</span>
                  </p>
                  <p className="text-[10px] leading-relaxed text-amber-700 dark:text-amber-400">
                    You are entering this restaurant&apos;s administration account as a delegated
                    owner. A high-visibility warning banner will be displayed throughout your
                    session.
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-stone-700 dark:text-stone-300 mb-1">
                    Support Ticket Reference / Reason (Optional)
                  </label>
                  <input
                    type="text"
                    value={impersonateReason}
                    onChange={(e) => setImpersonateReason(e.target.value)}
                    placeholder="e.g. Ticket #4021 - Staff onboarding assistance"
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-stone-200/90 dark:border-stone-700 hover:border-stone-300 dark:hover:border-stone-600 bg-stone-50/70 dark:bg-stone-800/60 focus:bg-white dark:focus:bg-stone-800 focus:border-stone-400 dark:focus:border-stone-500 focus:shadow-[0_0_0_3px_rgba(0,0,0,0.04)] dark:focus:shadow-[0_0_0_3px_rgba(255,255,255,0.04)] outline-none transition-all duration-200 h-8.5 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100 dark:border-stone-800">
                  <MotionButton
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setImpersonateTarget(null);
                      setImpersonateReason('');
                    }}
                    className="px-3 py-1.5 text-xs text-stone-700 dark:text-stone-300 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg hover:bg-stone-50 dark:hover:bg-stone-700/80 transition-colors"
                  >
                    Cancel
                  </MotionButton>
                  <MotionButton
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={handleImpersonateConfirm}
                    disabled={impersonateMutation.isPending}
                    className="bg-stone-900 hover:bg-black text-white dark:bg-white dark:hover:bg-stone-100 dark:text-stone-900 px-3.5 py-1.5 text-xs font-medium rounded-lg shadow-2xs transition-all"
                  >
                    {impersonateMutation.isPending ? 'Delegating...' : 'Launch Admin Session'}
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
