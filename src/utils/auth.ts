import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { createHash, timingSafeEqual } from "crypto";

// Environment variables
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";
const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_EXPIRY = "7d";

/**
 * Normalize email address (lowercase, trim)
 */
export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

/**
 * Hash password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
}

/** bcrypt modular crypt format (e.g. $2b$12$...) */
function isBcryptHash(stored: string): boolean {
  return /^\$2[aby]\$\d{2}\$[./0-9A-Za-z]{53}$/.test(stored);
}

/**
 * Legacy rows may have stored the raw password in `passwordHash`. Compare without leaking length
 * via early return (digest comparison is fixed length).
 */
function legacyPlaintextPasswordMatches(password: string, storedPlaintext: string): boolean {
  const a = createHash("sha256").update(password, "utf8").digest();
  const b = createHash("sha256").update(storedPlaintext, "utf8").digest();
  return timingSafeEqual(a, b);
}

export type VerifyPasswordResult = { ok: boolean; needsRehash: boolean };

/**
 * Verify password against stored value. `stored` must be either a bcrypt hash or (legacy) plaintext.
 * When legacy plaintext matches, `needsRehash` is true — persist `hashPassword(password)` on login.
 */
export async function verifyPasswordResult(
  password: string,
  stored: string,
): Promise<VerifyPasswordResult> {
  if (isBcryptHash(stored)) {
    const ok = await bcrypt.compare(password, stored);
    return { ok, needsRehash: false };
  }
  const ok = legacyPlaintextPasswordMatches(password, stored);
  return { ok, needsRehash: ok };
}

/**
 * Verify password against stored hash or legacy plaintext.
 */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  return (await verifyPasswordResult(password, stored)).ok;
}

/**
 * Hash token using SHA-256
 */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Generate JWT access and refresh tokens
 */
export function generateTokens(userId: string): { accessToken: string; refreshToken: string } {
  const accessToken = jwt.sign({ userId, type: "access" }, JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });

  const refreshToken = jwt.sign({ userId, type: "refresh" }, JWT_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRY,
  });

  return { accessToken, refreshToken };
}

/**
 * Calculate refresh token expiration date
 */
export function getRefreshTokenExpiry(): Date {
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + 7); // 7 days
  return expiry;
}

/**
 * Validate access JWT; returns userId or null (expired / invalid).
 */
export function verifyAccessToken(token: string): { userId: string } | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId?: string; type?: string };
    if (payload.type !== "access" || typeof payload.userId !== "string") return null;
    return { userId: payload.userId };
  } catch {
    return null;
  }
}

export function extractBearerUserId(header: string | undefined): string | null {
  if (!header) return null;
  const match = /^Bearer\s+(\S+)/i.exec(header.trim());
  const token = match?.[1]?.trim();
  if (!token) return null;
  return verifyAccessToken(token)?.userId ?? null;
}

/**
 * Validate refresh JWT; returns userId or null (expired / invalid).
 */
export function verifyRefreshToken(token: string): { userId: string } | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId?: string; type?: string };
    if (payload.type !== "refresh" || typeof payload.userId !== "string") return null;
    return { userId: payload.userId };
  } catch {
    return null;
  }
}
