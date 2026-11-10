import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { OnboardingPaymentScreen } from '../src/screens/OnboardingPaymentScreen.js';
import { AuthContext } from '../src/context/AuthContext.js';
import { api } from '../src/services/api.js';

const mockUnpaidUser = {
  id: 'usr-123',
  email: 'owner@establishment.com',
  fullName: 'Vikram Batra',
  role: 'admin',
  restaurantId: 'rest-123',
  hasActivePlan: false,
};

const mockRestaurant = {
  id: 'rest-123',
  name: 'O Pedro',
  slug: 'o-pedro',
  logoUrl: null,
};

const mockBillingPlans = [
  {
    id: 'plan-1',
    name: '1 Month',
    code: 'monthly',
    priceInr: 99,
    durationMonths: 1,
    monthlyFeeInr: 99,
  },
  {
    id: 'plan-2',
    name: '3 Months',
    code: 'quarterly',
    priceInr: 269,
    durationMonths: 3,
    monthlyFeeInr: 90,
  },
  {
    id: 'plan-3',
    name: '6 Months',
    code: 'semi_annual',
    priceInr: 549,
    durationMonths: 6,
    monthlyFeeInr: 91,
  },
  {
    id: 'plan-4',
    name: '12 Months',
    code: 'yearly',
    priceInr: 1029,
    durationMonths: 12,
    monthlyFeeInr: 85,
  },
];

const renderWithContext = (ui: React.ReactElement, refreshUserMock = vi.fn()) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });

  const authValue = {
    user: mockUnpaidUser,
    restaurant: mockRestaurant,
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
    refreshUser: refreshUserMock,
  };

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={authValue}>
        <BrowserRouter>{ui}</BrowserRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
};

describe('Onboarding Payment Screen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders plan options and allows selecting and completing payment', async () => {
    vi.spyOn(api, 'getBillingPlans').mockResolvedValueOnce({ plans: mockBillingPlans });
    const paySpy = vi.spyOn(api, 'completeOnboardingPayment').mockResolvedValueOnce({
      message: 'Plan "6 Months" successfully activated',
      accessToken: 'fresh.paid.token',
      subscription: {
        planId: 'plan-3',
        planName: '6 Months',
        priceInr: 549,
        durationMonths: 6,
        status: 'active',
        currentPeriodEnd: '2027-05-10T00:00:00Z',
      },
      hasActivePlan: true,
    });
    const refreshUserMock = vi.fn().mockResolvedValue(undefined);

    renderWithContext(<OnboardingPaymentScreen />, refreshUserMock);

    // Headline and restaurant branding
    expect(screen.getByText(/activate your establishment/i)).toBeInTheDocument();
    expect(screen.getByText('O Pedro')).toBeInTheDocument();

    // Verify removed clutter is NOT in the document
    expect(screen.queryByText(/mandatory plan activation/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/instant qr placards/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/direct staff upi/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/48-hour grace protection/i)).not.toBeInTheDocument();
    expect(
      screen.queryByText(/authorized establishment billing and credentialing/i),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/instant activation via upi deep link or standard checkout/i),
    ).not.toBeInTheDocument();

    // Verify plans and beUI duration tabs are displayed
    await waitFor(() => {
      expect(screen.getAllByText('1 Month').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('3 Months').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('6 Months').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('12 Months').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByRole('tab')).toHaveLength(4);
    });

    // Verify beUI tabs interaction: click 1 Month tab
    const tabs = screen.getAllByRole('tab');
    fireEvent.click(tabs[0]!); // Click '1 Month' tab

    // Check pricing values
    expect(screen.getByText('₹99')).toBeInTheDocument();
    expect(screen.getByText('₹269')).toBeInTheDocument();
    expect(screen.getByText('₹549')).toBeInTheDocument();
    expect(screen.getByText('₹1029')).toBeInTheDocument();

    // Check sticky dock typography: plan name on line 1 without dash, price on line 2
    expect(screen.getByText('1 Month Plan Selected')).toBeInTheDocument();
    expect(screen.getByText('₹99 INR')).toBeInTheDocument();
    expect(screen.queryByText(/1 Month Plan Selected —/i)).not.toBeInTheDocument();

    // Click Proceed to Pay
    const proceedBtn = screen.getByRole('button', { name: /proceed to pay/i });
    fireEvent.click(proceedBtn);

    // Modal opens
    await waitFor(() => {
      expect(screen.getByText(/complete plan payment/i)).toBeInTheDocument();
      expect(screen.getByText(/standard upi deep link/i)).toBeInTheDocument();
    });

    // Click Confirm & Activate
    const confirmBtn = screen.getByRole('button', { name: /confirm & activate/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(paySpy).toHaveBeenCalledWith('plan-1');
      expect(refreshUserMock).toHaveBeenCalled();
    });
  });
});
