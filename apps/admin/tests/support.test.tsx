import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from '@tiptable/ui';
import { SupportScreen } from '../src/screens/SupportScreen.js';
import { api, type SupportTicketItem, type SupportTicketsResponse } from '../src/services/api.js';
import { AuthContext } from '../src/context/AuthContext.js';

const mockTickets: SupportTicketItem[] = [
  {
    id: 'tick-1',
    restaurantId: 'rest-123',
    ticketNumber: 'TICK-901234',
    category: 'complaint',
    priority: 'high',
    status: 'open',
    subject: 'Table 4 QR code unreadable',
    description: 'Guests report their phone camera does not recognize the QR code on table 4.',
    resolutionNote: null,
    resolvedAt: null,
    createdAt: '2026-11-20T10:00:00.000Z',
    updatedAt: '2026-11-20T10:00:00.000Z',
  },
  {
    id: 'tick-2',
    restaurantId: 'rest-123',
    ticketNumber: 'TICK-901235',
    category: 'technical',
    priority: 'urgent',
    status: 'resolved',
    subject: 'Staff tip payouts sync latency',
    description: 'Delay in seeing tip intents populated in dashboard.',
    resolutionNote: 'Fixed network sync worker queue backlog.',
    resolvedAt: '2026-11-21T12:00:00.000Z',
    createdAt: '2026-11-21T09:00:00.000Z',
    updatedAt: '2026-11-21T12:00:00.000Z',
  },
];

const mockTicketsResponse: SupportTicketsResponse = {
  data: mockTickets,
  total: 2,
  limit: 50,
  offset: 0,
};

const createMockAuthContext = () => ({
  user: {
    id: 'usr-1',
    email: 'admin@restaurant.com',
    fullName: 'Rajesh Kumar',
    role: 'owner',
    restaurantId: 'rest-123',
  },
  restaurant: {
    id: 'rest-123',
    name: 'Jaipur Cafe',
    slug: 'jaipur-cafe',
    googleReviewUrl: 'https://maps.app.goo.gl/xyz',
  },
  isAuthenticated: true,
  isLoading: false,
  impersonation: null,
  login: vi.fn(),
  verifyMfa: vi.fn(),
  logout: vi.fn(),
  refreshUser: vi.fn(),
  exitImpersonation: vi.fn(),
});

const renderSupportScreen = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuthContext.Provider value={createMockAuthContext() as any}>
          <SupportScreen />
        </AuthContext.Provider>
      </ToastProvider>
    </QueryClientProvider>,
  );
};

describe('SupportScreen', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders heading and displays loaded tickets', async () => {
    vi.spyOn(api, 'getSupportTickets').mockResolvedValue(mockTicketsResponse);

    renderSupportScreen();

    expect(screen.getByText('support & complaints')).toBeInTheDocument();
    expect(
      screen.getByText(
        'raise support requests, report technical issues, or track active complaints',
      ),
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Table 4 QR code unreadable')).toBeInTheDocument();
      expect(screen.getByText('Staff tip payouts sync latency')).toBeInTheDocument();
      expect(screen.getByText('TICK-901234')).toBeInTheDocument();
    });
  });

  it('filters tickets using the search input', async () => {
    vi.spyOn(api, 'getSupportTickets').mockResolvedValue(mockTicketsResponse);

    renderSupportScreen();

    await waitFor(() => {
      expect(screen.getByText('Table 4 QR code unreadable')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search tickets...');
    fireEvent.change(searchInput, { target: { value: 'latency' } });

    expect(screen.queryByText('Table 4 QR code unreadable')).not.toBeInTheDocument();
    expect(screen.getByText('Staff tip payouts sync latency')).toBeInTheDocument();
  });

  it('submits a new support ticket and shows toast notification', async () => {
    vi.spyOn(api, 'getSupportTickets').mockResolvedValue(mockTicketsResponse);
    const createSpy = vi.spyOn(api, 'createSupportTicket').mockResolvedValue({
      ticket: {
        id: 'tick-3',
        restaurantId: 'rest-123',
        ticketNumber: 'TICK-901236',
        category: 'complaint',
        priority: 'high',
        status: 'open',
        subject: 'Printer thermal roll jammed',
        description: 'Need new printer roll for receipt counter stand.',
        resolutionNote: null,
        resolvedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    });

    renderSupportScreen();

    await waitFor(() => {
      expect(screen.getByText('Table 4 QR code unreadable')).toBeInTheDocument();
    });

    const raiseTicketBtn = screen.getByRole('button', { name: /raise ticket/i });
    fireEvent.click(raiseTicketBtn);

    expect(screen.getByText('raise a support ticket')).toBeInTheDocument();

    const subjectInput = screen.getByPlaceholderText(/e.g., QR scan routing error/i);
    const descInput = screen.getByPlaceholderText(/describe the issue/i);

    fireEvent.change(subjectInput, { target: { value: 'Printer thermal roll jammed' } });
    fireEvent.change(descInput, {
      target: { value: 'Need new printer roll for receipt counter stand.' },
    });

    const submitBtn = screen.getByRole('button', { name: /submit ticket/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledWith(
        'rest-123',
        expect.objectContaining({
          subject: 'Printer thermal roll jammed',
          description: 'Need new printer roll for receipt counter stand.',
        }),
      );
    });
  });

  it('opens ticket details modal and displays resolution note', async () => {
    vi.spyOn(api, 'getSupportTickets').mockResolvedValue(mockTicketsResponse);

    renderSupportScreen();

    await waitFor(() => {
      expect(screen.getByText('Staff tip payouts sync latency')).toBeInTheDocument();
    });

    const viewDetailsButtons = screen.getAllByRole('button', { name: /view details/i });
    expect(viewDetailsButtons.length).toBeGreaterThanOrEqual(2);
    fireEvent.click(viewDetailsButtons[1]!); // Click second ticket (resolved)

    await waitFor(() => {
      expect(screen.getByText('support team resolution')).toBeInTheDocument();
      expect(screen.getAllByText('Fixed network sync worker queue backlog.')).toHaveLength(2);
    });
  });
});
