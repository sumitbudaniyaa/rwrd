import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AdminLayout } from '../src/layouts/AdminLayout.js';
import { AuthContext } from '../src/context/AuthContext.js';
import { api, type ImpersonationDetails } from '../src/services/api.js';

const renderLayoutWithAuth = (
  impersonation: ImpersonationDetails | null = null,
  exitImpersonationSpy = vi.fn(),
  userOverrides: Record<string, unknown> = {},
  restaurantOverrides: Record<string, unknown> = {},
) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });

  const mockAuthContext = {
    user: {
      id: 'owner-123',
      email: 'owner@bombaycanteen.com',
      fullName: 'Sameer Seth',
      role: 'owner',
      restaurantId: 'rest-1111',
      ...userOverrides,
    },
    restaurant: {
      id: 'rest-1111',
      name: 'The Bombay Canteen',
      slug: 'the-bombay-canteen',
      logoUrl: null,
      ...restaurantOverrides,
    },
    accessToken: 'admin-access-token',
    tempToken: null,
    isLoading: false,
    isAuthenticated: true,
    impersonation,
    login: vi.fn(),
    register: vi.fn(),
    verifyMfa: vi.fn(),
    logout: vi.fn(),
    logoutAll: vi.fn(),
    cancelMfa: vi.fn(),
    exitImpersonation: exitImpersonationSpy,
  };

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={mockAuthContext}>
        <BrowserRouter>
          <AdminLayout />
        </BrowserRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
};

