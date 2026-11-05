import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { App } from '../src/App.js';
import { api } from '../src/services/api.js';

describe('Customer Screen 2: Staff Directory', () => {
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

  const mockStaffData = {
    staff: [
      {
        id: 'staff-1',
        displayName: 'Ramesh Kumar',
        roleLabel: 'Senior Server',
        photoUrl: 'https://media.tiptable.in/staff/ramesh.webp',
      },
      {
        id: 'staff-2',
        displayName: 'Priya Sharma',
        roleLabel: 'Captain',
        photoUrl: null, // Test initials avatar fallback
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders staff list with photo and initials fallback', async () => {
    vi.spyOn(api, 'resolveToken').mockResolvedValue(mockResolveData);
    vi.spyOn(api, 'getStaff').mockResolvedValue(mockStaffData);

    window.history.pushState({}, 'Staff', '/t/valid-token-123/staff');

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Who served you?')).toBeInTheDocument();
    });

    expect(screen.getByText('Ramesh Kumar')).toBeInTheDocument();
    expect(screen.getByText('Senior Server')).toBeInTheDocument();
    expect(screen.getByText('Priya Sharma')).toBeInTheDocument();
    expect(screen.getByText('Captain')).toBeInTheDocument();

    // Initials fallback for Priya Sharma
    expect(screen.getByText('PS')).toBeInTheDocument();
  });

  it('filters staff roster by search query', async () => {
    vi.spyOn(api, 'resolveToken').mockResolvedValue(mockResolveData);
    vi.spyOn(api, 'getStaff').mockResolvedValue(mockStaffData);

    window.history.pushState({}, 'Staff', '/t/valid-token-123/staff');

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Ramesh Kumar')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search by name...');
    fireEvent.change(searchInput, { target: { value: 'Priya' } });

    expect(screen.getByText('Priya Sharma')).toBeInTheDocument();
    expect(screen.queryByText('Ramesh Kumar')).not.toBeInTheDocument();
  });

  it('displays friendly empty state when no staff match search', async () => {
    vi.spyOn(api, 'resolveToken').mockResolvedValue(mockResolveData);
    vi.spyOn(api, 'getStaff').mockResolvedValue(mockStaffData);

    window.history.pushState({}, 'Staff', '/t/valid-token-123/staff');

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Ramesh Kumar')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search by name...');
    fireEvent.change(searchInput, { target: { value: 'NonexistentWaiter' } });

    expect(screen.getByText('No staff found')).toBeInTheDocument();
    expect(screen.getByText(/No waitstaff matching "NonexistentWaiter"/)).toBeInTheDocument();
  });
});
