import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { LegalScreen } from '../src/screens/LegalScreen.js';

describe('LegalScreen Component (M5-T05)', () => {
  it('renders Privacy Policy content for /privacy route', () => {
    render(
      <MemoryRouter initialEntries={['/privacy']}>
        <Routes>
          <Route path="/privacy" element={<LegalScreen />} />
          <Route path="/terms" element={<LegalScreen />} />
        </Routes>
      </MemoryRouter>,
    );

    // Header & DPDP Act
    expect(screen.getByText(/Privacy Policy & DPDP Act 2023 Compliance/i)).toBeInTheDocument();
    expect(screen.getByText(/Digital Personal Data Protection Act 2023/i)).toBeInTheDocument();

    // Data minimization principles
    expect(
      screen.getByText(/Diner Data Minimization: Zero Account, Zero Tracking/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Complete Anonymity for Diners:/i)).toBeInTheDocument();

    // Security & AES-256-GCM
    expect(screen.getByText(/Staff VPAs Encrypted at Rest \(AES-256-GCM\)/i)).toBeInTheDocument();

    // Grievance Redressal Officer
    expect(screen.getByText(/Ananya Deshmukh • Grievance Redressal Officer/i)).toBeInTheDocument();
    expect(screen.getByText('grievance@tiptable.in')).toBeInTheDocument();
  });

  it('renders Terms of Service content for /terms route', () => {
    render(
      <MemoryRouter initialEntries={['/terms']}>
        <Routes>
          <Route path="/privacy" element={<LegalScreen />} />
          <Route path="/terms" element={<LegalScreen />} />
        </Routes>
      </MemoryRouter>,
    );

    // Header
    expect(
      screen.getByText(/Terms of Service & Non-Custodial Facilitator Agreement/i),
    ).toBeInTheDocument();

    // Invariant 1: Zero Escrow
    expect(screen.getByText(/The 100% Non-Custodial Architecture Invariant/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Zero Escrow, Zero Money Transmission, Zero Custody/i),
    ).toBeInTheDocument();

    // 0% Commission
    expect(screen.getByText(/Zero Commission Policy on Staff Gratuities/i)).toBeInTheDocument();
    expect(screen.getByText(/0.00% commission rate/i)).toBeInTheDocument();

    // Subscription & Trial
    expect(screen.getByText(/SaaS Subscription Fees & Billing/i)).toBeInTheDocument();
    expect(screen.getByText(/14-Day Zero-Risk Trial:/i)).toBeInTheDocument();

    // Google anti-gating
    expect(screen.getByText(/Google Maps Anti-Gating Compliance/i)).toBeInTheDocument();
  });

  it('allows switching between Privacy Policy and Terms of Service tabs', () => {
    render(
      <MemoryRouter initialEntries={['/privacy']}>
        <Routes>
          <Route path="/privacy" element={<LegalScreen />} />
          <Route path="/terms" element={<LegalScreen />} />
        </Routes>
      </MemoryRouter>,
    );

    // Initially in Privacy
    expect(screen.getByText(/Privacy Policy & DPDP Act 2023 Compliance/i)).toBeInTheDocument();

    // Click Terms tab
    const termsLink = screen.getByRole('link', { name: /Terms of Service \(Non-Custodial\)/i });
    fireEvent.click(termsLink);

    // Now in Terms
    expect(
      screen.getByText(/Terms of Service & Non-Custodial Facilitator Agreement/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/The 100% Non-Custodial Architecture Invariant/i)).toBeInTheDocument();
  });
});
