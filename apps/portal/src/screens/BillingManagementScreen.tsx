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
} from '@hugeicons/core-free-icons';
import { SlideUp, FadeIn, Badge, MotionButton } from '@tiptable/ui';
import { useAuth } from '../context/AuthContext.js';
import {
  api,
  type SubscriptionItem,
  type InvoiceItem,
  type CreateInvoiceInput,
} from '../services/api.js';

type Tab = 'subscriptions' | 'invoices';
type InvoiceStatusFilter = 'all' | 'unpaid' | 'paid' | 'void';

export const BillingManagementScreen: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const isRestrictedRole = user?.role === 'support';

  // Navigation & Filter State
  const [activeTab, setActiveTab] = useState<Tab>('subscriptions');
  const [subSearch, setSubSearch] = useState('');
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<InvoiceStatusFilter>('all');
  const [invoiceSearch, setInvoiceSearch] = useState('');

  // Modals & Feedback State
  const [isCreateInvoiceOpen, setIsCreateInvoiceOpen] = useState(false);
  const [isSweepModalOpen, setIsSweepModalOpen] = useState(false);
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

  // Fetch Subscriptions
  const {
    data: subsData,
    isLoading: isLoadingSubs,
    refetch: refetchSubs,
  } = useQuery({
    queryKey: ['portal-subscriptions'],
    queryFn: () => api.getSubscriptions(),
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
      sub.planName.toLowerCase().includes(q)
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
            <h1 className="text-2xl font-bold text-stone-900 flex items-center gap-2">
              <HugeiconsIcon
                icon={Invoice01Icon}
                className="w-6 h-6 text-stone-800"
                strokeWidth={1.5}
              />
              Billing & Subscriptions
            </h1>
            <p className="text-sm text-stone-500 mt-1">
              Flat SaaS subscription management (0% commission on tips), invoice collection, and
              automated grace period enforcement.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {isRestrictedRole ? (
              <Badge variant="neutral">Read-only Finance Access</Badge>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setIsSweepModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 transition-colors shadow-2xs"
                >
                  <HugeiconsIcon
                    icon={AlertSquareIcon}
                    className="w-3.5 h-3.5 text-amber-700"
                    strokeWidth={1.5}
                  />
                  Run Grace Period Sweep
                </button>
                <MotionButton
                  type="button"
                  variant="primary"
                  onClick={() => setIsCreateInvoiceOpen(true)}
                  className="px-3 py-1.5 text-xs bg-stone-900 hover:bg-black text-white font-medium rounded-lg shadow-2xs flex items-center gap-1.5"
                >
                  <HugeiconsIcon icon={Add01Icon} className="w-3.5 h-3.5" strokeWidth={1.5} />
                  Create Invoice
                </MotionButton>
              </>
            )}
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

      {/* KPI Stats Overview */}
      <SlideUp delay={0.1}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-white border border-stone-200/80 rounded-xl shadow-2xs">
            <div className="flex items-center justify-between text-[11px] font-medium text-stone-500 uppercase tracking-wider">
              <span>Active Subscriptions</span>
              <HugeiconsIcon
                icon={CreditCardIcon}
                className="w-3.5 h-3.5 text-emerald-600"
                strokeWidth={1.5}
              />
            </div>
            <p className="text-xl font-bold text-stone-900 mt-2">{activeSubsCount}</p>
            <p className="text-[11px] text-stone-400 mt-0.5">Recurring flat SaaS establishments</p>
          </div>

          <div className="p-4 bg-white border border-stone-200/80 rounded-xl shadow-2xs">
            <div className="flex items-center justify-between text-[11px] font-medium text-stone-500 uppercase tracking-wider">
              <span>Past Due / Delinquent</span>
              <HugeiconsIcon
                icon={AlertCircleIcon}
                className="w-3.5 h-3.5 text-rose-600"
                strokeWidth={1.5}
              />
            </div>
            <p className="text-xl font-bold text-stone-900 mt-2">{pastDueSubsCount}</p>
            <p className="text-[11px] text-rose-600 font-medium mt-0.5">Subject to QR pause</p>
          </div>

          <div className="p-4 bg-white border border-stone-200/80 rounded-xl shadow-2xs">
            <div className="flex items-center justify-between text-[11px] font-medium text-stone-500 uppercase tracking-wider">
              <span>Pending Invoices</span>
              <HugeiconsIcon
                icon={Invoice01Icon}
                className="w-3.5 h-3.5 text-amber-600"
                strokeWidth={1.5}
              />
            </div>
            <p className="text-xl font-bold text-stone-900 mt-2">{unpaidInvoicesCount}</p>
            <p className="text-[11px] text-stone-400 mt-0.5">Awaiting settlement</p>
          </div>

          <div className="p-4 bg-white border border-stone-200/80 rounded-xl shadow-2xs">
            <div className="flex items-center justify-between text-[11px] font-medium text-stone-500 uppercase tracking-wider">
              <span>Unpaid INR Volume</span>
              <span className="text-[10px] font-semibold text-stone-400 font-mono">INR</span>
            </div>
            <p className="text-xl font-bold text-stone-900 mt-2 font-mono">
              ₹{unpaidInvoicesSum.toLocaleString()}
            </p>
            <p className="text-[11px] text-stone-400 mt-0.5">Outstanding accounts receivable</p>
          </div>
        </div>
      </SlideUp>

      {/* Tabs Navigation */}
      <SlideUp delay={0.15}>
        <div className="flex items-center gap-2 border-b border-stone-200">
          <button
            type="button"
            onClick={() => setActiveTab('subscriptions')}
            className={`pb-3 px-3 text-sm font-semibold transition-colors relative ${
              activeTab === 'subscriptions'
                ? 'text-stone-900 border-b-2 border-stone-900'
                : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            Subscriptions ({subscriptions.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('invoices')}
            className={`pb-3 px-3 text-sm font-semibold transition-colors relative ${
              activeTab === 'invoices'
                ? 'text-stone-900 border-b-2 border-stone-900'
                : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            Invoices Ledger ({invoices.length})
          </button>
        </div>
      </SlideUp>

      {/* Subscriptions Tab */}
      {activeTab === 'subscriptions' && (
        <SlideUp delay={0.2}>
          <div className="bg-white border border-stone-200/80 rounded-xl shadow-2xs overflow-hidden">
            {/* Toolbar */}
            <div className="p-3 border-b border-stone-200/80 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-72">
                <HugeiconsIcon
                  icon={Search01Icon}
                  className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2"
                  strokeWidth={1.5}
                />
                <input
                  type="text"
                  placeholder="Filter subscriptions..."
                  value={subSearch}
                  onChange={(e) => setSubSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1 text-xs bg-white border border-stone-200 rounded-lg text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-900 h-8"
                />
              </div>

              <button
                type="button"
                onClick={() => refetchSubs()}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs text-stone-600 hover:text-stone-900 border border-stone-200 rounded-lg bg-white hover:bg-stone-50 transition-colors h-8"
              >
                <HugeiconsIcon icon={RefreshIcon} className="w-3 h-3" strokeWidth={1.5} />
                Refresh
              </button>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-50/80 border-b border-stone-200 text-stone-500 uppercase text-[11px] font-semibold">
                  <tr>
                    <th className="py-2.5 px-4">Restaurant</th>
                    <th className="py-2.5 px-4">Plan Tier</th>
                    <th className="py-2.5 px-4">Monthly Fee</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4">Current Period</th>
                    <th className="py-2.5 px-4 text-right">Account Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {isLoadingSubs ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-stone-400 text-xs">
                        Loading subscriptions...
                      </td>
                    </tr>
                  ) : filteredSubs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-stone-400 text-xs">
                        No subscription records found.
                      </td>
                    </tr>
                  ) : (
                    filteredSubs.map((sub) => (
                      <tr key={sub.id} className="hover:bg-stone-50/50 transition-colors">
                        <td className="py-2.5 px-4">
                          <p className="font-semibold text-stone-900">{sub.restaurantName}</p>
                          <p className="text-[10px] text-stone-400 font-mono">
                            /{sub.restaurantSlug}
                          </p>
                        </td>
                        <td className="py-2.5 px-4 font-medium text-stone-700">{sub.planName}</td>
                        <td className="py-2.5 px-4 font-semibold text-stone-900 font-mono">
                          ₹{sub.monthlyFeeInr}/mo
                        </td>
                        <td className="py-2.5 px-4">{getSubStatusBadge(sub.status)}</td>
                        <td className="py-2.5 px-4 text-stone-500 font-mono text-[11px]">
                          {new Date(sub.currentPeriodStart).toLocaleDateString()} &rarr;{' '}
                          {new Date(sub.currentPeriodEnd).toLocaleDateString()}
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          {sub.isRestaurantSuspended ? (
                            <Badge variant="danger">Suspended</Badge>
                          ) : (
                            <Badge variant="success">Active QR</Badge>
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

      {/* Invoices Tab */}
      {activeTab === 'invoices' && (
        <SlideUp delay={0.2}>
          <div className="bg-white border border-stone-200/80 rounded-xl shadow-2xs overflow-hidden">
            {/* Toolbar */}
            <div className="p-3 border-b border-stone-200/80 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <div className="relative w-full sm:w-64">
                  <HugeiconsIcon
                    icon={Search01Icon}
                    className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2"
                    strokeWidth={1.5}
                  />
                  <input
                    type="text"
                    placeholder="Search invoices..."
                    value={invoiceSearch}
                    onChange={(e) => setInvoiceSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1 text-xs bg-white border border-stone-200 rounded-lg text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-900 h-8"
                  />
                </div>

                <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-lg border border-stone-200/60 shrink-0">
                  {(['all', 'unpaid', 'paid', 'void'] as InvoiceStatusFilter[]).map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setInvoiceStatusFilter(status)}
                      className={`px-2 py-0.5 text-xs font-medium rounded-md capitalize transition-colors ${
                        invoiceStatusFilter === status
                          ? 'bg-white text-stone-900 shadow-2xs'
                          : 'text-stone-600 hover:text-stone-900'
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
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-stone-600 hover:text-stone-900 border border-stone-200 rounded-lg bg-stone-50 hover:bg-stone-100 transition-colors"
              >
                <HugeiconsIcon icon={RefreshIcon} className="w-3.5 h-3.5" strokeWidth={1.5} />
                Refresh
              </button>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-50/70 border-b border-stone-200 text-stone-500 uppercase text-[10px] tracking-wider font-semibold">
                  <tr>
                    <th className="py-2.5 px-3.5">Invoice #</th>
                    <th className="py-2.5 px-3.5">Restaurant</th>
                    <th className="py-2.5 px-3.5">Amount</th>
                    <th className="py-2.5 px-3.5">Due Date</th>
                    <th className="py-2.5 px-3.5">Status</th>
                    <th className="py-2.5 px-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {isLoadingInvoices ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-stone-400">
                        Loading invoice ledger...
                      </td>
                    </tr>
                  ) : filteredInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-stone-400">
                        No invoice records found matching criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredInvoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-stone-50/60 transition-colors">
                        <td className="py-2 px-3.5 font-mono font-semibold text-stone-900">
                          {inv.invoiceNumber}
                        </td>
                        <td className="py-2 px-3.5 font-medium text-stone-800">
                          {inv.restaurantName}
                        </td>
                        <td className="py-2 px-3.5 font-semibold text-stone-900">
                          ₹{inv.amountInr.toLocaleString()}
                        </td>
                        <td className="py-2 px-3.5 font-mono text-[11px] text-stone-500">
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
                                className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors"
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
                                className="px-2 py-1 text-[11px] font-medium rounded-lg text-stone-500 hover:text-stone-800 hover:bg-stone-100 border border-transparent hover:border-stone-200 transition-colors"
                              >
                                Void
                              </button>
                            </div>
                          )}
                          {inv.status === 'paid' && (
                            <span className="text-[11px] text-stone-400 font-mono">
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

      {/* Create Invoice Modal */}
      {isCreateInvoiceOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
            <FadeIn>
              <div className="bg-white rounded-xl border border-stone-200/90 shadow-xl max-w-md w-full p-5 space-y-3.5">
                <div className="flex items-center justify-between border-b border-stone-100 pb-2.5">
                  <h3 className="text-sm font-semibold text-stone-900 flex items-center gap-2">
                    <HugeiconsIcon
                      icon={Invoice01Icon}
                      className="w-4 h-4 text-stone-900"
                      strokeWidth={1.5}
                    />
                    Generate Invoice
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsCreateInvoiceOpen(false)}
                    className="p-1 text-stone-400 hover:text-stone-600 rounded-lg hover:bg-stone-100 transition-colors"
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
                  className="space-y-3"
                >
                  <div>
                    <label className="block text-[11px] font-medium text-stone-700 mb-1">
                      Select Restaurant
                    </label>
                    <select
                      value={formRestaurantId}
                      onChange={(e) => setFormRestaurantId(e.target.value)}
                      required
                      className="w-full h-8 px-2.5 text-xs bg-white border border-stone-200 rounded-lg text-stone-900 focus:outline-none focus:border-stone-900 focus:ring-1 focus:ring-stone-900"
                    >
                      <option value="">-- Choose Restaurant --</option>
                      {restaurantsData?.restaurants.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name} ({r.slug})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-medium text-stone-700 mb-1">
                        Amount (INR)
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={formAmountInr}
                        onChange={(e) => setFormAmountInr(Number(e.target.value))}
                        required
                        className="w-full h-8 px-2.5 text-xs bg-white border border-stone-200 rounded-lg text-stone-900 focus:outline-none focus:border-stone-900 focus:ring-1 focus:ring-stone-900"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-stone-700 mb-1">
                        Due Date
                      </label>
                      <input
                        type="date"
                        value={formDueDate}
                        onChange={(e) => setFormDueDate(e.target.value)}
                        required
                        className="w-full h-8 px-2.5 text-xs bg-white border border-stone-200 rounded-lg text-stone-900 focus:outline-none focus:border-stone-900 focus:ring-1 focus:ring-stone-900"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-stone-700 mb-1">
                      Internal Notes (Optional)
                    </label>
                    <textarea
                      rows={2}
                      value={formNotes}
                      onChange={(e) => setFormNotes(e.target.value)}
                      placeholder="Monthly billing notes or discount reference..."
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-stone-200 rounded-lg text-stone-900 focus:outline-none focus:border-stone-900 focus:ring-1 focus:ring-stone-900 resize-none"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
                    <button
                      type="button"
                      onClick={() => setIsCreateInvoiceOpen(false)}
                      className="px-3 py-1.5 text-xs text-stone-600 hover:text-stone-900 rounded-lg hover:bg-stone-100 font-medium transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={createInvoiceMutation.isPending}
                      className="px-3.5 py-1.5 text-xs font-medium text-white bg-stone-900 hover:bg-black rounded-lg transition-colors shadow-2xs disabled:opacity-50"
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
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
            <FadeIn>
              <div className="bg-white rounded-xl border border-stone-200/90 shadow-xl max-w-md w-full p-5 space-y-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center shrink-0">
                    <HugeiconsIcon icon={AlertSquareIcon} className="w-4 h-4" strokeWidth={1.5} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-stone-900">
                      Run Grace Period Enforcement Sweep
                    </h3>
                    <p className="text-[11px] text-stone-500">
                      Evaluates overdue invoices against the platform 7-day grace rule.
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-stone-50 border border-stone-200 rounded-lg text-xs text-stone-700 space-y-1.5">
                  <p className="font-medium text-stone-900 text-[11px]">
                    How auto-suspension works:
                  </p>
                  <ul className="list-disc list-inside space-y-0.5 text-[11px] text-stone-600">
                    <li>Checks all unpaid invoices whose due date has passed by &ge; 7 days.</li>
                    <li>Delinquent restaurants are automatically flagged as suspended.</li>
                    <li>Customer QR code placards are disabled immediately with an audit log.</li>
                    <li>
                      Subscriptions are marked as{' '}
                      <span className="font-mono text-rose-600 font-semibold">past_due</span>.
                    </li>
                  </ul>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
                  <button
                    type="button"
                    onClick={() => setIsSweepModalOpen(false)}
                    className="px-3 py-1.5 text-xs font-medium text-stone-600 hover:text-stone-900 rounded-lg hover:bg-stone-100 transition-colors"
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
