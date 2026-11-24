import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { HugeiconsIcon } from '@hugeicons/react';
import { Add01Icon, Search01Icon } from '@hugeicons/core-free-icons';
import { SlideUp, FadeIn, useToast } from '@tiptable/ui';
import { MotionButton } from '../components/motion/button.js';
import { useAuth } from '../context/AuthContext.js';
import { api, type SupportTicketItem, type CreateSupportTicketInput } from '../services/api.js';

export const SupportScreen: React.FC = () => {
  const { restaurant } = useAuth();
  const queryClient = useQueryClient();
  const toast = useToast();

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicketItem | null>(null);

  // Form state
  const [category, setCategory] = useState<CreateSupportTicketInput['category']>('complaint');
  const [priority, setPriority] = useState<CreateSupportTicketInput['priority']>('medium');
  const [subject, setSubject] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);

  const restaurantId = restaurant?.id || '';

  const {
    data: ticketsResponse,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['admin-support-tickets', restaurantId],
    queryFn: () => (restaurantId ? api.getSupportTickets(restaurantId) : null),
    enabled: Boolean(restaurantId),
  });

  const tickets = ticketsResponse?.data || [];

  const createTicketMutation = useMutation({
    mutationFn: (newTicket: CreateSupportTicketInput) =>
      api.createSupportTicket(restaurantId, newTicket),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-support-tickets', restaurantId] });
      toast.success(
        'Ticket Submitted',
        `Support ticket ${data.ticket.ticketNumber} has been opened with our team.`,
      );
      setIsCreateModalOpen(false);
      setSubject('');
      setDescription('');
      setCategory('complaint');
      setPriority('medium');
      setFormError(null);
    },
    onError: (err) => {
      const msg = err instanceof Error ? err.message : 'Failed to submit support ticket.';
      setFormError(msg);
      toast.error('Submission Failed', msg);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (subject.trim().length < 3) {
      setFormError('Subject must be at least 3 characters long.');
      return;
    }
    if (description.trim().length < 10) {
      setFormError('Description must be at least 10 characters long.');
      return;
    }

    createTicketMutation.mutate({
      category,
      priority,
      subject: subject.trim(),
      description: description.trim(),
    });
  };

  const filteredTickets = tickets.filter((t) => {
    if (statusFilter !== 'all' && t.status !== statusFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchSubject = t.subject.toLowerCase().includes(q);
      const matchNumber = t.ticketNumber.toLowerCase().includes(q);
      const matchCategory = t.category.toLowerCase().includes(q);
      if (!matchSubject && !matchNumber && !matchCategory) return false;
    }
    return true;
  });

  const getStatusBadge = (status: SupportTicketItem['status']) => {
    switch (status) {
      case 'open':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'in_progress':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'resolved':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'closed':
        return 'bg-stone-100 text-stone-600 border-stone-200';
    }
  };

  const getPriorityBadge = (p: SupportTicketItem['priority']) => {
    switch (p) {
      case 'urgent':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'high':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'medium':
        return 'bg-stone-100 text-stone-700 border-stone-200';
      case 'low':
        return 'bg-stone-50 text-stone-500 border-stone-200';
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <SlideUp>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
          <div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif tracking-tight text-stone-900 font-normal leading-[1.08] text-left">
              support & complaints
            </h1>
            <p className="text-stone-500 text-sm mt-1">
              raise support requests, report technical issues, or track active complaints
            </p>
          </div>

          <div className="flex items-center gap-3">
            <MotionButton
              onClick={() => {
                setFormError(null);
                setIsCreateModalOpen(true);
              }}
              className="bg-[#FFE862] text-stone-900 font-semibold px-4 py-2.5 rounded-xl text-sm hover:opacity-90 transition-opacity flex items-center gap-2 shadow-sm"
            >
              <HugeiconsIcon icon={Add01Icon} size={16} strokeWidth={2} />
              <span>raise ticket</span>
            </MotionButton>
          </div>
        </div>
      </SlideUp>

      {/* Filter Tabs & Search Bar */}
      <SlideUp delay={0.05}>
        <div className="bg-white rounded-2xl border border-stone-200/80 p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
            {(
              [
                { id: 'all', label: 'All' },
                { id: 'open', label: 'Open' },
                { id: 'in_progress', label: 'In Progress' },
                { id: 'resolved', label: 'Resolved' },
                { id: 'closed', label: 'Closed' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  statusFilter === tab.id
                    ? 'bg-stone-900 text-white shadow-xs'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-72">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
              <HugeiconsIcon icon={Search01Icon} size={15} strokeWidth={1.5} />
            </div>
            <input
              type="text"
              placeholder="Search tickets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-400 transition-all text-stone-800"
            />
          </div>
        </div>
      </SlideUp>

      {/* Ticket List */}
      <SlideUp delay={0.1}>
        <div className="space-y-4">
          {isLoading ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-stone-200/80">
              <p className="text-sm text-stone-500 animate-pulse">Loading support tickets...</p>
            </div>
          ) : isError ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-stone-200/80">
              <p className="text-sm text-rose-600 mb-3">Failed to load support tickets.</p>
              <button
                type="button"
                onClick={() => refetch()}
                className="text-xs font-semibold px-3 py-1.5 bg-stone-100 text-stone-800 rounded-lg hover:bg-stone-200 transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-stone-200/80 space-y-2">
              <h3 className="text-base font-medium text-stone-900">no tickets found</h3>
              <p className="text-xs text-stone-500 max-w-sm mx-auto">
                {tickets.length === 0
                  ? 'You have not raised any support requests or complaints yet. Click "raise ticket" whenever you need assistance.'
                  : 'No tickets matched your filter criteria.'}
              </p>
            </div>
          ) : (
            <div className="grid gap-3">
              {filteredTickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="bg-white rounded-2xl border border-stone-200/80 p-5 shadow-xs hover:border-stone-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-mono font-semibold text-stone-900 px-2 py-0.5 bg-stone-100 rounded-md border border-stone-200/60">
                        {ticket.ticketNumber}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full border text-[11px] font-medium capitalize ${getStatusBadge(
                          ticket.status,
                        )}`}
                      >
                        {ticket.status.replace('_', ' ')}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full border text-[11px] font-medium capitalize ${getPriorityBadge(
                          ticket.priority,
                        )}`}
                      >
                        {ticket.priority} priority
                      </span>
                      <span className="text-[11px] text-stone-400 capitalize">
                        • {ticket.category}
                      </span>
                    </div>

                    <h4 className="text-sm font-semibold text-stone-900 truncate">
                      {ticket.subject}
                    </h4>
                    <p className="text-xs text-stone-500 line-clamp-2 leading-relaxed">
                      {ticket.description}
                    </p>

                    {ticket.resolutionNote && (
                      <div className="pt-1.5 flex items-center gap-1.5 text-xs text-emerald-700">
                        <span className="font-medium">Resolution available:</span>
                        <span className="truncate italic text-stone-600">
                          {ticket.resolutionNote}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-100">
                    <span className="text-[11px] text-stone-400">
                      {new Date(ticket.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedTicket(ticket)}
                      className="px-3 py-1.5 text-xs font-medium text-stone-700 bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded-xl transition-colors"
                    >
                      view details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </SlideUp>

      {/* Create Ticket Modal */}
      {isCreateModalOpen &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-ticket-title"
            className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-fade-in font-sans"
          >
            <FadeIn>
              <div className="bg-white rounded-2xl max-w-lg w-full border border-stone-200/90 shadow-2xl overflow-hidden p-6 space-y-4">
                <div>
                  <h3
                    id="new-ticket-title"
                    className="text-lg font-serif font-normal text-stone-900 tracking-tight"
                  >
                    raise a support ticket
                  </h3>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Describe your issue or complaint in detail. Our support engineers will respond
                    promptly.
                  </p>
                </div>

                {formError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
                    {formError}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-stone-700 mb-1">
                        Category
                      </label>
                      <select
                        value={category}
                        onChange={(e) =>
                          setCategory(e.target.value as CreateSupportTicketInput['category'])
                        }
                        className="w-full text-xs bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-400 transition-all capitalize"
                      >
                        <option value="complaint">Complaint</option>
                        <option value="technical">Technical Issue</option>
                        <option value="billing">Billing Inquiry</option>
                        <option value="request">Feature Request</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-stone-700 mb-1">
                        Priority
                      </label>
                      <select
                        value={priority}
                        onChange={(e) =>
                          setPriority(e.target.value as CreateSupportTicketInput['priority'])
                        }
                        className="w-full text-xs bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-400 transition-all capitalize"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-1">Subject</label>
                    <input
                      type="text"
                      placeholder="e.g., QR scan routing error at Table 4"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      required
                      className="w-full text-xs bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-400 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-1">
                      Description
                    </label>
                    <textarea
                      rows={4}
                      placeholder="Describe the issue, steps to reproduce, or any error messages..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      required
                      className="w-full text-xs bg-stone-50 border border-stone-200 rounded-xl p-3 text-stone-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-400 transition-all resize-none"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-stone-100">
                    <MotionButton
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={createTicketMutation.isPending}
                      onClick={() => setIsCreateModalOpen(false)}
                      className="px-4 py-2 text-xs font-medium text-stone-700 bg-white border border-stone-200 rounded-xl hover:bg-stone-50 transition-colors"
                    >
                      Cancel
                    </MotionButton>
                    <MotionButton
                      type="submit"
                      size="sm"
                      disabled={createTicketMutation.isPending}
                      className="px-4 py-2 text-xs font-semibold text-stone-900 bg-[#FFE862] rounded-xl hover:opacity-90 transition-opacity shadow-sm"
                    >
                      {createTicketMutation.isPending ? 'Submitting...' : 'submit ticket'}
                    </MotionButton>
                  </div>
                </form>
              </div>
            </FadeIn>
          </div>,
          document.body,
        )}

      {/* Ticket Details Modal */}
      {selectedTicket &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="ticket-details-title"
            className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-fade-in font-sans"
          >
            <FadeIn>
              <div className="bg-white rounded-2xl max-w-lg w-full border border-stone-200/90 shadow-2xl overflow-hidden p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-mono text-xs font-semibold text-stone-900 px-2 py-0.5 bg-stone-100 rounded-md border border-stone-200/60">
                      {selectedTicket.ticketNumber}
                    </span>
                    <h3
                      id="ticket-details-title"
                      className="text-base font-serif font-normal text-stone-900 tracking-tight mt-1"
                    >
                      ticket details
                    </h3>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full border text-xs font-medium capitalize ${getStatusBadge(
                      selectedTicket.status,
                    )}`}
                  >
                    {selectedTicket.status.replace('_', ' ')}
                  </span>
                </div>

                <div className="p-3.5 bg-stone-50 border border-stone-200/80 rounded-xl space-y-2 text-xs">
                  <div className="flex items-center justify-between text-stone-600">
                    <span className="font-medium text-stone-500">Category:</span>
                    <span className="capitalize font-semibold text-stone-800">
                      {selectedTicket.category}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-stone-600">
                    <span className="font-medium text-stone-500">Priority:</span>
                    <span className="capitalize font-semibold text-stone-800">
                      {selectedTicket.priority}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-stone-600">
                    <span className="font-medium text-stone-500">Submitted On:</span>
                    <span className="text-stone-800">
                      {new Date(selectedTicket.createdAt).toLocaleString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <h5 className="text-xs font-semibold text-stone-900">{selectedTicket.subject}</h5>
                  <p className="text-xs text-stone-600 whitespace-pre-wrap leading-relaxed bg-stone-50/50 p-3 rounded-xl border border-stone-200/60">
                    {selectedTicket.description}
                  </p>
                </div>

                {selectedTicket.resolutionNote ? (
                  <div className="p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-xl text-xs space-y-1 text-emerald-950">
                    <div className="flex items-center justify-between font-semibold text-emerald-800">
                      <span>support team resolution</span>
                      {selectedTicket.resolvedAt && (
                        <span className="text-[10px] font-normal text-emerald-700">
                          {new Date(selectedTicket.resolvedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <p className="text-emerald-900 leading-relaxed whitespace-pre-wrap text-[11px]">
                      {selectedTicket.resolutionNote}
                    </p>
                  </div>
                ) : (
                  <div className="p-3 bg-stone-50 border border-stone-200/60 rounded-xl text-xs text-stone-500 text-center">
                    <span>Our engineering team is actively reviewing your ticket.</span>
                  </div>
                )}

                <div className="flex items-center justify-end pt-2 border-t border-stone-100">
                  <MotionButton
                    type="button"
                    size="sm"
                    onClick={() => setSelectedTicket(null)}
                    className="px-4 py-2 text-xs font-medium text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors"
                  >
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
