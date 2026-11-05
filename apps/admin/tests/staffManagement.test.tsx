import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { StaffManagementScreen } from '../src/screens/StaffManagementScreen.js';
import { api, type StaffAdminItem } from '../src/services/api.js';
import { AuthContext } from '../src/context/AuthContext.js';

const mockStaffList: StaffAdminItem[] = [
  {
    id: 'staff-1',
    restaurantId: 'rest-123',
    displayName: 'Rahul Sharma',
    roleLabel: 'Server',
    maskedVpa: 'r***a@okaxis',
    isActive: true,
    photoUrl: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'staff-2',
    restaurantId: 'rest-123',
    displayName: 'Priya Patel',
    roleLabel: 'Bartender',
    maskedVpa: 'p***l@okhdfcbank',
    isActive: false,
    photoUrl: null,
    createdAt: '2026-01-02T00:00:00Z',
    updatedAt: '2026-01-02T00:00:00Z',
  },
];

const mockAuthContextValue = {
  user: {
    id: 'usr-1',
    email: 'owner@bombaycanteen.com',
    fullName: 'Sameer Seth',
    role: 'owner',
    restaurantId: 'rest-123',
  },
  restaurant: {
    id: 'rest-123',
    name: 'The Bombay Canteen',
    slug: 'the-bombay-canteen',
  },
  accessToken: 'dummy-token',
  tempToken: null,
  isLoading: false,
  isAuthenticated: true,
  login: vi.fn(),
  verifyMfa: vi.fn(),
  logout: vi.fn(),
  logoutAll: vi.fn(),
  cancelMfa: vi.fn(),
};

const renderWithProviders = (ui: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={mockAuthContextValue}>
        <BrowserRouter>{ui}</BrowserRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
};

describe('StaffManagementScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders staff roster table with masked VPAs and active badges', async () => {
    vi.spyOn(api, 'getStaffList').mockResolvedValueOnce({ staff: mockStaffList });

    renderWithProviders(<StaffManagementScreen />);

    expect(screen.getByText(/Staff Management/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Rahul Sharma')).toBeInTheDocument();
    });

    expect(screen.getByText('Priya Patel')).toBeInTheDocument();
    expect(screen.getByText('r***a@okaxis')).toBeInTheDocument();
    expect(screen.getByText('p***l@okhdfcbank')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Inactive')).toBeInTheDocument();
  });

  it('filters staff list when typing in the search input', async () => {
    vi.spyOn(api, 'getStaffList').mockResolvedValueOnce({ staff: mockStaffList });

    renderWithProviders(<StaffManagementScreen />);

    await waitFor(() => {
      expect(screen.getByText('Rahul Sharma')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Search by name or role/i);
    fireEvent.change(searchInput, { target: { value: 'Priya' } });

    expect(screen.queryByText('Rahul Sharma')).not.toBeInTheDocument();
    expect(screen.getByText('Priya Patel')).toBeInTheDocument();
  });

  it('opens Add Team Member modal, displays VPA safeguard warning, and submits new staff', async () => {
    vi.spyOn(api, 'getStaffList').mockResolvedValueOnce({ staff: mockStaffList });
    const createStaffSpy = vi.spyOn(api, 'createStaff').mockResolvedValueOnce({
      staff: {
        id: 'staff-3',
        restaurantId: 'rest-123',
        displayName: 'Amit Roy',
        roleLabel: 'Server',
        maskedVpa: 'a***y@upi',
        isActive: true,
        photoUrl: null,
        createdAt: '2026-01-03T00:00:00Z',
        updatedAt: '2026-01-03T00:00:00Z',
      },
    });

    renderWithProviders(<StaffManagementScreen />);

    await waitFor(() => {
      expect(screen.getByText('Rahul Sharma')).toBeInTheDocument();
    });

    const addButtons = screen.getAllByRole('button', { name: /Add Team Member/i });
    fireEvent.click(addButtons[0]!);

    // Check safeguard warning
    expect(
      screen.getByText(
        /Double-check the VPA. A wrong VPA sends diner tips directly to the wrong person/i,
      ),
    ).toBeInTheDocument();

    // Fill form
    fireEvent.change(screen.getByPlaceholderText(/e.g. Rahul Sharma/i), {
      target: { value: 'Amit Roy' },
    });
    fireEvent.change(screen.getByPlaceholderText(/e.g. rahul@okaxis/i), {
      target: { value: 'amitroy@upi' },
    });

    const submitBtn = screen.getByRole('button', { name: /^Add Staff Member$/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(createStaffSpy).toHaveBeenCalledWith('rest-123', {
        displayName: 'Amit Roy',
        roleLabel: 'Server',
        vpa: 'amitroy@upi',
      });
    });
  });

  it('toggles staff active status on button click', async () => {
    vi.spyOn(api, 'getStaffList').mockResolvedValueOnce({ staff: mockStaffList });
    const firstStaff = mockStaffList[0]!;
    const toggleSpy = vi.spyOn(api, 'toggleStaffActive').mockResolvedValueOnce({
      staff: { ...firstStaff, isActive: false },
    });

    renderWithProviders(<StaffManagementScreen />);

    await waitFor(() => {
      expect(screen.getByText('Rahul Sharma')).toBeInTheDocument();
    });

    const activeBadgeButton = screen.getByText('Active').closest('button');
    expect(activeBadgeButton).toBeInTheDocument();
    fireEvent.click(activeBadgeButton!);

    await waitFor(() => {
      expect(toggleSpy).toHaveBeenCalledWith('rest-123', 'staff-1');
    });
  });

  it('opens confirmation modal and soft deletes a staff member', async () => {
    vi.spyOn(api, 'getStaffList').mockResolvedValueOnce({ staff: mockStaffList });
    const deleteSpy = vi.spyOn(api, 'deleteStaff').mockResolvedValueOnce({
      message: 'Staff member deactivated successfully',
    });

    renderWithProviders(<StaffManagementScreen />);

    await waitFor(() => {
      expect(screen.getByText('Rahul Sharma')).toBeInTheDocument();
    });

    const removeBtn = screen.getByLabelText(/Remove Rahul Sharma/i);
    fireEvent.click(removeBtn);

    expect(screen.getByText(/Remove Rahul Sharma\?/i)).toBeInTheDocument();
    expect(
      screen.getByText(/This will soft delete the staff member from active tipping rosters/i),
    ).toBeInTheDocument();

    const confirmDeleteBtn = screen.getByRole('button', { name: /^Remove Staff$/i });
    fireEvent.click(confirmDeleteBtn);

    await waitFor(() => {
      expect(deleteSpy).toHaveBeenCalledWith('rest-123', 'staff-1');
    });
  });
});
