import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { App } from '../src/App.js';
import { api } from '../src/services/api.js';

describe('Admin App Scaffolding & Minimal Design System', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(api, 'refresh').mockResolvedValue({
      accessToken: 'valid.admin.jwt',
      expiresInSeconds: 900,
    });
    vi.spyOn(api, 'getMe').mockResolvedValue({
      user: {
        id: 'usr-1',
        email: 'owner@bombaycanteen.com',
        fullName: 'Sarah Miller',
        role: 'owner',
      },
      restaurant: {
        id: 'rest-1',
        name: 'The Bombay Canteen',
        slug: 'the-bombay-canteen',
      },
    });
    vi.spyOn(api, 'getStaffList').mockResolvedValue({ staff: [] });
    vi.spyOn(api, 'getRestaurantSettings').mockResolvedValue({
      restaurant: {
        id: 'rest-1',
        name: 'The Bombay Canteen',
        slug: 'the-bombay-canteen',
        logoUrl: null,
        googleReviewUrl: 'https://maps.app.goo.gl/bombaycanteen',
        tipPresets: [20, 50, 100, 200],
        minTipInr: 10,
        maxTipInr: 5000,
        isActive: true,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
    });
    vi.spyOn(api, 'getQrList').mockResolvedValue({
      restaurant: {
        id: 'rest-1',
        name: 'The Bombay Canteen',
        slug: 'the-bombay-canteen',
        logoUrl: null,
      },
      tokens: [],
    });
    vi.spyOn(api, 'getAnalytics').mockResolvedValue({
      dateRange: { startDate: '2026-11-01', endDate: '2026-11-07' },
      metrics: {
        scans: 1429,
        staffViews: 984,
        tipsInitiatedCount: 432,
        tipsInitiatedVolumeInr: 34850,
        reviewTaps: 187,
      },
      dailyTimeline: [],
      staffBreakdown: [],
    });
  });

  it('renders admin shell with sidebar navigation, tenant pill, and metrics overview', async () => {
    window.history.pushState({}, 'Admin Overview', '/admin');

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('rwrd')).toBeInTheDocument();
    });

    // Brand and header
    expect(screen.getAllByText('Admin').length).toBeGreaterThanOrEqual(1);

    // Navigation items
    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Staff Roster')).toBeInTheDocument();
    expect(screen.getByText('QR Management')).toBeInTheDocument();
    expect(screen.getByText('Analytics')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Audit Log')).toBeInTheDocument();
    expect(screen.getByText('Log Out')).toBeInTheDocument();

    // Invariant check: metrics must label tips as initiated, never received
    expect(screen.getByText('Tips Initiated')).toBeInTheDocument();
    expect(screen.getByText(/recent tips initiated/i)).toBeInTheDocument();
    expect(screen.queryByText(/tips received/i)).toBeNull();
  });

  it('navigates cleanly between admin tabs', async () => {
    window.history.pushState({}, 'Admin Overview', '/admin');

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Staff Roster')).toBeInTheDocument();
    });

    // Click Staff Roster
    const staffTab = screen.getByText('Staff Roster');
    fireEvent.click(staffTab);

    expect(screen.getByText(/staff management/i)).toBeInTheDocument();
    expect(screen.getByText(/Manage your waitstaff roster/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Add Team Member/i).length).toBeGreaterThanOrEqual(1);

    // Click Settings
    const settingsTab = screen.getByText('Settings');
    fireEvent.click(settingsTab);

    await waitFor(() => {
      expect(screen.getByText(/restaurant settings/i)).toBeInTheDocument();
    });
  });
});
