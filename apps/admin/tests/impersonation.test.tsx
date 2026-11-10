import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AdminLayout } from '../src/layouts/AdminLayout.js';
import { AuthContext } from '../src/context/AuthContext.js';
import type { ImpersonationDetails } from '../src/services/api.js';

const renderLayoutWithAuth = (
  impersonation: ImpersonationDetails | null = null,
  exitImpersonationSpy = vi.fn(),
  userOverrides: Record<string, unknown> = {},
  restaurantOverrides: Record<string, unknown> = {},
) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });

  const mockAuthContext = {
    user: {
      id: 'owner-123',
      email: 'owner@bombaycanteen.com',
      fullName: 'Sameer Seth',
      role: 'owner',
      restaurantId: 'rest-1111',
      ...userOverrides,
    },
    restaurant: {
      id: 'rest-1111',
      name: 'The Bombay Canteen',
      slug: 'the-bombay-canteen',
      logoUrl: null,
      ...restaurantOverrides,
    },
    accessToken: 'admin-access-token',
    tempToken: null,
    isLoading: false,
    isAuthenticated: true,
    impersonation,
    login: vi.fn(),
    register: vi.fn(),
    verifyMfa: vi.fn(),
    logout: vi.fn(),
    logoutAll: vi.fn(),
    cancelMfa: vi.fn(),
    exitImpersonation: exitImpersonationSpy,
  };

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={mockAuthContext}>
        <BrowserRouter>
          <AdminLayout />
        </BrowserRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
};

describe('Admin Header Banners (Impersonation & Review Link Missing)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders persistent warning banner when in impersonation mode', () => {
    renderLayoutWithAuth({
      isImpersonated: true,
      impersonatorId: 'staff-999',
      impersonatorEmail: 'support@tiptable.in',
    });

    const banner = screen.getByRole('alert');
    expect(banner).toBeDefined();
    expect(screen.getByText(/Impersonation Mode:/i)).toBeDefined();
    expect(screen.getByText(/staff-999/i)).toBeDefined();
    expect(screen.getByText(/All actions are strictly audited/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /Exit Impersonation/i })).toBeDefined();
  });

  it('triggers exitImpersonation when Exit Impersonation button is clicked', () => {
    const exitSpy = vi.fn();
    renderLayoutWithAuth(
      {
        isImpersonated: true,
        impersonatorId: 'staff-999',
      },
      exitSpy,
    );

    const exitBtn = screen.getByRole('button', { name: /Exit Impersonation/i });
    fireEvent.click(exitBtn);

    expect(exitSpy).toHaveBeenCalledTimes(1);
  });

  it('does not render banner during standard authenticated session', () => {
    renderLayoutWithAuth(null);

    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.queryByText(/Impersonation Mode:/i)).toBeNull();
  });

  it('renders Google review link missing banner when subscriber has paid but not configured review link', () => {
    renderLayoutWithAuth(null, vi.fn(), { hasActivePlan: true }, { googleReviewUrl: '' });

    expect(screen.getByText(/Google Review Link Missing/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add Review Link/i })).toBeInTheDocument();
    expect(screen.queryByText('⭐')).toBeNull();
  });

  it('does not render review missing banner when Google review URL is configured', () => {
    renderLayoutWithAuth(
      null,
      vi.fn(),
      { hasActivePlan: true },
      { googleReviewUrl: 'https://maps.app.goo.gl/bombaycanteen' },
    );

    expect(screen.queryByText(/Google Review Link Missing/i)).toBeNull();
  });

  it('does not render review missing banner when account has not paid yet', () => {
    renderLayoutWithAuth(
      null,
      vi.fn(),
      { hasActivePlan: false, subscriptionStatus: 'unpaid' },
      { googleReviewUrl: '' },
    );

    expect(screen.queryByText(/Google Review Link Missing/i)).toBeNull();
  });
});
