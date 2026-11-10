import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { DashboardOverview } from '../src/screens/DashboardOverview.js';
import { api, type AnalyticsResponse, type StaffAdminItem } from '../src/services/api.js';
import { AuthContext } from '../src/context/AuthContext.js';

const mockAnalytics: AnalyticsResponse = {
  dateRange: { startDate: '2026-11-01', endDate: '2026-11-07' },
  metrics: {
    scans: 150,
    staffViews: 85,
    tipsInitiatedCount: 30,
    tipsInitiatedVolumeInr: 2500,
    reviewTaps: 12,
  },
  dailyTimeline: [],
  staffBreakdown: [],
};

const mockAuthValue = {
  user: {
    id: 'user-1',
    email: 'admin@bombaycanteen.com',
    fullName: 'Sarah Miller',
    role: 'owner' as const,
    restaurantId: 'rest-1',
    hasActivePlan: true,
    subscriptionStatus: 'active' as const,
  },
  restaurant: {
    id: 'rest-1',
    name: 'The Bombay Canteen',
    slug: 'the-bombay-canteen',
    logoUrl: null,
    googleReviewUrl: 'https://maps.app.goo.gl/example',
  },
  accessToken: 'mock.token',
  tempToken: null,
  isAuthenticated: true,
  isLoading: false,
  impersonation: null,
  login: vi.fn(),
  register: vi.fn(),
  verifyMfa: vi.fn(),
  logout: vi.fn(),
  logoutAll: vi.fn(),
  cancelMfa: vi.fn(),
  exitImpersonation: vi.fn(),
  refreshUser: vi.fn(),
};

function renderOverview(staffList: StaffAdminItem[]) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  vi.spyOn(api, 'getAnalytics').mockResolvedValue(mockAnalytics);
  vi.spyOn(api, 'getStaffList').mockResolvedValue({ staff: staffList });

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={mockAuthValue}>
        <BrowserRouter>
          <DashboardOverview />
        </BrowserRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

describe('DashboardOverview Screen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders greeting and Manage Staff button', async () => {
    renderOverview([]);

    expect(screen.getByRole('button', { name: /Manage Staff/i })).toBeInTheDocument();
  });

  it('renders cursive "add staff" callout with freestyle arrow when restaurant has no staff members', async () => {
    renderOverview([]);

    await waitFor(() => {
      expect(screen.getByText('add staff')).toBeInTheDocument();
      expect(screen.getByLabelText('Add staff callout')).toBeInTheDocument();
    });
  });

  it('hides cursive "add staff" callout when restaurant already has active staff', async () => {
    const mockStaffItem: StaffAdminItem = {
      id: 'staff-1',
      restaurantId: 'rest-1',
      displayName: 'Aarav Patel',
      roleLabel: 'Head Server',
      maskedVpa: 'aarav@upi',
      photoUrl: null,
      isActive: true,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };

    renderOverview([mockStaffItem]);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Manage Staff/i })).toBeInTheDocument();
    });

    expect(screen.queryByText('add staff')).toBeNull();
    expect(screen.queryByLabelText('Add staff callout')).toBeNull();
  });
});
