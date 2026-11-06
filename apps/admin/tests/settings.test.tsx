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

const createMockAuthContext = (role = 'owner') => ({
  user: {
    id: 'usr-1',
    email: 'user@bombaycanteen.com',
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
  verifyMfa: vi.fn(),
  logout: vi.fn(),
  logoutAll: vi.fn(),
  cancelMfa: vi.fn(),
  exitImpersonation: vi.fn(),
});

const renderWithProviders = (ui: React.ReactElement, role = 'owner') => {
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

  it('renders settings screen with pre-filled restaurant configurations', async () => {
    vi.spyOn(api, 'getRestaurantSettings').mockResolvedValueOnce({
      restaurant: mockRestaurantSettings,
    });

    renderWithProviders(<SettingsScreen />);

    expect(screen.getByText('Loading restaurant configuration...')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByDisplayValue('The Bombay Canteen')).toBeInTheDocument();
    });

    expect(
      screen.getByDisplayValue('https://maps.app.goo.gl/bombaycanteen123'),
    ).toBeInTheDocument();
    expect(screen.getByText('₹20')).toBeInTheDocument();
    expect(screen.getByText('₹50')).toBeInTheDocument();
    expect(screen.getByText('₹100')).toBeInTheDocument();
    expect(screen.getByText('₹200')).toBeInTheDocument();
  });

  it('disables restaurant legal name when user has manager role', async () => {
    vi.spyOn(api, 'getRestaurantSettings').mockResolvedValueOnce({
      restaurant: mockRestaurantSettings,
    });

    renderWithProviders(<SettingsScreen />, 'manager');

    await waitFor(() => {
      expect(screen.getByText('Restaurant Settings')).toBeInTheDocument();
    });

    const nameInput = screen.getByDisplayValue('The Bombay Canteen');
    expect(nameInput).toBeDisabled();
    expect(
      screen.getByText(/Managers cannot modify entity legal name. Contact owner./i),
    ).toBeInTheDocument();
  });

  it('validates Google review URL and displays warning for non-Google links', async () => {
    vi.spyOn(api, 'getRestaurantSettings').mockResolvedValueOnce({
      restaurant: mockRestaurantSettings,
    });

    renderWithProviders(<SettingsScreen />);

    await waitFor(() => {
      expect(screen.getByText('Restaurant Settings')).toBeInTheDocument();
    });

    const urlInput = screen.getByDisplayValue('https://maps.app.goo.gl/bombaycanteen123');
    fireEvent.change(urlInput, { target: { value: 'https://yelp.com/biz/restaurant' } });

    expect(
      screen.getByText(/URL must be an official Google Maps \/ Business link/i),
    ).toBeInTheDocument();

    const saveBtn = screen.getByRole('button', { name: /Save Settings/i });
    fireEvent.click(saveBtn);

    expect(
      screen.getByText(
        /Google review link must be a valid Google Maps or Google Business review URL/i,
      ),
    ).toBeInTheDocument();
  });

  it('adds and removes quick-pick tip chips', async () => {
    vi.spyOn(api, 'getRestaurantSettings').mockResolvedValueOnce({
      restaurant: mockRestaurantSettings,
    });

    renderWithProviders(<SettingsScreen />);

    await waitFor(() => {
      expect(screen.getByText('₹20')).toBeInTheDocument();
    });

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
  });

  it('submits updated settings successfully and shows confirmation', async () => {
    vi.spyOn(api, 'getRestaurantSettings').mockResolvedValueOnce({
      restaurant: mockRestaurantSettings,
    });
    const updateSpy = vi.spyOn(api, 'updateRestaurantSettings').mockResolvedValueOnce({
      restaurant: {
        ...mockRestaurantSettings,
        name: 'The Bombay Canteen & Bar',
        googleReviewUrl: 'https://g.page/r/newreview',
      },
    });

    renderWithProviders(<SettingsScreen />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('The Bombay Canteen')).toBeInTheDocument();
    });

    const nameInput = screen.getByDisplayValue('The Bombay Canteen');
    fireEvent.change(nameInput, { target: { value: 'The Bombay Canteen & Bar' } });

    const urlInput = screen.getByDisplayValue('https://maps.app.goo.gl/bombaycanteen123');
    fireEvent.change(urlInput, { target: { value: 'https://g.page/r/newreview' } });

    const saveBtn = screen.getByRole('button', { name: /Save Settings/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith(
        'rest-123',
        expect.objectContaining({
          name: 'The Bombay Canteen & Bar',
          googleReviewUrl: 'https://g.page/r/newreview',
        }),
      );
    });

    expect(screen.getByText('Restaurant settings updated successfully.')).toBeInTheDocument();
  });
});
