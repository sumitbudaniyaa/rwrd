import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import type { ReactElement } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BillingManagementScreen } from '../src/screens/BillingManagementScreen.js';
import {
  api,
  type SubscriptionItem,
  type InvoiceItem,
  type InvoicesResponse,
  type AutoSuspendSweepResult,
  type BillingPlanItem,
} from '../src/services/api.js';
import { AuthContext } from '../src/context/AuthContext.js';

const mockSubscriptions: SubscriptionItem[] = [
  {
    id: 'sub-1',
    restaurantId: 'rest-1',
    restaurantName: 'Toit Brewpub',
    restaurantSlug: 'toit-brewpub',
    isRestaurantSuspended: false,
    planId: 'plan-standard',
    planName: 'Standard Flat',
    planCode: 'standard',
    monthlyFeeInr: 999,
    status: 'active',
    trialEndsAt: null,
    currentPeriodStart: '2026-11-01T00:00:00.000Z',
    currentPeriodEnd: '2026-12-01T00:00:00.000Z',
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
  },
  {
    id: 'sub-2',
    restaurantId: 'rest-2',
    restaurantName: 'Delinquent Cafe',
    restaurantSlug: 'delinquent-cafe',
    isRestaurantSuspended: true,
    planId: 'plan-standard',
    planName: 'Standard Flat',
    planCode: 'standard',
    monthlyFeeInr: 999,
    status: 'past_due',
    trialEndsAt: null,
    currentPeriodStart: '2026-10-01T00:00:00.000Z',
    currentPeriodEnd: '2026-11-01T00:00:00.000Z',
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-11-06T00:00:00.000Z',
  },
  {
    id: 'sub-3',
    restaurantId: 'rest-3',
    restaurantName: 'Unpaid Onboarding Diner',
    restaurantSlug: 'unpaid-onboarding-diner',
    isRestaurantActive: false,
    isRestaurantSuspended: false,
    planId: null,
    planName: null,
    planCode: null,
    monthlyFeeInr: null,
    status: 'unpaid',
    trialEndsAt: null,
    currentPeriodStart: null,
    currentPeriodEnd: null,
    createdAt: '2026-11-10T00:00:00.000Z',
    updatedAt: '2026-11-10T00:00:00.000Z',
  },
];

const mockInvoices: InvoiceItem[] = [
  {
    id: 'inv-1',
    invoiceNumber: 'INV-100001',
    restaurantId: 'rest-1',
    restaurantName: 'Toit Brewpub',
    subscriptionId: 'sub-1',
    amountInr: 999,
    status: 'unpaid',
    dueDate: '2026-11-20',
    paidAt: null,
    createdAt: '2026-11-06T00:00:00.000Z',
  },
  {
    id: 'inv-2',
    invoiceNumber: 'INV-100002',
    restaurantId: 'rest-2',
    restaurantName: 'Delinquent Cafe',
    subscriptionId: 'sub-2',
    amountInr: 999,
    status: 'paid',
    dueDate: '2026-10-15',
    paidAt: '2026-10-14T00:00:00.000Z',
    createdAt: '2026-10-01T00:00:00.000Z',
  },
];

const mockPlans: BillingPlanItem[] = [
  {
    id: 'plan-quarterly',
    code: 'quarterly',
    name: 'Quarterly Growth',
    priceInr: 2699,
    monthlyFeeInr: 899,
    durationMonths: 3,
    maxStaff: 50,
    maxTables: 100,
    isActive: true,
  },
];

