import { z } from 'zod';
import { CURRENCY, VPA_REGEX } from '../constants/limits.js';

export const VpaSchema = z
  .string()
  .trim()
  .min(3, 'VPA is too short')
  .max(128, 'VPA is too long')
  .regex(VPA_REGEX, 'Invalid UPI VPA format. Must be format: handle@bank (e.g., ramesh@okaxis)');

export interface BuildUpiDeepLinkOptions {
  vpa: string;
  payeeName: string;
  amountInr: number;
  transactionNote?: string;
}

/**
 * Builds standard UPI deep link for mobile payment apps.
 * Format: upi://pay?pa=<VPA>&pn=<name>&am=<amount>&cu=INR&tn=<note>
 */
export function buildUpiDeepLink(options: BuildUpiDeepLinkOptions): string {
  const { vpa, payeeName, amountInr, transactionNote } = options;

  // Validate VPA format before constructing URI
  VpaSchema.parse(vpa);

  if (amountInr <= 0) {
    throw new Error('Tip amount must be greater than zero.');
  }

  const queryParams = new URLSearchParams();
  queryParams.set('pa', vpa.trim());
  queryParams.set('pn', payeeName.trim());
  queryParams.set('am', amountInr.toString());
  queryParams.set('cu', CURRENCY);

  if (transactionNote && transactionNote.trim().length > 0) {
    queryParams.set('tn', transactionNote.trim().slice(0, 80));
  }

  return `upi://pay?${queryParams.toString()}`;
}

/**
 * Parses a raw scanned UPI QR code string to extract the VPA and Payee Name.
 */
export function parseUpiQrString(rawQr: string): { vpa: string; payeeName?: string } | null {
  try {
    if (!rawQr.startsWith('upi://pay')) {
      return null;
    }
    const url = new URL(rawQr);
    const pa = url.searchParams.get('pa');
    if (!pa || !VPA_REGEX.test(pa)) {
      return null;
    }
    const pn = url.searchParams.get('pn');
    if (pn && pn.trim().length > 0) {
      return { vpa: pa.trim(), payeeName: pn.trim() };
    }
    return { vpa: pa.trim() };
  } catch {
    return null;
  }
}
