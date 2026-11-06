import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import type { ReactElement } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DashboardOverview } from '../src/screens/DashboardOverview.js';
import { api, type PlatformMetricsResponse } from '../src/services/api.js';
import { AuthContext } from '../src/context/AuthContext.js';

const mockMetrics: PlatformMetricsResponse = {
  summary: {
    activeRestaurants: 42,
    suspendedRestaurants: 3,
    totalRestaurants: 45,
    newRestaurants30d: 8,
    churnedRestaurants: 2,
    churnRatePercent: 4.3,
    scansToday: 9150,
    scansAllTime: 245000,
    tipsInitiatedTodayCount: 2410,
    tipsInitiatedTodayVolumeInr: 289500,
    tipsInitiatedAllTimeCount: 65000,
    tipsInitiatedAllTimeVolumeInr: 7200000,
    reviewTapsToday: 1540,
    reviewTapsAllTime: 38200,
    estimatedMrrInr: 41958,
    inboundLeadsCount: 14,
    pendingLeadsCount: 5,
  },
  timeline30d: [
    {
      date: '2026-11-05',
      scans: 850,
      tipsInitiatedCount: 220,
      tipsInitiatedVolumeInr: 26400,
      reviewTaps: 130,
    },
    {
      date: '2026-11-06',
      scans: 9150,
      tipsInitiatedCount: 2410,
      tipsInitiatedVolumeInr: 289500,
      reviewTaps: 1540,
    },
  ],
};

const renderWithProviders = (ui: ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });

  const mockAuthContext = {
    user: {
      id: 'usr-super-admin',
      email: 'admin@tiptable.in',
      fullName: 'Ananya Deshmukh',
      role: 'super_admin' as const,
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

describe('DashboardOverview Screen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders live global KPI cards and invariant copy', async () => {
    vi.spyOn(api, 'getGlobalMetrics').mockResolvedValueOnce(mockMetrics);

    renderWithProviders(<DashboardOverview />);

    await waitFor(() => {
      // Metric titles
      expect(screen.getByText('Active Restaurants')).toBeDefined();
      expect(screen.getByText('Global Scans (Today)')).toBeDefined();
      expect(screen.getByText('Tips Initiated (Today)')).toBeDefined();
      expect(screen.getByText('Estimated Platform MRR')).toBeDefined();
      expect(screen.getByText('Google Review Taps')).toBeDefined();
      expect(screen.getByText('Inbound Demo Leads')).toBeDefined();

      // Live values
      expect(screen.getAllByText('42').length).toBeGreaterThan(0);
      expect(screen.getAllByText(/9.*150/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/₹.*289.*500/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/₹.*41.*958/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/1.*540/).length).toBeGreaterThan(0);
      expect(screen.getAllByText('14').length).toBeGreaterThan(0);
    });
  });

  it('renders 30-day activity trends and tenant retention health widget', async () => {
    vi.spyOn(api, 'getGlobalMetrics').mockResolvedValueOnce(mockMetrics);

    renderWithProviders(<DashboardOverview />);

    await waitFor(() => {
      expect(screen.getByText(/30-Day Scan & Interaction Activity/i)).toBeDefined();
      expect(screen.getByText('Tenant Account Health')).toBeDefined();
      expect(screen.getByText('Active Establishments')).toBeDefined();
      expect(screen.getByText('Suspended Establishments')).toBeDefined();
      expect(screen.getByText('Churned / Soft-Deleted')).toBeDefined();
      expect(screen.getByText('Historical Churn Rate')).toBeDefined();
      expect(screen.getByText('4.3%')).toBeDefined();
    });
  });

  it('displays error notice and retry trigger when API call fails', async () => {
    vi.spyOn(api, 'getGlobalMetrics').mockRejectedValueOnce(new Error('Network failure'));

    renderWithProviders(<DashboardOverview />);

    await waitFor(() => {
      expect(screen.getByText(/Failed to load live metrics/i)).toBeDefined();
      expect(screen.getByText('Retry')).toBeDefined();
    });
  });
});
