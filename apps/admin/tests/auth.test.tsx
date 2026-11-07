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
    expect(screen.getByText('welcome back')).toBeInTheDocument();
    expect(screen.getByLabelText(/^email/i)).toBeInTheDocument();
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

    fireEvent.change(screen.getByLabelText(/^email/i), {
      target: { value: 'owner@restaurant.com' },
    });
    fireEvent.change(screen.getByLabelText(/^password/i), {
      target: { value: 'ValidPassword123!' },
    });

    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText('Sarah Miller')).toBeInTheDocument();
    });
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

    fireEvent.change(screen.getByLabelText(/^email/i), {
      target: { value: 'owner@restaurant.com' },
    });
    fireEvent.change(screen.getByLabelText(/^password/i), {
      target: { value: 'ValidPassword123!' },
    });

    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/two-factor authentication/i)).toBeInTheDocument();
    });

    expect(screen.getByLabelText(/6-digit verification code/i)).toBeInTheDocument();

    // Toggle to recovery code
    const recoveryToggle = screen.getByText(/lost your device\? use recovery code/i);
    fireEvent.click(recoveryToggle);

    expect(screen.getByText(/enter recovery code/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/emergency recovery code/i)).toBeInTheDocument();
  });

  it('toggles to forgot password screen and handles reset link request', async () => {
    vi.spyOn(api, 'refresh').mockRejectedValue(new Error('No session'));
    window.history.pushState({}, 'Login', '/admin/login');

    render(<App />);

    expect(screen.getByText('welcome back')).toBeInTheDocument();

    // Click Forgot?
    fireEvent.click(screen.getByRole('button', { name: /forgot\?/i }));

    await waitFor(() => {
      expect(screen.getByText('reset password')).toBeInTheDocument();
    });
    expect(screen.getByLabelText(/^email/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/^email/i), {
      target: { value: 'admin@restaurant.com' },
    });

    fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));

    await waitFor(() => {
      expect(
        screen.getByText(
          /if an account exists for this email, password reset instructions have been sent/i,
        ),
      ).toBeInTheDocument();
    });

    // Navigate back to sign in
    fireEvent.click(screen.getByRole('button', { name: /back to sign in/i }));

    await waitFor(() => {
      expect(screen.getByText('welcome back')).toBeInTheDocument();
    });
  });

  it('navigates through 3-step interactive onboarding flow during sign-up', async () => {
    vi.spyOn(api, 'refresh').mockRejectedValue(new Error('No session'));
    vi.spyOn(api, 'register').mockResolvedValueOnce({
      message: 'Registered successfully',
      accessToken: 'access.jwt.123',
      expiresInSeconds: 900,
      user: {
        id: 'usr-1',
        email: 'founder@restaurant.com',
        fullName: 'Sarah Miller',
        role: 'admin',
      },
    });

    window.history.pushState({}, 'Login', '/admin/login');

    render(<App />);

    // Toggle to Sign Up
    fireEvent.click(screen.getByRole('button', { name: /sign up/i }));

    // Step 1: "let's onboard you"
    await waitFor(() => {
      expect(screen.getByText(/let's onboard you/i)).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /next/i }));

    // Step 2: "i am a..."
    await waitFor(() => {
      expect(screen.getByText(/i am a\.\.\./i)).toBeInTheDocument();
    });
    expect(screen.getByText(/A\. Restaurant \/ Dining/i)).toBeInTheDocument();

    // Select role / type
    fireEvent.click(screen.getByText(/A\. Restaurant \/ Dining/i));

    // Step 3: "your restaurant" form
    await waitFor(() => {
      expect(screen.getByText(/your restaurant/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/^name/i), {
      target: { value: 'Sarah Miller' },
    });
    fireEvent.change(screen.getByLabelText(/restaurant legal name/i), {
      target: { value: 'The Bombay Canteen' },
    });
    fireEvent.change(screen.getByLabelText(/^email/i), {
      target: { value: 'founder@restaurant.com' },
    });
    fireEvent.change(screen.getByLabelText(/^password/i), {
      target: { value: 'SecretPassword123!' },
    });
    fireEvent.change(screen.getByLabelText(/^confirm password$/i), {
      target: { value: 'SecretPassword123!' },
    });

    fireEvent.click(screen.getByRole('button', { name: /onboard/i }));

    await waitFor(() => {
      expect(api.register).toHaveBeenCalledWith({
        restaurantName: 'The Bombay Canteen',
        fullName: 'Sarah Miller',
        email: 'founder@restaurant.com',
        password: 'SecretPassword123!',
      });
    });
  });
});
