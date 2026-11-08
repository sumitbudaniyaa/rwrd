import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { App } from '../src/App.js';
import { api } from '../src/services/api.js';

describe('Customer Screen 3: Amount Selection', () => {
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

  const mockStaffData = {
    staff: [
      {
        id: 'staff-1',
        displayName: 'Ramesh Kumar',
        roleLabel: 'Senior Server',
        photoUrl: null,
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders waiter profile, preset chips, and default amount', async () => {
    vi.spyOn(api, 'resolveToken').mockResolvedValue(mockResolveData);
    vi.spyOn(api, 'getStaff').mockResolvedValue(mockStaffData);

    window.history.pushState({}, 'Amount', '/t/valid-token-123/staff/staff-1');

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Ramesh Kumar')).toBeInTheDocument();
    });

    expect(screen.getByText('₹20')).toBeInTheDocument();
    expect(screen.getAllByText('₹50').length).toBe(2); // In preset chip and on primary button
    expect(screen.getByText('₹100')).toBeInTheDocument();
    expect(screen.getByText('₹200')).toBeInTheDocument();

    // Default preset is 2nd chip: ₹50
    expect(screen.getByText('Spread happiness')).toBeInTheDocument();

    // rwrd brand logo in top bar
    expect(screen.getByAltText('rwrd')).toBeInTheDocument();
  });

  it('updates amount when selecting a different preset chip', async () => {
    vi.spyOn(api, 'resolveToken').mockResolvedValue(mockResolveData);
    vi.spyOn(api, 'getStaff').mockResolvedValue(mockStaffData);

    window.history.pushState({}, 'Amount', '/t/valid-token-123/staff/staff-1');

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Ramesh Kumar')).toBeInTheDocument();
    });

    const chip100 = screen.getByText('₹100');
    fireEvent.click(chip100);

    expect(screen.getByText('Spread happiness')).toBeInTheDocument();
    expect(screen.getByText('•')).toBeInTheDocument();
  });

  it('allows entering a custom amount and validates bounds', async () => {
    vi.spyOn(api, 'resolveToken').mockResolvedValue(mockResolveData);
    vi.spyOn(api, 'getStaff').mockResolvedValue(mockStaffData);

    window.history.pushState({}, 'Amount', '/t/valid-token-123/staff/staff-1');

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Ramesh Kumar')).toBeInTheDocument();
    });

    const customInput = screen.getByPlaceholderText('Other amount');

    // Amount below minimum (min is 10)
    fireEvent.change(customInput, { target: { value: '5' } });
    expect(screen.getByText('Minimum tip is ₹10')).toBeInTheDocument();

    const button = screen.getByText('Spread happiness').closest('button')!;
    expect(button).toBeDisabled();

    // Amount above maximum (max is 5000)
    fireEvent.change(customInput, { target: { value: '6000' } });
    expect(screen.getByText('Maximum tip is ₹5,000')).toBeInTheDocument();
    expect(button).toBeDisabled();

    // Valid amount
    fireEvent.change(customInput, { target: { value: '250' } });
    expect(screen.queryByText(/Minimum tip/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Maximum tip/)).not.toBeInTheDocument();
    expect(button).not.toBeDisabled();
  });
});
