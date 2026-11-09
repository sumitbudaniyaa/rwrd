import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { App } from '../src/App.js';
import { api } from '../src/services/api.js';

describe('Customer Screen 1: Home', () => {
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
    table: {
      id: '22222222-2222-2222-2222-222222222222',
      tableNumber: 'Table 14',
      section: 'Terrace Garden',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders restaurant branding, header without table badge, and serif greeting', async () => {
    vi.spyOn(api, 'resolveToken').mockResolvedValue(mockResolveData);
    window.history.pushState({}, 'Home', '/t/valid-token-123');

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('The Bombay Canteen')).toBeInTheDocument();
    });

    expect(screen.queryByText('Table 14')).not.toBeInTheDocument();
    expect(screen.queryByText('Terrace Garden')).not.toBeInTheDocument();
    expect(screen.getByText('You are here for...')).toBeInTheDocument();
    expect(screen.getByText('Make the people who fed you happy')).toBeInTheDocument();
    expect(screen.getByText('Review us')).toBeInTheDocument();
    expect(screen.getByAltText('The Bombay Canteen')).toBeInTheDocument();
    expect(screen.getByAltText('rwrd')).toBeInTheDocument();
    expect(screen.queryByText(/Powered by rwrd/i)).not.toBeInTheDocument();
  });

  it('displays friendly error screen when QR token resolution fails', async () => {
    vi.spyOn(api, 'resolveToken').mockRejectedValue(new Error('Token not found'));
    window.history.pushState({}, 'Error', '/t/invalid-token');

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Table unavailable')).toBeInTheDocument();
    });
  });

  it('triggers review telemetry and opens Google Review link on click', async () => {
    vi.spyOn(api, 'resolveToken').mockResolvedValue(mockResolveData);
    const trackSpy = vi.spyOn(api, 'trackReviewTap').mockResolvedValue(undefined);
    const windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

    window.history.pushState({}, 'Home', '/t/valid-token-123');

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Review us')).toBeInTheDocument();
    });

    const reviewButton = screen.getByText('Review us').closest('button')!;
    fireEvent.click(reviewButton);

    expect(trackSpy).toHaveBeenCalledWith('11111111-1111-1111-1111-111111111111', {
      token: 'valid-token-123',
      source: 'home_card',
    });
    expect(windowOpenSpy).toHaveBeenCalledWith(
      'https://maps.app.goo.gl/exampleReview',
      '_blank',
      'noopener,noreferrer',
    );
  });

  it('redirects /r/:token QR link format directly to restaurant home screen', async () => {
    vi.spyOn(api, 'resolveToken').mockResolvedValue(mockResolveData);
    window.history.pushState({}, 'QR Link', '/r/valid-token-123');

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('The Bombay Canteen')).toBeInTheDocument();
    });
    expect(window.location.pathname).toBe('/t/valid-token-123');
  });

  it('renders NoTokenScreen fallback when visiting base domain without token', async () => {
    window.history.pushState({}, 'Root', '/');

    render(<App />);

    expect(screen.getByText('scan table QR code')).toBeInTheDocument();
  });
});
