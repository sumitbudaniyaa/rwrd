import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { HomeScreen } from '../src/screens/HomeScreen.js';
import { InteractiveFlowDemo } from '../src/components/InteractiveFlowDemo.js';

describe('Landing Home Sections & Interactive Simulator', () => {
  it('renders all 6 restaurant hospitality benefits', () => {
    render(
      <BrowserRouter>
        <HomeScreen />
      </BrowserRouter>,
    );

    expect(screen.getByText('Zero Escrow & Zero Payment Liability')).toBeInTheDocument();
    expect(screen.getByText('Cut Waitstaff Attrition by 35%')).toBeInTheDocument();
    expect(screen.getByText('Google Review Flywheel')).toBeInTheDocument();
    expect(screen.getByText('100% Tax & Legal Cleanliness')).toBeInTheDocument();
    expect(screen.getByText('AES-256-GCM Encrypted VPAs')).toBeInTheDocument();
    expect(screen.getByText('High-Res Placards & Granular Analytics')).toBeInTheDocument();
  });

  it('runs through the interactive scan-to-tip simulator journey', () => {
    render(<InteractiveFlowDemo />);

    // Step 1: Table Placard
    expect(screen.getByText('Acrylic Table Placard')).toBeInTheDocument();
    expect(screen.getByText(/Table 12 • Indiranagar/i)).toBeInTheDocument();

    const scanBtn = screen.getByRole('button', { name: /Scan Table QR Placard/i });
    fireEvent.click(scanBtn);

    // Step 2: Select Server & Amount
    expect(screen.getByText('Select Server & Amount')).toBeInTheDocument();
    expect(screen.getByText('Who took care of your table?')).toBeInTheDocument();
    expect(screen.getByText('Ramesh Kumar')).toBeInTheDocument();
    expect(screen.getByText('Ananya Sen')).toBeInTheDocument();

    // Select Ananya Sen and ₹200
    fireEvent.click(screen.getByText('Ananya Sen'));
    fireEvent.click(screen.getByRole('button', { name: '₹200' }));

    const payBtn = screen.getByRole('button', { name: /Pay ₹200 via UPI/i });
    expect(payBtn).toBeInTheDocument();
    fireEvent.click(payBtn);

    // Step 3: Tip Initiated & Google Review
    expect(screen.getByText('₹200 Tip Initiated!')).toBeInTheDocument();
    expect(
      screen.getByText(/Directly into Ananya Sen's verified UPI account/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Enjoyed your meal at The Bombay Canteen\?/i)).toBeInTheDocument();

    // Replay Flow
    const replayBtn = screen.getByRole('button', { name: /Replay Flow/i });
    fireEvent.click(replayBtn);
    expect(screen.getByText('Acrylic Table Placard')).toBeInTheDocument();
  });
});
