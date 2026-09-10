import crypto from 'crypto';
import path from 'path';
import fs from 'fs';

// --- 1. SECURE PASSWORD HASHING (PBKDF2 SHA-512) ---

/**
 * Hash a plain text password with PBKDF2 and a unique salt.
 * Output format: $pbkdf2$iterations$salt$hash
 */
export function hashPassword(plainText: string): string {
  const iterations = 100000;
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(plainText, salt, iterations, 64, 'sha512').toString('hex');
  return `$pbkdf2$${iterations}$${salt}$${hash}`;
}

/**
 * Verify a plain text password against a stored password (supports both PBKDF2 hash & plain text fallback).
 */
export function verifyPassword(plainText: string, storedPassword?: string): boolean {
  if (!storedPassword || !plainText) return false;

  const trimmedPlain = String(plainText).trim();
  const trimmedStored = String(storedPassword).trim();

  // If stored password is in PBKDF2 format: $pbkdf2$iterations$salt$hash
  if (trimmedStored.startsWith('$pbkdf2$')) {
    const parts = trimmedStored.split('$');
    if (parts.length === 5) {
      const iterations = parseInt(parts[2], 10) || 100000;
      const salt = parts[3];
      const expectedHash = parts[4];

      const computedHash = crypto.pbkdf2Sync(trimmedPlain, salt, iterations, 64, 'sha512').toString('hex');
      try {
        return crypto.timingSafeEqual(
          Buffer.from(computedHash, 'hex'),
          Buffer.from(expectedHash, 'hex')
        );
      } catch {
        return false;
      }
    }
  }

  // Fallback for plain text password comparison
  return trimmedPlain === trimmedStored;
}

// --- 2. BRUTE FORCE / RATE LIMITER (In-Memory) ---

interface RateLimitRecord {
  attempts: number;
  blockedUntil: number;
}

const loginAttempts = new Map<string, RateLimitRecord>();

/**
 * Check if an IP or identifier is currently rate limited.
 * Max 5 failed attempts within 15 minutes window.
 */
export function checkRateLimit(key: string, maxAttempts = 5, lockTimeMs = 15 * 60 * 1000): { isBlocked: boolean; retryAfterMinutes: number } {
  const now = Date.now();
  const record = loginAttempts.get(key);

  if (!record) {
    return { isBlocked: false, retryAfterMinutes: 0 };
  }

  if (record.blockedUntil > now) {
    const retryAfterMinutes = Math.ceil((record.blockedUntil - now) / 60000);
    return { isBlocked: true, retryAfterMinutes };
  }

  if (record.blockedUntil !== 0 && record.blockedUntil <= now) {
    // Lock expired, reset attempts
    loginAttempts.delete(key);
    return { isBlocked: false, retryAfterMinutes: 0 };
  }

  return { isBlocked: false, retryAfterMinutes: 0 };
}

/**
 * Record a failed login attempt.
 */
export function recordFailedAttempt(key: string, maxAttempts = 5, lockTimeMs = 15 * 60 * 1000): void {
  const now = Date.now();
  const record = loginAttempts.get(key) || { attempts: 0, blockedUntil: 0 };

  record.attempts += 1;
  if (record.attempts >= maxAttempts) {
    record.blockedUntil = now + lockTimeMs;
  }
  loginAttempts.set(key, record);
}

/**
 * Reset login attempts after successful authentication.
 */
export function resetLoginAttempts(key: string): void {
  loginAttempts.delete(key);
}

// --- 3. SECURE FILE UPLOAD WHITELIST & HTACCESS ---

// Allowed file extensions (strictly non-executable)
export const ALLOWED_EXTENSIONS = new Set([
  '.jpg', '.jpeg', '.png', '.webp', '.gif',
  '.pdf', '.xlsx', '.xls', '.doc', '.docx',
  '.txt', '.csv', '.zip'
]);

// Allowed MIME types
export const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain', 'text/csv',
  'application/zip', 'application/x-zip-compressed'
]);

/**
 * Validate and sanitize uploaded file extension & filename.
 */
export function sanitizeFilename(originalName: string): { safeName: string; ext: string; isValid: boolean } {
  const cleanBase = path.basename(originalName).replace(/[^a-zA-Z0-9._-]/g, '_');
  const ext = path.extname(cleanBase).toLowerCase();

  const isSafeExt = ALLOWED_EXTENSIONS.has(ext);
  const isDangerous = /\.(php|phtml|php\d|phar|inc|cgi|pl|py|sh|bash|exe|asp|aspx|jsp|svg)$/i.test(originalName);

  if (!isSafeExt || isDangerous) {
    return { safeName: '', ext: '', isValid: false };
  }

  const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
  const safeName = `file-${uniqueSuffix}${ext}`;

  return { safeName, ext, isValid: true };
}

/**
 * Ensure .htaccess is placed inside the uploads directory to prevent PHP execution.
 */
export function protectUploadsDirectory(uploadsDir: string): void {
  try {
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const htaccessPath = path.join(uploadsDir, '.htaccess');
    const htaccessContent = `# Proteksi Eksekusi Script di Direktori Uploads HIJ Apps
<FilesMatch "\\.(php|phtml|php3|php4|php5|php7|phps|phar|inc|cgi|pl|py|sh|bash|exe|asp|aspx|jsp|svg)$">
    Order Allow,Deny
    Deny from all
</FilesMatch>

Options -ExecCGI -Indexes
php_flag engine off
`;

    if (!fs.existsSync(htaccessPath)) {
      fs.writeFileSync(htaccessPath, htaccessContent, 'utf-8');
    }
  } catch (err) {
    console.warn('Could not write uploads .htaccess protection:', err);
  }
}
