import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { PortalLayout } from '../src/layouts/PortalLayout.js';
import { DashboardOverview } from '../src/screens/DashboardOverview.js';
import { AuthContext } from '../src/context/AuthContext.js';

const mockSuperAdminContext = {
  user: {
    id: 'usr-super-admin',
    email: 'admin@tiptable.in',
    fullName: 'Ananya Deshmukh',
    role: 'super_admin' as const,
  },
  accessToken: 'dummy-portal-access-token',
  isAuthenticated: true,
  isLoading: false,
  login: vi.fn(),
  logout: vi.fn(),
};

const renderWithProviders = (ui: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={mockSuperAdminContext}>
        <BrowserRouter>{ui}</BrowserRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
};

describe('Portal App Scaffolding & Layout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders portal navigation sidebar with realm badge and nav links', () => {
    renderWithProviders(<PortalLayout />);

    expect(screen.getByText('TipTable')).toBeDefined();
    expect(screen.getByText('Control Plane')).toBeDefined();
    expect(screen.getByText('Platform Staff Realm')).toBeDefined();

    expect(screen.getByText('Platform Overview')).toBeDefined();
    expect(screen.getByText('Restaurants')).toBeDefined();
    expect(screen.getByText('Billing & Plans')).toBeDefined();
    expect(screen.getByText('Inbound Leads')).toBeDefined();
    expect(screen.getByText('Global Audit')).toBeDefined();
    expect(screen.getByText('System Status')).toBeDefined();

    // User profile in footer
    expect(screen.getByText('Ananya Deshmukh')).toBeDefined();
    expect(screen.getByText('admin@tiptable.in')).toBeDefined();
    expect(screen.getByText('Super Admin')).toBeDefined();
    expect(screen.getByText('Sign Out')).toBeDefined();
  });

  it('renders dashboard overview with global metric cards and quick links', () => {
    renderWithProviders(<DashboardOverview />);

    expect(screen.getByText('Control Plane Dashboard')).toBeDefined();
    expect(screen.getByText(/Ananya Deshmukh/)).toBeDefined();

    // Metric cards
    expect(screen.getByText('Active Restaurants')).toBeDefined();
    expect(screen.getByText('Global Scans (Today)')).toBeDefined();
    expect(screen.getByText('Tips Initiated (Today)')).toBeDefined();
    expect(screen.getByText('Inbound Demo Leads')).toBeDefined();

    // Operations quick links
    expect(screen.getByText('Tenant Management')).toBeDefined();
    expect(screen.getByText('Inbound Leads Pipeline')).toBeDefined();
    expect(screen.getByText('Platform Security & Audit')).toBeDefined();
  });
});
