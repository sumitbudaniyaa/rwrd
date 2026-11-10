import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Invoice01Icon,
  CreditCardIcon,
  Search01Icon,
  Add01Icon,
  AlertCircleIcon,
  CheckmarkCircle02Icon,
  Cancel01Icon,
  RefreshIcon,
  AlertSquareIcon,
  Edit01Icon,
  Delete02Icon,
} from '@hugeicons/core-free-icons';
import { SlideUp, FadeIn, MotionButton } from '@tiptable/ui';
import { Badge } from '../components/Badge.js';
import { useAuth } from '../context/AuthContext.js';
import {
  api,
  type SubscriptionItem,
  type InvoiceItem,
  type CreateInvoiceInput,
  type BillingPlanItem,
  type UpdateBillingPlanInput,
} from '../services/api.js';

type Tab = 'subscriptions' | 'invoices' | 'plans';
type SubStatusFilter = 'all' | 'active' | 'unpaid' | 'trial' | 'past_due' | 'cancelled';
type InvoiceStatusFilter = 'all' | 'unpaid' | 'paid' | 'void';

export const BillingManagementScreen: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const isRestrictedRole = user?.role === 'support';

  // Navigation & Filter State
  const [activeTab, setActiveTab] = useState<Tab>('subscriptions');
  const [subSearch, setSubSearch] = useState('');
  const [subStatusFilter, setSubStatusFilter] = useState<SubStatusFilter>('all');
  const [subPlanFilter, setSubPlanFilter] = useState<string>('all');
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<InvoiceStatusFilter>('all');
  const [invoiceSearch, setInvoiceSearch] = useState('');

  // Modals & Feedback State
  const [isCreateInvoiceOpen, setIsCreateInvoiceOpen] = useState(false);
  const [isSweepModalOpen, setIsSweepModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<BillingPlanItem | null>(null);
  const [planToDelete, setPlanToDelete] = useState<BillingPlanItem | null>(null);
  const [editPlanName, setEditPlanName] = useState('');
  const [editPlanPrice, setEditPlanPrice] = useState<number>(0);
  const [editPlanMonthlyFee, setEditPlanMonthlyFee] = useState<number>(0);
  const [editPlanIsActive, setEditPlanIsActive] = useState<boolean>(true);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Create Invoice Form State
  const [formRestaurantId, setFormRestaurantId] = useState('');
  const [formAmountInr, setFormAmountInr] = useState(999);
  const [formDueDate, setFormDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().slice(0, 10);
  });
  const [formNotes, setFormNotes] = useState('');

  // Fetch Billing Plans
  const { data: plansData, refetch: refetchPlans } = useQuery({
    queryKey: ['portal-plans-all'],
    queryFn: () => api.getBillingPlans({ all: true }),
  });

  // Fetch Subscriptions with filters
  const {
    data: subsData,
    isLoading: isLoadingSubs,
    refetch: refetchSubs,
  } = useQuery({
    queryKey: ['portal-subscriptions', subStatusFilter, subPlanFilter, subSearch],
    queryFn: () => {
      const params: { status?: string; planId?: string; search?: string } = {};
      if (subStatusFilter !== 'all') params.status = subStatusFilter;
      if (subPlanFilter !== 'all') params.planId = subPlanFilter;
      if (subSearch.trim()) params.search = subSearch.trim();
      return api.getSubscriptions(params);
    },
  });

  // Edit Plan Price Mutation
  const updatePlanMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateBillingPlanInput }) =>
      api.updateBillingPlan(id, data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['portal-plans-all'] });
      queryClient.invalidateQueries({ queryKey: ['portal-plans'] });
      queryClient.invalidateQueries({ queryKey: ['portal-subscriptions'] });
      setEditingPlan(null);
      setSuccessMessage(`Pricing for "${res.plan.name}" updated to ₹${res.plan.priceInr}.`);
    },
    onError: (err) => {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to update plan pricing.');
    },
  });

  // Delete Plan Mutation
  const deletePlanMutation = useMutation({
    mutationFn: (id: string) => api.deleteBillingPlan(id),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['portal-plans-all'] });
      queryClient.invalidateQueries({ queryKey: ['portal-plans'] });
      queryClient.invalidateQueries({ queryKey: ['portal-subscriptions'] });
      setPlanToDelete(null);
      setSuccessMessage(res.message);
    },
    onError: (err) => {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to delete billing plan.');
    },
  });

  // Fetch Invoices
  const {
    data: invoicesData,
    isLoading: isLoadingInvoices,
    refetch: refetchInvoices,
  } = useQuery({
    queryKey: ['portal-invoices', invoiceStatusFilter],
    queryFn: () => {
      const params: { status?: string } = {};
      if (invoiceStatusFilter !== 'all') params.status = invoiceStatusFilter;
      return api.getInvoices(params);
    },
  });

  // Fetch Restaurants for Invoice Creation dropdown
  const { data: restaurantsData } = useQuery({
    queryKey: ['portal-restaurants-dropdown'],
    queryFn: () => api.getRestaurants({ limit: 100 }),
    enabled: isCreateInvoiceOpen,
  });

  // Create Invoice Mutation
  const createInvoiceMutation = useMutation({
    mutationFn: (data: CreateInvoiceInput) => api.createInvoice(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['portal-invoices'] });
      setIsCreateInvoiceOpen(false);
      setFormRestaurantId('');
      setFormAmountInr(999);
      setFormNotes('');
      setSuccessMessage(`Invoice ${data.invoice.invoiceNumber} created successfully.`);
    },
    onError: (err) => {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to create invoice.');
    },
  });

  // Update Invoice Status Mutation (Mark Paid / Void)
  const updateInvoiceStatusMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'mark_paid' | 'void' }) =>
      api.updateInvoiceStatus(id, action),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['portal-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['portal-subscriptions'] });
      setSuccessMessage(
        `Invoice ${data.invoice.invoiceNumber} status updated to "${data.invoice.status}".`,
      );
    },
    onError: (err) => {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to update invoice status.');
    },
  });

  // Run Auto-Suspend Sweep Mutation
  const sweepMutation = useMutation({
    mutationFn: () => api.runAutoSuspendCheck(),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['portal-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['portal-subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['portal-restaurants'] });
      setIsSweepModalOpen(false);
      setSuccessMessage(
        `Grace period sweep completed. Evaluated ${result.evaluatedInvoicesCount} overdue invoice(s); newly suspended ${result.newlySuspendedCount} delinquent account(s).`,
      );
    },
    onError: (err) => {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to run auto-suspend sweep.');
    },
  });

  // Filtered Subscriptions
  const subscriptions = subsData?.subscriptions || [];
  const filteredSubs = subscriptions.filter((sub) => {
    const q = subSearch.toLowerCase();
    return (
      sub.restaurantName.toLowerCase().includes(q) ||
      sub.restaurantSlug.toLowerCase().includes(q) ||
      (sub.planName ? sub.planName.toLowerCase().includes(q) : false)
    );
  });

  // Filtered Invoices
  const invoices = invoicesData?.invoices || [];
  const filteredInvoices = invoices.filter((inv) => {
    const q = invoiceSearch.toLowerCase();
    return (
      inv.invoiceNumber.toLowerCase().includes(q) || inv.restaurantName.toLowerCase().includes(q)
    );
  });

  // Summary Metrics
  const activeSubsCount = subscriptions.filter((s) => s.status === 'active').length;
  const pastDueSubsCount = subscriptions.filter((s) => s.status === 'past_due').length;
  const unpaidInvoices = invoices.filter((i) => i.status === 'unpaid');
  const unpaidInvoicesCount = unpaidInvoices.length;
  const unpaidInvoicesSum = unpaidInvoices.reduce((acc, curr) => acc + curr.amountInr, 0);

  const getSubStatusBadge = (status: SubscriptionItem['status']) => {
    switch (status) {
      case 'active':
        return <Badge variant="success">Active</Badge>;
      case 'unpaid':
        return <Badge variant="warning">Unpaid</Badge>;
      case 'past_due':
        return <Badge variant="danger">Past Due</Badge>;
      case 'trial':
        return <Badge variant="accent">Trial</Badge>;
      case 'cancelled':
        return <Badge variant="neutral">Cancelled</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  const getAccountQrStatusBadge = (sub: SubscriptionItem) => {
    if (sub.isRestaurantSuspended) {
      return <Badge variant="danger">Suspended</Badge>;
    }
    if (sub.status === 'unpaid' || sub.isRestaurantActive === false) {
      return (
        <div className="flex flex-col items-end gap-0.5">
          <Badge variant="warning">Inactive QR</Badge>
          <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
            Pending Payment
          </span>
        </div>
      );
    }
    if (sub.status === 'past_due') {
      return (
        <div className="flex flex-col items-end gap-0.5">
          <Badge variant="warning">Paused QR</Badge>
          <span className="text-[10px] text-stone-400 dark:text-stone-500 font-medium">
            Past Due
          </span>
        </div>
      );
    }
    if (sub.status === 'cancelled') {
      return <Badge variant="neutral">Cancelled QR</Badge>;
    }
    if (sub.status === 'trial') {
      return <Badge variant="accent">Trial QR</Badge>;
    }
    return <Badge variant="success">Active QR</Badge>;
  };

  const getInvoiceStatusBadge = (status: InvoiceItem['status']) => {
    switch (status) {
      case 'paid':
        return <Badge variant="success">Paid</Badge>;
      case 'unpaid':
        return <Badge variant="warning">Unpaid</Badge>;
      case 'void':
        return <Badge variant="neutral">Void</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Actions */}
      <SlideUp delay={0.05}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <HugeiconsIcon
                icon={Invoice01Icon}
                className="w-6 h-6 text-stone-800 dark:text-stone-200"
                strokeWidth={1.5}
              />
              Billing &amp; Subscriptions
            </h1>
            <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
              Flat SaaS subscription management (0% commission on tips), invoice collection, and
              automated grace period enforcement.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-nowrap">
            {isRestrictedRole ? (
              <Badge variant="neutral">Read-only Finance Access</Badge>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setIsSweepModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/60 transition-colors shadow-2xs whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <HugeiconsIcon
                    icon={AlertSquareIcon}
                    className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400 shrink-0"
                    strokeWidth={1.5}
                  />
                  <span>Run Grace Period Sweep</span>
                </button>
                <MotionButton
                  type="button"
                  variant="primary"
                  onClick={() => setIsCreateInvoiceOpen(true)}
                  className="px-3 py-1.5 text-xs bg-stone-900 hover:bg-black text-white dark:bg-white dark:hover:bg-stone-100 dark:text-stone-900 font-medium rounded-lg shadow-2xs flex items-center gap-1.5 transition-all whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <HugeiconsIcon
                    icon={Add01Icon}
                    className="w-3.5 h-3.5 text-white dark:text-stone-900 shrink-0"
                    strokeWidth={1.5}
                  />
                  <span>Create Invoice</span>
                </MotionButton>
              </>
            )}
          </div>
        </div>
      </SlideUp>

      {/* Notifications */}
      {successMessage && (
        <FadeIn>
          <div className="flex items-center justify-between p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-900 dark:text-emerald-200 text-sm">
            <div className="flex items-center gap-2.5">
              <HugeiconsIcon
                icon={CheckmarkCircle02Icon}
                className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0"
                strokeWidth={1.5}
              />
              <span>{successMessage}</span>
            </div>
            <button
              onClick={() => setSuccessMessage(null)}
              className="text-emerald-700 hover:text-emerald-900 dark:hover:text-emerald-100"
            >
              <HugeiconsIcon icon={Cancel01Icon} className="w-4 h-4" strokeWidth={1.5} />
            </button>
          </div>
        </FadeIn>
      )}

      {errorMessage && (
        <FadeIn>
          <div className="flex items-center justify-between p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-900 dark:text-rose-200 text-sm">
            <div className="flex items-center gap-2.5">
              <HugeiconsIcon
                icon={AlertCircleIcon}
                className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0"
                strokeWidth={1.5}
              />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-rose-700 hover:text-rose-900 dark:hover:text-rose-100"
            >
              <HugeiconsIcon icon={Cancel01Icon} className="w-4 h-4" strokeWidth={1.5} />
            </button>
          </div>
        </FadeIn>
      )}

      {/* KPI Stats Overview */}
      <SlideUp delay={0.1}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 rounded-xl shadow-2xs transition-colors duration-200">
            <div className="flex items-center justify-between text-[11px] font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider">
              <span>Active Subscriptions</span>
              <HugeiconsIcon
                icon={CreditCardIcon}
                className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400"
                strokeWidth={1.5}
              />
            </div>
            <p className="text-xl font-bold text-stone-900 dark:text-stone-100 mt-2">
              {activeSubsCount}
            </p>
            <p className="text-[11px] text-stone-400 dark:text-stone-500 mt-0.5">
              Recurring flat SaaS establishments
            </p>
          </div>

          <div className="p-4 bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 rounded-xl shadow-2xs transition-colors duration-200">
            <div className="flex items-center justify-between text-[11px] font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider">
              <span>Past Due / Delinquent</span>
              <HugeiconsIcon
                icon={AlertCircleIcon}
                className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400"
                strokeWidth={1.5}
              />
            </div>
            <p className="text-xl font-bold text-stone-900 dark:text-stone-100 mt-2">
              {pastDueSubsCount}
            </p>
            <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium mt-0.5">
              Subject to QR pause
            </p>
          </div>

          <div className="p-4 bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 rounded-xl shadow-2xs transition-colors duration-200">
            <div className="flex items-center justify-between text-[11px] font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider">
              <span>Pending Invoices</span>
              <HugeiconsIcon
                icon={Invoice01Icon}
                className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400"
                strokeWidth={1.5}
              />
            </div>
            <p className="text-xl font-bold text-stone-900 dark:text-stone-100 mt-2">
              {unpaidInvoicesCount}
            </p>
            <p className="text-[11px] text-stone-400 dark:text-stone-500 mt-0.5">
              Awaiting settlement
            </p>
          </div>

          <div className="p-4 bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 rounded-xl shadow-2xs transition-colors duration-200">
            <div className="flex items-center justify-between text-[11px] font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider">
              <span>Unpaid INR Volume</span>
              <span className="text-[10px] font-semibold text-stone-400 dark:text-stone-500 font-mono">
                INR
              </span>
            </div>
            <p className="text-xl font-bold text-stone-900 dark:text-stone-100 mt-2 font-mono">
              ₹{unpaidInvoicesSum.toLocaleString()}
            </p>
            <p className="text-[11px] text-stone-400 dark:text-stone-500 mt-0.5">
              Outstanding accounts receivable
            </p>
          </div>
        </div>
      </SlideUp>

      {/* Tabs Navigation */}
      <SlideUp delay={0.15}>
        <div className="flex items-center gap-2 border-b border-stone-200 dark:border-stone-800">
          <button
            type="button"
            onClick={() => setActiveTab('subscriptions')}
            className={`pb-3 px-3 text-sm font-semibold transition-colors relative ${
              activeTab === 'subscriptions'
                ? 'text-stone-900 dark:text-stone-100 border-b-2 border-stone-900 dark:border-stone-100'
                : 'text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200'
            }`}
          >
            Subscriptions ({subscriptions.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('invoices')}
            className={`pb-3 px-3 text-sm font-semibold transition-colors relative ${
              activeTab === 'invoices'
                ? 'text-stone-900 dark:text-stone-100 border-b-2 border-stone-900 dark:border-stone-100'
                : 'text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200'
            }`}
          >
            Invoices Ledger ({invoices.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('plans')}
            className={`pb-3 px-3 text-sm font-semibold transition-colors relative ${
              activeTab === 'plans'
                ? 'text-stone-900 dark:text-stone-100 border-b-2 border-stone-900 dark:border-stone-100'
                : 'text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200'
            }`}
          >
            SaaS Plans Pricing ({plansData?.plans.length || 4})
          </button>
        </div>
      </SlideUp>

      {/* Subscriptions Tab */}
      {activeTab === 'subscriptions' && (
        <SlideUp delay={0.2}>
          <div className="bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 rounded-xl shadow-2xs overflow-hidden transition-colors duration-200">
            {/* Toolbar with Search, Status Tabs, Plan Dropdown, Refresh */}
            <div className="p-3 border-b border-stone-200/80 dark:border-stone-800 flex flex-col lg:flex-row items-center justify-between gap-3">
              <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full lg:w-auto flex-1">
                <div className="relative w-full sm:w-64">
                  <HugeiconsIcon
                    icon={Search01Icon}
                    className="w-3.5 h-3.5 text-stone-400 dark:text-stone-500 absolute left-2.5 top-1/2 -translate-y-1/2"
                    strokeWidth={1.5}
                  />
                  <input
                    type="text"
                    placeholder="Search restaurant or plan..."
                    value={subSearch}
                    onChange={(e) => setSubSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1 text-xs rounded-xl border border-stone-200/90 dark:border-stone-700 hover:border-stone-300 dark:hover:border-stone-600 bg-stone-50/70 dark:bg-stone-800/60 focus:bg-white dark:focus:bg-stone-800 focus:border-stone-400 dark:focus:border-stone-500 focus:shadow-[0_0_0_3px_rgba(0,0,0,0.04)] outline-none transition-all duration-200 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 h-8"
                  />
                </div>

                {/* Plan Dropdown */}
                <select
                  value={subPlanFilter}
                  onChange={(e) => setSubPlanFilter(e.target.value)}
                  className="px-2.5 py-1 text-xs rounded-xl bg-stone-50/70 dark:bg-stone-800/60 border border-stone-200/90 dark:border-stone-700 text-stone-700 dark:text-stone-300 font-medium focus:outline-none cursor-pointer h-8 w-full sm:w-auto"
                  aria-label="Filter subscriptions by plan"
                >
                  <option value="all">All Plans</option>
                  {plansData?.plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (₹{p.priceInr})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 w-full lg:w-auto justify-between lg:justify-end">
                {/* Status Tabs */}
                <div className="flex items-center gap-1">
                  {(
                    [
                      { id: 'all', label: 'All' },
                      { id: 'active', label: 'Active' },
                      { id: 'unpaid', label: 'Unpaid' },
                      { id: 'past_due', label: 'Past Due' },
                      { id: 'trial', label: 'Trial' },
                      { id: 'cancelled', label: 'Cancelled' },
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setSubStatusFilter(tab.id)}
                      className={`px-2 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                        subStatusFilter === tab.id
                          ? 'bg-stone-900 dark:bg-white text-white dark:text-stone-900 shadow-2xs'
                          : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => refetchSubs()}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 border border-stone-200 dark:border-stone-700 rounded-lg bg-white dark:bg-stone-900 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors h-8 shrink-0"
                >
                  <HugeiconsIcon icon={RefreshIcon} className="w-3 h-3" strokeWidth={1.5} />
                  <span>Refresh</span>
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-50/80 dark:bg-stone-800/80 border-b border-stone-200 dark:border-stone-800 text-stone-500 dark:text-stone-400 uppercase text-[11px] font-semibold">
                  <tr>
                    <th className="py-2.5 px-4">Restaurant</th>
                    <th className="py-2.5 px-4">Plan Tier</th>
                    <th className="py-2.5 px-4">Monthly Fee</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4">Current Period</th>
                    <th className="py-2.5 px-4 text-right">Account Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                  {isLoadingSubs ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="py-8 text-center text-stone-400 dark:text-stone-500 text-xs"
                      >
                        Loading subscriptions...
                      </td>
                    </tr>
                  ) : filteredSubs.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="py-8 text-center text-stone-400 dark:text-stone-500 text-xs"
                      >
                        No subscription records found.
                      </td>
                    </tr>
                  ) : (
                    filteredSubs.map((sub) => {
                      const isSubUnpaid =
                        sub.status === 'unpaid' || sub.isRestaurantActive === false;
                      return (
                        <tr
                          key={sub.id}
                          className="hover:bg-stone-50/50 dark:hover:bg-stone-800/50 transition-colors"
                        >
                          <td className="py-2.5 px-4">
                            <p className="font-semibold text-stone-900 dark:text-stone-100">
                              {sub.restaurantName}
                            </p>
                            <p className="text-[10px] text-stone-400 dark:text-stone-500 font-mono">
                              /{sub.restaurantSlug}
                            </p>
                          </td>
                          <td className="py-2.5 px-4 font-medium text-stone-700 dark:text-stone-300">
                            {!isSubUnpaid && sub.planName ? (
                              sub.planName
                            ) : (
                              <span className="text-stone-400 dark:text-stone-500 italic font-normal">
                                Pending Selection
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-4 font-semibold text-stone-900 dark:text-stone-100 font-mono">
                            {!isSubUnpaid && sub.monthlyFeeInr ? (
                              <>
                                {sub.priceInr ? `₹${sub.priceInr}` : `₹${sub.monthlyFeeInr}/mo`}
                                {sub.durationMonths && sub.durationMonths > 1 && (
                                  <span className="text-[10px] text-stone-400 font-normal ml-1">
                                    ({sub.durationMonths}m)
                                  </span>
                                )}
                              </>
                            ) : (
                              <span className="text-stone-400 dark:text-stone-500 font-normal">
                                &mdash;
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-4">{getSubStatusBadge(sub.status)}</td>
                          <td className="py-2.5 px-4 text-stone-500 dark:text-stone-400 font-mono text-[11px]">
                            {!isSubUnpaid && sub.currentPeriodStart && sub.currentPeriodEnd ? (
                              <>
                                {new Date(sub.currentPeriodStart).toLocaleDateString()} &rarr;{' '}
                                {new Date(sub.currentPeriodEnd).toLocaleDateString()}
                              </>
                            ) : (
                              <span className="text-stone-400 dark:text-stone-500 font-normal">
                                &mdash;
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-4 text-right">{getAccountQrStatusBadge(sub)}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </SlideUp>
      )}

      {/* Invoices Tab */}
      {activeTab === 'invoices' && (
        <SlideUp delay={0.2}>
          <div className="bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 rounded-xl shadow-2xs overflow-hidden transition-colors duration-200">
            {/* Toolbar */}
            <div className="p-3 border-b border-stone-200/80 dark:border-stone-800 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <div className="relative w-full sm:w-64">
                  <HugeiconsIcon
                    icon={Search01Icon}
                    className="w-3.5 h-3.5 text-stone-400 dark:text-stone-500 absolute left-2.5 top-1/2 -translate-y-1/2"
                    strokeWidth={1.5}
                  />
                  <input
                    type="text"
                    placeholder="Search invoices..."
                    value={invoiceSearch}
                    onChange={(e) => setInvoiceSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1 text-xs rounded-xl border border-stone-200/90 dark:border-stone-700 hover:border-stone-300 dark:hover:border-stone-600 bg-stone-50/70 dark:bg-stone-800/60 focus:bg-white dark:focus:bg-stone-800 focus:border-stone-400 dark:focus:border-stone-500 focus:shadow-[0_0_0_3px_rgba(0,0,0,0.04)] outline-none transition-all duration-200 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 h-8"
                  />
                </div>

                <div className="flex items-center gap-1 bg-stone-100 dark:bg-stone-800/80 p-1 rounded-lg border border-stone-200/60 dark:border-stone-700 shrink-0">
                  {(['all', 'unpaid', 'paid', 'void'] as InvoiceStatusFilter[]).map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setInvoiceStatusFilter(status)}
                      className={`px-2 py-0.5 text-xs font-medium rounded-md capitalize transition-colors ${
                        invoiceStatusFilter === status
                          ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-2xs'
                          : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => refetchInvoices()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 border border-stone-200 dark:border-stone-700 rounded-lg bg-stone-50 dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors"
              >
                <HugeiconsIcon icon={RefreshIcon} className="w-3.5 h-3.5" strokeWidth={1.5} />
                Refresh
              </button>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-50/70 dark:bg-stone-800/80 border-b border-stone-200 dark:border-stone-800 text-stone-500 dark:text-stone-400 uppercase text-[10px] tracking-wider font-semibold">
                  <tr>
                    <th className="py-2.5 px-3.5">Invoice #</th>
                    <th className="py-2.5 px-3.5">Restaurant</th>
                    <th className="py-2.5 px-3.5">Amount</th>
                    <th className="py-2.5 px-3.5">Due Date</th>
                    <th className="py-2.5 px-3.5">Status</th>
                    <th className="py-2.5 px-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                  {isLoadingInvoices ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="py-8 text-center text-stone-400 dark:text-stone-500"
                      >
                        Loading invoice ledger...
                      </td>
                    </tr>
                  ) : filteredInvoices.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="py-8 text-center text-stone-400 dark:text-stone-500"
                      >
                        No invoice records found matching criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredInvoices.map((inv) => (
                      <tr
                        key={inv.id}
                        className="hover:bg-stone-50/60 dark:hover:bg-stone-800/50 transition-colors"
                      >
                        <td className="py-2 px-3.5 font-mono font-semibold text-stone-900 dark:text-stone-100">
                          {inv.invoiceNumber}
                        </td>
                        <td className="py-2 px-3.5 font-medium text-stone-800 dark:text-stone-200">
                          {inv.restaurantName}
                        </td>
                        <td className="py-2 px-3.5 font-semibold text-stone-900 dark:text-stone-100">
                          ₹{inv.amountInr.toLocaleString()}
                        </td>
                        <td className="py-2 px-3.5 font-mono text-[11px] text-stone-500 dark:text-stone-400">
                          {inv.dueDate}
                        </td>
                        <td className="py-2 px-3.5">{getInvoiceStatusBadge(inv.status)}</td>
                        <td className="py-2 px-3.5 text-right">
                          {inv.status === 'unpaid' && !isRestrictedRole && (
                            <div className="inline-flex items-center gap-1.5 justify-end">
                              <button
                                type="button"
                                disabled={updateInvoiceStatusMutation.isPending}
                                onClick={() =>
                                  updateInvoiceStatusMutation.mutate({
                                    id: inv.id,
                                    action: 'mark_paid',
                                  })
                                }
                                className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 transition-colors"
                              >
                                Mark Paid
                              </button>
                              <button
                                type="button"
                                disabled={updateInvoiceStatusMutation.isPending}
                                onClick={() =>
                                  updateInvoiceStatusMutation.mutate({
                                    id: inv.id,
                                    action: 'void',
                                  })
                                }
                                className="px-2 py-1 text-[11px] font-medium rounded-lg text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 border border-transparent hover:border-stone-200 dark:hover:border-stone-700 transition-colors"
                              >
                                Void
                              </button>
                            </div>
                          )}
                          {inv.status === 'paid' && (
                            <span className="text-[11px] text-stone-400 dark:text-stone-500 font-mono">
                              Paid {inv.paidAt ? new Date(inv.paidAt).toLocaleDateString() : ''}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </SlideUp>
      )}

      {/* SaaS Plans Pricing Tab */}
      {activeTab === 'plans' && (
        <SlideUp delay={0.2}>
          <div className="space-y-4">
            <div className="p-4 bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 rounded-xl shadow-2xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                  SaaS Subscription Pricing Architecture
                </h2>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                  Configure upfront tier prices and monthly equivalent rates billed to dining
                  establishments.
                </p>
              </div>
              <button
                type="button"
                onClick={() => refetchPlans()}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 border border-stone-200 dark:border-stone-700 rounded-lg bg-white dark:bg-stone-900 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors h-8 self-start sm:self-auto"
              >
                <HugeiconsIcon icon={RefreshIcon} className="w-3 h-3" strokeWidth={1.5} />
                Refresh Plans
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {plansData?.plans.map((plan) => (
                <div
                  key={plan.id}
                  className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 shadow-2xs flex flex-col justify-between transition-colors"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[11px] font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
                        {plan.durationMonths} {plan.durationMonths === 1 ? 'Month' : 'Months'}
                      </span>
                      {plan.isActive ? (
                        <Badge variant="success">Active</Badge>
                      ) : (
                        <Badge variant="neutral">Archived</Badge>
                      )}
                    </div>
                    <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
                      {plan.name}
                    </h3>
                    <div className="mt-3 flex items-baseline gap-1">
                      <span className="text-2xl font-bold font-mono text-stone-900 dark:text-stone-100">
                        ₹{plan.priceInr}
                      </span>
                      <span className="text-xs text-stone-400 dark:text-stone-500 font-mono">
                        / {plan.durationMonths}m
                      </span>
                    </div>
                    <p className="text-xs text-stone-500 dark:text-stone-400 font-mono mt-1">
                      ₹{plan.monthlyFeeInr}/mo equivalent
                    </p>
                  </div>

                  <div className="pt-4 mt-4 border-t border-stone-100 dark:border-stone-800">
                    {!isRestrictedRole && user?.role === 'super_admin' ? (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingPlan(plan);
                            setEditPlanName(plan.name);
                            setEditPlanPrice(plan.priceInr || 0);
                            setEditPlanMonthlyFee(plan.monthlyFeeInr || 0);
                            setEditPlanIsActive(plan.isActive);
                          }}
                          className="flex-1 py-1.5 px-3 rounded-lg text-xs font-medium bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <HugeiconsIcon
                            icon={Edit01Icon}
                            className="w-3.5 h-3.5"
                            strokeWidth={1.5}
                          />
                          <span>Edit Pricing</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setPlanToDelete(plan)}
                          className="py-1.5 px-2.5 rounded-lg text-xs font-medium bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-400 border border-rose-200/60 dark:border-rose-900/50 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                          title={`Delete ${plan.name} plan`}
                          aria-label={`Delete ${plan.name} plan`}
                        >
                          <HugeiconsIcon
                            icon={Delete02Icon}
                            className="w-3.5 h-3.5"
                            strokeWidth={1.5}
                          />
                          <span>Delete</span>
                        </button>
                      </div>
                    ) : (
                      <span className="text-[11px] text-stone-400 dark:text-stone-500 italic block text-center">
                        Read-only for {user?.role}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </SlideUp>
      )}

      {/* Edit Plan Price Modal */}
      {editingPlan &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 dark:bg-black/70 backdrop-blur-xs animate-fade-in font-sans">
            <FadeIn>
              <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200/90 dark:border-stone-800 shadow-xl max-w-md w-full p-6 space-y-4 transition-colors duration-200">
                <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
                  <div>
                    <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                      Edit Plan Pricing: {editingPlan.name}
                    </h3>
                    <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5 font-mono">
                      Code: {editingPlan.code} • Duration: {editingPlan.durationMonths} months
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingPlan(null)}
                    className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-300"
                  >
                    <HugeiconsIcon icon={Cancel01Icon} className="w-4 h-4" strokeWidth={1.5} />
                  </button>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!editingPlan) return;
                    updatePlanMutation.mutate({
                      id: editingPlan.id,
                      data: {
                        name: editPlanName.trim(),
                        priceInr: Number(editPlanPrice),
                        monthlyFeeInr: Number(editPlanMonthlyFee),
                        isActive: editPlanIsActive,
                      },
                    });
                  }}
                  className="space-y-4 text-xs"
                >
                  <div>
                    <label
                      htmlFor="editPlanName"
                      className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1"
                    >
                      Display Name
                    </label>
                    <input
                      type="text"
                      id="editPlanName"
                      required
                      value={editPlanName}
                      onChange={(e) => setEditPlanName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs text-stone-900 dark:text-stone-100 outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label
                        htmlFor="editPlanPrice"
                        className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1"
                      >
                        Total Price (₹ INR)
                      </label>
                      <input
                        type="number"
                        id="editPlanPrice"
                        required
                        min={1}
                        value={editPlanPrice}
                        onChange={(e) => {
                          const newPrice = Number(e.target.value);
                          setEditPlanPrice(newPrice);
                          if (editingPlan && editingPlan.durationMonths) {
                            setEditPlanMonthlyFee(
                              Math.round(newPrice / editingPlan.durationMonths),
                            );
                          }
                        }}
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs font-mono text-stone-900 dark:text-stone-100 outline-none"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="editPlanMonthlyFee"
                        className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1"
                      >
                        Monthly Fee (₹ INR/mo)
                      </label>
                      <input
                        type="number"
                        id="editPlanMonthlyFee"
                        required
                        min={1}
                        value={editPlanMonthlyFee}
                        onChange={(e) => setEditPlanMonthlyFee(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs font-mono text-stone-900 dark:text-stone-100 outline-none"
                      />
                      <p className="text-[10px] text-stone-400 dark:text-stone-500 mt-1 font-mono">
                        Auto-computed: ₹{editPlanPrice || 0} ÷ {editingPlan?.durationMonths || 1}m
                        (editable)
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="editPlanIsActive"
                      checked={editPlanIsActive}
                      onChange={(e) => setEditPlanIsActive(e.target.checked)}
                      className="rounded border-stone-300 dark:border-stone-600 text-stone-900 focus:ring-0 cursor-pointer"
                    />
                    <label
                      htmlFor="editPlanIsActive"
                      className="text-xs font-medium text-stone-700 dark:text-stone-300 cursor-pointer select-none"
                    >
                      Active Tier (available on public pricing & onboarding)
                    </label>
                  </div>

                  <div className="pt-3 flex items-center justify-end gap-2 border-t border-stone-100 dark:border-stone-800">
                    <MotionButton
                      variant="ghost"
                      size="sm"
                      type="button"
                      onClick={() => setEditingPlan(null)}
                    >
                      Cancel
                    </MotionButton>
                    <MotionButton
                      variant="primary"
                      size="sm"
                      type="submit"
                      disabled={updatePlanMutation.isPending}
                    >
                      {updatePlanMutation.isPending ? 'Saving...' : 'Save Price Changes'}
                    </MotionButton>
                  </div>
                </form>
              </div>
            </FadeIn>
          </div>,
          document.body,
        )}

      {/* Delete Plan Confirmation Modal */}
      {planToDelete &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-plan-dialog-title"
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-stone-900/40 dark:bg-black/70 backdrop-blur-xs animate-fade-in font-sans"
          >
            <FadeIn>
              <div className="bg-white dark:bg-stone-900 rounded-2xl max-w-md w-full border border-stone-200/90 dark:border-stone-800 shadow-xl overflow-hidden p-6 space-y-4 transition-colors duration-200">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-rose-500/10 dark:bg-rose-950/40 border border-rose-500/20 dark:border-rose-900 flex items-center justify-center text-rose-700 dark:text-rose-400 shrink-0">
                    <HugeiconsIcon icon={Delete02Icon} className="w-4 h-4" strokeWidth={1.5} />
                  </div>
                  <div>
                    <h3
                      id="delete-plan-dialog-title"
                      className="text-sm font-semibold text-stone-900 dark:text-stone-100"
                    >
                      Delete &quot;{planToDelete.name}&quot; Plan?
                    </h3>
                    <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5 font-mono">
                      Code: {planToDelete.code} • Duration: {planToDelete.durationMonths}m • Total:
                      ₹{planToDelete.priceInr}
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-amber-500/10 dark:bg-amber-950/30 border border-amber-500/20 dark:border-amber-900/40 rounded-xl text-xs text-amber-900 dark:text-amber-200 space-y-2">
                  <div className="flex items-center gap-1.5 font-semibold text-[11px] text-amber-800 dark:text-amber-300">
                    <HugeiconsIcon
                      icon={AlertCircleIcon}
                      className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0"
                      strokeWidth={1.5}
                    />
                    <span>Grandfathered Subscriber Protection</span>
                  </div>
                  <ul className="text-[11px] leading-relaxed text-amber-800/90 dark:text-amber-300/90 list-disc list-inside space-y-1">
                    <li>
                      If any restaurants currently subscribe to this tier, the plan is safely
                      archived. Their active billing period continues <strong>uninterrupted</strong>{' '}
                      until its scheduled expiration date.
                    </li>
                    <li>
                      When their subscription ends, this plan will no longer be available for
                      renewal; they must select from available active plans.
                    </li>
                    <li>
                      If 0 restaurants are subscribed, this plan is permanently deleted from the
                      database.
                    </li>
                  </ul>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100 dark:border-stone-800">
                  <MotionButton
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setPlanToDelete(null)}
                  >
                    Cancel
                  </MotionButton>
                  <MotionButton
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      if (planToDelete) {
                        deletePlanMutation.mutate(planToDelete.id);
                      }
                    }}
                    disabled={deletePlanMutation.isPending}
                    className="bg-rose-600 hover:bg-rose-700 text-white font-medium"
                  >
                    {deletePlanMutation.isPending ? 'Deleting...' : 'Delete Plan'}
                  </MotionButton>
                </div>
              </div>
            </FadeIn>
          </div>,
          document.body,
        )}

      {/* Create Invoice Modal */}
      {isCreateInvoiceOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 dark:bg-black/70 backdrop-blur-xs animate-fade-in font-sans">
            <FadeIn>
              <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200/90 dark:border-stone-800 shadow-xl max-w-lg w-full p-6 space-y-4 transition-colors duration-200">
                <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
                  <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                    <HugeiconsIcon
                      icon={Invoice01Icon}
                      className="w-4 h-4 text-stone-900 dark:text-stone-100"
                      strokeWidth={1.5}
                    />
                    Generate Invoice
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsCreateInvoiceOpen(false)}
                    className="p-1 text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
                  >
                    <HugeiconsIcon icon={Cancel01Icon} className="w-4 h-4" strokeWidth={1.5} />
                  </button>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!formRestaurantId) {
                      setErrorMessage('Please select a restaurant');
                      return;
                    }
                    const payload: CreateInvoiceInput = {
                      restaurantId: formRestaurantId,
                      amountInr: Number(formAmountInr),
                      dueDate: formDueDate,
                    };
                    if (formNotes.trim()) {
                      payload.notes = formNotes.trim();
                    }
                    createInvoiceMutation.mutate(payload);
                  }}
                  className="space-y-3.5"
                >
                  <div>
                    <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1.5">
                      Select Restaurant
                    </label>
                    <select
                      value={formRestaurantId}
                      onChange={(e) => setFormRestaurantId(e.target.value)}
                      required
                      className="w-full h-10 px-3.5 text-xs sm:text-sm bg-stone-50/70 dark:bg-stone-800/60 border border-stone-200/90 dark:border-stone-700 hover:border-stone-300 dark:hover:border-stone-600 rounded-xl text-stone-900 dark:text-stone-100 focus:bg-white dark:focus:bg-stone-800 focus:border-stone-400 dark:focus:border-stone-500 focus:shadow-[0_0_0_3px_rgba(0,0,0,0.04)] dark:focus:shadow-[0_0_0_3px_rgba(255,255,255,0.04)] outline-none transition-all duration-200"
                    >
                      <option value="">-- Choose Restaurant --</option>
                      {restaurantsData?.restaurants.map((r) => (
                        <option key={r.id} value={r.id} className="dark:bg-stone-800">
                          {r.name} ({r.slug})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1.5">
                        Amount (INR)
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={formAmountInr}
                        onChange={(e) => setFormAmountInr(Number(e.target.value))}
                        required
                        className="w-full h-10 px-3.5 text-xs sm:text-sm bg-stone-50/70 dark:bg-stone-800/60 border border-stone-200/90 dark:border-stone-700 hover:border-stone-300 dark:hover:border-stone-600 rounded-xl text-stone-900 dark:text-stone-100 focus:bg-white dark:focus:bg-stone-800 focus:border-stone-400 dark:focus:border-stone-500 focus:shadow-[0_0_0_3px_rgba(0,0,0,0.04)] dark:focus:shadow-[0_0_0_3px_rgba(255,255,255,0.04)] outline-none transition-all duration-200"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1.5">
                        Due Date
                      </label>
                      <input
                        type="date"
                        value={formDueDate}
                        onChange={(e) => setFormDueDate(e.target.value)}
                        required
                        className="w-full h-10 px-3.5 text-xs sm:text-sm bg-stone-50/70 dark:bg-stone-800/60 border border-stone-200/90 dark:border-stone-700 hover:border-stone-300 dark:hover:border-stone-600 rounded-xl text-stone-900 dark:text-stone-100 focus:bg-white dark:focus:bg-stone-800 focus:border-stone-400 dark:focus:border-stone-500 focus:shadow-[0_0_0_3px_rgba(0,0,0,0.04)] dark:focus:shadow-[0_0_0_3px_rgba(255,255,255,0.04)] outline-none transition-all duration-200"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1.5">
                      Internal Notes (Optional)
                    </label>
                    <textarea
                      rows={3}
                      value={formNotes}
                      onChange={(e) => setFormNotes(e.target.value)}
                      placeholder="Monthly billing notes or discount reference..."
                      className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-stone-50/70 dark:bg-stone-800/60 border border-stone-200/90 dark:border-stone-700 hover:border-stone-300 dark:hover:border-stone-600 rounded-xl text-stone-900 dark:text-stone-100 focus:bg-white dark:focus:bg-stone-800 focus:border-stone-400 dark:focus:border-stone-500 focus:shadow-[0_0_0_3px_rgba(0,0,0,0.04)] dark:focus:shadow-[0_0_0_3px_rgba(255,255,255,0.04)] outline-none transition-all duration-200 resize-none"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100 dark:border-stone-800">
                    <button
                      type="button"
                      onClick={() => setIsCreateInvoiceOpen(false)}
                      className="px-3.5 py-2 text-xs font-medium text-stone-700 dark:text-stone-300 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg hover:bg-stone-50 dark:hover:bg-stone-700/80 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={createInvoiceMutation.isPending}
                      className="px-4 py-2 text-xs font-medium text-white dark:text-stone-900 bg-stone-900 hover:bg-black dark:bg-white dark:hover:bg-stone-100 rounded-lg transition-all shadow-2xs disabled:opacity-50 cursor-pointer"
                    >
                      {createInvoiceMutation.isPending ? 'Generating...' : 'Issue Invoice'}
                    </button>
                  </div>
                </form>
              </div>
            </FadeIn>
          </div>,
          document.body,
        )}

      {/* Auto-Suspend Sweep Confirmation Modal */}
      {isSweepModalOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 dark:bg-black/70 backdrop-blur-xs animate-fade-in font-sans">
            <FadeIn>
              <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200/90 dark:border-stone-800 shadow-xl max-w-md w-full p-5 space-y-3.5 transition-colors duration-200">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900 flex items-center justify-center shrink-0">
                    <HugeiconsIcon icon={AlertSquareIcon} className="w-4 h-4" strokeWidth={1.5} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                      Run Grace Period Enforcement Sweep
                    </h3>
                    <p className="text-[11px] text-stone-500 dark:text-stone-400">
                      Evaluates overdue invoices against the platform 7-day grace rule.
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 rounded-lg text-xs text-stone-700 dark:text-stone-300 space-y-1.5">
                  <p className="font-medium text-stone-900 dark:text-stone-100 text-[11px]">
                    How auto-suspension works:
                  </p>
                  <ul className="list-disc list-inside space-y-0.5 text-[11px] text-stone-600 dark:text-stone-400">
                    <li>Checks all unpaid invoices whose due date has passed by &ge; 7 days.</li>
                    <li>Delinquent restaurants are automatically flagged as suspended.</li>
                    <li>Customer QR code placards are disabled immediately with an audit log.</li>
                    <li>
                      Subscriptions are marked as{' '}
                      <span className="font-mono text-rose-600 dark:text-rose-400 font-semibold">
                        past_due
                      </span>
                      .
                    </li>
                  </ul>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100 dark:border-stone-800">
                  <button
                    type="button"
                    onClick={() => setIsSweepModalOpen(false)}
                    className="px-3 py-1.5 text-xs font-medium text-stone-700 dark:text-stone-300 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg hover:bg-stone-50 dark:hover:bg-stone-700/80 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={sweepMutation.isPending}
                    onClick={() => sweepMutation.mutate()}
                    className="px-3.5 py-1.5 text-xs font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors shadow-2xs"
                  >
                    {sweepMutation.isPending ? 'Sweeping...' : 'Execute Sweep'}
                  </button>
                </div>
              </div>
            </FadeIn>
          </div>,
          document.body,
        )}
    </div>
  );
};
