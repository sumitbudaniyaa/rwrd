import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import QRCode from 'qrcode';
import { QrManagementScreen } from '../src/screens/QrManagementScreen.js';
import { api, type QrListResponse } from '../src/services/api.js';
import { AuthContext } from '../src/context/AuthContext.js';

// Mock QRCode library
vi.mock('qrcode', () => ({
  default: {
    toCanvas: vi.fn(),
    toDataURL: vi.fn().mockResolvedValue('data:image/png;base64,mockPngDataUrl'),
    toString: vi.fn().mockResolvedValue('<svg>mockSvg</svg>'),
  },
}));

const mockQrData: QrListResponse = {
  restaurant: {
    id: 'rest-123',
    name: 'The Bombay Canteen',
    slug: 'the-bombay-canteen',
    logoUrl: 'https://cdn.tiptable.in/logo.png',
  },
  tokens: [
    {
      id: 'qr-root-1',
      restaurantId: 'rest-123',
      tableId: null,
      tableNumber: null,
      sectionName: null,
      token: 'root-token-xyz',
      customerUrl: 'http://localhost:3000/r/root-token-xyz',
      isActive: true,
      createdAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 'qr-table-1',
      restaurantId: 'rest-123',
      tableId: 'tbl-1',
      tableNumber: 'Table 4',
      sectionName: 'Terrace',
      token: 'table-token-abc',
      customerUrl: 'http://localhost:3000/r/table-token-abc',
      isActive: true,
      createdAt: '2026-01-01T00:00:00Z',
    },
  ],
};

const mockAuthContext = {
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
};

const renderWithProviders = (ui: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={mockAuthContext}>
        <BrowserRouter>{ui}</BrowserRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
};

describe('QrManagementScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders root restaurant QR and table placards list', async () => {
    vi.spyOn(api, 'getQrList').mockResolvedValueOnce(mockQrData);

    renderWithProviders(<QrManagementScreen />);

    expect(screen.getByText('Loading QR tokens and table placards...')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/general restaurant QR/i)).toBeInTheDocument();
    });

    expect(screen.getByText('Universal / Standing')).toBeInTheDocument();
    expect(screen.getByText('Table 4')).toBeInTheDocument();
    expect(screen.getByText('Terrace')).toBeInTheDocument();
  });

  it('downloads PNG and SVG files when clicking download buttons', async () => {
    vi.spyOn(api, 'getQrList').mockResolvedValueOnce(mockQrData);

    renderWithProviders(<QrManagementScreen />);

    await waitFor(() => {
      expect(screen.getByText(/general restaurant QR/i)).toBeInTheDocument();
    });

    const pngBtns = screen.getAllByRole('button', { name: /^PNG$/i });
    fireEvent.click(pngBtns[0]!);

    await waitFor(() => {
      expect(QRCode.toDataURL).toHaveBeenCalledWith(
        'http://localhost:3000/r/root-token-xyz',
        expect.any(Object),
      );
    });

    const svgBtns = screen.getAllByRole('button', { name: /^SVG$/i });
    fireEvent.click(svgBtns[0]!);

    await waitFor(() => {
      expect(QRCode.toString).toHaveBeenCalledWith(
        'http://localhost:3000/r/root-token-xyz',
        expect.objectContaining({ type: 'svg' }),
      );
    });
  });

  it('opens Add Dining Table modal and submits new table creation', async () => {
    vi.spyOn(api, 'getQrList').mockResolvedValueOnce(mockQrData);
    const createTableSpy = vi.spyOn(api, 'createTable').mockResolvedValueOnce({
      table: {
        id: 'tbl-2',
        tableNumber: 'Table 7',
        sectionName: 'Courtyard',
      },
      token: {
        id: 'qr-tbl-2',
        restaurantId: 'rest-123',
        tableId: 'tbl-2',
        tableNumber: 'Table 7',
        sectionName: 'Courtyard',
        token: 'new-token-table-7',
        customerUrl: 'http://localhost:3000/r/new-token-table-7',
        isActive: true,
        createdAt: '2026-01-02T00:00:00Z',
      },
    });

    renderWithProviders(<QrManagementScreen />);

    await waitFor(() => {
      expect(screen.getByText(/general restaurant QR/i)).toBeInTheDocument();
    });

    const addBtn = screen.getByRole('button', { name: /Add Dining Table/i });
    fireEvent.click(addBtn);

    expect(screen.getByText('Table Number / Identifier')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText(/e.g. Table 1, T-12, Booth 3/i), {
      target: { value: 'Table 7' },
    });
    fireEvent.change(screen.getByPlaceholderText(/e.g. Ground Floor, Terrace, Bar/i), {
      target: { value: 'Courtyard' },
    });

    const submitBtn = screen.getByRole('button', { name: /^Create Table$/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(createTableSpy).toHaveBeenCalledWith('rest-123', {
        tableNumber: 'Table 7',
        sectionName: 'Courtyard',
      });
    });
  });

  it('opens Rotate Token modal, warns about deactivation, and confirms rotation', async () => {
    vi.spyOn(api, 'getQrList').mockResolvedValueOnce(mockQrData);
    const rotateSpy = vi.spyOn(api, 'rotateQrToken').mockResolvedValueOnce({
      token: {
        id: 'qr-root-new',
        restaurantId: 'rest-123',
        tableId: null,
        tableNumber: null,
        sectionName: null,
        token: 'new-root-token-999',
        customerUrl: 'http://localhost:3000/r/new-root-token-999',
        isActive: true,
        createdAt: '2026-01-02T00:00:00Z',
      },
    });

    renderWithProviders(<QrManagementScreen />);

    await waitFor(() => {
      expect(screen.getByText(/general restaurant QR/i)).toBeInTheDocument();
    });

    const rotateBtns = screen.getAllByRole('button', { name: /Rotate/i });
    fireEvent.click(rotateBtns[0]!);

    expect(screen.getByText(/Rotate Restaurant QR\?/i)).toBeInTheDocument();
    expect(screen.getByText(/Rotating this token will/i)).toBeInTheDocument();

    const confirmRotateBtn = screen.getByLabelText('Confirm token rotation');
    fireEvent.click(confirmRotateBtn);

    await waitFor(() => {
      expect(rotateSpy).toHaveBeenCalledWith('rest-123', null);
    });
  });

  it('opens Print Placard modal with bilingual copy and triggers window.print()', async () => {
    vi.spyOn(api, 'getQrList').mockResolvedValueOnce(mockQrData);
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});

    renderWithProviders(<QrManagementScreen />);

    await waitFor(() => {
      expect(screen.getByText(/general restaurant QR/i)).toBeInTheDocument();
    });

    const printPlacardBtns = screen.getAllByRole('button', { name: /Print Placard/i });
    fireEvent.click(printPlacardBtns[0]!);

    expect(screen.getByRole('heading', { name: /print table placard/i })).toBeInTheDocument();
    expect(screen.getByText('Scan to tip your waiter directly via UPI')).toBeInTheDocument();
    expect(
      screen.getByText('अपने वेटर को सीधे UPI द्वारा टिप देने के लिए स्कैन करें'),
    ).toBeInTheDocument();

    const printPdfBtn = screen.getByRole('button', { name: /Print \/ Save PDF/i });
    fireEvent.click(printPdfBtn);

    expect(printSpy).toHaveBeenCalledTimes(1);
  });
});
