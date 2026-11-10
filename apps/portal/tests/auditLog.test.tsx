import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import type { ReactElement } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuditLogScreen } from '../src/screens/AuditLogScreen.js';
import { api, type PortalAuditResponse } from '../src/services/api.js';
import { AuthContext } from '../src/context/AuthContext.js';

const mockPortalAuditResponse: PortalAuditResponse = {
  logs: [
    {
      id: 'audit-001',
      action: 'PLAN_PRICE_UPDATED',
      actorId: 'usr-portal-1',
      actorType: 'platform_user',
      actorName: 'Super Admin Sumit',
      actorEmail: 'sumit@rwrd.live',
      actorRole: 'super_admin',
      entityType: 'billing_plan',
      entityId: 'plan-quarterly',
      restaurantId: null,
      restaurantName: null,
      restaurantSlug: null,
      beforeState: { name: 'Quarterly', priceInr: 2699 },
      afterState: { name: 'Quarterly Growth', priceInr: 2999 },
      ipAddress: '127.0.0.1',
      userAgent: 'Mozilla/5.0',
      createdAt: '2026-11-10T12:00:00.000Z',
    },
    {
      id: 'audit-002',
      action: 'RESTAURANT_SUSPENDED',
      actorId: 'usr-portal-2',
      actorType: 'platform_user',
      actorName: 'Support Agent Jane',
      actorEmail: 'jane@tiptable.in',
      actorRole: 'support',
      entityType: 'restaurant',
      entityId: 'rest-toit',
      restaurantId: 'rest-toit',
      restaurantName: 'Toit Brewpub',
      restaurantSlug: 'toit-brewpub',
      beforeState: { isSuspended: false },
      afterState: { isSuspended: true, reason: 'Overdue invoice' },
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0',
      createdAt: '2026-11-10T11:00:00.000Z',
    },
  ],
  pagination: {
    limit: 25,
    offset: 0,
    count: 2,
  },
};

const renderWithProviders = (ui: ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });

  const mockAuthContext = {
    user: {
      id: 'usr-portal-1',
      email: 'sumit@rwrd.live',
      fullName: 'Super Admin Sumit',
      role: 'super_admin' as const,
    },
    accessToken: 'mock-portal-token',
    isAuthenticated: true,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
  };

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={mockAuthContext}>
        <BrowserRouter>{ui}</BrowserRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
};

describe('AuditLogScreen (Company Portal Global Audit)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders company portal global audit header and lists strictly platform actions', async () => {
    vi.spyOn(api, 'getPortalAuditLogs').mockResolvedValue(mockPortalAuditResponse);

    renderWithProviders(<AuditLogScreen />);

    expect(screen.getByText('Company Portal Global Audit Log')).toBeInTheDocument();
    expect(screen.getByText(/Immutable Platform Records/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Super Admin Sumit')).toBeInTheDocument();
      expect(screen.getByText('Support Agent Jane')).toBeInTheDocument();
      expect(screen.getByText(/Target: Toit Brewpub/)).toBeInTheDocument();
      expect(screen.getAllByText('PLAN_PRICE_UPDATED').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('RESTAURANT_SUSPENDED').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('filters audit records by action type', async () => {
    const getLogsSpy = vi
      .spyOn(api, 'getPortalAuditLogs')
      .mockResolvedValue(mockPortalAuditResponse);

    renderWithProviders(<AuditLogScreen />);

    await waitFor(() => {
      expect(screen.getByText('Super Admin Sumit')).toBeInTheDocument();
    });

    const actionSelect = screen.getByRole('combobox');
    fireEvent.change(actionSelect, { target: { value: 'PLAN_PRICE_UPDATED' } });

    await waitFor(() => {
      expect(getLogsSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'PLAN_PRICE_UPDATED',
        }),
      );
    });
  });

  it('opens and closes the Before/After state diff viewer modal', async () => {
    vi.spyOn(api, 'getPortalAuditLogs').mockResolvedValue(mockPortalAuditResponse);

    renderWithProviders(<AuditLogScreen />);

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /Inspect Diff/i })).toHaveLength(2);
    });

    // Click the first Inspect Diff button
    const inspectBtn = screen.getAllByRole('button', { name: /Inspect Diff/i })[0]!;
    fireEvent.click(inspectBtn);

    await waitFor(() => {
      expect(screen.getByText(/Audit State Diff: PLAN_PRICE_UPDATED/)).toBeInTheDocument();
      expect(screen.getByText('Before State')).toBeInTheDocument();
      expect(screen.getByText('After State')).toBeInTheDocument();
    });

    // Close diff viewer
    const closeBtn = screen.getByRole('button', { name: /Close Diff Viewer/i });
    fireEvent.click(closeBtn);

    await waitFor(() => {
      expect(screen.queryByText(/Audit State Diff: PLAN_PRICE_UPDATED/)).not.toBeInTheDocument();
    });
  });
});
