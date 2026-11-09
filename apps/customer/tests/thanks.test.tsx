import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { App } from '../src/App.js';
import { api } from '../src/services/api.js';

describe('Customer Screen 5: "You came so far" Post-Payment', () => {
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

  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it('renders "You came so far..." heading and Google review prompt', async () => {
    vi.spyOn(api, 'resolveToken').mockResolvedValue(mockResolveData);

    sessionStorage.setItem(
      'tiptable_active_tip',
      JSON.stringify({
        staffName: 'Ramesh Kumar',
        amountInr: 150,
      }),
    );

    window.history.pushState({}, 'Thanks', '/t/valid-token-123/thanks');

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('You came so far...')).toBeInTheDocument();
    });

    expect(screen.getByAltText('Appreciation heart')).toBeInTheDocument();
    expect(screen.getByText(/Thank you for spreading happiness!/)).toBeInTheDocument();
    expect(screen.getByText(/Tip initiated for Ramesh Kumar/)).toBeInTheDocument();
    expect(screen.getByText("Don't forget to review us")).toBeInTheDocument();
    expect(screen.getByText('Leave a Google Review')).toBeInTheDocument();
    expect(screen.getByText('Back to Table Home')).toBeInTheDocument();
  });

  it('triggers post-tip review telemetry and opens Google Review link on click', async () => {
    vi.spyOn(api, 'resolveToken').mockResolvedValue(mockResolveData);
    const trackSpy = vi.spyOn(api, 'trackReviewTap').mockResolvedValue(undefined);
    const windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

    window.history.pushState({}, 'Thanks', '/t/valid-token-123/thanks');

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Leave a Google Review')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Leave a Google Review'));

    expect(trackSpy).toHaveBeenCalledWith('11111111-1111-1111-1111-111111111111', {
      token: 'valid-token-123',
      source: 'post_tip_reminder',
    });
    expect(windowOpenSpy).toHaveBeenCalledWith(
      'https://maps.app.goo.gl/exampleReview',
      '_blank',
      'noopener,noreferrer',
    );
  });

  it('auto-navigates to thanks screen upon return detection from UPI app via visibility change', async () => {
    vi.spyOn(api, 'resolveToken').mockResolvedValue(mockResolveData);

    // Seed active tip in sessionStorage (as stored by Screen 4)
    sessionStorage.setItem(
      'tiptable_active_tip',
      JSON.stringify({
        intentId: 'intent-123',
        staffName: 'Aarav Sharma',
        amountInr: 100,
        restaurantName: 'The Bombay Canteen',
        timestamp: Date.now(),
      }),
    );

    // Initial position on home
    window.history.pushState({}, 'Home', '/t/valid-token-123');

    render(<App />);

    // Simulate returning to the page (visibilitychange to visible)
    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      configurable: true,
    });
    document.dispatchEvent(new Event('visibilitychange'));

    await waitFor(() => {
      expect(screen.getByText('You came so far...')).toBeInTheDocument();
    });
  });
});
