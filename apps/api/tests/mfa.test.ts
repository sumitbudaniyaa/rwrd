import { describe, it, expect } from 'vitest';
import { generateSync } from 'otplib';
import { mfaService } from '../src/services/mfaService.js';

describe('TOTP Multi-Factor Authentication Service', () => {
  it('generates Base32 TOTP secret and keyuri', () => {
    const { secret, otpauthUrl } = mfaService.generateMfaSecret(
      'TipTable',
      'owner@bombaycanteen.in',
    );

    expect(secret).toBeDefined();
    expect(secret.length).toBeGreaterThanOrEqual(16);
    expect(otpauthUrl).toContain('otpauth://totp/');
    expect(otpauthUrl).toContain('secret=' + secret);
    expect(otpauthUrl).toContain('issuer=TipTable');
  });

  it('verifies valid 6-digit TOTP code', () => {
    const { secret } = mfaService.generateMfaSecret('TipTable', 'user@test.com');
    const validToken = generateSync({ secret });

    const isValid = mfaService.verifyTotpCode(validToken, secret);
    expect(isValid).toBe(true);
  });

  it('rejects invalid or malformed TOTP codes', () => {
    const { secret } = mfaService.generateMfaSecret('TipTable', 'user@test.com');

    expect(mfaService.verifyTotpCode('000000', secret)).toBe(false);
    expect(mfaService.verifyTotpCode('abc', secret)).toBe(false);
    expect(mfaService.verifyTotpCode('12345', secret)).toBe(false);
  });

  it('generates recovery codes and consumes them once (single-use)', () => {
    const { plainCodes, hashedCodes } = mfaService.generateRecoveryCodes(8);

    expect(plainCodes).toHaveLength(8);
    expect(hashedCodes).toHaveLength(8);
    expect(plainCodes[0]).toMatch(/^[0-9A-F]{4}-[0-9A-F]{4}$/);

    const codeToUse = plainCodes[0]!;

    // 1st consumption attempt: must succeed
    const firstAttempt = mfaService.verifyAndConsumeRecoveryCode(codeToUse, hashedCodes);
    expect(firstAttempt.isValid).toBe(true);
    expect(firstAttempt.remainingHashedCodes).toHaveLength(7);

    // 2nd consumption attempt with same code: must fail because code was consumed
    const secondAttempt = mfaService.verifyAndConsumeRecoveryCode(
      codeToUse,
      firstAttempt.remainingHashedCodes,
    );
    expect(secondAttempt.isValid).toBe(false);
    expect(secondAttempt.remainingHashedCodes).toHaveLength(7);
  });

  it('handles recovery codes case-insensitively and ignores hyphens', () => {
    const { plainCodes, hashedCodes } = mfaService.generateRecoveryCodes(2);
    const code = plainCodes[0]!;

    // Lowercase without hyphens
    const input = code.replace('-', '').toLowerCase();
    const result = mfaService.verifyAndConsumeRecoveryCode(input, hashedCodes);

    expect(result.isValid).toBe(true);
  });
});
