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

  it('renders Impersonate button and opens confirmation dialog with security disclosure', async () => {
    vi.spyOn(api, 'getRestaurants').mockResolvedValue(mockRestaurantsResponse);

    renderWithProviders(<RestaurantManagementScreen />, 'support');

    await waitFor(() => {
      expect(screen.getByText('The Bombay Canteen')).toBeDefined();
    });

    const impersonateBtn = screen.getByRole('button', { name: /Impersonate/i });
    expect(impersonateBtn).toBeDefined();

    fireEvent.click(impersonateBtn);

    await waitFor(() => {
      expect(screen.getByText(/Enter Support Impersonation Mode/i)).toBeDefined();
      expect(screen.getByText(/Support Delegation Security Notice/i)).toBeDefined();
    });

    expect(screen.getByRole('button', { name: /Launch Admin Session/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Cancel/i })).toBeDefined();
  });

  it('submits impersonation request and opens admin window with token', async () => {
    vi.spyOn(api, 'getRestaurants').mockResolvedValue(mockRestaurantsResponse);
    const impersonateSpy = vi.spyOn(api, 'impersonateRestaurant').mockResolvedValueOnce({
      impersonationToken: 'jwt-impersonate-token-12345',
      expiresInSeconds: 3600,
      restaurant: {
        id: 'rest-1111',
        name: 'The Bombay Canteen',
        slug: 'the-bombay-canteen',
        isSuspended: false,
      },
      impersonator: {
        id: 'staff-999',
        email: 'support@tiptable.in',
        role: 'support',
      },
    });

    const windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

    renderWithProviders(<RestaurantManagementScreen />, 'support');

    await waitFor(() => {
      expect(screen.getByText('The Bombay Canteen')).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: /Impersonate/i }));

    await waitFor(() => {
      expect(screen.getByText(/Enter Support Impersonation Mode/i)).toBeDefined();
    });

    const reasonInput = screen.getByPlaceholderText(/e\.g\. Ticket #4021/i);
    fireEvent.change(reasonInput, { target: { value: 'Ticket #4021 - live assistance' } });

    const launchBtn = screen.getByRole('button', { name: /Launch Admin Session/i });
    fireEvent.click(launchBtn);

    await waitFor(() => {
      expect(impersonateSpy).toHaveBeenCalledWith('rest-1111', 'Ticket #4021 - live assistance');
      expect(windowOpenSpy).toHaveBeenCalledWith(
        expect.stringContaining('impersonate_token=jwt-impersonate-token-12345'),
        '_blank',
        'noopener,noreferrer',
      );
    });
  });
});
