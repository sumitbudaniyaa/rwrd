import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PricingCalculator } from '../src/components/PricingCalculator.js';
import { FaqAccordion } from '../src/components/FaqAccordion.js';

describe('Pricing & FAQ Components (M5-T03)', () => {
  describe('PricingCalculator', () => {
    it('renders initial metrics, 0% commission guarantee, and flat fee', () => {
      render(
        <MemoryRouter>
          <PricingCalculator />
        </MemoryRouter>,
      );

      // Verify header and calculator title
      expect(screen.getByText(/Restaurant ROI & Impact Calculator/i)).toBeInTheDocument();
      expect(screen.getByText(/Standard Platform License/i)).toBeInTheDocument();

      // Flat fee display
      expect(screen.getByText('₹999')).toBeInTheDocument();
      expect(screen.getByText(/\/ month per outlet/i)).toBeInTheDocument();

      // Initial slider values
      expect(screen.getByText('20 Tables')).toBeInTheDocument();
      expect(screen.getByText('12 Diners')).toBeInTheDocument();
      expect(screen.getByText('₹75')).toBeInTheDocument();
      expect(screen.getByText('18%')).toBeInTheDocument();

      // Initial results
      expect(screen.getByText(/Monthly Staff Tips/i)).toBeInTheDocument();
      expect(screen.getByText(/Google 5-Star Reviews/i)).toBeInTheDocument();

      // Verify zero cut benefits list
      expect(screen.getByText(/0% commission on tips/i)).toBeInTheDocument();
      expect(screen.getByText(/Unlimited tables & placards/i)).toBeInTheDocument();
    });

    it('toggles between monthly and annual billing cycle', () => {
      render(
        <MemoryRouter>
          <PricingCalculator />
        </MemoryRouter>,
      );

      // Switch to annual
      const annualBadge = screen.getByText(/Annual Billing/i);
      fireEvent.click(annualBadge);

      // Now price is discounted to ₹833/month
      expect(screen.getByText('₹833')).toBeInTheDocument();
      expect(screen.getByText(/Billed annually at ₹9,990/i)).toBeInTheDocument();

      // Switch back to monthly
      const monthlyTab = screen.getByText(/Monthly Billing/i);
      fireEvent.click(monthlyTab);

      expect(screen.getByText('₹999')).toBeInTheDocument();
      expect(screen.getByText(/Billed monthly • Cancel anytime/i)).toBeInTheDocument();
    });

    it('updates projected staff tips when table count slider changes', () => {
      render(
        <MemoryRouter>
          <PricingCalculator />
        </MemoryRouter>,
      );

      // 20 tables * 12 covers * 30 days * 18% * 75 = 97,200
      expect(screen.getByText('₹97,200')).toBeInTheDocument();

      // Find slider
      const tableSlider = screen.getByRole('slider', { name: /Active Dining Tables/i });
      fireEvent.change(tableSlider, { target: { value: '40' } });

      // 40 tables * 12 covers * 30 days * 18% * 75 = 194,400
      expect(screen.getByText('40 Tables')).toBeInTheDocument();
      expect(screen.getByText('₹1,94,400')).toBeInTheDocument();
    });
  });

  describe('FaqAccordion', () => {
    it('renders all 6 questions and has the zero-commission question open by default', () => {
      render(<FaqAccordion />);

      // Check all 6 question headers
      expect(
        screen.getByText(
          /How does the 0% commission model work\? Do you take any cut of staff tips\?/i,
        ),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          /Is TipTable compliant with Reserve Bank of India \(RBI\) payment aggregator regulations\?/i,
        ),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Does review redirection violate Google Maps Anti-Gating policies\?/i),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          /Do restaurant owners have to manage tip pooling, payroll taxation, or GST\?/i,
        ),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/What hardware, kitchen displays, or POS integrations are required\?/i),
      ).toBeInTheDocument();
      expect(screen.getByText(/How quickly can our restaurant go live\?/i)).toBeInTheDocument();

      // Zero commission answer should be visible
      expect(
        screen.getByText(/TipTable takes exactly zero percentage cut of your staff tips/i),
      ).toBeInTheDocument();
    });

    it('expands and collapses answers upon clicking', () => {
      render(<FaqAccordion />);

      // RBI compliance question button
      const rbiButton = screen.getByRole('button', {
        name: /Reserve Bank of India \(RBI\) payment aggregator/i,
      });
      expect(rbiButton).toHaveAttribute('aria-expanded', 'false');

      // Click to open
      fireEvent.click(rbiButton);
      expect(rbiButton).toHaveAttribute('aria-expanded', 'true');
      expect(
        screen.getByText(/Under RBI master directions for Payment Aggregators/i),
      ).toBeInTheDocument();

      // Click to close
      fireEvent.click(rbiButton);
      expect(rbiButton).toHaveAttribute('aria-expanded', 'false');
    });
  });
});
