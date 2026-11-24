import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import type { ReactElement } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from '@tiptable/ui';
import { SupportTicketsScreen } from '../src/screens/SupportTicketsScreen.js';
import {
  api,
  type PortalSupportTicketItem,
  type PortalSupportTicketsResponse,
} from '../src/services/api.js';
import { AuthContext } from '../src/context/AuthContext.js';

const mockTickets: PortalSupportTicketItem[] = [
  {
    id: 'tick-p1',
    restaurantId: 'rest-111',
    restaurantName: 'The Bombay Canteen',
    restaurantSlug: 'the-bombay-canteen',
    ticketNumber: 'TICK-801234',
    category: 'complaint',
    priority: 'urgent',
    status: 'open',
    subject: 'UPI QR scan failing for customer payments',
    description: 'Customers scanning the table QR code receive error.',
    assignedStaffId: null,
    assignedStaffEmail: null,
    resolutionNote: null,
    resolvedAt: null,
    createdAt: '2026-11-20T10:00:00.000Z',
    updatedAt: '2026-11-20T10:00:00.000Z',
  },
  {
    id: 'tick-p2',
    restaurantId: 'rest-222',
    restaurantName: 'Jaipur Cafe',
    restaurantSlug: 'jaipur-cafe',
    ticketNumber: 'TICK-801235',
    category: 'technical',
    priority: 'medium',
    status: 'resolved',
    subject: 'Request assistance updating UPI VPA',
    description: 'Need help replacing old ICICI VPA with new HDFC VPA.',
    assignedStaffId: 'staff-1',
    assignedStaffEmail: 'support@tiptable.in',
    resolutionNote: 'Assisted manager with OTP verification for new VPA.',
    resolvedAt: '2026-11-21T12:00:00.000Z',
    createdAt: '2026-11-21T09:00:00.000Z',
    updatedAt: '2026-11-21T12:00:00.000Z',
  },
];

const mockTicketsResponse: PortalSupportTicketsResponse = {
  data: mockTickets,
  total: 2,
  kpis: {
    open: 1,
    inProgress: 0,
    resolved: 1,
    urgent: 1,
  },
  limit: 50,
  offset: 0,
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
      email: 'admin@tiptable.in',
      fullName: 'Super Admin',
      role: userRole,
    },
    isAuthenticated: true,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
    refreshUser: vi.fn(),
  };

  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuthContext.Provider value={mockAuthContext as any}>{ui}</AuthContext.Provider>
      </ToastProvider>
    </QueryClientProvider>,
  );
};

describe('SupportTicketsScreen', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders heading, KPI metrics, and tickets table', async () => {
    vi.spyOn(api, 'getSupportTickets').mockResolvedValue(mockTicketsResponse);

    renderWithProviders(<SupportTicketsScreen />);

    expect(screen.getByText('support & complaints')).toBeInTheDocument();
    expect(
      screen.getByText(
        'review incoming complaints, investigate technical tickets, and publish resolution notes',
      ),
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('The Bombay Canteen')).toBeInTheDocument();
      expect(screen.getByText('/the-bombay-canteen')).toBeInTheDocument();
      expect(screen.getByText('UPI QR scan failing for customer payments')).toBeInTheDocument();
      expect(screen.getByText('TICK-801234')).toBeInTheDocument();
      expect(screen.getByText('Jaipur Cafe')).toBeInTheDocument();
    });
  });

  it('opens review/resolve modal and submits status and resolution notes', async () => {
    vi.spyOn(api, 'getSupportTickets').mockResolvedValue(mockTicketsResponse);
    const updateSpy = vi.spyOn(api, 'updateSupportTicket').mockResolvedValue({
      ticket: {
        ...mockTickets[0]!,
        status: 'resolved',
        resolutionNote: 'Re-generated VPA QR vector payload.',
        resolvedAt: new Date().toISOString(),
      },
    });

    renderWithProviders(<SupportTicketsScreen />);

    await waitFor(() => {
      expect(screen.getByText('TICK-801234')).toBeInTheDocument();
    });

    const reviewButtons = screen.getAllByRole('button', { name: /review \/ resolve/i });
    expect(reviewButtons.length).toBeGreaterThanOrEqual(1);
    fireEvent.click(reviewButtons[0]!);

    await waitFor(() => {
      expect(screen.getByText('review ticket - TICK-801234')).toBeInTheDocument();
      expect(
        screen.getAllByText('Customers scanning the table QR code receive error.'),
      ).toHaveLength(2);
    });

    // Update status
    const statusSelect = screen.getByLabelText(/update status/i);
    fireEvent.change(statusSelect, { target: { value: 'resolved' } });

    // Enter resolution note
    const noteTextarea = screen.getByPlaceholderText(
      /explain how the issue was fixed, troubleshooting steps/i,
    );
    fireEvent.change(noteTextarea, {
      target: { value: 'Re-generated VPA QR vector payload.' },
    });

    // Submit form
    const saveButton = screen.getByRole('button', { name: /save & update ticket/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith('tick-p1', {
        status: 'resolved',
        priority: 'urgent',
        resolutionNote: 'Re-generated VPA QR vector payload.',
        assignedStaffId: 'usr-portal-1',
      });
    });
  });
});