const mockInvoicesResponse: InvoicesResponse = {
  invoices: mockInvoices,
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

describe('BillingManagementScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(api, 'getSubscriptions').mockResolvedValue({ subscriptions: mockSubscriptions });
    vi.spyOn(api, 'getInvoices').mockResolvedValue(mockInvoicesResponse);
    vi.spyOn(api, 'getBillingPlans').mockResolvedValue({ plans: mockPlans });
  });

  it('renders billing header, stats overview, and subscriptions list', async () => {
    renderWithProviders(<BillingManagementScreen />);

    expect(screen.getByText('Billing & Subscriptions')).toBeInTheDocument();
    expect(
      screen.getByText(/Flat SaaS subscription management \(0% commission on tips\)/),
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Toit Brewpub')).toBeInTheDocument();
      expect(screen.getByText('Delinquent Cafe')).toBeInTheDocument();
      expect(screen.getByText('/toit-brewpub')).toBeInTheDocument();
      expect(screen.getByText('Unpaid Onboarding Diner')).toBeInTheDocument();
      expect(screen.getByText('Pending Selection')).toBeInTheDocument();
      expect(screen.getByText('Inactive QR')).toBeInTheDocument();
      expect(screen.getByText('Pending Payment')).toBeInTheDocument();
    });

    expect(screen.getByText('Active Subscriptions')).toBeInTheDocument();
    expect(screen.getByText('Past Due / Delinquent')).toBeInTheDocument();
  });

  it('switches to Invoices Ledger tab and displays invoice records', async () => {
    renderWithProviders(<BillingManagementScreen />);

    await waitFor(() => {
      expect(screen.getByText('Toit Brewpub')).toBeInTheDocument();
    });

    // Switch tab
    const invoicesTab = screen.getByRole('button', { name: /Invoices Ledger/i });
    fireEvent.click(invoicesTab);

    await waitFor(() => {
      expect(screen.getByText('INV-100001')).toBeInTheDocument();
      expect(screen.getByText('INV-100002')).toBeInTheDocument();
      expect(screen.getByText('Mark Paid')).toBeInTheDocument();
    });
  });

  it('calls updateInvoiceStatus when Mark Paid button is clicked', async () => {
    const markPaidSpy = vi.spyOn(api, 'updateInvoiceStatus').mockResolvedValue({
      invoice: {
        ...mockInvoices[0]!,
        status: 'paid',
        paidAt: new Date().toISOString(),
      },
    });

    renderWithProviders(<BillingManagementScreen />);

    // Switch to invoices tab
    const invoicesTab = screen.getByRole('button', { name: /Invoices Ledger/i });
    fireEvent.click(invoicesTab);

    await waitFor(() => {
      expect(screen.getByText('Mark Paid')).toBeInTheDocument();
    });

    const markPaidButton = screen.getByText('Mark Paid');
    fireEvent.click(markPaidButton);

    await waitFor(() => {
      expect(markPaidSpy).toHaveBeenCalledWith('inv-1', 'mark_paid');
    });
  });

  it('opens grace period sweep confirmation modal and triggers sweep', async () => {
    const sweepResult: AutoSuspendSweepResult = {
      evaluatedInvoicesCount: 1,
      newlySuspendedCount: 1,
      suspendedEstablishments: [
        {
          restaurantId: 'rest-2',
          restaurantName: 'Delinquent Cafe',
          invoiceNumber: 'INV-099999',
        },
      ],
    };

    const sweepSpy = vi.spyOn(api, 'runAutoSuspendCheck').mockResolvedValue(sweepResult);

    renderWithProviders(<BillingManagementScreen />);

    const sweepButton = screen.getByRole('button', { name: /Run Grace Period Sweep/i });
    fireEvent.click(sweepButton);

    await waitFor(() => {
      expect(screen.getByText('Run Grace Period Enforcement Sweep')).toBeInTheDocument();
      expect(
        screen.getByText(/Evaluates overdue invoices against the platform 7-day grace rule/),
      ).toBeInTheDocument();
    });

    const executeButton = screen.getByRole('button', { name: /Execute Sweep/i });
    fireEvent.click(executeButton);

    await waitFor(() => {
      expect(sweepSpy).toHaveBeenCalled();
      expect(screen.getByText(/Grace period sweep completed/)).toBeInTheDocument();
    });
  });

  it('hides mutation buttons for support role', async () => {
    renderWithProviders(<BillingManagementScreen />, 'support');

    expect(screen.getByText('Read-only Finance Access')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Run Grace Period Sweep/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Create Invoice/i })).not.toBeInTheDocument();
  });

  it('switches to SaaS Plans Pricing tab and opens edit price modal for super admin', async () => {
    const updateSpy = vi.spyOn(api, 'updateBillingPlan').mockResolvedValue({
      plan: {
        ...mockPlans[0]!,
        priceInr: 2999,
        monthlyFeeInr: 999,
      },
    });

    renderWithProviders(<BillingManagementScreen />, 'super_admin');

    // Click SaaS Plans Pricing tab
    const plansTab = screen.getByRole('button', { name: /SaaS Plans Pricing/i });
    fireEvent.click(plansTab);

    await waitFor(() => {
      expect(screen.getByText('SaaS Subscription Pricing Architecture')).toBeInTheDocument();
      expect(screen.getByText('Quarterly Growth')).toBeInTheDocument();
      expect(screen.getByText('₹2699')).toBeInTheDocument();
    });

    // Click Edit Pricing
    const editBtn = screen.getByRole('button', { name: /Edit Pricing/i });
    fireEvent.click(editBtn);

    await waitFor(() => {
      expect(screen.getByText(/Edit Plan Pricing: Quarterly Growth/)).toBeInTheDocument();
    });

    // Change total price and verify real-time auto-calculation of monthly fee
    const priceInput = screen.getByLabelText(/Total Price/i);
    const monthlyInput = screen.getByLabelText(/Monthly Fee/i) as HTMLInputElement;

    fireEvent.change(priceInput, { target: { value: '3000' } });
    // Plan duration is 3 months, so 3000 / 3 = 1000
    expect(monthlyInput.value).toBe('1000');

    // Submit form
    const saveBtn = screen.getByRole('button', { name: /Save Price Changes/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith(
        'plan-quarterly',
        expect.objectContaining({
          priceInr: 3000,
          monthlyFeeInr: 1000,
        }),
      );
    });
  });
});
