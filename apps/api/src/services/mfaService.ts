import { generateSecret, generateURI, verifySync } from 'otplib';
import crypto from 'node:crypto';
import { hashToken, timingSafeHashMatch } from '../utils/authCrypto.js';

export interface MfaSetupResult {
  secret: string;
  otpauthUrl: string;
}

export interface RecoveryCodesResult {
  plainCodes: string[];
  hashedCodes: string[];
}

export class MfaService {
  /**
   * Generates a new Base32 TOTP secret and otpauth URL for QR codes.
   */
  generateMfaSecret(issuer: string, userEmail: string): MfaSetupResult {
    const secret = generateSecret();
    const otpauthUrl = generateURI({
      issuer,
      label: userEmail,
      secret,
    });

    return { secret, otpauthUrl };
  }

  /**
   * Verifies a 6-digit TOTP code against a secret.
   */
  verifyTotpCode(code: string, secret: string): boolean {
    const cleanCode = code.trim().replace(/\s+/g, '');
    if (!/^\d{6}$/.test(cleanCode)) {
      return false;
    }
    try {
      const result = verifySync({ token: cleanCode, secret });
      return result.valid;
    } catch {
      return false;
    }
  }

  /**
   * Generates a batch of single-use recovery codes.
   * Format: 'ABCD-EFGH'
   */
  generateRecoveryCodes(count = 8): RecoveryCodesResult {
    const plainCodes: string[] = [];
    const hashedCodes: string[] = [];

    for (let i = 0; i < count; i++) {
      const raw = crypto.randomBytes(4).toString('hex').toUpperCase();
      const formatted = `${raw.slice(0, 4)}-${raw.slice(4, 8)}`;
      plainCodes.push(formatted);
      hashedCodes.push(hashToken(raw));
    }

    return { plainCodes, hashedCodes };
  }

  /**
   * Verifies and consumes a recovery code against stored hashes.
   * If valid, returns the remaining hashes with the used code removed.
   */
  verifyAndConsumeRecoveryCode(
    inputCode: string,
    storedHashedCodes: string[],
  ): { isValid: boolean; remainingHashedCodes: string[] } {
    const cleanCode = inputCode.trim().replace(/[-\s]/g, '').toUpperCase();
    const inputHash = hashToken(cleanCode);

    const matchIndex = storedHashedCodes.findIndex((storedHash) =>
      timingSafeHashMatch(inputHash, storedHash),
    );

    if (matchIndex === -1) {
      return { isValid: false, remainingHashedCodes: storedHashedCodes };
    }

    // Single-use: remove the matched code
    const remainingHashedCodes = [
      ...storedHashedCodes.slice(0, matchIndex),
      ...storedHashedCodes.slice(matchIndex + 1),
    ];

    return { isValid: true, remainingHashedCodes };
  }
}

export const mfaService = new MfaService();
