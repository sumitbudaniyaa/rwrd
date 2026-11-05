import { describe, it, expect } from 'vitest';
import {
  hashPassword,
  verifyPassword,
  generateSecureToken,
  hashToken,
  timingSafeHashMatch,
} from '../src/utils/authCrypto.js';

describe('Auth Cryptography Utilities (Argon2id & Secure Tokens)', () => {
  const plainPassword = 'CorrectHorseBatteryStaple123!';

  it('hashes password with Argon2id and verifies successfully', async () => {
    const passwordHash = await hashPassword(plainPassword);
    expect(passwordHash).toMatch(/^\$argon2id\$/);

    const isMatch = await verifyPassword(plainPassword, passwordHash);
    expect(isMatch).toBe(true);
  });

  it('rejects incorrect password during verification', async () => {
    const passwordHash = await hashPassword(plainPassword);
    const isMatch = await verifyPassword('WrongPassword123!', passwordHash);
    expect(isMatch).toBe(false);
  });

  it('produces unique hashes for the same password due to random salt', async () => {
    const hash1 = await hashPassword(plainPassword);
    const hash2 = await hashPassword(plainPassword);

    expect(hash1).not.toBe(hash2);
    expect(await verifyPassword(plainPassword, hash1)).toBe(true);
    expect(await verifyPassword(plainPassword, hash2)).toBe(true);
  });

  it('generates high-entropy URL-safe random tokens', () => {
    const token1 = generateSecureToken(32);
    const token2 = generateSecureToken(32);

    expect(token1).toHaveLength(43); // 32 bytes in base64url is 43 characters
    expect(token1).not.toBe(token2);
    expect(token1).toMatch(/^[a-zA-Z0-9_-]+$/);
  });

  it('produces deterministic SHA-256 token hash', () => {
    const token = 'sample_refresh_token_value_abc_123';
    const hash1 = hashToken(token);
    const hash2 = hashToken(token);

    expect(hash1).toHaveLength(64); // SHA-256 hex is 64 characters
    expect(hash1).toBe(hash2);
  });

  it('matches hashes with timing-safe comparison', () => {
    const hashA = hashToken('test_token_a');
    const hashB = hashToken('test_token_b');

    expect(timingSafeHashMatch(hashA, hashA)).toBe(true);
    expect(timingSafeHashMatch(hashA, hashB)).toBe(false);
    expect(timingSafeHashMatch(hashA, 'short')).toBe(false);
  });
});
