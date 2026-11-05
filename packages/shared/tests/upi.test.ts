import { describe, it, expect } from 'vitest';
import { buildUpiDeepLink, parseUpiQrString, VpaSchema } from '../src/schemas/upi.js';

describe('UPI Helpers & Schemas', () => {
  it('validates correct VPA formats', () => {
    expect(() => VpaSchema.parse('ramesh@okaxis')).not.toThrow();
    expect(() => VpaSchema.parse('priya.sharma@hdfcbank')).not.toThrow();
    expect(() => VpaSchema.parse('staff_99@paytm')).not.toThrow();
  });

  it('rejects invalid VPA formats', () => {
    expect(() => VpaSchema.parse('invalid-vpa')).toThrow();
    expect(() => VpaSchema.parse('@axis')).toThrow();
    expect(() => VpaSchema.parse('ramesh@')).toThrow();
    expect(() => VpaSchema.parse('ramesh @okaxis')).toThrow();
  });

  it('builds standard UPI deep link', () => {
    const link = buildUpiDeepLink({
      vpa: 'ramesh@okaxis',
      payeeName: 'Ramesh Kumar',
      amountInr: 100,
      transactionNote: 'Tip for Ramesh',
    });

    expect(link).toContain('upi://pay?');
    expect(link).toContain('pa=ramesh%40okaxis');
    expect(link).toContain('pn=Ramesh+Kumar');
    expect(link).toContain('am=100');
    expect(link).toContain('cu=INR');
    expect(link).toContain('tn=Tip+for+Ramesh');
  });

  it('throws error for non-positive amount in UPI deep link', () => {
    expect(() =>
      buildUpiDeepLink({
        vpa: 'ramesh@okaxis',
        payeeName: 'Ramesh',
        amountInr: 0,
      }),
    ).toThrow('Tip amount must be greater than zero.');
  });

  it('parses raw UPI QR string', () => {
    const rawQr = 'upi://pay?pa=waiter@okaxis&pn=Waiter+One&cu=INR';
    const parsed = parseUpiQrString(rawQr);

    expect(parsed).toEqual({
      vpa: 'waiter@okaxis',
      payeeName: 'Waiter One',
    });
  });

  it('returns null for non-UPI QR string', () => {
    expect(parseUpiQrString('https://google.com')).toBeNull();
    expect(parseUpiQrString('upi://invalid')).toBeNull();
  });
});
