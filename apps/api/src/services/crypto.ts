import crypto from 'node:crypto';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

export interface EncryptedVpaResult {
  ciphertext: string; // base64
  iv: string; // base64
  tag: string; // base64
}

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH_BYTES = 12; // 96 bits recommended for AES-GCM
const AUTH_TAG_LENGTH_BYTES = 16; // 128 bits

/**
 * Encrypts a VPA at rest using AES-256-GCM authenticated encryption.
 */
export function encryptVpa(vpa: string, keyHex?: string): EncryptedVpaResult {
  const activeKeyHex = keyHex || env.VPA_ENCRYPTION_KEY;
  const key = Buffer.from(activeKeyHex, 'hex');

  if (key.length !== 32) {
    throw new Error('Encryption key must be exactly 32 bytes (64 hex characters).');
  }

  const iv = crypto.randomBytes(IV_LENGTH_BYTES);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH_BYTES,
  });

  const ciphertext = Buffer.concat([cipher.update(vpa.trim(), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    ciphertext: ciphertext.toString('base64'),
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
  };
}

/**
 * Decrypts a VPA using the primary key, automatically falling back to
 * VPA_ENCRYPTION_KEY_PREV if configured to support zero-downtime key rotation.
 */
export function decryptVpa(data: { ciphertext: string; iv: string; tag: string }): string {
  const { ciphertext, iv, tag } = data;
  const ivBuffer = Buffer.from(iv, 'base64');
  const tagBuffer = Buffer.from(tag, 'base64');
  const ciphertextBuffer = Buffer.from(ciphertext, 'base64');

  // Attempt decryption with primary key
  try {
    return decryptWithKey(ciphertextBuffer, ivBuffer, tagBuffer, env.VPA_ENCRYPTION_KEY);
  } catch (primaryError) {
    // If fallback key is configured, attempt decryption with previous key
    if (env.VPA_ENCRYPTION_KEY_PREV && env.VPA_ENCRYPTION_KEY_PREV.trim().length === 64) {
      logger.warn('Primary VPA decryption failed; attempting fallback key');
      try {
        return decryptWithKey(
          ciphertextBuffer,
          ivBuffer,
          tagBuffer,
          env.VPA_ENCRYPTION_KEY_PREV.trim(),
        );
      } catch {
        // Fallthrough to throw error
      }
    }

    logger.error({ error: primaryError }, 'VPA decryption failed authentication tag verification');
    throw new Error('Failed to decrypt VPA. Data may be corrupted or tampered with.');
  }
}

function decryptWithKey(ciphertext: Buffer, iv: Buffer, tag: Buffer, keyHex: string): string {
  const key = Buffer.from(keyHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH_BYTES,
  });

  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString('utf8');
}

/**
 * Masks a VPA for safe display in administrative listings.
 * e.g., 'ramesh.kumar@okaxis' -> 'r***r@okaxis'
 *       'priya@hdfcbank' -> 'p***a@hdfcbank'
 *       'ab@ok' -> 'a***@ok'
 */
export function maskVpa(vpa: string): string {
  const parts = vpa.trim().split('@');
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return '***@***';
  }

  const [handle, psp] = parts;
  if (handle.length <= 2) {
    return `${handle[0]}***@${psp}`;
  }

  const firstChar = handle[0];
  const lastChar = handle[handle.length - 1];
  return `${firstChar}***${lastChar}@${psp}`;
}

/**
 * Re-encrypts a VPA under the primary key (used during key rotation jobs).
 */
export function reEncryptVpa(data: {
  ciphertext: string;
  iv: string;
  tag: string;
}): EncryptedVpaResult {
  const plaintext = decryptVpa(data);
  return encryptVpa(plaintext);
}
