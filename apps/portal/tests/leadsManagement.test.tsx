import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import type { ReactElement } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LeadsManagementScreen } from '../src/screens/LeadsManagementScreen.js';
import { api, type LeadItem, type LeadsResponse } from '../src/services/api.js';
import { AuthContext } from '../src/context/AuthContext.js';

const mockLeads: LeadItem[] = [
  {
    id: 'lead-1',
    contactName: 'Rohit Sharma',
    email: 'rohit@trattoria.in',
    phone: '+919876543210',
    restaurantName: 'Trattoria Bella',
    city: 'Mumbai',
    notes: 'Interested in digital tipping for 30 waitstaff',
    status: 'new',
    captchaVerified: true,
    createdAt: '2026-11-06T10:00:00.000Z',
    updatedAt: '2026-11-06T10:00:00.000Z',
  },
  {
    id: 'lead-2',
    contactName: 'Priya Nair',
    email: 'priya@coastaldelight.in',
    phone: '+919811223344',
    restaurantName: 'Coastal Delight',
    city: 'Kochi',
    notes: 'Requested online walkthrough',
    status: 'contacted',
    captchaVerified: true,
    createdAt: '2026-11-05T14:30:00.000Z',
    updatedAt: '2026-11-06T09:00:00.000Z',
  },
];

const mockLeadsResponse: LeadsResponse = {
  leads: mockLeads,
  pagination: {
    limit: 50,
    offset: 0,
    count: 2,
  },
};

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
      email: 'staff@tiptable.in',
      fullName: 'Portal Staff',
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

describe('LeadsManagementScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(api, 'getLeads').mockResolvedValue(mockLeadsResponse);
  });

  it('renders leads header, pipeline summary cards, and lead list', async () => {
    renderWithProviders(<LeadsManagementScreen />);

    expect(screen.getByText('Inbound Leads & Demo Pipeline')).toBeInTheDocument();
    expect(
      screen.getByText(
        /Prospective restaurant partner inquiries from the marketing demo request form/,
      ),
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Trattoria Bella')).toBeInTheDocument();
      expect(screen.getByText('Coastal Delight')).toBeInTheDocument();
      expect(screen.getByText('Rohit Sharma')).toBeInTheDocument();
      expect(screen.getByText('Priya Nair')).toBeInTheDocument();
    });

    expect(screen.getByText('New Inquiries')).toBeInTheDocument();
    expect(screen.getByText('Won / Converted')).toBeInTheDocument();
  });

  it('opens lead details modal when lead card/row is clicked', async () => {
    renderWithProviders(<LeadsManagementScreen />);

    await waitFor(() => {
      expect(screen.getByText('Trattoria Bella')).toBeInTheDocument();
    });

    const leadRow = screen.getByText('Trattoria Bella');
    fireEvent.click(leadRow);

    await waitFor(() => {
      expect(screen.getByText('Lead ID:')).toBeInTheDocument();
      expect(screen.getByText('Sales Notes & Discussion Record')).toBeInTheDocument();
      expect(screen.getByText('Onboard as Restaurant →')).toBeInTheDocument();
    });
  });

  it('updates lead status via inline select dropdown', async () => {
    const updateSpy = vi.spyOn(api, 'updateLeadStatus').mockResolvedValue({
      lead: {
        ...mockLeads[0]!,
        status: 'contacted',
      },
    });

    renderWithProviders(<LeadsManagementScreen />);

    await waitFor(() => {
      expect(screen.getByText('Trattoria Bella')).toBeInTheDocument();
    });

    const selects = screen.getAllByRole('combobox');
    expect(selects.length).toBeGreaterThan(0);

    fireEvent.change(selects[0]!, { target: { value: 'contacted' } });

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith('lead-1', { status: 'contacted' });
    });
  });

  it('displays read-only view and disables edit controls for finance role', async () => {
    renderWithProviders(<LeadsManagementScreen />, 'finance');

    expect(screen.getByText('Read-only Sales View')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Trattoria Bella')).toBeInTheDocument();
    });

    // Inline selects should not be rendered for finance role
    expect(screen.queryAllByRole('combobox')).toHaveLength(0);
  });
});