describe('Admin Header Banners (Impersonation & Review Link Missing)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders persistent warning banner when in impersonation mode', () => {
    renderLayoutWithAuth({
      isImpersonated: true,
      impersonatorId: 'staff-999',
      impersonatorEmail: 'support@tiptable.in',
    });

    const banner = screen.getByRole('alert');
    expect(banner).toBeDefined();
    expect(screen.queryByText('⚠️')).toBeNull();
    expect(screen.getByText(/Impersonation Mode:/i)).toBeDefined();
    expect(screen.getByText(/staff-999/i)).toBeDefined();
    expect(screen.getByText(/All actions are strictly audited/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /Exit Impersonation/i })).toBeDefined();
  });

  it('triggers exitImpersonation when Exit Impersonation button is clicked', () => {
    const exitSpy = vi.fn();
    renderLayoutWithAuth(
      {
        isImpersonated: true,
        impersonatorId: 'staff-999',
      },
      exitSpy,
    );

    const exitBtn = screen.getByRole('button', { name: /Exit Impersonation/i });
    fireEvent.click(exitBtn);

    expect(exitSpy).toHaveBeenCalledTimes(1);
  });

  it('does not render banner during standard authenticated session', () => {
    renderLayoutWithAuth(null);

    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.queryByText(/Impersonation Mode:/i)).toBeNull();
  });

  it('renders Google review link missing banner when subscriber has paid but not configured review link', () => {
    renderLayoutWithAuth(null, vi.fn(), { hasActivePlan: true }, { googleReviewUrl: '' });

    expect(screen.getByText(/Google Review Link Missing/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add Review Link/i })).toBeInTheDocument();
    expect(screen.queryByText('⭐')).toBeNull();
  });

  it('does not render review missing banner when Google review URL is configured', () => {
    renderLayoutWithAuth(
      null,
      vi.fn(),
      { hasActivePlan: true },
      { googleReviewUrl: 'https://maps.app.goo.gl/bombaycanteen' },
    );

    expect(screen.queryByText(/Google Review Link Missing/i)).toBeNull();
  });

  it('does not render review missing banner when account has not paid yet', () => {
    renderLayoutWithAuth(
      null,
      vi.fn(),
      { hasActivePlan: false, subscriptionStatus: 'unpaid' },
      { googleReviewUrl: '' },
    );

    expect(screen.queryByText(/Google Review Link Missing/i)).toBeNull();
  });

  it('renders support access request popup when a pending impersonation request exists', async () => {
    vi.spyOn(api, 'getPendingImpersonationRequest').mockResolvedValueOnce({
      pendingRequest: {
        id: 'req-pending-1',
        impersonatorEmail: 'tech-support@tiptable.in',
        reason: 'Ticket #8092 - QR code sync issue',
        expiresAt: new Date(Date.now() + 300000).toISOString(),
        createdAt: new Date().toISOString(),
      },
    });

    renderLayoutWithAuth(null);

    await waitFor(() => {
      expect(screen.getByText(/support access request/i)).toBeInTheDocument();
      expect(screen.getByText('tech-support@tiptable.in')).toBeInTheDocument();
      expect(screen.getByText('Ticket #8092 - QR code sync issue')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /approve access/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Decline/i })).toBeInTheDocument();
    });
  });

  it('approves support access request when Approve Access is clicked', async () => {
    vi.spyOn(api, 'getPendingImpersonationRequest').mockResolvedValueOnce({
      pendingRequest: {
        id: 'req-pending-2',
        impersonatorEmail: 'tech-support@tiptable.in',
        reason: 'Investigating bill sync',
        expiresAt: new Date(Date.now() + 300000).toISOString(),
        createdAt: new Date().toISOString(),
      },
    });

    const respondSpy = vi.spyOn(api, 'respondToImpersonationRequest').mockResolvedValueOnce({
      message: 'Support access request approved',
      status: 'approved',
    });

    renderLayoutWithAuth(null);

    await waitFor(() => {
      expect(screen.getByText(/support access request/i)).toBeInTheDocument();
    });

    const approveBtn = screen.getByRole('button', { name: /approve access/i });
    fireEvent.click(approveBtn);

    await waitFor(() => {
      expect(respondSpy).toHaveBeenCalledWith('rest-1111', 'req-pending-2', 'approve');
    });
  });

  it('declines support access request when Decline is clicked', async () => {
    vi.spyOn(api, 'getPendingImpersonationRequest').mockResolvedValueOnce({
      pendingRequest: {
        id: 'req-pending-3',
        impersonatorEmail: 'tech-support@tiptable.in',
        reason: 'Unrequested check',
        expiresAt: new Date(Date.now() + 300000).toISOString(),
        createdAt: new Date().toISOString(),
      },
    });

    const respondSpy = vi.spyOn(api, 'respondToImpersonationRequest').mockResolvedValueOnce({
      message: 'Support access request declined',
      status: 'declined',
    });

    renderLayoutWithAuth(null);

    await waitFor(() => {
      expect(screen.getByText(/support access request/i)).toBeInTheDocument();
    });

    const declineBtn = screen.getByRole('button', { name: /Decline/i });
    fireEvent.click(declineBtn);

    await waitFor(() => {
      expect(respondSpy).toHaveBeenCalledWith('rest-1111', 'req-pending-3', 'decline');
    });
  });

  it('renders floating on admin access pill when activeAccess exists and revokes access when end access is clicked', async () => {
    vi.spyOn(api, 'getPendingImpersonationRequest').mockResolvedValueOnce({
      pendingRequest: null,
      activeAccess: {
        id: 'req-active-1',
        impersonatorEmail: 'tech-support@tiptable.in',
        reason: 'Live debugging',
        approvedAt: new Date().toISOString(),
      },
    });

    const revokeSpy = vi.spyOn(api, 'respondToImpersonationRequest').mockResolvedValueOnce({
      message: 'Support access revoked',
      status: 'revoked',
    });

    renderLayoutWithAuth(null);

    await waitFor(() => {
      expect(screen.getByText(/on admin access/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /end access/i })).toBeInTheDocument();
    });

    const endBtn = screen.getByRole('button', { name: /end access/i });
    fireEvent.click(endBtn);

    await waitFor(() => {
      expect(revokeSpy).toHaveBeenCalledWith('rest-1111', 'req-active-1', 'revoke');
    });
  });
});
