import React, { useState } from 'react';
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
    <div className="space-y-8 max-w-7xl">
      {/* Header */}
      <SlideUp>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-stone-900 tracking-tight">
              Restaurant Tenants
            </h1>
            <p className="mt-1 text-sm text-stone-500">
              Manage dining establishments, configure onboarding, and monitor account health.
            </p>
          </div>

          {isSuperAdmin && (
            <div className="flex items-center gap-3">
              <MotionButton
                variant="primary"
                size="sm"
                onClick={() => {
                  resetForm();
                  setIsOnboardModalOpen(true);
                }}
                className="flex items-center gap-2 bg-stone-900 hover:bg-stone-800 text-white"
                aria-label="Onboard New Restaurant"
              >
                <HugeiconsIcon icon={Add01Icon} className="w-4 h-4 text-white" />
                <span>Onboard Restaurant</span>
              </MotionButton>
            </div>
          )}
        </div>
      </SlideUp>

      {/* Notifications */}
      {successMessage && (
        <FadeIn>
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HugeiconsIcon
                icon={CheckmarkCircle02Icon}
                className="w-4 h-4 text-emerald-600 shrink-0"
              />
              <span>{successMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setSuccessMessage(null)}
              className="text-emerald-500 hover:text-emerald-700"
            >
              <HugeiconsIcon icon={Cancel01Icon} className="w-4 h-4" />
            </button>
          </div>
        </FadeIn>
      )}

      {errorMessage && (
        <FadeIn>
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HugeiconsIcon icon={AlertCircleIcon} className="w-4 h-4 text-red-500 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="text-red-400 hover:text-red-700"
            >
              <HugeiconsIcon icon={Cancel01Icon} className="w-4 h-4" />
            </button>
          </div>
        </FadeIn>
      )}

      {/* Search & Status Filters */}
      <SlideUp delay={50}>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-3 rounded-2xl border border-stone-200">
          <div className="relative flex-1 max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
              <HugeiconsIcon icon={Search01Icon} className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by restaurant name or slug..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-stone-900 text-stone-900 placeholder:text-stone-400 transition-colors"
            />
          </div>

          <div className="flex items-center gap-1.5">
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
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  statusFilter === tab.id
                    ? 'bg-stone-900 text-white shadow-xs'
                    : 'text-stone-600 hover:bg-stone-100'
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
        <div className="p-12 text-center text-stone-400 text-sm">
          Loading restaurants directory...
        </div>
      )}

      {isError && (
        <div className="p-8 text-center bg-white border border-red-200 rounded-2xl">
          <p className="text-sm font-medium text-red-700">Failed to load restaurants.</p>
          <MotionButton variant="outline" size="sm" onClick={() => refetch()} className="mt-4">
            Retry
          </MotionButton>
        </div>
      )}

      {/* Table */}
      {restaurantsData && (
        <SlideUp delay={100}>
          <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-xs">
            {restaurantsData.restaurants.length === 0 ? (
              <div className="p-12 text-center text-xs text-stone-400">
                No restaurant establishments found matching your filter criteria.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-50 text-stone-500 border-b border-stone-200">
                    <tr>
                      <th className="py-3 px-6 font-medium">Establishment</th>
                      <th className="py-3 px-6 font-medium">Slug / Identifier</th>
                      <th className="py-3 px-6 font-medium">Status</th>
                      <th className="py-3 px-6 font-medium">Created At</th>
                      <th className="py-3 px-6 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {restaurantsData.restaurants.map((rest) => (
                      <tr key={rest.id} className="hover:bg-stone-50/60">
                        <td className="py-3.5 px-6 font-medium text-stone-900">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-700 shrink-0">
                              <HugeiconsIcon icon={Store01Icon} className="w-4 h-4" />
                            </div>
                            <div>
                              <span className="block font-semibold text-stone-900">
                                {rest.name}
                              </span>
                              <span className="text-[11px] text-stone-400 block truncate max-w-xs">
                                {rest.googleReviewUrl}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-6 font-mono text-stone-600">
                          <span className="px-2 py-0.5 rounded-md bg-stone-100 border border-stone-200 text-[11px]">
                            {rest.slug}
                          </span>
                        </td>
                        <td className="py-3.5 px-6">
                          {rest.deletedAt ? (
                            <Badge variant="neutral">Deleted</Badge>
                          ) : rest.isSuspended ? (
                            <div className="flex flex-col gap-0.5">
                              <Badge variant="danger">Suspended</Badge>
                              {rest.suspensionReason && (
                                <span className="text-[10px] text-stone-400 truncate max-w-xs">
                                  {rest.suspensionReason}
                                </span>
                              )}
                            </div>
                          ) : (
                            <Badge variant="success">Active</Badge>
                          )}
                        </td>
                        <td className="py-3.5 px-6 text-stone-500 font-mono">
                          {new Date(rest.createdAt).toISOString().slice(0, 10)}
                        </td>
                        <td className="py-3.5 px-6 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            {/* Impersonate button */}
                            <button
                              type="button"
                              className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors flex items-center gap-1"
                              title="Support Impersonation"
                            >
                              <HugeiconsIcon icon={UserCheck01Icon} className="w-3.5 h-3.5" />
                              <span>Impersonate</span>
                            </button>

                            {isSuperAdmin && !rest.deletedAt && (
                              <>
                                {rest.isSuspended ? (
                                  <button
                                    type="button"
                                    onClick={() => handleReactivate(rest)}
                                    className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors"
                                  >
                                    Reactivate
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setSuspendTarget(rest)}
                                    className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-amber-50 hover:bg-amber-100 text-amber-700 transition-colors"
                                  >
                                    Suspend
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => handleDelete(rest)}
                                  className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-red-50 hover:bg-red-100 text-red-700 transition-colors"
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
      {isOnboardModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/40 backdrop-blur-xs">
          <FadeIn>
            <div className="bg-white rounded-2xl max-w-lg w-full border border-stone-200 shadow-xl overflow-hidden">
              <div className="p-5 border-b border-stone-200 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-stone-900">Onboard New Restaurant</h2>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Provisions establishment, root table QR, and initial owner user.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOnboardModalOpen(false)}
                  className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100"
                  aria-label="Close modal"
                >
                  <HugeiconsIcon icon={Cancel01Icon} className="w-5 h-5" />
                </button>
              </div>

              <form
                onSubmit={handleOnboardSubmit}
                className="p-6 space-y-4 max-h-[75vh] overflow-y-auto"
              >
                {errorMessage && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
                    <HugeiconsIcon
                      icon={AlertCircleIcon}
                      className="w-4 h-4 text-red-500 shrink-0 mt-0.5"
                    />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <div className="space-y-3">
                  <h3 className="text-xs font-semibold text-stone-700 uppercase tracking-wider">
                    Establishment Profile
                  </h3>

                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-1">
                      Restaurant Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formName}
                      onChange={(e) => handleNameChange(e.target.value)}
                      placeholder="e.g. The Bombay Canteen"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-stone-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-1">
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
                      className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-stone-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-1">
                      Google Review Write URL *
                    </label>
                    <input
                      type="url"
                      required
                      value={formReviewUrl}
                      onChange={(e) => setFormReviewUrl(e.target.value)}
                      placeholder="https://maps.app.goo.gl/..."
                      className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-stone-900"
                    />
                    <span className="text-[11px] text-stone-400 mt-1 block">
                      Must be a valid Google Maps / Place review link (un-gated).
                    </span>
                  </div>
                </div>

                <div className="space-y-3 pt-3 border-t border-stone-100">
                  <h3 className="text-xs font-semibold text-stone-700 uppercase tracking-wider">
                    Initial Owner Credentials
                  </h3>

                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-1">
                      Owner Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formOwnerName}
                      onChange={(e) => setFormOwnerName(e.target.value)}
                      placeholder="e.g. Sameer Seth"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-stone-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-1">
                      Owner Email *
                    </label>
                    <input
                      type="email"
                      required
                      value={formOwnerEmail}
                      onChange={(e) => setFormOwnerEmail(e.target.value)}
                      placeholder="owner@establishment.com"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-stone-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-1">
                      Initial Temporary Password *
                    </label>
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={formOwnerPassword}
                      onChange={(e) => setFormOwnerPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-stone-900"
                    />
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-end gap-2 border-t border-stone-100">
                  <MotionButton
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsOnboardModalOpen(false)}
                  >
                    Cancel
                  </MotionButton>
                  <MotionButton
                    type="submit"
                    variant="primary"
                    size="sm"
                    disabled={onboardMutation.isPending}
                    className="bg-stone-900 hover:bg-stone-800 text-white"
                  >
                    {onboardMutation.isPending ? 'Provisioning...' : 'Provision Restaurant'}
                  </MotionButton>
                </div>
              </form>
            </div>
          </FadeIn>
        </div>
      )}

      {/* Suspend Confirmation Modal */}
      {suspendTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/40 backdrop-blur-xs">
          <FadeIn>
            <div className="bg-white rounded-2xl max-w-md w-full border border-stone-200 shadow-xl overflow-hidden p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
                  <HugeiconsIcon icon={AlertCircleIcon} className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-stone-900">
                    Suspend &quot;{suspendTarget.name}&quot;
                  </h3>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Suspension will immediately disable customer QR placards.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  Reason for Suspension (Optional)
                </label>
                <textarea
                  rows={3}
                  value={suspensionReason}
                  onChange={(e) => setSuspensionReason(e.target.value)}
                  placeholder="e.g. Overdue payment on flat monthly plan, temporary operational shutdown..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-stone-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <MotionButton
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSuspendTarget(null)}
                >
                  Cancel
                </MotionButton>
                <MotionButton
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={handleSuspendConfirm}
                  disabled={statusMutation.isPending}
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                >
                  {statusMutation.isPending ? 'Suspending...' : 'Confirm Suspension'}
                </MotionButton>
              </div>
            </div>
          </FadeIn>
        </div>
      )}
    </div>
  );
};
