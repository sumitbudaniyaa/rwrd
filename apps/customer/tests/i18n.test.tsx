import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { App } from '../src/App.js';
import { api } from '../src/services/api.js';
import i18n from '../src/i18n/index.js';

describe('Customer App i18n: English & Hindi Support', () => {
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

  beforeEach(async () => {
    vi.clearAllMocks();
    await i18n.changeLanguage('en');
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

  it('switches dynamically to Hindi upon clicking language switcher button', async () => {
    vi.spyOn(api, 'resolveToken').mockResolvedValue(mockResolveData);
    window.history.pushState({}, 'Home', '/t/valid-token-123');

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('You are here for...')).toBeInTheDocument();
    });

    // Find and click the Hindi language button
    const hindiBtn = screen.getByRole('button', { name: 'हिंदी' });
    fireEvent.click(hindiBtn);

    await waitFor(() => {
      expect(screen.getByText('आप यहाँ आए हैं...')).toBeInTheDocument();
    });

    expect(screen.getByText('जिन्होंने आपको भोजन कराया उन्हें खुश करें')).toBeInTheDocument();
    expect(screen.getByText('समीक्षा दें')).toBeInTheDocument();
    expect(
      screen.getByText('rwrd द्वारा संचालित • 100% टिप सीधे वेटर को जाती है'),
    ).toBeInTheDocument();

    // Switch back to English
    const enBtn = screen.getByRole('button', { name: 'English' });
    fireEvent.click(enBtn);

    await waitFor(() => {
      expect(screen.getByText('You are here for...')).toBeInTheDocument();
    });
    expect(screen.getByText('Make the people who fed you happy')).toBeInTheDocument();
  });

  it('interpolates parameters accurately in Hindi', async () => {
    await i18n.changeLanguage('hi');
    expect(i18n.t('amount.subtitle', { name: 'Aarav' })).toBe(
      '100% राशि सीधे UPI द्वारा Aarav को जाएगी',
    );
    expect(i18n.t('thanks.tip_initiated', { name: 'Pooja' })).toBe('Pooja के लिए टिप शुरू की गई');
    expect(i18n.t('amount.err_min', { min: 10 })).toBe('न्यूनतम टिप ₹10 है');
  });
});
