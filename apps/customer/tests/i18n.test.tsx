import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { App } from '../src/App.js';
import { api } from '../src/services/api.js';
import i18n from '../src/i18n/index.js';

describe('Customer App: English-Only Interface', () => {
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

  it('renders default English greeting and strings on Home screen', async () => {
    vi.spyOn(api, 'resolveToken').mockResolvedValue(mockResolveData);
    window.history.pushState({}, 'Home', '/t/valid-token-123');

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('You are here for...')).toBeInTheDocument();
    });

    expect(screen.getByText('Make the people who fed you happy')).toBeInTheDocument();
    expect(screen.getByText('Review us')).toBeInTheDocument();
  });

  it('does not render any language switcher toggle buttons', async () => {
    vi.spyOn(api, 'resolveToken').mockResolvedValue(mockResolveData);
    window.history.pushState({}, 'Home', '/t/valid-token-123');

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('You are here for...')).toBeInTheDocument();
    });

    expect(screen.queryByRole('button', { name: /हिंदी/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /English/i })).not.toBeInTheDocument();
  });

  it('interpolates English parameters accurately', () => {
    expect(i18n.t('amount.subtitle', { name: 'Aarav' })).toBe(
      '100% goes directly to Aarav via UPI',
    );
    expect(i18n.t('thanks.tip_initiated', { name: 'Pooja' })).toBe('Tip initiated for Pooja');
    expect(i18n.t('amount.err_min', { min: 10 })).toBe('Minimum tip is ₹10');
  });
});
