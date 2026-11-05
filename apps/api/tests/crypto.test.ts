import { describe, it, expect } from 'vitest';
import { encryptVpa, decryptVpa, maskVpa, reEncryptVpa } from '../src/services/crypto.js';

describe('VPA AES-256-GCM Encryption Service', () => {
  const testVpa = 'ramesh.kumar@okaxis';

  it('encrypts and decrypts VPA with authenticated integrity', () => {
    const encrypted = encryptVpa(testVpa);
    expect(encrypted.ciphertext).toBeDefined();
    expect(encrypted.iv).toBeDefined();
    expect(encrypted.tag).toBeDefined();

    const decrypted = decryptVpa(encrypted);
    expect(decrypted).toBe(testVpa);
  });

  it('produces unique IV and ciphertext on each invocation for the same plaintext', () => {
    const enc1 = encryptVpa(testVpa);
    const enc2 = encryptVpa(testVpa);

    expect(enc1.iv).not.toBe(enc2.iv);
    expect(enc1.ciphertext).not.toBe(enc2.ciphertext);

    expect(decryptVpa(enc1)).toBe(testVpa);
    expect(decryptVpa(enc2)).toBe(testVpa);
  });

  it('detects tampering in ciphertext and throws', () => {
    const encrypted = encryptVpa(testVpa);
    const tamperedCiphertext = Buffer.from(encrypted.ciphertext, 'base64');
    tamperedCiphertext[0] = (tamperedCiphertext[0] ?? 0) ^ 0xff;

    expect(() =>
      decryptVpa({
        ...encrypted,
        ciphertext: tamperedCiphertext.toString('base64'),
      }),
    ).toThrow('Failed to decrypt VPA');
  });

  it('detects tampering in authentication tag and throws', () => {
    const encrypted = encryptVpa(testVpa);
    const tamperedTag = Buffer.from(encrypted.tag, 'base64');
    tamperedTag[0] = (tamperedTag[0] ?? 0) ^ 0xff;

    expect(() =>
      decryptVpa({
        ...encrypted,
        tag: tamperedTag.toString('base64'),
      }),
    ).toThrow('Failed to decrypt VPA');
  });

  it('masks VPAs for administrative UI display', () => {
    expect(maskVpa('ramesh.kumar@okaxis')).toBe('r***r@okaxis');
    expect(maskVpa('priya@hdfcbank')).toBe('p***a@hdfcbank');
    expect(maskVpa('ab@ok')).toBe('a***@ok');
    expect(maskVpa('invalid')).toBe('***@***');
  });

  it('re-encrypts VPA ciphertext cleanly', () => {
    const original = encryptVpa(testVpa);
    const reEncrypted = reEncryptVpa(original);

    expect(reEncrypted.iv).not.toBe(original.iv);
    expect(decryptVpa(reEncrypted)).toBe(testVpa);
  });
});
