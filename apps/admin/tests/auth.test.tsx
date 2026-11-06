import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { App } from '../src/App.js';
import { api } from '../src/services/api.js';

describe('Admin Authentication Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders login screen with email, password fields and sign-in button', () => {
    vi.spyOn(api, 'refresh').mockRejectedValue(new Error('No session'));
    window.history.pushState({}, 'Login', '/admin/login');

    render(<App />);

    expect(screen.getByText('Sign in to rwrd Admin')).toBeInTheDocument();
    expect(screen.getByLabelText(/work email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('redirects unauthenticated user from protected /admin route to /admin/login', async () => {
    vi.spyOn(api, 'refresh').mockRejectedValue(new Error('No session'));
    window.history.pushState({}, 'Protected Admin', '/admin');

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Sign in to rwrd Admin')).toBeInTheDocument();
    });
  });

  it('authenticates user directly when MFA is not required', async () => {
    vi.spyOn(api, 'refresh').mockRejectedValue(new Error('No session'));
    vi.spyOn(api, 'login').mockResolvedValueOnce({
      mfaRequired: false,
      accessToken: 'access.jwt.123',
      expiresInSeconds: 900,
      user: {
        id: 'usr-1',
        email: 'owner@restaurant.com',
        fullName: 'Sarah Miller',
        role: 'owner',
      },
    });
    vi.spyOn(api, 'getMe').mockResolvedValueOnce({
      user: {
        id: 'usr-1',
        email: 'owner@restaurant.com',
        fullName: 'Sarah Miller',
        role: 'owner',
      },
      restaurant: {
        id: 'rest-1',
        name: 'The Bombay Canteen',
        slug: 'the-bombay-canteen',
      },
    });

    window.history.pushState({}, 'Login', '/admin/login');

    render(<App />);

    fireEvent.change(screen.getByLabelText(/work email/i), {
      target: { value: 'owner@restaurant.com' },
    });
    fireEvent.change(screen.getByLabelText(/^password/i), {
      target: { value: 'ValidPassword123!' },
    });

    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText('Restaurant Admin')).toBeInTheDocument();
    });

    expect(screen.getByText('The Bombay Canteen')).toBeInTheDocument();
    expect(screen.getByText('Sarah Miller')).toBeInTheDocument();
  });

  it('navigates to MFA challenge when login requires second factor', async () => {
    vi.spyOn(api, 'refresh').mockRejectedValue(new Error('No session'));
    vi.spyOn(api, 'login').mockResolvedValueOnce({
      mfaRequired: true,
      tempToken: 'sample.temp.mfa.token',
      user: {
        id: 'usr-1',
        email: 'owner@restaurant.com',
        fullName: 'Sarah Miller',
        role: 'owner',
      },
    });

    window.history.pushState({}, 'Login', '/admin/login');

    render(<App />);

    fireEvent.change(screen.getByLabelText(/work email/i), {
      target: { value: 'owner@restaurant.com' },
    });
    fireEvent.change(screen.getByLabelText(/^password/i), {
      target: { value: 'ValidPassword123!' },
    });

    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText('Two-Factor Authentication')).toBeInTheDocument();
    });

    expect(screen.getByLabelText(/6-digit verification code/i)).toBeInTheDocument();

    // Toggle to recovery code
    const recoveryToggle = screen.getByText(/lost your device\? use recovery code/i);
    fireEvent.click(recoveryToggle);

    expect(screen.getByText('Enter Recovery Code')).toBeInTheDocument();
    expect(screen.getByLabelText(/emergency recovery code/i)).toBeInTheDocument();
  });
});
