import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { App } from '../src/App.js';

describe('Landing App Scaffolding & Layout', () => {
  it('renders landing header with compliance guarantee and brand logo', () => {
    render(<App />);

    expect(screen.getAllByText('TipTable').length).toBeGreaterThan(0);
    expect(screen.getByText(/100% Non-Custodial:/i)).toBeInTheDocument();
    expect(
      screen.getByText(/We never touch diner funds or take a percentage cut of staff tips/i),
    ).toBeInTheDocument();
  });

  it('renders hero title and core non-custodial value proposition', () => {
    render(<App />);

    expect(screen.getByText(/Empower your waitstaff./i)).toBeInTheDocument();
    expect(screen.getByText(/Skyrocket 5-star reviews./i)).toBeInTheDocument();
    expect(
      screen.getByText(/Zero Platform Cut • Direct-to-Staff UPI Tipping/i),
    ).toBeInTheDocument();
  });

  it('renders 3-step flow section', () => {
    render(<App />);

    expect(screen.getByText('STEP 01')).toBeInTheDocument();
    expect(screen.getByText('Scan Table Placard')).toBeInTheDocument();
    expect(screen.getByText('STEP 02')).toBeInTheDocument();
    expect(screen.getByText('Tip Directly via UPI')).toBeInTheDocument();
    expect(screen.getByText('STEP 03')).toBeInTheDocument();
    expect(screen.getByText('1-Tap 5-Star Review')).toBeInTheDocument();
  });

  it('renders pricing section with ₹999 flat monthly fee and 0% commission guarantee', () => {
    render(<App />);

    expect(screen.getByText('Standard Platform License')).toBeInTheDocument();
    expect(screen.getByText('₹999')).toBeInTheDocument();
    expect(screen.getAllByText(/0% commission/i).length).toBeGreaterThan(0);
  });

  it('renders footer with legal compliance links and non-custodial disclaimer', () => {
    render(<App />);

    expect(screen.getByText(/Non-Custodial Invariant:/i)).toBeInTheDocument();
    expect(screen.getByText(/DPDP Act Privacy Policy/i)).toBeInTheDocument();
    expect(screen.getByText(/Terms of Service/i)).toBeInTheDocument();
  });
});
