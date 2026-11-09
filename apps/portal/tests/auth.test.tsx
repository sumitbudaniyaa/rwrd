import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { LoginScreen } from '../src/screens/LoginScreen.js';
import { AuthContext } from '../src/context/AuthContext.js';
import { ThemeProvider } from '../src/context/ThemeContext.js';

const mockUnauthContext = (loginMock = vi.fn()) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isLoading: false,
  login: loginMock,
  logout: vi.fn(),
});

const renderWithProviders = (ui: React.ReactElement, loginMock = vi.fn()) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthContext.Provider value={mockUnauthContext(loginMock)}>
          <BrowserRouter>{ui}</BrowserRouter>
        </AuthContext.Provider>
      </ThemeProvider>
    </QueryClientProvider>,
  );
};

describe('Portal Authentication Screen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders login screen with security disclosure and form fields', () => {
    renderWithProviders(<LoginScreen />);

    expect(screen.getByText('rwrd Control Plane')).toBeDefined();
    expect(screen.getByText(/Authorized access only. Connections are IP-monitored/i)).toBeDefined();
    expect(screen.getByPlaceholderText('sumit@rwrd.live')).toBeDefined();
    expect(screen.getByPlaceholderText('••••••••••••')).toBeDefined();
    expect(screen.getByRole('button', { name: /Sign In to Control Plane/i })).toBeDefined();
  });

  it('submits credentials and calls login on form submission', async () => {
    const loginMock = vi.fn().mockResolvedValueOnce({
      accessToken: 'dummy-token',
      expiresInSeconds: 900,
      user: {
        id: 'usr-1',
        email: 'staff@tiptable.in',
        fullName: 'Platform Staff',
        role: 'support' as const,
      },
    });

    renderWithProviders(<LoginScreen />, loginMock);

    const emailInput = screen.getByPlaceholderText('sumit@rwrd.live');
    const passwordInput = screen.getByPlaceholderText('••••••••••••');
    const submitBtn = screen.getByRole('button', { name: /Sign In to Control Plane/i });

    fireEvent.change(emailInput, { target: { value: 'staff@tiptable.in' } });
    fireEvent.change(passwordInput, { target: { value: 'SecretPassword123!' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(loginMock).toHaveBeenCalledWith('staff@tiptable.in', 'SecretPassword123!');
    });
  });

  it('displays error banner when authentication fails', async () => {
    const loginMock = vi.fn().mockRejectedValueOnce(new Error('Invalid staff credentials'));

    renderWithProviders(<LoginScreen />, loginMock);

    const emailInput = screen.getByPlaceholderText('sumit@rwrd.live');
    const passwordInput = screen.getByPlaceholderText('••••••••••••');
    const submitBtn = screen.getByRole('button', { name: /Sign In to Control Plane/i });

    fireEvent.change(emailInput, { target: { value: 'staff@tiptable.in' } });
    fireEvent.change(passwordInput, { target: { value: 'WrongPassword' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Invalid staff credentials')).toBeDefined();
    });
  });
});
