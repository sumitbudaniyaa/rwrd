import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { HugeiconsIcon } from '@hugeicons/react';
import { Search01Icon, RefreshIcon, Cancel01Icon } from '@hugeicons/core-free-icons';
import { motion } from 'framer-motion';
import { SlideUp, FadeIn, useToast } from '@tiptable/ui';
import { useAuth } from '../context/AuthContext.js';
import {
  api,
  type PortalSupportTicketItem,
  type UpdatePortalSupportTicketInput,
} from '../services/api.js';

export const SupportTicketsScreen: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const toast = useToast();

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [search, setSearch] = useState<string>('');
  const [selectedTicket, setSelectedTicket] = useState<PortalSupportTicketItem | null>(null);

  // Modal edit form state
  const [editStatus, setEditStatus] = useState<PortalSupportTicketItem['status']>('open');
  const [editPriority, setEditPriority] = useState<PortalSupportTicketItem['priority']>('medium');
  const [editResolutionNote, setEditResolutionNote] = useState<string>('');

  const {
    data: ticketsResponse,
    isLoading,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['portal-support-tickets', statusFilter, categoryFilter, priorityFilter, search],
    queryFn: () => {
      const params: {
        status?: string;
        category?: string;
        priority?: string;
        search?: string;
      } = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (categoryFilter !== 'all') params.category = categoryFilter;
      if (priorityFilter !== 'all') params.priority = priorityFilter;
      if (search.trim()) params.search = search.trim();
      return api.getSupportTickets(params);
    },
  });

  const tickets = ticketsResponse?.data || [];
  const kpis = ticketsResponse?.kpis || { open: 0, inProgress: 0, resolved: 0, urgent: 0 };

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePortalSupportTicketInput }) =>
      api.updateSupportTicket(id, data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['portal-support-tickets'] });
      toast.success(
        'Ticket Updated',
        `Ticket ${res.ticket.ticketNumber} status updated to ${res.ticket.status.replace('_', ' ')}.`,
      );
      setSelectedTicket(null);
    },
    onError: (err) => {
      const msg = err instanceof Error ? err.message : 'Failed to update ticket.';
      toast.error('Update Failed', msg);
    },
  });

  const handleOpenReview = (ticket: PortalSupportTicketItem) => {
    setSelectedTicket(ticket);
    setEditStatus(ticket.status);
    setEditPriority(ticket.priority);
    setEditResolutionNote(ticket.resolutionNote || '');
  };

  const handleSaveUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket) return;

    updateMutation.mutate({
      id: selectedTicket.id,
      data: {
        status: editStatus,
        priority: editPriority,
        resolutionNote: editResolutionNote.trim() || null,
        assignedStaffId: user?.id || null,
      },
    });
  };

  const getStatusBadge = (status: PortalSupportTicketItem['status']) => {
    switch (status) {
      case 'open':
        return 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      case 'in_progress':
        return 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800';
      case 'resolved':
        return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
      case 'closed':
        return 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300 border-stone-200 dark:border-stone-700';
    }
  };

  const getPriorityBadge = (priority: PortalSupportTicketItem['priority']) => {
    switch (priority) {
      case 'urgent':
        return 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800';
      case 'high':
        return 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800';
      case 'medium':
        return 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300 border-stone-200 dark:border-stone-700';
      case 'low':
        return 'bg-stone-50 text-stone-500 dark:bg-stone-900 dark:text-stone-400 border-stone-200 dark:border-stone-800';
    }
  };

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#FAFAF9] dark:bg-stone-950 font-sans transition-colors duration-200">
      {/* Scrollable Container */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
        {/* Header */}
        <SlideUp>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
            <div>
              <h1 className="text-2xl md:text-3xl font-serif tracking-tight text-stone-900 dark:text-stone-100 font-normal leading-[1.08] text-left">
                support & complaints
              </h1>
              <p className="text-stone-500 dark:text-stone-400 text-xs md:text-sm mt-1">
                review incoming complaints, investigate technical tickets, and publish resolution
                notes
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => refetch()}
                disabled={isFetching}
                className="px-3 py-1.5 text-xs font-medium text-stone-700 dark:text-stone-300 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl hover:bg-stone-50 dark:hover:bg-stone-800/60 transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-50"
              >
                <HugeiconsIcon
                  icon={RefreshIcon}
                  size={14}
                  strokeWidth={2}
                  className={isFetching ? 'animate-spin' : ''}
                />
                <span>Refresh</span>
              </button>
            </div>
          </div>
        </SlideUp>

        {/* Summary KPI Cards */}
        <SlideUp delay={0.05}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-4 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200/80 dark:border-stone-800 shadow-xs">
              <span className="text-[11px] font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider block">
                Open Tickets
              </span>
              <span className="text-2xl font-semibold text-blue-600 dark:text-blue-400 mt-1 block">
                {kpis.open}
              </span>
            </div>

            <div className="p-4 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200/80 dark:border-stone-800 shadow-xs">
              <span className="text-[11px] font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider block">
                In Progress
              </span>
              <span className="text-2xl font-semibold text-amber-600 dark:text-amber-400 mt-1 block">
                {kpis.inProgress}
              </span>
            </div>

            <div className="p-4 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200/80 dark:border-stone-800 shadow-xs">
              <span className="text-[11px] font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider block">
                Resolved
              </span>
              <span className="text-2xl font-semibold text-emerald-600 dark:text-emerald-400 mt-1 block">
                {kpis.resolved}
              </span>
            </div>

            <div className="p-4 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200/80 dark:border-stone-800 shadow-xs">
              <span className="text-[11px] font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider block">
                Urgent Attention
              </span>
              <span className="text-2xl font-semibold text-rose-600 dark:text-rose-400 mt-1 block">
                {kpis.urgent}
              </span>
            </div>
          </div>
        </SlideUp>

        {/* Filters and Search Bar */}
        <SlideUp delay={0.1}>
          <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200/80 dark:border-stone-800 p-4 shadow-xs space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Status Tabs with beUI spring gliding active pill */}
              <div
                role="tablist"
                aria-label="Filter support tickets by status"
                className="inline-flex items-center gap-1 bg-stone-100/90 dark:bg-stone-800/80 p-1 rounded-xl border border-stone-200/70 dark:border-stone-700 overflow-x-auto max-w-full"
              >
                {(
                  [
                    { id: 'all', label: 'All' },
                    { id: 'open', label: 'Open' },
                    { id: 'in_progress', label: 'In Progress' },
                    { id: 'resolved', label: 'Resolved' },
                    { id: 'closed', label: 'Closed' },
                  ] as const
                ).map((tab) => {
                  const isSelected = statusFilter === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={isSelected}
                      onClick={() => setStatusFilter(tab.id)}
                      className={`relative px-3.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer select-none outline-none focus:outline-none whitespace-nowrap transition-colors duration-150 ${
                        isSelected
                          ? 'text-white dark:text-stone-900'
                          : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
                      }`}
                    >
                      {isSelected && (
                        <motion.span
                          layoutId="portal-support-status-tab"
                          className="absolute inset-0 bg-stone-900 dark:bg-stone-100 rounded-lg shadow-xs z-0"
                          transition={{ type: 'spring', stiffness: 420, damping: 32, mass: 0.8 }}
                        />
                      )}
                      <span className="relative z-10">{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Search Box */}
              <div className="relative w-full md:w-64">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                  <HugeiconsIcon icon={Search01Icon} size={14} strokeWidth={1.5} />
                </div>
                <input
                  type="text"
                  placeholder="Search by ticket # or restaurant..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl focus:bg-white dark:focus:bg-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-400 transition-all text-stone-800 dark:text-stone-100"
                />
              </div>
            </div>

            {/* Category and Priority Selectors */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-stone-100 dark:border-stone-800 text-xs">
              <span className="text-stone-400 text-[11px] font-medium">Filter by:</span>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-2.5 py-1 text-xs bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-stone-700 dark:text-stone-300 focus:outline-none"
              >
                <option value="all">All Categories</option>
                <option value="complaint">Complaints</option>
                <option value="technical">Technical</option>
                <option value="billing">Billing</option>
                <option value="request">Feature Requests</option>
                <option value="other">Other</option>
              </select>

              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="px-2.5 py-1 text-xs bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-stone-700 dark:text-stone-300 focus:outline-none"
              >
                <option value="all">All Priorities</option>
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>

              {(categoryFilter !== 'all' || priorityFilter !== 'all' || search) && (
                <button
                  type="button"
                  onClick={() => {
                    setCategoryFilter('all');
                    setPriorityFilter('all');
                    setSearch('');
                  }}
                  className="text-[11px] text-stone-500 hover:text-stone-900 dark:hover:text-stone-200 underline ml-2"
                >
                  Clear filters
                </button>
              )}
            </div>
          </div>
        </SlideUp>

        {/* Tickets Table / List */}
        <SlideUp delay={0.15}>
          <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200/80 dark:border-stone-800 shadow-xs overflow-hidden">
            {isLoading ? (
              <div className="p-12 text-center text-sm text-stone-500 animate-pulse">
                Loading support tickets...
              </div>
            ) : tickets.length === 0 ? (
              <div className="p-12 text-center space-y-2">
                <h3 className="text-base font-medium text-stone-900 dark:text-stone-100">
                  no support tickets
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400 max-w-sm mx-auto">
                  No tickets matched the current filter criteria or none have been submitted by
                  restaurant tenants.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-stone-200/70 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-800/40 text-[11px] font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider">
                      <th className="py-3 px-4">Ticket</th>
                      <th className="py-3 px-4">Restaurant</th>
                      <th className="py-3 px-4">Subject & Description</th>
                      <th className="py-3 px-4">Priority</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Created</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 dark:divide-stone-800/60 text-stone-700 dark:text-stone-300">
                    {tickets.map((t) => (
                      <tr
                        key={t.id}
                        className="hover:bg-stone-50/80 dark:hover:bg-stone-800/40 transition-colors"
                      >
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="font-mono font-semibold text-stone-900 dark:text-stone-100">
                            {t.ticketNumber}
                          </span>
                          <span className="block text-[10px] text-stone-400 capitalize">
                            {t.category}
                          </span>
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="font-medium text-stone-900 dark:text-stone-100 block">
                            {t.restaurantName}
                          </span>
                          <span className="text-[10px] text-stone-400 font-mono">
                            /{t.restaurantSlug}
                          </span>
                        </td>

                        <td className="py-3 px-4 max-w-md">
                          <span className="font-semibold text-stone-900 dark:text-stone-100 block truncate">
                            {t.subject}
                          </span>
                          <p className="text-stone-500 dark:text-stone-400 line-clamp-1 text-[11px] leading-relaxed">
                            {t.description}
                          </p>
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded-full border text-[11px] font-medium capitalize ${getPriorityBadge(
                              t.priority,
                            )}`}
                          >
                            {t.priority}
                          </span>
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded-full border text-[11px] font-medium capitalize ${getStatusBadge(
                              t.status,
                            )}`}
                          >
                            {t.status.replace('_', ' ')}
                          </span>
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap text-stone-400 text-[11px]">
                          {new Date(t.createdAt).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap text-right">
                          <button
                            type="button"
                            onClick={() => handleOpenReview(t)}
                            className="px-3 py-1.5 text-xs font-semibold text-stone-900 dark:text-stone-900 bg-[#FFE862] hover:opacity-90 rounded-xl transition-opacity shadow-xs"
                          >
                            Review / Resolve
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </SlideUp>
      </div>

      {/* Review / Resolve Modal */}
      {selectedTicket &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="review-ticket-title"
            className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-fade-in font-sans"
          >
            <FadeIn>
              <div className="bg-white dark:bg-stone-900 rounded-2xl max-w-xl w-full border border-stone-200/90 dark:border-stone-800 shadow-2xl overflow-hidden p-6 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-stone-100 dark:border-stone-800">
                  <div>
                    <span className="font-mono text-xs font-semibold text-stone-900 dark:text-stone-100 px-2 py-0.5 bg-stone-100 dark:bg-stone-800 rounded-md border border-stone-200/60 dark:border-stone-700">
                      {selectedTicket.ticketNumber}
                    </span>
                    <h3
                      id="review-ticket-title"
                      className="text-base font-serif font-normal text-stone-900 dark:text-stone-100 tracking-tight mt-1"
                    >
                      review ticket - {selectedTicket.ticketNumber}
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedTicket(null)}
                    className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 p-1 rounded-lg"
                  >
                    <HugeiconsIcon icon={Cancel01Icon} size={18} strokeWidth={2} />
                  </button>
                </div>

                {/* Ticket Context Box */}
                <div className="p-3.5 bg-stone-50 dark:bg-stone-800/60 border border-stone-200/80 dark:border-stone-700 rounded-xl space-y-2 text-xs">
                  <div className="flex items-center justify-between text-stone-600 dark:text-stone-400">
                    <span className="font-medium text-stone-500">Restaurant:</span>
                    <span className="font-semibold text-stone-900 dark:text-stone-100">
                      {selectedTicket.restaurantName} (/{selectedTicket.restaurantSlug})
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-stone-600 dark:text-stone-400">
                    <span className="font-medium text-stone-500">Category:</span>
                    <span className="capitalize text-stone-800 dark:text-stone-200">
                      {selectedTicket.category}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-stone-600 dark:text-stone-400">
                    <span className="font-medium text-stone-500">Submitted:</span>
                    <span className="text-stone-800 dark:text-stone-200">
                      {new Date(selectedTicket.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-stone-200/60 dark:border-stone-700">
                    <span className="font-medium text-stone-500 block mb-1">Subject:</span>
                    <p className="font-semibold text-stone-900 dark:text-stone-100 text-xs">
                      {selectedTicket.subject}
                    </p>
                  </div>
                  <div className="pt-1">
                    <span className="font-medium text-stone-500 block mb-1">
                      Reported Issue / Description:
                    </span>
                    <p className="text-stone-700 dark:text-stone-300 text-[11px] whitespace-pre-wrap leading-relaxed bg-white dark:bg-stone-900 p-2.5 rounded-lg border border-stone-200/60 dark:border-stone-700">
                      {selectedTicket.description}
                    </p>
                  </div>
                </div>

                {/* Update Form */}
                <form onSubmit={handleSaveUpdate} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label
                        htmlFor="ticket-edit-status"
                        className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1"
                      >
                        Update Status
                      </label>
                      <select
                        id="ticket-edit-status"
                        value={editStatus}
                        onChange={(e) =>
                          setEditStatus(e.target.value as PortalSupportTicketItem['status'])
                        }
                        className="w-full text-xs bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl px-3 py-2 text-stone-800 dark:text-stone-200 focus:outline-none focus:ring-2 focus:ring-stone-900/10 capitalize"
                      >
                        <option value="open">Open</option>
                        <option value="in_progress">In Progress</option>
                        <option value="resolved">Resolved</option>
                        <option value="closed">Closed</option>
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor="ticket-edit-priority"
                        className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1"
                      >
                        Priority Level
                      </label>
                      <select
                        id="ticket-edit-priority"
                        value={editPriority}
                        onChange={(e) =>
                          setEditPriority(e.target.value as PortalSupportTicketItem['priority'])
                        }
                        className="w-full text-xs bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl px-3 py-2 text-stone-800 dark:text-stone-200 focus:outline-none focus:ring-2 focus:ring-stone-900/10 capitalize"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1">
                      Support Team Resolution Note (visible to restaurant manager)
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Explain how the issue was fixed, troubleshooting steps, or closing advice..."
                      value={editResolutionNote}
                      onChange={(e) => setEditResolutionNote(e.target.value)}
                      className="w-full text-xs bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl p-3 text-stone-800 dark:text-stone-200 focus:outline-none focus:ring-2 focus:ring-stone-900/10 resize-none"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-stone-100 dark:border-stone-800">
                    <button
                      type="button"
                      disabled={updateMutation.isPending}
                      onClick={() => setSelectedTicket(null)}
                      className="px-4 py-2 text-xs font-medium text-stone-700 dark:text-stone-300 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={updateMutation.isPending}
                      className="px-4 py-2 text-xs font-semibold text-stone-900 bg-[#FFE862] rounded-xl hover:opacity-90 transition-opacity shadow-sm"
                    >
                      {updateMutation.isPending ? 'Updating...' : 'Save & Update Ticket'}
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
