import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import type { ReactElement } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SystemHealthScreen } from '../src/screens/SystemHealthScreen.js';
import { api, type SystemHealthResponse, type FeatureFlagItem } from '../src/services/api.js';
import { AuthContext } from '../src/context/AuthContext.js';

const mockHealthResponse: SystemHealthResponse = {
  status: 'healthy',
  timestamp: '2026-11-06T12:00:00.000Z',
  environment: 'production',
  components: {
    api: {
      status: 'healthy',
      uptimeSeconds: 86400,
      memoryUsageMb: 112,
      heapUsedMb: 64,
      version: '0.1.0',
      nodeVersion: 'v20.18.0',
    },
    database: {
      status: 'healthy',
      engine: 'PostgreSQL 16',
      latencyMs: 3,
    },
    redis: {
      status: 'healthy',
      engine: 'Redis 7',
      latencyMs: 1,
    },
    workers: {
      status: 'operational',
      queue: 'telemetry_processing',
      activeJobs: 0,
      completedJobs: 1420,
      failedJobs: 0,
    },
  },
};

const mockFlags: FeatureFlagItem[] = [
  {
    id: 'flag-1',
    restaurantId: 'rest-1',
    restaurantName: 'Toit Brewpub',
    restaurantSlug: 'toit-brewpub',
    key: 'google_reviews_booster',
    enabled: true,
    configJson: { minimumTipForPrompt: 50 },
    createdAt: '2026-11-06T10:00:00.000Z',
    updatedAt: '2026-11-06T10:00:00.000Z',
  },
];

const renderWithProviders = (
  ui: ReactElement,
  userRole: 'super_admin' | 'support' | 'finance' = 'super_admin',
) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });

  const mockAuthContext = {
    user: {
      id: 'usr-portal-1',
      email: 'admin@tiptable.in',
      fullName: 'Portal Admin',
      role: userRole,
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

describe('SystemHealthScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(api, 'getSystemHealth').mockResolvedValue(mockHealthResponse);
    vi.spyOn(api, 'getFeatureFlags').mockResolvedValue({ flags: mockFlags });
  });

  it('renders system health overview with diagnostic component cards', async () => {
    renderWithProviders(<SystemHealthScreen />);

    expect(screen.getByText('System Status & Feature Flags')).toBeInTheDocument();
    expect(
      screen.getByText(/Operational backing services health, telemetry worker queues/),
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('API Gateway')).toBeInTheDocument();
      expect(screen.getByText('Database')).toBeInTheDocument();
      expect(screen.getByText('PostgreSQL 16')).toBeInTheDocument();
      expect(screen.getByText('Redis 7')).toBeInTheDocument();
      expect(screen.getByText('Queue Workers')).toBeInTheDocument();
    });

    expect(screen.getByText('All Systems Go')).toBeInTheDocument();
  });

  it('switches to Tenant Feature Flags tab and displays configured overrides', async () => {
    renderWithProviders(<SystemHealthScreen />);

    await waitFor(() => {
      expect(screen.getByText('API Gateway')).toBeInTheDocument();
    });

    const flagsTab = screen.getByRole('button', { name: /Tenant Feature Flags/i });
    fireEvent.click(flagsTab);

    await waitFor(() => {
      expect(screen.getByText('Toit Brewpub')).toBeInTheDocument();
      expect(screen.getAllByText('google_reviews_booster').length).toBeGreaterThan(0);
      expect(screen.getByText('Add Flag Override')).toBeInTheDocument();
    });
  });

  it('toggles feature flag when clicked by super_admin', async () => {
    const toggleSpy = vi.spyOn(api, 'updateFeatureFlag').mockResolvedValue({
      flag: {
        ...mockFlags[0]!,
        enabled: false,
      },
    });

    renderWithProviders(<SystemHealthScreen />);

    const flagsTab = screen.getByRole('button', { name: /Tenant Feature Flags/i });
    fireEvent.click(flagsTab);

    await waitFor(() => {
      expect(screen.getByText('Toit Brewpub')).toBeInTheDocument();
    });

    const toggleButton = screen.getByRole('button', { name: /Enabled/i });
    fireEvent.click(toggleButton);

    await waitFor(() => {
      expect(toggleSpy).toHaveBeenCalledWith('flag-1', { enabled: false });
    });
  });

  it('restricts edit controls and hides Add Flag Override for support role', async () => {
    renderWithProviders(<SystemHealthScreen />, 'support');

    expect(screen.getByText('Read-only Infrastructure View')).toBeInTheDocument();

    const flagsTab = screen.getByRole('button', { name: /Tenant Feature Flags/i });
    fireEvent.click(flagsTab);

    await waitFor(() => {
      expect(screen.getByText('Toit Brewpub')).toBeInTheDocument();
    });

    // Add button should not be rendered
    expect(screen.queryByRole('button', { name: /Add Flag Override/i })).not.toBeInTheDocument();
  });
});
