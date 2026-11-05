import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { App } from '../src/App.js';

describe('Admin App Scaffolding & Minimal Design System', () => {
  it('renders admin shell with sidebar navigation, tenant pill, and metrics overview', () => {
    window.history.pushState({}, 'Admin Overview', '/admin');

    render(<App />);

    // Brand and header
    expect(screen.getByText('TipTable')).toBeInTheDocument();
    expect(screen.getByText('Restaurant Admin')).toBeInTheDocument();
    expect(screen.getByText('The Bombay Canteen')).toBeInTheDocument();
    expect(screen.getByText('Production Mode')).toBeInTheDocument();

    // Navigation items
    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Staff Roster')).toBeInTheDocument();
    expect(screen.getByText('QR Management')).toBeInTheDocument();
    expect(screen.getByText('Analytics')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Audit Log')).toBeInTheDocument();

    // Invariant check: metrics must label tips as initiated, never received
    expect(screen.getByText('Tips Initiated')).toBeInTheDocument();
    expect(screen.getByText('Recent Tips Initiated')).toBeInTheDocument();
    expect(screen.queryByText(/tips received/i)).toBeNull();
  });

  it('navigates cleanly between admin tabs', () => {
    window.history.pushState({}, 'Admin Overview', '/admin');

    render(<App />);

    // Click Staff Roster
    const staffTab = screen.getByText('Staff Roster');
    fireEvent.click(staffTab);

    expect(screen.getByText('Staff Management')).toBeInTheDocument();
    expect(screen.getByText('Manage waitstaff roster and UPI VPAs.')).toBeInTheDocument();

    // Click Settings
    const settingsTab = screen.getByText('Settings');
    fireEvent.click(settingsTab);

    expect(screen.getByText('Restaurant Settings')).toBeInTheDocument();
  });
});
