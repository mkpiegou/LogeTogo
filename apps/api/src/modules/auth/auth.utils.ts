import * as crypto from 'crypto';

export function generateVerificationToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function generateRefreshToken(): string {
  return crypto.randomBytes(64).toString('hex');
}
