import React, { useState } from 'react';
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
import { SlideUp, FadeIn, Badge, MotionButton } from '@tiptable/ui';
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-stone-900 flex items-center gap-2">
              <HugeiconsIcon
                icon={UserGroupIcon}
                className="w-6 h-6 text-stone-800"
                strokeWidth={1.5}
              />
              Inbound Leads & Demo Pipeline
            </h1>
            <p className="text-sm text-stone-500 mt-1">
              Prospective restaurant partner inquiries from the marketing demo request form.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {isRestrictedRole && <Badge variant="neutral">Read-only Sales View</Badge>}
            <button
              type="button"
              onClick={() => refetch()}
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

      {/* Pipeline Stage Summary KPIs */}
      <SlideUp delay={0.1}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-white border border-stone-200 rounded-xl shadow-xs">
            <div className="flex items-center justify-between text-xs font-medium text-stone-500">
              <span>New Inquiries</span>
              <span className="w-2 h-2 rounded-full bg-amber-500" />
            </div>
            <p className="text-2xl font-bold text-stone-900 mt-2">{newCount}</p>
            <p className="text-xs text-stone-400 mt-0.5">Awaiting initial outreach</p>
          </div>

          <div className="p-4 bg-white border border-stone-200 rounded-xl shadow-xs">
            <div className="flex items-center justify-between text-xs font-medium text-stone-500">
              <span>In Pipeline</span>
              <span className="w-2 h-2 rounded-full bg-indigo-500" />
            </div>
            <p className="text-2xl font-bold text-stone-900 mt-2">{inProgressCount}</p>
            <p className="text-xs text-stone-400 mt-0.5">Contacted or demo set</p>
          </div>

          <div className="p-4 bg-white border border-stone-200 rounded-xl shadow-xs">
            <div className="flex items-center justify-between text-xs font-medium text-stone-500">
              <span>Won / Converted</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            </div>
            <p className="text-2xl font-bold text-stone-900 mt-2">{wonCount}</p>
            <p className="text-xs text-stone-400 mt-0.5">Ready for onboarding</p>
          </div>

          <div className="p-4 bg-white border border-stone-200 rounded-xl shadow-xs">
            <div className="flex items-center justify-between text-xs font-medium text-stone-500">
              <span>Closed / Lost</span>
              <span className="w-2 h-2 rounded-full bg-stone-300" />
            </div>
            <p className="text-2xl font-bold text-stone-900 mt-2">{lostCount}</p>
            <p className="text-xs text-stone-400 mt-0.5">Archived or disqualified</p>
          </div>
        </div>
      </SlideUp>

      {/* Main Table / Pipeline Section */}
      <SlideUp delay={0.15}>
        <div className="bg-white border border-stone-200 rounded-2xl shadow-xs overflow-hidden">
          {/* Filter & Search Bar */}
          <div className="p-4 border-b border-stone-200 flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="relative w-full md:w-72">
              <HugeiconsIcon
                icon={Search01Icon}
                className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2"
                strokeWidth={1.5}
              />
              <input
                type="text"
                placeholder="Search leads by name, city, phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-lg text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-900 focus:bg-white"
              />
            </div>

            {/* Stage Filter Chips */}
            <div className="flex items-center gap-1 overflow-x-auto w-full md:w-auto bg-stone-100 p-0.5 rounded-lg border border-stone-200">
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
                  className={`px-3 py-1 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
                    statusFilter === tab.value
                      ? 'bg-white text-stone-900 shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
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
              <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 uppercase font-semibold">
                <tr>
                  <th className="py-3 px-4">Restaurant & Location</th>
                  <th className="py-3 px-4">Contact Details</th>
                  <th className="py-3 px-4">Notes</th>
                  <th className="py-3 px-4">Stage</th>
                  <th className="py-3 px-4">Received</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-stone-400">
                      Loading leads pipeline...
                    </td>
                  </tr>
                ) : leads.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-stone-400">
                      No inbound leads matching filters.
                    </td>
                  </tr>
                ) : (
                  leads.map((lead) => (
                    <tr
                      key={lead.id}
                      className="hover:bg-stone-50/50 transition-colors cursor-pointer"
                      onClick={() => handleOpenLead(lead)}
                    >
                      <td className="py-3 px-4">
                        <p className="font-semibold text-stone-900">{lead.restaurantName}</p>
                        <p className="text-[11px] text-stone-500 font-medium">{lead.city}</p>
                      </td>
                      <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                        <p className="font-medium text-stone-800">{lead.contactName}</p>
                        <div className="flex items-center gap-3 mt-1 text-[11px] text-stone-500">
                          <a
                            href={`tel:${lead.phone}`}
                            className="inline-flex items-center gap-1 hover:text-stone-900"
                            title="Call contact"
                          >
                            <HugeiconsIcon
                              icon={CallIcon}
                              className="w-3 h-3 text-stone-400"
                              strokeWidth={1.5}
                            />
                            {lead.phone}
                          </a>
                          <a
                            href={`mailto:${lead.email}`}
                            className="inline-flex items-center gap-1 hover:text-stone-900"
                            title="Send email"
                          >
                            <HugeiconsIcon
                              icon={Mail01Icon}
                              className="w-3 h-3 text-stone-400"
                              strokeWidth={1.5}
                            />
                            {lead.email}
                          </a>
                        </div>
                      </td>
                      <td className="py-3 px-4 max-w-xs truncate text-stone-500">
                        {lead.notes || <span className="text-stone-300 italic">No notes</span>}
                      </td>
                      <td className="py-3 px-4">{getStatusBadge(lead.status)}</td>
                      <td className="py-3 px-4 font-mono text-[11px] text-stone-400">
                        {new Date(lead.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="inline-flex items-center gap-2 justify-end">
                          {!isRestrictedRole && (
                            <select
                              value={lead.status}
                              onChange={(e) =>
                                updateStatusMutation.mutate({
                                  id: lead.id,
                                  data: { status: e.target.value as LeadStatus },
                                })
                              }
                              className="px-2 py-1 text-xs bg-stone-50 border border-stone-200 rounded-md text-stone-700 hover:bg-stone-100 focus:outline-none"
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
                            className="p-1 text-stone-400 hover:text-stone-700 rounded-md hover:bg-stone-100"
                            title="View details"
                          >
                            <HugeiconsIcon
                              icon={ArrowRight01Icon}
                              className="w-4 h-4"
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
      {selectedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs">
          <FadeIn>
            <div className="bg-white rounded-2xl border border-stone-200 shadow-xl max-w-lg w-full p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <div>
                  <h3 className="text-base font-bold text-stone-900">
                    {selectedLead.restaurantName}
                  </h3>
                  <p className="text-xs text-stone-500">
                    Lead ID: <span className="font-mono">{selectedLead.id}</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedLead(null)}
                  className="text-stone-400 hover:text-stone-600"
                >
                  <HugeiconsIcon icon={Cancel01Icon} className="w-5 h-5" strokeWidth={1.5} />
                </button>
              </div>

              {/* Lead Info Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs bg-stone-50 p-3.5 rounded-xl border border-stone-200">
                <div>
                  <span className="text-stone-400 block mb-0.5">Contact Person</span>
                  <p className="font-semibold text-stone-900">{selectedLead.contactName}</p>
                </div>
                <div>
                  <span className="text-stone-400 block mb-0.5">City</span>
                  <p className="font-semibold text-stone-900">{selectedLead.city}</p>
                </div>
                <div>
                  <span className="text-stone-400 block mb-0.5">Phone</span>
                  <a
                    href={`tel:${selectedLead.phone}`}
                    className="font-mono text-indigo-600 hover:underline"
                  >
                    {selectedLead.phone}
                  </a>
                </div>
                <div>
                  <span className="text-stone-400 block mb-0.5">Email</span>
                  <a
                    href={`mailto:${selectedLead.email}`}
                    className="font-mono text-indigo-600 hover:underline"
                  >
                    {selectedLead.email}
                  </a>
                </div>
              </div>

              {/* Stage Transition */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                  Pipeline Stage
                </label>
                <div className="flex items-center gap-2">
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
                        className={`px-2.5 py-1 text-xs font-semibold rounded-lg capitalize border transition-colors ${
                          selectedLead.status === st
                            ? 'bg-stone-900 text-white border-stone-900'
                            : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
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
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Sales Notes & Discussion Record
                </label>
                <textarea
                  rows={3}
                  value={editingNotes}
                  disabled={isRestrictedRole}
                  onChange={(e) => setEditingNotes(e.target.value)}
                  placeholder="Record call notes, demo feedback, or onboarding prerequisites..."
                  className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-lg text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900 focus:bg-white disabled:opacity-60"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => {
                    navigate('/portal/restaurants');
                  }}
                  className="inline-flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
                >
                  Onboard as Restaurant &rarr;
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedLead(null)}
                    className="px-3 py-1.5 text-xs text-stone-600 hover:text-stone-900 font-medium"
                  >
                    Close
                  </button>
                  {!isRestrictedRole && (
                    <MotionButton
                      type="button"
                      variant="primary"
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
                      className="!px-3.5 !py-1.5 !text-xs !bg-stone-900 hover:!bg-stone-800"
                    >
                      {updateStatusMutation.isPending ? 'Saving...' : 'Save Notes'}
                    </MotionButton>
                  )}
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      )}
    </div>
  );
};
