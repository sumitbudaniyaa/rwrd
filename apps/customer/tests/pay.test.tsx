import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { App } from '../src/App.js';
import { api } from '../src/services/api.js';

describe('Customer Screen 4: Pay & UPI Deep Link Redirection', () => {
  const mockResolveData = {
    restaurant: {
      id: '11111111-1111-1111-1111-111111111111',
      name: 'The Bombay Canteen',
      slug: 'the-bombay-canteen',
      logoUrl: 'https://media.tiptable.in/restaurants/logo.png',
      googleReviewUrl: 'https://maps.app.goo.gl/exampleReview',
      tipPresets: [20, 50, 100, 200],
      minTipInr: 10,
      maxTipInr: 5000,
    },
    table: null,
  };

  const mockStaff = {
    id: 'staff-1',
    displayName: 'Ramesh Kumar',
    roleLabel: 'Senior Server',
    photoUrl: null,
  };

  const mockTipIntentResponse = {
    intentId: 'intent-uuid-123',
    upiLink: 'upi://pay?pa=ramesh%40okaxis&pn=Ramesh+Kumar&am=100&cu=INR&tn=Tip+for+Ramesh+Kumar',
    payeeName: 'Ramesh Kumar',
    amountInr: 100,
    restaurantName: 'The Bombay Canteen',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it('creates tip intent, triggers UPI deep link, and renders fallback UI', async () => {
    vi.spyOn(api, 'resolveToken').mockResolvedValue(mockResolveData);
    vi.spyOn(api, 'getStaff').mockResolvedValue({ staff: [mockStaff] });
    const intentSpy = vi.spyOn(api, 'createTipIntent').mockResolvedValue(mockTipIntentResponse);

    window.history.pushState({}, 'Pay', '/t/valid-token-123/staff/staff-1/pay?amount=100');

    render(<App />);

    await waitFor(() => {
      expect(intentSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          token: 'valid-token-123',
          staffId: 'staff-1',
          amountInr: 100,
        }),
      );
    });

    // Check sessionStorage persistence
    const savedSession = sessionStorage.getItem('tiptable_active_tip');
    expect(savedSession).toBeDefined();
    const parsed = JSON.parse(savedSession!);
    expect(parsed.intentId).toBe('intent-uuid-123');
    expect(parsed.amountInr).toBe(100);

    // Check Fallback UI
    expect(screen.getByText('Opening your UPI app...')).toBeInTheDocument();
    expect(screen.getByText("UPI App Didn't Open?")).toBeInTheDocument();
    expect(screen.getByText('ramesh@okaxis')).toBeInTheDocument();
    expect(screen.getByText('Copy ID')).toBeInTheDocument();
    expect(screen.getByText('I have completed payment')).toBeInTheDocument();

    // rwrd brand logo in top bar
    expect(screen.getByAltText('rwrd')).toBeInTheDocument();
  });

  it('copies VPA to clipboard when clicking Copy ID button', async () => {
    vi.spyOn(api, 'resolveToken').mockResolvedValue(mockResolveData);
    vi.spyOn(api, 'getStaff').mockResolvedValue({ staff: [mockStaff] });
    vi.spyOn(api, 'createTipIntent').mockResolvedValue(mockTipIntentResponse);

    const writeTextSpy = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextSpy,
      },
    });

    window.history.pushState({}, 'Pay', '/t/valid-token-123/staff/staff-1/pay?amount=100');

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Copy ID')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Copy ID'));

    expect(writeTextSpy).toHaveBeenCalledWith('ramesh@okaxis');
    await waitFor(() => {
      expect(screen.getByText('✓ Copied')).toBeInTheDocument();
    });
  });
});
