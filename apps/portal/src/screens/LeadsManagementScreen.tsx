import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  UserGroupIcon,
  Search01Icon,
  RefreshIcon,
  Mail01Icon,
  CallIcon,
  CheckmarkCircle02Icon,
  AlertCircleIcon,
  Cancel01Icon,
  ArrowRight01Icon,
} from '@hugeicons/core-free-icons';
import { SlideUp, FadeIn } from '@tiptable/ui';
import { Badge } from '../components/Badge.js';
import { useAuth } from '../context/AuthContext.js';
import {
  api,
  type LeadItem,
  type LeadStatus,
  type UpdateLeadStatusInput,
} from '../services/api.js';

type StatusFilter = 'all' | LeadStatus;

export const LeadsManagementScreen: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const isRestrictedRole = user?.role === 'finance';

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');
  const [selectedLead, setSelectedLead] = useState<LeadItem | null>(null);
  const [editingNotes, setEditingNotes] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch Leads Pipeline
  const {
    data: leadsData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['portal-leads', statusFilter, search],
    queryFn: () => {
      const params: { status?: string; search?: string } = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (search.trim()) params.search = search.trim();
      return api.getLeads(params);
    },
  });

  // Update Status Mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateLeadStatusInput }) =>
      api.updateLeadStatus(id, data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['portal-leads'] });
      if (selectedLead && selectedLead.id === res.lead.id) {
        setSelectedLead(res.lead);
      }
      setSuccessMessage(
        `Lead "${res.lead.restaurantName}" updated to "${res.lead.status.replace('_', ' ')}".`,
      );
    },
    onError: (err) => {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to update lead status.');
    },
  });

  const leads = leadsData?.leads || [];

  // Summary counts
  const newCount = leads.filter((l) => l.status === 'new').length;
  const inProgressCount = leads.filter(
    (l) => l.status === 'contacted' || l.status === 'demo_scheduled',
  ).length;
  const wonCount = leads.filter((l) => l.status === 'won').length;
  const lostCount = leads.filter((l) => l.status === 'lost').length;

  const getStatusBadge = (status: LeadStatus) => {
    switch (status) {
      case 'new':
        return <Badge variant="warning">New Lead</Badge>;
      case 'contacted':
        return <Badge variant="accent">Contacted</Badge>;
      case 'demo_scheduled':
        return <Badge variant="accent">Demo Scheduled</Badge>;
      case 'won':
        return <Badge variant="success">Won / Converted</Badge>;
      case 'lost':
        return <Badge variant="neutral">Lost</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  const handleOpenLead = (lead: LeadItem) => {
    setSelectedLead(lead);
    setEditingNotes(lead.notes || '');
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <SlideUp delay={0.05}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <HugeiconsIcon
                icon={UserGroupIcon}
                className="w-5 h-5 text-stone-900 dark:text-stone-100"
                strokeWidth={1.5}
              />
              Inbound Leads &amp; Demo Pipeline
            </h1>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              Prospective restaurant partner inquiries from the marketing demo request form.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {isRestrictedRole && <Badge variant="neutral">Read-only Sales View</Badge>}
            <button
              type="button"
              onClick={() => refetch()}
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
          <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-900 dark:text-emerald-200 text-xs">
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
          <div className="flex items-center justify-between p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-900 dark:text-rose-200 text-xs">
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

      {/* Pipeline Stage Summary KPIs */}
      <SlideUp delay={0.1}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3.5 bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 rounded-xl shadow-2xs transition-colors duration-200">
            <div className="flex items-center justify-between text-[11px] font-medium text-stone-500 dark:text-stone-400">
              <span>New Inquiries</span>
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            </div>
            <p className="text-xl font-semibold tracking-tight text-stone-900 dark:text-stone-100 mt-1.5">
              {newCount}
            </p>
            <p className="text-[11px] text-stone-400 dark:text-stone-500 mt-0.5">
              Awaiting initial outreach
            </p>
          </div>

          <div className="p-3.5 bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 rounded-xl shadow-2xs transition-colors duration-200">
            <div className="flex items-center justify-between text-[11px] font-medium text-stone-500 dark:text-stone-400">
              <span>In Pipeline</span>
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
            </div>
            <p className="text-xl font-semibold tracking-tight text-stone-900 dark:text-stone-100 mt-1.5">
              {inProgressCount}
            </p>
            <p className="text-[11px] text-stone-400 dark:text-stone-500 mt-0.5">
              Contacted or demo set
            </p>
          </div>

          <div className="p-3.5 bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 rounded-xl shadow-2xs transition-colors duration-200">
            <div className="flex items-center justify-between text-[11px] font-medium text-stone-500 dark:text-stone-400">
              <span>Won / Converted</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            </div>
            <p className="text-xl font-semibold tracking-tight text-stone-900 dark:text-stone-100 mt-1.5">
              {wonCount}
            </p>
            <p className="text-[11px] text-stone-400 dark:text-stone-500 mt-0.5">
              Ready for onboarding
            </p>
          </div>

          <div className="p-3.5 bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 rounded-xl shadow-2xs transition-colors duration-200">
            <div className="flex items-center justify-between text-[11px] font-medium text-stone-500 dark:text-stone-400">
              <span>Closed / Lost</span>
              <span className="w-1.5 h-1.5 rounded-full bg-stone-300 dark:bg-stone-600" />
            </div>
            <p className="text-xl font-semibold tracking-tight text-stone-900 dark:text-stone-100 mt-1.5">
              {lostCount}
            </p>
            <p className="text-[11px] text-stone-400 dark:text-stone-500 mt-0.5">
              Archived or disqualified
            </p>
          </div>
        </div>
      </SlideUp>

      {/* Main Table / Pipeline Section */}
      <SlideUp delay={0.15}>
        <div className="bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 rounded-xl shadow-2xs overflow-hidden transition-colors duration-200">
          {/* Filter & Search Bar */}
          <div className="p-3 border-b border-stone-200/80 dark:border-stone-800 flex flex-col md:flex-row items-center justify-between gap-2.5">
            <div className="relative w-full md:w-64">
              <HugeiconsIcon
                icon={Search01Icon}
                className="w-3.5 h-3.5 text-stone-400 dark:text-stone-500 absolute left-2.5 top-1/2 -translate-y-1/2"
                strokeWidth={1.5}
              />
              <input
                type="text"
                placeholder="Search leads by name, city, phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1 text-xs rounded-xl border border-stone-200/90 dark:border-stone-700 hover:border-stone-300 dark:hover:border-stone-600 bg-stone-50/70 dark:bg-stone-800/60 focus:bg-white dark:focus:bg-stone-800 focus:border-stone-400 dark:focus:border-stone-500 focus:shadow-[0_0_0_3px_rgba(0,0,0,0.04)] outline-none transition-all duration-200 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 h-8"
              />
            </div>

            {/* Stage Filter Chips */}
            <div className="flex items-center gap-1 overflow-x-auto w-full md:w-auto bg-stone-100/80 dark:bg-stone-800/80 p-0.5 rounded-lg border border-stone-200/70 dark:border-stone-700">
              {(
                [
                  { label: 'All', value: 'all' },
                  { label: 'New', value: 'new' },
                  { label: 'Contacted', value: 'contacted' },
                  { label: 'Demo Set', value: 'demo_scheduled' },
                  { label: 'Won', value: 'won' },
                  { label: 'Lost', value: 'lost' },
                ] as Array<{ label: string; value: StatusFilter }>
              ).map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setStatusFilter(tab.value)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
                    statusFilter === tab.value
                      ? 'bg-stone-900 dark:bg-white text-white dark:text-stone-900 shadow-2xs'
                      : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-200/50 dark:hover:bg-stone-700/50'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50/70 dark:bg-stone-800/80 border-b border-stone-200 dark:border-stone-800 text-stone-500 dark:text-stone-400 uppercase text-[10px] tracking-wider font-semibold">
                <tr>
                  <th className="py-2.5 px-3.5">Restaurant &amp; Location</th>
                  <th className="py-2.5 px-3.5">Contact Details</th>
                  <th className="py-2.5 px-3.5">Notes</th>
                  <th className="py-2.5 px-3.5">Stage</th>
                  <th className="py-2.5 px-3.5">Received</th>
                  <th className="py-2.5 px-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-stone-400 dark:text-stone-500">
                      Loading leads pipeline...
                    </td>
                  </tr>
                ) : leads.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-stone-400 dark:text-stone-500">
                      No inbound leads matching filters.
                    </td>
                  </tr>
                ) : (
                  leads.map((lead) => (
                    <tr
                      key={lead.id}
                      className="hover:bg-stone-50/60 dark:hover:bg-stone-800/50 transition-colors cursor-pointer"
                      onClick={() => handleOpenLead(lead)}
                    >
                      <td className="py-2.5 px-3.5">
                        <p className="font-semibold text-stone-900 dark:text-stone-100">
                          {lead.restaurantName}
                        </p>
                        <p className="text-[11px] text-stone-500 dark:text-stone-400 font-medium">
                          {lead.city}
                        </p>
                      </td>
                      <td className="py-2.5 px-3.5" onClick={(e) => e.stopPropagation()}>
                        <p className="font-medium text-stone-800 dark:text-stone-200">
                          {lead.contactName}
                        </p>
                        <div className="flex items-center gap-3 mt-0.5 text-[11px] text-stone-500 dark:text-stone-400">
                          <a
                            href={`tel:${lead.phone}`}
                            className="inline-flex items-center gap-1 hover:text-stone-900 dark:hover:text-stone-100"
                            title="Call contact"
                          >
                            <HugeiconsIcon
                              icon={CallIcon}
                              className="w-3 h-3 text-stone-400 dark:text-stone-500"
                              strokeWidth={1.5}
                            />
                            {lead.phone}
                          </a>
                          <a
                            href={`mailto:${lead.email}`}
                            className="inline-flex items-center gap-1 hover:text-stone-900 dark:hover:text-stone-100"
                            title="Send email"
                          >
                            <HugeiconsIcon
                              icon={Mail01Icon}
                              className="w-3 h-3 text-stone-400 dark:text-stone-500"
                              strokeWidth={1.5}
                            />
                            {lead.email}
                          </a>
                        </div>
                      </td>
                      <td className="py-2.5 px-3.5 max-w-xs truncate text-stone-500 dark:text-stone-400 text-[11px]">
                        {lead.notes || (
                          <span className="text-stone-300 dark:text-stone-600 italic">
                            No notes
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3.5">{getStatusBadge(lead.status)}</td>
                      <td className="py-2.5 px-3.5 font-mono text-[11px] text-stone-400 dark:text-stone-500">
                        {new Date(lead.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-2.5 px-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="inline-flex items-center gap-1.5 justify-end">
                          {!isRestrictedRole && (
                            <select
                              value={lead.status}
                              onChange={(e) =>
                                updateStatusMutation.mutate({
                                  id: lead.id,
                                  data: { status: e.target.value as LeadStatus },
                                })
                              }
                              className="h-7 px-2 text-[11px] bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-stone-800 dark:text-stone-200 hover:border-stone-300 dark:hover:border-stone-600 focus:outline-none focus:border-stone-900 dark:focus:border-stone-400"
                            >
                              <option value="new">New</option>
                              <option value="contacted">Contacted</option>
                              <option value="demo_scheduled">Demo Set</option>
                              <option value="won">Won</option>
                              <option value="lost">Lost</option>
                            </select>
                          )}
                          <button
                            type="button"
                            onClick={() => handleOpenLead(lead)}
                            className="p-1 text-stone-400 dark:text-stone-500 hover:text-stone-700 dark:hover:text-stone-200 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                            title="View details"
                          >
                            <HugeiconsIcon
                              icon={ArrowRight01Icon}
                              className="w-3.5 h-3.5"
                              strokeWidth={1.5}
                            />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </SlideUp>

      {/* Lead Detail & Actions Modal */}
      {selectedLead &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 dark:bg-black/70 backdrop-blur-xs animate-fade-in font-sans">
            <FadeIn>
              <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200/90 dark:border-stone-800 shadow-xl max-w-lg w-full p-5 space-y-3.5 transition-colors duration-200">
                <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-2.5">
                  <div>
                    <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                      {selectedLead.restaurantName}
                    </h3>
                    <p className="text-[11px] text-stone-500 dark:text-stone-400">
                      Lead ID:{' '}
                      <span className="font-mono text-stone-700 dark:text-stone-300">
                        {selectedLead.id}
                      </span>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedLead(null)}
                    className="p-1 text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                  >
                    <HugeiconsIcon icon={Cancel01Icon} className="w-4 h-4" strokeWidth={1.5} />
                  </button>
                </div>

                {/* Lead Info Grid */}
                <div className="grid grid-cols-2 gap-2.5 text-xs bg-stone-50/70 dark:bg-stone-800/60 p-3 rounded-lg border border-stone-200/80 dark:border-stone-700">
                  <div>
                    <span className="text-stone-400 dark:text-stone-500 block text-[10px] uppercase font-semibold tracking-wider mb-0.5">
                      Contact Person
                    </span>
                    <p className="font-medium text-stone-900 dark:text-stone-100">
                      {selectedLead.contactName}
                    </p>
                  </div>
                  <div>
                    <span className="text-stone-400 dark:text-stone-500 block text-[10px] uppercase font-semibold tracking-wider mb-0.5">
                      City
                    </span>
                    <p className="font-medium text-stone-900 dark:text-stone-100">
                      {selectedLead.city}
                    </p>
                  </div>
                  <div>
                    <span className="text-stone-400 dark:text-stone-500 block text-[10px] uppercase font-semibold tracking-wider mb-0.5">
                      Phone
                    </span>
                    <a
                      href={`tel:${selectedLead.phone}`}
                      className="font-mono text-stone-900 dark:text-stone-100 hover:underline"
                    >
                      {selectedLead.phone}
                    </a>
                  </div>
                  <div>
                    <span className="text-stone-400 dark:text-stone-500 block text-[10px] uppercase font-semibold tracking-wider mb-0.5">
                      Email
                    </span>
                    <a
                      href={`mailto:${selectedLead.email}`}
                      className="font-mono text-stone-900 dark:text-stone-100 hover:underline"
                    >
                      {selectedLead.email}
                    </a>
                  </div>
                </div>

                {/* Stage Transition */}
                <div>
                  <label className="block text-[11px] font-medium text-stone-700 dark:text-stone-300 mb-1.5">
                    Pipeline Stage
                  </label>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {(['new', 'contacted', 'demo_scheduled', 'won', 'lost'] as LeadStatus[]).map(
                      (st) => (
                        <button
                          key={st}
                          type="button"
                          disabled={isRestrictedRole || updateStatusMutation.isPending}
                          onClick={() => {
                            const payload: UpdateLeadStatusInput = { status: st };
                            if (editingNotes.trim()) {
                              payload.notes = editingNotes.trim();
                            }
                            updateStatusMutation.mutate({
                              id: selectedLead.id,
                              data: payload,
                            });
                          }}
                          className={`px-2.5 py-1 text-[11px] font-medium rounded-lg capitalize border transition-colors ${
                            selectedLead.status === st
                              ? 'bg-stone-900 text-white dark:bg-white dark:text-stone-900 border-stone-900 dark:border-white shadow-2xs'
                              : 'bg-white text-stone-600 dark:bg-stone-800 dark:text-stone-300 border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-700/80'
                          }`}
                        >
                          {st.replace('_', ' ')}
                        </button>
                      ),
                    )}
                  </div>
                </div>

                {/* Internal Notes Editor */}
                <div>
                  <label className="block text-[11px] font-medium text-stone-700 dark:text-stone-300 mb-1">
                    Sales Notes &amp; Discussion Record
                  </label>
                  <textarea
                    rows={3}
                    value={editingNotes}
                    disabled={isRestrictedRole}
                    onChange={(e) => setEditingNotes(e.target.value)}
                    placeholder="Record call notes, demo feedback, or onboarding prerequisites..."
                    className="w-full px-3 py-2 text-xs bg-stone-50/70 dark:bg-stone-800/60 border border-stone-200/90 dark:border-stone-700 hover:border-stone-300 dark:hover:border-stone-600 rounded-xl text-stone-900 dark:text-stone-100 focus:bg-white dark:focus:bg-stone-800 focus:border-stone-400 dark:focus:border-stone-500 focus:shadow-[0_0_0_3px_rgba(0,0,0,0.04)] dark:focus:shadow-[0_0_0_3px_rgba(255,255,255,0.04)] outline-none transition-all duration-200 resize-none disabled:opacity-60"
                  />
                </div>

                {/* Modal Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-stone-100 dark:border-stone-800">
                  <button
                    type="button"
                    onClick={() => {
                      navigate('/restaurants');
                    }}
                    className="inline-flex items-center gap-1 text-xs text-stone-900 dark:text-stone-100 hover:text-black dark:hover:text-white font-semibold underline underline-offset-2"
                  >
                    Onboard as Restaurant &rarr;
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedLead(null)}
                      className="px-3 py-1.5 text-xs text-stone-700 dark:text-stone-300 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg hover:bg-stone-50 dark:hover:bg-stone-700/80 font-medium transition-colors cursor-pointer"
                    >
                      Close
                    </button>
                    {!isRestrictedRole && (
                      <button
                        type="button"
                        disabled={updateStatusMutation.isPending}
                        onClick={() => {
                          const payload: UpdateLeadStatusInput = {
                            status: selectedLead.status,
                          };
                          if (editingNotes.trim()) {
                            payload.notes = editingNotes.trim();
                          }
                          updateStatusMutation.mutate({
                            id: selectedLead.id,
                            data: payload,
                          });
                        }}
                        className="px-3.5 py-1.5 text-xs font-medium text-white dark:text-stone-900 bg-stone-900 hover:bg-black dark:bg-white dark:hover:bg-stone-100 rounded-lg transition-all shadow-2xs disabled:opacity-50 cursor-pointer"
                      >
                        {updateStatusMutation.isPending ? 'Saving...' : 'Save Notes'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </FadeIn>
          </div>,
          document.body,
        )}
    </div>
  );
};
