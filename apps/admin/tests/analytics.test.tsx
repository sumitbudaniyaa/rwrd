import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { AnalyticsScreen } from '../src/screens/AnalyticsScreen.js';
import { api, type AnalyticsResponse } from '../src/services/api.js';
import { AuthContext } from '../src/context/AuthContext.js';

const mockAnalyticsResponse: AnalyticsResponse = {
  dateRange: {
    startDate: '2026-10-01T00:00:00.000Z',
    endDate: '2026-10-31T23:59:59.999Z',
  },
  metrics: {
    scans: 1429,
    staffViews: 984,
    tipsInitiatedCount: 432,
    tipsInitiatedVolumeInr: 34850,
    reviewTaps: 187,
  },
  dailyTimeline: [
    {
      date: '2026-10-30',
      scans: 48,
      staffViews: 32,
      tipsInitiatedCount: 15,
      tipsInitiatedVolumeInr: 1250,
      reviewTaps: 7,
    },
    {
      date: '2026-10-31',
      scans: 55,
      staffViews: 40,
      tipsInitiatedCount: 18,
      tipsInitiatedVolumeInr: 1600,
      reviewTaps: 9,
    },
  ],
  staffBreakdown: [
    {
      staffId: 'staff-1',
      displayName: 'Rahul Sharma',
      roleLabel: 'Head Captain',
      tipsInitiatedCount: 180,
      tipsInitiatedVolumeInr: 16500,
      averageTipInr: 92,
    },
    {
      staffId: 'staff-2',
      displayName: 'Priya Patel',
      roleLabel: 'Server, Patio',
      tipsInitiatedCount: 140,
      tipsInitiatedVolumeInr: 11200,
      averageTipInr: 80,
    },
  ],
};

const createMockAuthContext = () => ({
  user: {
    id: 'usr-1',
    email: 'owner@bombaycanteen.com',
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
  impersonation: null,
  login: vi.fn(),
  register: vi.fn(),
  verifyMfa: vi.fn(),
  logout: vi.fn(),
  logoutAll: vi.fn(),
  cancelMfa: vi.fn(),
  exitImpersonation: vi.fn(),
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

describe('AnalyticsScreen Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders analytics dashboard with key metric cards and invariant copy', async () => {
    vi.spyOn(api, 'getAnalytics').mockResolvedValueOnce(mockAnalyticsResponse);

    renderWithProviders(<AnalyticsScreen />);

    // Check header
    expect(screen.getByText(/analytics & telemetry/i)).toBeDefined();

    // Wait for metrics to load
    await waitFor(() => {
      expect(screen.getByText('1,429')).toBeDefined();
    });

    expect(screen.getByText('984')).toBeDefined();
    expect(screen.getByText('432')).toBeDefined();
    expect(screen.getByText('187')).toBeDefined();

    // Verify non-custodial copy invariant: "Tips Initiated" (NEVER "Tips received")
    expect(screen.getAllByText(/Tips Initiated/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/Tips Received/i)).toBeNull();
    expect(screen.queryByText(/Payment Successful/i)).toBeNull();

    // Check volume string
    expect(screen.getByText(/₹34,850 initiated/i)).toBeDefined();
  });

  it('renders waitstaff performance table with per-waiter initiated tip metrics', async () => {
    vi.spyOn(api, 'getAnalytics').mockResolvedValueOnce(mockAnalyticsResponse);

    renderWithProviders(<AnalyticsScreen />);

    await waitFor(() => {
      expect(screen.getByText('Rahul Sharma')).toBeDefined();
    });

    expect(screen.getByText('Head Captain')).toBeDefined();
    expect(screen.getByText('₹16,500')).toBeDefined();
    expect(screen.getByText('₹92')).toBeDefined();

    expect(screen.getByText('Priya Patel')).toBeDefined();
    expect(screen.getByText('Server, Patio')).toBeDefined();
    expect(screen.getByText('₹11,200')).toBeDefined();
  });

  it('renders daily timeline breakdown entries', async () => {
    vi.spyOn(api, 'getAnalytics').mockResolvedValueOnce(mockAnalyticsResponse);

    renderWithProviders(<AnalyticsScreen />);

    await waitFor(() => {
      expect(screen.getByText('2026-10-30')).toBeDefined();
    });

    expect(screen.getByText('2026-10-31')).toBeDefined();
  });

  it('allows switching period filter pills (Today, 7D, 30D, Custom)', async () => {
    const getAnalyticsSpy = vi.spyOn(api, 'getAnalytics').mockResolvedValue(mockAnalyticsResponse);

    renderWithProviders(<AnalyticsScreen />);

    await waitFor(() => {
      expect(screen.getByText('1,429')).toBeDefined();
    });

    // Click "Last 7 Days"
    const btn7d = screen.getByText('Last 7 Days');
    fireEvent.click(btn7d);

    await waitFor(() => {
      expect(getAnalyticsSpy).toHaveBeenCalledTimes(2);
    });

    // Click "Custom"
    const btnCustom = screen.getByText('Custom');
    fireEvent.click(btnCustom);

    expect(screen.getByText('Select date range')).toBeDefined();
  });

  it('triggers CSV export download when clicking Export CSV button', async () => {
    vi.spyOn(api, 'getAnalytics').mockResolvedValueOnce(mockAnalyticsResponse);
    const downloadCsvSpy = vi.spyOn(api, 'downloadAnalyticsCsv').mockResolvedValueOnce();

    renderWithProviders(<AnalyticsScreen />);

    await waitFor(() => {
      expect(screen.getByText('1,429')).toBeDefined();
    });

    const exportBtn = screen.getByLabelText('Export Analytics CSV');
    fireEvent.click(exportBtn);

    await waitFor(() => {
      expect(downloadCsvSpy).toHaveBeenCalledWith(
        'rest-123',
        expect.objectContaining({
          startDate: expect.any(String),
          endDate: expect.any(String),
        }),
      );
    });
  });

  it('renders non-custodial direct UPI compliance disclosure notice', async () => {
    vi.spyOn(api, 'getAnalytics').mockResolvedValueOnce(mockAnalyticsResponse);

    renderWithProviders(<AnalyticsScreen />);

    await waitFor(() => {
      expect(screen.getByText(/Direct Non-Custodial UPI Invariant:/i)).toBeDefined();
    });

    expect(
      screen.getByText(/rwrd never holds, intercepts, or settles customer funds./i),
    ).toBeDefined();
  });
});
