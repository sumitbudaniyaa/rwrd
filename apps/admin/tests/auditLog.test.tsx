import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { AuditLogScreen } from '../src/screens/AuditLogScreen.js';
import { api, type AuditLogsResponse } from '../src/services/api.js';
import { AuthContext } from '../src/context/AuthContext.js';

const mockAuditLogsResponse: AuditLogsResponse = {
  logs: [
    {
      id: 'audit-001',
      restaurantId: 'rest-123',
      actorId: 'usr-1',
      actorType: 'restaurant_user',
      actorName: 'Sameer Seth',
      actorEmail: 'sameer@bombaycanteen.com',
      action: 'STAFF_CREATED',
      entityType: 'staff',
      entityId: 'staff-9999-8888-7777-666666666666',
      beforeState: null,
      afterState: { displayName: 'Aarav Patel', roleLabel: 'Captain' },
      ipAddress: '127.0.0.1',
      userAgent: 'Mozilla/5.0',
      createdAt: '2026-11-01T10:00:00.000Z',
    },
    {
      id: 'audit-002',
      restaurantId: 'rest-123',
      actorId: 'sys-daemon',
      actorType: 'system',
      actorName: 'System Engine',
      actorEmail: null,
      action: 'QR_TOKEN_ROTATED',
      entityType: 'qr_token',
      entityId: 'token-5555-4444-3333-222222222222',
      beforeState: { isActive: true },
      afterState: { isActive: false },
      ipAddress: null,
      userAgent: null,
      createdAt: '2026-11-02T14:30:00.000Z',
    },
  ],
  pagination: {
    limit: 25,
    offset: 0,
    count: 2,
  },
};

const createMockAuthContext = () => ({
  user: {
    id: 'usr-1',
    email: 'sameer@bombaycanteen.com',
    fullName: 'Sameer Seth',
    role: 'owner',
    restaurantId: 'rest-123',
  },
  restaurant: {
    id: 'rest-123',
    name: 'The Bombay Canteen',
    slug: 'the-bombay-canteen',
    logoUrl: null,
  },
  accessToken: 'dummy-token',
  tempToken: null,
  isLoading: false,
  isAuthenticated: true,
  login: vi.fn(),
  verifyMfa: vi.fn(),
  logout: vi.fn(),
  logoutAll: vi.fn(),
  cancelMfa: vi.fn(),
});

const renderWithProviders = (ui: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={createMockAuthContext()}>
        <BrowserRouter>{ui}</BrowserRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
};

describe('AuditLogScreen Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders audit log trail with actions, actors, and immutable badge', async () => {
    vi.spyOn(api, 'getAuditLogs').mockResolvedValueOnce(mockAuditLogsResponse);

    renderWithProviders(<AuditLogScreen />);

    expect(screen.getByText('Audit Trail & History')).toBeDefined();
    expect(screen.getByText('Immutable')).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText('STAFF_CREATED')).toBeDefined();
    });

    expect(screen.getByText('QR_TOKEN_ROTATED')).toBeDefined();
    expect(screen.getByText('Sameer Seth')).toBeDefined();
    expect(screen.getByText('sameer@bombaycanteen.com')).toBeDefined();
    expect(screen.getByText('System Engine')).toBeDefined();
  });

  it('allows filtering by entity category (staff, settings, qr_token, table)', async () => {
    const getAuditSpy = vi.spyOn(api, 'getAuditLogs').mockResolvedValue(mockAuditLogsResponse);

    renderWithProviders(<AuditLogScreen />);

    await waitFor(() => {
      expect(screen.getByText('STAFF_CREATED')).toBeDefined();
    });

    // Click "Staff" filter
    const staffTab = screen.getByText('Staff');
    fireEvent.click(staffTab);

    await waitFor(() => {
      expect(getAuditSpy).toHaveBeenCalledWith('rest-123', {
        limit: 25,
        offset: 0,
        entityType: 'staff',
      });
    });
  });

  it('opens and closes state diff modal when clicking Inspect Diff', async () => {
    vi.spyOn(api, 'getAuditLogs').mockResolvedValueOnce(mockAuditLogsResponse);

    renderWithProviders(<AuditLogScreen />);

    await waitFor(() => {
      expect(screen.getAllByText('Inspect Diff').length).toBe(2);
    });

    // Click first "Inspect Diff"
    const inspectBtns = screen.getAllByText('Inspect Diff');
    fireEvent.click(inspectBtns[0]!);

    // Modal should be visible with before and after state
    await waitFor(() => {
      expect(screen.getByText('Before Change')).toBeDefined();
    });

    expect(screen.getByText('After Change')).toBeDefined();
    expect(screen.getByText(/None \(New Record Created\)/i)).toBeDefined();
    expect(screen.getByText(/Aarav Patel/i)).toBeDefined();
    expect(screen.getByText(/Automated Redaction:/i)).toBeDefined();

    // Close modal
    const closeBtn = screen.getByLabelText('Close diff modal');
    fireEvent.click(closeBtn);

    await waitFor(() => {
      expect(screen.queryByText('Before Change')).toBeNull();
    });
  });
});
