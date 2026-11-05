import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { App } from '../src/App.js';
import { api } from '../src/services/api.js';

describe('Customer App Scaffolding', () => {
  it('renders without crashing and mounts customer container', async () => {
    vi.spyOn(api, 'resolveToken').mockResolvedValue({
      restaurant: {
        id: '11111111-1111-1111-1111-111111111111',
        name: 'The Bombay Canteen',
        slug: 'the-bombay-canteen',
        logoUrl: null,
        googleReviewUrl: 'https://maps.app.goo.gl/example',
        tipPresets: [20, 50, 100, 200],
        minTipInr: 10,
        maxTipInr: 5000,
      },
      table: null,
    });

    window.history.pushState({}, 'Test', '/t/test-token-123');

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('You are here for...')).toBeInTheDocument();
    });
  });
});
