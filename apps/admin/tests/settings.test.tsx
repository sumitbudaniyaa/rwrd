import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { SettingsScreen } from '../src/screens/SettingsScreen.js';
import { api, type RestaurantSettings } from '../src/services/api.js';
import { AuthContext } from '../src/context/AuthContext.js';

const mockRestaurantSettings: RestaurantSettings = {
  id: 'rest-123',
  name: 'The Bombay Canteen',
  slug: 'the-bombay-canteen',
  logoUrl: 'https://cdn.tiptable.in/logo.png',
  googleReviewUrl: 'https://maps.app.goo.gl/bombaycanteen123',
  tipPresets: [20, 50, 100, 200],
  minTipInr: 10,
  maxTipInr: 5000,
  isActive: true,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

const createMockAuthContext = (role = 'admin') => ({
  user: {
    id: 'usr-1',
    email: 'admin@bombaycanteen.com',
    fullName: 'Sameer Seth',
    role,
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
});

const renderWithProviders = (ui: React.ReactElement, role = 'admin') => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={createMockAuthContext(role)}>
        <BrowserRouter>{ui}</BrowserRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
};

describe('SettingsScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders settings screen with pre-filled restaurant configurations in read-only view mode', async () => {
    vi.spyOn(api, 'getRestaurantSettings').mockResolvedValueOnce({
      restaurant: mockRestaurantSettings,
    });

    renderWithProviders(<SettingsScreen />);

    expect(screen.getByText('Loading restaurant configuration...')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('The Bombay Canteen')).toBeInTheDocument();
    });

    expect(screen.getByText('https://maps.app.goo.gl/bombaycanteen123')).toBeInTheDocument();
    expect(screen.getByText('₹20')).toBeInTheDocument();
    expect(screen.getByText('₹50')).toBeInTheDocument();
    expect(screen.getByText('₹100')).toBeInTheDocument();
    expect(screen.getByText('₹200')).toBeInTheDocument();
    expect(screen.getByText('Min: ₹10 · Max: ₹5000')).toBeInTheDocument();

    // Verify Edit buttons exist for fields
    const editButtons = screen.getAllByRole('button', { name: /^Edit$/i });
    expect(editButtons.length).toBeGreaterThanOrEqual(4);
  });

  it('allows editing and saving restaurant legal name field-wise only when modified', async () => {
    vi.spyOn(api, 'getRestaurantSettings').mockResolvedValue({
      restaurant: mockRestaurantSettings,
    });
    const updateSpy = vi.spyOn(api, 'updateRestaurantSettings').mockResolvedValueOnce({
      restaurant: {
        ...mockRestaurantSettings,
        name: 'The Bombay Canteen & Bar',
      },
    });

    renderWithProviders(<SettingsScreen />, 'admin');

    await waitFor(() => {
      expect(screen.getByText('The Bombay Canteen')).toBeInTheDocument();
    });

    // Click Edit next to name
    const editBtns = screen.getAllByRole('button', { name: /^Edit$/i });
    expect(editBtns[0]).toBeDefined();
    fireEvent.click(editBtns[0]!);

    // Name input appears
    const nameInput = screen.getByDisplayValue('The Bombay Canteen');
    expect(nameInput).toBeInTheDocument();

    // Save button should initially be disabled because no edit made
    const saveBtn = screen.getByRole('button', { name: /^Save$/i });
    expect(saveBtn).toBeDisabled();

    // Make an edit
    fireEvent.change(nameInput, { target: { value: 'The Bombay Canteen & Bar' } });
    expect(saveBtn).not.toBeDisabled();

    // Click Save
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith('rest-123', {
        name: 'The Bombay Canteen & Bar',
      });
    });

    expect(screen.getByText('Restaurant settings updated successfully.')).toBeInTheDocument();
  });

  it('validates Google review URL during field edit and saves only on valid modification', async () => {
    vi.spyOn(api, 'getRestaurantSettings').mockResolvedValue({
      restaurant: mockRestaurantSettings,
    });
    const updateSpy = vi.spyOn(api, 'updateRestaurantSettings').mockResolvedValueOnce({
      restaurant: {
        ...mockRestaurantSettings,
        googleReviewUrl: 'https://g.page/r/newreview',
      },
    });

    renderWithProviders(<SettingsScreen />);

    await waitFor(() => {
      expect(screen.getByText('https://maps.app.goo.gl/bombaycanteen123')).toBeInTheDocument();
    });

    // Find and click Edit for Google Review URL (second edit button in list)
    const editReviewBtn = screen.getAllByRole('button', { name: /^Edit$/i })[1];
    expect(editReviewBtn).toBeDefined();
    fireEvent.click(editReviewBtn!);

    const urlInput = screen.getByDisplayValue('https://maps.app.goo.gl/bombaycanteen123');

    // Change to invalid URL
    fireEvent.change(urlInput, { target: { value: 'https://yelp.com/biz/restaurant' } });

    expect(
      screen.getByText(/URL must be an official Google Maps \/ Business link/i),
    ).toBeInTheDocument();

    const saveBtn = screen.getByRole('button', { name: /^Save$/i });
    expect(saveBtn).toBeDisabled();

    // Change to valid URL
    fireEvent.change(urlInput, { target: { value: 'https://g.page/r/newreview' } });
    expect(saveBtn).not.toBeDisabled();

    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith('rest-123', {
        googleReviewUrl: 'https://g.page/r/newreview',
      });
    });
  });

  it('adds and removes quick-pick tip chips with field-wise save', async () => {
    vi.spyOn(api, 'getRestaurantSettings').mockResolvedValue({
      restaurant: mockRestaurantSettings,
    });
    const updateSpy = vi.spyOn(api, 'updateRestaurantSettings').mockResolvedValueOnce({
      restaurant: {
        ...mockRestaurantSettings,
        tipPresets: [50, 100, 200, 500],
      },
    });

    renderWithProviders(<SettingsScreen />);

    await waitFor(() => {
      expect(screen.getByText('₹20')).toBeInTheDocument();
    });

    // Click Edit on tip presets (third Edit button)
    const editPresetBtn = screen.getAllByRole('button', { name: /^Edit$/i })[2];
    expect(editPresetBtn).toBeDefined();
    fireEvent.click(editPresetBtn!);

    // Remove ₹20
    const removeBtn = screen.getByLabelText('Remove ₹20');
    fireEvent.click(removeBtn);

    expect(screen.queryByText('₹20')).not.toBeInTheDocument();

    // Add ₹500
    const chipInput = screen.getByPlaceholderText('+ Add ₹');
    fireEvent.change(chipInput, { target: { value: '500' } });
    const addBtn = screen.getByTitle('Add chip');
    fireEvent.click(addBtn);

    expect(screen.getByText('₹500')).toBeInTheDocument();

    // Save field
    const saveBtn = screen.getByRole('button', { name: /^Save$/i });
    expect(saveBtn).not.toBeDisabled();
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith('rest-123', {
        tipPresets: [50, 100, 200, 500],
      });
    });
  });

  it('allows canceling field edits and restores saved values', async () => {
    vi.spyOn(api, 'getRestaurantSettings').mockResolvedValue({
      restaurant: mockRestaurantSettings,
    });

    renderWithProviders(<SettingsScreen />);

    await waitFor(() => {
      expect(screen.getByText('Min: ₹10 · Max: ₹5000')).toBeInTheDocument();
    });

    // Click Edit on tip limits
    const editBoundsBtn = screen.getAllByRole('button', { name: /^Edit$/i })[3];
    expect(editBoundsBtn).toBeDefined();
    fireEvent.click(editBoundsBtn!);

    // Inputs appear
    const minInput = screen.getByDisplayValue('10');
    fireEvent.change(minInput, { target: { value: '50' } });

    // Click Cancel
    const cancelBtn = screen.getByRole('button', { name: /^Cancel$/i });
    fireEvent.click(cancelBtn);

    // View mode restored with original values
    expect(screen.getByText('Min: ₹10 · Max: ₹5000')).toBeInTheDocument();
  });

  it('renders active subscription plan details without grace buffer protection copy', async () => {
    vi.spyOn(api, 'getRestaurantSettings').mockResolvedValue({
      restaurant: mockRestaurantSettings,
      subscription: {
        id: 'sub-active-1',
        status: 'active',
        planId: 'plan-6m',
        planName: '6 Months',
        planCode: 'semi_annual',
        priceInr: 549,
        durationMonths: 6,
        monthlyFeeInr: 92,
        currentPeriodStart: '2026-05-01T00:00:00.000Z',
        currentPeriodEnd: '2026-11-01T00:00:00.000Z',
        trialEndsAt: null,
      },
    });

    renderWithProviders(<SettingsScreen />);

    await waitFor(() => {
      expect(screen.getByText('Active Subscription Tier')).toBeInTheDocument();
      expect(screen.getByText('6 Months')).toBeInTheDocument();
      expect(screen.getByText('Billing Duration')).toBeInTheDocument();
      expect(screen.getByText('Period Expiration')).toBeInTheDocument();
    });

    // Verify Grace Buffer Protection is absent
    expect(screen.queryByText(/Grace Buffer Protection/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/48-Hour Renewal Buffer/i)).not.toBeInTheDocument();
  });

  it('allows toggling guest experience controls for tipping and reviews', async () => {
    vi.spyOn(api, 'getRestaurantSettings').mockResolvedValue({
      restaurant: {
        ...mockRestaurantSettings,
        tippingEnabled: true,
        reviewsEnabled: true,
      },
    });
    const updateSpy = vi.spyOn(api, 'updateRestaurantSettings').mockResolvedValue({
      restaurant: {
        ...mockRestaurantSettings,
        tippingEnabled: false,
        reviewsEnabled: false,
      },
    });

    renderWithProviders(<SettingsScreen />);

    await waitFor(() => {
      expect(screen.getByText('guest experience controls')).toBeInTheDocument();
      expect(screen.getByText('Waitstaff Tipping Option')).toBeInTheDocument();
      expect(screen.getByText('Google Review Option')).toBeInTheDocument();
    });

    // Toggle tipping switch
    const tippingSwitch = screen.getByRole('switch', { name: /Toggle waitstaff tipping option/i });
    expect(tippingSwitch).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(tippingSwitch);

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith('rest-123', { tippingEnabled: false });
    });

    // Toggle reviews switch
    const reviewsSwitch = screen.getByRole('switch', { name: /Toggle Google review option/i });
    expect(reviewsSwitch).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(reviewsSwitch);

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith('rest-123', { reviewsEnabled: false });
    });
  });
});
