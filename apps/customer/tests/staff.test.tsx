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

    window.history.pushState({}, 'Staff', '/t/staff-token-1/staff');

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Whose day is it?')).toBeInTheDocument();
    });

    expect(screen.getByText('Ramesh Kumar')).toBeInTheDocument();
    expect(screen.getByText('Senior Server')).toBeInTheDocument();
    expect(screen.getByText('Priya Sharma')).toBeInTheDocument();
    expect(screen.getByText('Captain')).toBeInTheDocument();

    // Initials fallback for Priya Sharma
    expect(screen.getByText('PS')).toBeInTheDocument();

    // Server dummy avatar fallback & photo image verification
    expect(screen.getByTestId('server-avatar-fallback')).toBeInTheDocument();
    expect(screen.getByTestId('server-avatar-image')).toBeInTheDocument();

    // rwrd brand logo in top bar
    expect(screen.getByAltText('rwrd')).toBeInTheDocument();
  });

  it('falls back to server dummy avatar when photo fails to load via onError', async () => {
    vi.spyOn(api, 'resolveToken').mockResolvedValue(mockResolveData);
    vi.spyOn(api, 'getStaff').mockResolvedValue({
      staff: [
        {
          id: 'staff-broken',
          displayName: 'Broken Photo Staff',
          roleLabel: 'Server',
          photoUrl: 'https://media.tiptable.in/staff/broken-image.jpg',
        },
      ],
    });

    window.history.pushState({}, 'Staff', '/t/staff-token-2/staff');

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Broken Photo Staff')).toBeInTheDocument();
    });

    const img = screen.getByTestId('server-avatar-image');
    expect(img).toBeInTheDocument();

    // Simulate image load error
    fireEvent.error(img);

    // Fallback vector illustration should now be displayed
    await waitFor(() => {
      expect(screen.getByTestId('server-avatar-fallback')).toBeInTheDocument();
    });
  });

  it('filters staff roster by search query', async () => {
    vi.spyOn(api, 'resolveToken').mockResolvedValue(mockResolveData);
    vi.spyOn(api, 'getStaff').mockResolvedValue(mockStaffData);

    window.history.pushState({}, 'Staff', '/t/staff-token-3/staff');

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

    window.history.pushState({}, 'Staff', '/t/staff-token-4/staff');

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
