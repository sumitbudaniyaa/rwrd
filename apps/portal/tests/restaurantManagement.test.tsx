import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { RestaurantManagementScreen } from '../src/screens/RestaurantManagementScreen.js';
import { api, type PortalRestaurantsResponse } from '../src/services/api.js';
import { AuthContext } from '../src/context/AuthContext.js';

const mockRestaurantsResponse: PortalRestaurantsResponse = {
  restaurants: [
    {
      id: 'rest-001',
      name: 'The Bombay Canteen',
      slug: 'the-bombay-canteen',
      logoUrl: null,
      googleReviewUrl: 'https://maps.app.goo.gl/bombaycanteen123',
      tipPresets: [20, 50, 100, 200],
      minTipInr: 10,
      maxTipInr: 5000,
      isActive: true,
      isSuspended: false,
      suspensionReason: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      deletedAt: null,
    },
    {
      id: 'rest-002',
      name: 'Toit Brewpub',
      slug: 'toit-brewpub',
      logoUrl: null,
      googleReviewUrl: 'https://maps.app.goo.gl/toit123',
      tipPresets: [30, 60, 120, 250],
      minTipInr: 20,
      maxTipInr: 10000,
      isActive: true,
      isSuspended: true,
      suspensionReason: 'Overdue monthly plan',
      createdAt: '2026-01-05T00:00:00.000Z',
      updatedAt: '2026-01-10T00:00:00.000Z',
      deletedAt: null,
    },
  ],
  pagination: {
    limit: 50,
    offset: 0,
    count: 2,
  },
};

const createMockAuthContext = (role: 'super_admin' | 'support' | 'finance' = 'super_admin') => ({
  user: {
    id: 'usr-1',
    email: 'admin@tiptable.in',
    fullName: 'Ananya Deshmukh',
    role,
  },
  accessToken: 'dummy-token',
  isAuthenticated: true,
  isLoading: false,
  login: vi.fn(),
  logout: vi.fn(),
});

const renderWithProviders = (
  ui: React.ReactElement,
  role: 'super_admin' | 'support' | 'finance' = 'super_admin',
) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={createMockAuthContext(role)}>
        <BrowserRouter>{ui}</BrowserRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
};

describe('RestaurantManagementScreen Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders restaurant list with active and suspended establishments', async () => {
    vi.spyOn(api, 'getRestaurants').mockResolvedValueOnce(mockRestaurantsResponse);

    renderWithProviders(<RestaurantManagementScreen />);

    expect(screen.getByText('Restaurant Tenants')).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText('The Bombay Canteen')).toBeDefined();
    });

    expect(screen.getByText('the-bombay-canteen')).toBeDefined();
    expect(screen.getAllByText('Active').length).toBeGreaterThan(0);

    expect(screen.getByText('Toit Brewpub')).toBeDefined();
    expect(screen.getByText('toit-brewpub')).toBeDefined();
    expect(screen.getAllByText('Suspended').length).toBeGreaterThan(0);
    expect(screen.getByText('Overdue monthly plan')).toBeDefined();
  });

  it('super admin can open onboard modal and submit new restaurant provisioning', async () => {
    vi.spyOn(api, 'getRestaurants').mockResolvedValue(mockRestaurantsResponse);
    const onboardSpy = vi.spyOn(api, 'onboardRestaurant').mockResolvedValueOnce({
      restaurant: {
        ...mockRestaurantsResponse.restaurants[0]!,
        id: 'new-rest-id',
        name: 'Brik Oven',
        slug: 'brik-oven',
      },
      owner: {
        id: 'new-owner-id',
        email: 'owner@brikoven.com',
        fullName: 'Anirudh K',
        role: 'owner',
      },
      rootQrToken: 'hex-token-1234',
    });

    renderWithProviders(<RestaurantManagementScreen />);

    await waitFor(() => {
      expect(screen.getByText('The Bombay Canteen')).toBeDefined();
    });

    const onboardBtn = screen.getByLabelText('Onboard New Restaurant');
    fireEvent.click(onboardBtn);

    await waitFor(() => {
      expect(screen.getByText('Onboard New Restaurant')).toBeDefined();
    });

    // Fill form
    fireEvent.change(screen.getByPlaceholderText(/e\.g\. The Bombay Canteen/i), {
      target: { value: 'Brik Oven' },
    });
    fireEvent.change(screen.getByPlaceholderText(/https:\/\/maps\.app\.goo\.gl\/\.\.\./i), {
      target: { value: 'https://maps.app.goo.gl/brik123' },
    });
    fireEvent.change(screen.getByPlaceholderText(/e\.g\. Sameer Seth/i), {
      target: { value: 'Anirudh K' },
    });
    fireEvent.change(screen.getByPlaceholderText(/owner@establishment\.com/i), {
      target: { value: 'owner@brikoven.com' },
    });
    fireEvent.change(screen.getByPlaceholderText(/At least 8 characters/i), {
      target: { value: 'SecurePassword123!' },
    });

    const submitBtn = screen.getByRole('button', { name: /Provision Restaurant/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(onboardSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Brik Oven',
          slug: 'brik-oven',
          ownerEmail: 'owner@brikoven.com',
        }),
      );
    });
  }, 15000);

  it('super admin can suspend restaurant with custom reason', async () => {
    vi.spyOn(api, 'getRestaurants').mockResolvedValue(mockRestaurantsResponse);
    const statusSpy = vi.spyOn(api, 'updateRestaurantStatus').mockResolvedValueOnce({
      restaurant: {
        ...mockRestaurantsResponse.restaurants[0]!,
        isSuspended: true,
        suspensionReason: 'Overdue bill',
      },
    });

    renderWithProviders(<RestaurantManagementScreen />);

    await waitFor(() => {
      expect(screen.getByText('The Bombay Canteen')).toBeDefined();
    });

    const suspendBtn = screen.getByText('Suspend');
    fireEvent.click(suspendBtn);

    await waitFor(() => {
      expect(screen.getByText(/Suspend "The Bombay Canteen"/i)).toBeDefined();
    });

    const reasonInput = screen.getByPlaceholderText(/e\.g\. Overdue payment/i);
    fireEvent.change(reasonInput, { target: { value: 'Subscription non-payment' } });

    const confirmBtn = screen.getByRole('button', { name: /Confirm Suspension/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(statusSpy).toHaveBeenCalledWith('rest-001', 'suspend', 'Subscription non-payment');
    });
  });

  it('support role cannot see onboarding or suspension controls (RBAC)', async () => {
    vi.spyOn(api, 'getRestaurants').mockResolvedValueOnce(mockRestaurantsResponse);

    renderWithProviders(<RestaurantManagementScreen />, 'support');

    await waitFor(() => {
      expect(screen.getByText('The Bombay Canteen')).toBeDefined();
    });

    // Support can view restaurants and impersonate, but not onboard or suspend
    expect(screen.queryByLabelText('Onboard New Restaurant')).toBeNull();
    expect(screen.queryByText('Suspend')).toBeNull();
    expect(screen.queryByText('Reactivate')).toBeNull();
  });
});
