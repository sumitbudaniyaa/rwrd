import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DemoRequestForm } from '../src/components/DemoRequestForm.js';

describe('DemoRequestForm Component (M5-T04)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders all form input fields and labels', () => {
    render(<DemoRequestForm />);

    expect(screen.getByLabelText(/Restaurant \/ Outlet Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^City/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Your Name \/ Title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Work Email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Phone \/ WhatsApp Number/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Dining Table Count/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Special Requirements \/ Current POS/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Digital Personal Data Protection \(DPDP\) Act 2023/i),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Schedule Free Demo/i })).toBeInTheDocument();
  });

  it('displays client-side validation errors when required fields are empty', async () => {
    render(<DemoRequestForm />);

    const submitBtn = screen.getByRole('button', { name: /Schedule Free Demo/i });
    fireEvent.click(submitBtn);

    expect(
      await screen.findByText(/Restaurant name must be at least 2 characters/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/City is required/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Contact person name must be at least 2 characters/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Please enter a valid business email address/i)).toBeInTheDocument();
    expect(screen.getByText(/Please enter a valid 10-digit phone number/i)).toBeInTheDocument();
    expect(
      screen.getByText(/You must agree to the DPDP privacy policy to proceed/i),
    ).toBeInTheDocument();
  });

  it('handles server submission error gracefully (RFC 7807 problem details)', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 429,
      json: async () => ({
        type: 'https://api.tiptable.in/errors/rate-limit-exceeded',
        title: 'Too Many Requests',
        status: 429,
        detail: 'Rate limit exceeded for lead submissions from this IP address.',
      }),
    });

    render(<DemoRequestForm />);

    fireEvent.change(screen.getByLabelText(/Restaurant \/ Outlet Name/i), {
      target: { value: 'Bombay Canteen' },
    });
    fireEvent.change(screen.getByLabelText(/^City/i), {
      target: { value: 'Mumbai' },
    });
    fireEvent.change(screen.getByLabelText(/Your Name \/ Title/i), {
      target: { value: 'Sameer Seth' },
    });
    fireEvent.change(screen.getByLabelText(/Work Email/i), {
      target: { value: 'sameer@bombaycanteen.in' },
    });
    fireEvent.change(screen.getByLabelText(/Phone \/ WhatsApp Number/i), {
      target: { value: '+919876543210' },
    });
    fireEvent.click(screen.getByRole('checkbox'));

    const submitBtn = screen.getByRole('button', { name: /Schedule Free Demo/i });
    fireEvent.click(submitBtn);

    expect(
      await screen.findByText(/Rate limit exceeded for lead submissions from this IP address/i),
    ).toBeInTheDocument();
  });

  it('submits valid lead data to POST /api/v1/public/leads and displays success confirmation', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => ({
        message:
          'Demo request received. Our restaurant partnerships team will contact you shortly.',
        lead: {
          id: 'lead-test-123',
          restaurantName: 'The Bombay Canteen',
          city: 'Mumbai',
        },
      }),
    });
    global.fetch = fetchMock;

    render(<DemoRequestForm />);

    fireEvent.change(screen.getByLabelText(/Restaurant \/ Outlet Name/i), {
      target: { value: 'The Bombay Canteen' },
    });
    fireEvent.change(screen.getByLabelText(/^City/i), {
      target: { value: 'Mumbai' },
    });
    fireEvent.change(screen.getByLabelText(/Your Name \/ Title/i), {
      target: { value: 'Sameer Seth' },
    });
    fireEvent.change(screen.getByLabelText(/Work Email/i), {
      target: { value: 'sameer@bombaycanteen.in' },
    });
    fireEvent.change(screen.getByLabelText(/Phone \/ WhatsApp Number/i), {
      target: { value: '+919876543210' },
    });
    fireEvent.change(screen.getByLabelText(/Dining Table Count/i), {
      target: { value: '25-50' },
    });
    fireEvent.change(screen.getByLabelText(/Special Requirements \/ Current POS/i), {
      target: { value: 'Need POSist integration guidance' },
    });
    fireEvent.click(screen.getByRole('checkbox'));

    const submitBtn = screen.getByRole('button', { name: /Schedule Free Demo/i });
    fireEvent.click(submitBtn);

    // Verify submission payload
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    const call = fetchMock.mock.calls[0];
    expect(call).toBeDefined();
    const [url, options] = call!;
    expect(url).toContain('/api/v1/public/leads');
    expect(options.method).toBe('POST');
    const body = JSON.parse(options.body);
    expect(body).toEqual({
      restaurantName: 'The Bombay Canteen',
      contactName: 'Sameer Seth',
      email: 'sameer@bombaycanteen.in',
      phone: '+919876543210',
      city: 'Mumbai',
      notes: 'Tables: 25-50 | Need POSist integration guidance',
    });

    // Verify success confirmation view
    expect(await screen.findByText(/Demo Walkthrough Requested!/i)).toBeInTheDocument();
    expect(screen.getByText(/The Bombay Canteen/i)).toBeInTheDocument();
    expect(screen.getByText(/within 2 business hours/i)).toBeInTheDocument();

    // Verify reset capability
    const resetBtn = screen.getByRole('button', { name: /Submit another request/i });
    fireEvent.click(resetBtn);

    expect(screen.getByLabelText(/Restaurant \/ Outlet Name/i)).toBeInTheDocument();
  });
});
