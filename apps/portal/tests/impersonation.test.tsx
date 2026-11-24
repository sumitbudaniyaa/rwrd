import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { ReactElement } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RestaurantManagementScreen } from '../src/screens/RestaurantManagementScreen.js';
import { api, type PortalRestaurantsResponse } from '../src/services/api.js';
import { AuthContext } from '../src/context/AuthContext.js';

const mockRestaurantsResponse: PortalRestaurantsResponse = {
  restaurants: [
    {
      id: 'rest-1111',
      name: 'The Bombay Canteen',
      slug: 'the-bombay-canteen',
      logoUrl: null,
      googleReviewUrl: 'https://maps.app.goo.gl/tbc123',
      tipPresets: [20, 50, 100, 200],
      minTipInr: 10,
      maxTipInr: 5000,
      isActive: true,
      isSuspended: false,
      suspensionReason: null,
      deletedAt: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ],
  pagination: {
    limit: 50,
    offset: 0,
    count: 1,
  },
};

const renderWithProviders = (ui: ReactElement, userRole: 'super_admin' | 'support' = 'support') => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });

  const mockAuthContext = {
    user: {
      id: 'staff-999',
      email: 'support@tiptable.in',
      fullName: 'Support Agent',
      role: userRole,
    },
    accessToken: 'dummy-token',
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

describe('Portal Support Impersonation Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Impersonate button and opens confirmation dialog with restaurant consent disclosure', async () => {
    vi.spyOn(api, 'getRestaurants').mockResolvedValue(mockRestaurantsResponse);

    renderWithProviders(<RestaurantManagementScreen />, 'support');

    await waitFor(() => {
      expect(screen.getByText('The Bombay Canteen')).toBeDefined();
    });

    const impersonateBtn = screen.getByRole('button', { name: /Impersonate/i });
    expect(impersonateBtn).toBeDefined();

    fireEvent.click(impersonateBtn);

    await waitFor(() => {
      expect(screen.getByText(/Request Support Access: "The Bombay Canteen"/i)).toBeDefined();
      expect(screen.getByText(/Restaurant Consent Protocol/i)).toBeDefined();
    });

    expect(screen.getByRole('button', { name: /Send Request to Restaurant/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Cancel/i })).toBeDefined();
  });

  it('shows waiting indicator while request is pending approval', async () => {
    vi.spyOn(api, 'getRestaurants').mockResolvedValue(mockRestaurantsResponse);
    vi.spyOn(api, 'createImpersonationRequest').mockResolvedValueOnce({
      requestId: 'req-pending-123',
      status: 'pending',
      restaurantName: 'The Bombay Canteen',
      expiresAt: new Date(Date.now() + 300000).toISOString(),
      reason: 'Live support check',
    });

    vi.spyOn(api, 'getImpersonationRequestStatus').mockResolvedValueOnce({
      id: 'req-pending-123',
      status: 'pending',
      reason: 'Live support check',
      impersonationToken: null,
      expiresAt: new Date(Date.now() + 300000).toISOString(),
      respondedAt: null,
    });

    renderWithProviders(<RestaurantManagementScreen />, 'support');

    await waitFor(() => {
      expect(screen.getByText('The Bombay Canteen')).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: /Impersonate/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Send Request to Restaurant/i })).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: /Send Request to Restaurant/i }));

    await waitFor(() => {
      expect(screen.getAllByText(/Waiting for Restaurant Approval/i).length).toBeGreaterThan(0);
      expect(screen.getByRole('button', { name: /Cancel Request/i })).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: /Cancel Request/i }));

    await waitFor(() => {
      expect(screen.queryByText(/Waiting for Restaurant Approval/i)).toBeNull();
    });
  });

  it('submits impersonation request and launches admin session when approved', async () => {
    vi.spyOn(api, 'getRestaurants').mockResolvedValue(mockRestaurantsResponse);
    const createRequestSpy = vi.spyOn(api, 'createImpersonationRequest').mockResolvedValueOnce({
      requestId: 'req-12345',
      status: 'pending',
      restaurantName: 'The Bombay Canteen',
      expiresAt: new Date(Date.now() + 300000).toISOString(),
      reason: 'Ticket #4021 - live assistance',
    });

    const getStatusSpy = vi.spyOn(api, 'getImpersonationRequestStatus').mockResolvedValueOnce({
      id: 'req-12345',
      status: 'approved',
      reason: 'Ticket #4021 - live assistance',
      impersonationToken: 'jwt-approved-impersonate-token',
      expiresAt: new Date(Date.now() + 300000).toISOString(),
      respondedAt: new Date().toISOString(),
    });

    const windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

    renderWithProviders(<RestaurantManagementScreen />, 'support');

    await waitFor(() => {
      expect(screen.getByText('The Bombay Canteen')).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: /Impersonate/i }));

    await waitFor(() => {
      expect(screen.getByText(/Request Support Access: "The Bombay Canteen"/i)).toBeDefined();
    });

    const reasonInput = screen.getByPlaceholderText(/e\.g\. Ticket #4021/i);
    fireEvent.change(reasonInput, { target: { value: 'Ticket #4021 - live assistance' } });

    const sendRequestBtn = screen.getByRole('button', { name: /Send Request to Restaurant/i });
    fireEvent.click(sendRequestBtn);

    await waitFor(() => {
      expect(createRequestSpy).toHaveBeenCalledWith('rest-1111', 'Ticket #4021 - live assistance');
      expect(getStatusSpy).toHaveBeenCalledWith('req-12345');
      expect(screen.getByText(/Access Granted by Restaurant/i)).toBeDefined();
    });

    const launchBtn = screen.getByRole('button', { name: /Launch Admin Session/i });
    fireEvent.click(launchBtn);

    expect(windowOpenSpy).toHaveBeenCalledWith(
      expect.stringContaining('impersonate_token=jwt-approved-impersonate-token'),
      '_blank',
      'noopener,noreferrer',
    );
  });

  it('displays declined view when restaurant administrator rejects request', async () => {
    vi.spyOn(api, 'getRestaurants').mockResolvedValue(mockRestaurantsResponse);
    vi.spyOn(api, 'createImpersonationRequest').mockResolvedValueOnce({
      requestId: 'req-declined-999',
      status: 'pending',
      restaurantName: 'The Bombay Canteen',
      expiresAt: new Date(Date.now() + 300000).toISOString(),
      reason: 'Support check',
    });

    vi.spyOn(api, 'getImpersonationRequestStatus').mockResolvedValueOnce({
      id: 'req-declined-999',
      status: 'declined',
      reason: 'Support check',
      impersonationToken: null,
      expiresAt: new Date(Date.now() + 300000).toISOString(),
      respondedAt: new Date().toISOString(),
    });

    renderWithProviders(<RestaurantManagementScreen />, 'support');

    await waitFor(() => {
      expect(screen.getByText('The Bombay Canteen')).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: /Impersonate/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Send Request to Restaurant/i })).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: /Send Request to Restaurant/i }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Support Access Declined/i })).toBeDefined();
      expect(
        screen.getByText(/The restaurant administrator declined this support access request/i),
      ).toBeDefined();
    });

    const dismissBtn = screen.getByRole('button', { name: /Dismiss/i });
    fireEvent.click(dismissBtn);

    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: /Support Access Declined/i })).toBeNull();
    });
  });
});
