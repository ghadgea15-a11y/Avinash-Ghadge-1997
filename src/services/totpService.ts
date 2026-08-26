import QRCode from 'qrcode';

/**
 * TOTP Configuration Options based on RFC 6238 & RFC 4226
 */
export interface TotpOptions {
  /** Time-step duration in seconds (default: 30) */
  period?: number;
  /** Number of digits in generated code (default: 6) */
  digits?: number;
  /** Cryptographic hash algorithm (default: 'SHA-1') */
  algorithm?: 'SHA-1' | 'SHA-256' | 'SHA-512';
}

/**
 * Parameters to generate a new MFA setup payload
 */
export interface GenerateMfaSetupParams {
  /** Account identifier / email address */
  accountName: string;
  /** Organization or Application name (default: 'Log Sheet Muster') */
  issuer?: string;
  /** Secret length in bytes before Base32 encoding (default: 20 bytes / 160 bits for SHA-1) */
  secretBytesLength?: number;
  /** Options for TOTP generation */
  options?: TotpOptions;
}

/**
 * TOTP Setup details generated for user enrollment
 */
export interface TotpSetupResult {
  /** Raw unpadded Base32-encoded secret */
  secret: string;
  /** Formatted Base32 secret grouped in 4-character chunks for manual user entry */
  formattedSecret: string;
  /** Standard otpauth:// URI for authenticator applications */
  otpAuthUri: string;
  /** High-resolution Base64 PNG Data URL of the QR code */
  qrCodeDataUrl: string;
  /** SVG markup string for vector QR rendering */
  qrCodeSvg: string;
  /** Pre-generated cryptographically secure backup recovery codes */
  backupCodes: string[];
  /** Configured period in seconds */
  period: number;
  /** Configured digits */
  digits: number;
  /** Hash algorithm */
  algorithm: 'SHA-1' | 'SHA-256' | 'SHA-512';
}

/**
 * Verification result with timing metadata
 */
export interface TotpVerificationResult {
  /** Whether the code was successfully verified */
  isValid: boolean;
  /** Time step delta (0 = current window, -1 = previous window, 1 = next window) */
  delta?: number;
  /** Error message if verification failed */
  error?: string;
}

// RFC 4648 Base32 Alphabet
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/**
 * Converts a byte Uint8Array to a Base32 string (RFC 4648)
 */
export function encodeBase32(buffer: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let output = '';

  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;

    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
}

/**
 * Decodes a Base32 string (RFC 4648) to a Uint8Array
 */
export function decodeBase32(base32: string): Uint8Array {
  // Clean input: remove spaces, dashes, and convert to uppercase
  const clean = base32.replace(/[\s=-]/g, '').toUpperCase();
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (let i = 0; i < clean.length; i++) {
    const idx = BASE32_ALPHABET.indexOf(clean[i]);
    if (idx === -1) {
      throw new Error(`Invalid Base32 character encountered: '${clean[i]}'`);
    }

    value = (value << 5) | idx;
    bits += 5;

    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return new Uint8Array(bytes);
}

/**
 * Formats a Base32 secret string into 4-character blocks for readability
 * e.g., "JBSWY3DPEHPK3PXP" -> "JBSW Y3DP EHPK 3PXP"
 */
export function formatSecretKey(secret: string): string {
  const clean = secret.replace(/[\s-]/g, '').toUpperCase();
  return clean.match(/.{1,4}/g)?.join(' ') || clean;
}

/**
 * Service providing RFC 6238 TOTP secrets generation, QR code rendering,
 * and cryptographic validation using the Web Crypto API.
 */
export class TotpService {
  private static readonly DEFAULT_ISSUER = 'Log Sheet Muster';
  private static readonly DEFAULT_PERIOD = 30;
  private static readonly DEFAULT_DIGITS = 6;
  private static readonly DEFAULT_ALGORITHM: 'SHA-1' | 'SHA-256' | 'SHA-512' = 'SHA-1';

  /**
   * Generates a cryptographically secure random Base32 secret key.
   * @param byteLength Number of random bytes (default: 20 bytes = 160 bits, standard for SHA-1 TOTP)
   */
  public static generateSecret(byteLength: number = 20): string {
    const randomBytes = new Uint8Array(byteLength);
    if (typeof window !== 'undefined' && window.crypto) {
      window.crypto.getRandomValues(randomBytes);
    } else if (typeof globalThis !== 'undefined' && globalThis.crypto) {
      globalThis.crypto.getRandomValues(randomBytes);
    } else {
      throw new Error('Cryptographically secure PRNG (Web Crypto) is not available.');
    }
    return encodeBase32(randomBytes);
  }

  /**
   * Generates cryptographically secure alphanumeric backup recovery codes.
   * @param count Number of codes to generate (default: 8)
   * @param length Character length of each code (default: 10)
   */
  public static generateBackupCodes(count: number = 8, length: number = 10): string[] {
    const charset = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // excludes ambiguous chars 0, 1, I, O
    const codes: string[] = [];
    const randomBuffer = new Uint8Array(length);

    for (let i = 0; i < count; i++) {
      if (typeof window !== 'undefined' && window.crypto) {
        window.crypto.getRandomValues(randomBuffer);
      } else {
        globalThis.crypto.getRandomValues(randomBuffer);
      }

      let code = '';
      for (let j = 0; j < length; j++) {
        code += charset[randomBuffer[j] % charset.length];
      }
      // Group as e.g. "ABCD-EFGH-JK"
      const grouped = code.match(/.{1,4}/g)?.join('-') || code;
      codes.push(grouped);
    }

    return codes;
  }

  /**
   * Constructs the standard otpauth:// URI for authenticator applications (Google Authenticator, etc.)
   */
  public static generateOtpAuthUri(
    secret: string,
    accountName: string,
    issuer: string = this.DEFAULT_ISSUER,
    options?: TotpOptions
  ): string {
    const period = options?.period || this.DEFAULT_PERIOD;
    const digits = options?.digits || this.DEFAULT_DIGITS;
    const algorithm = (options?.algorithm || this.DEFAULT_ALGORITHM).toUpperCase().replace('-', '');

    const cleanSecret = secret.replace(/[\s-]/g, '').toUpperCase();
    const encodedIssuer = encodeURIComponent(issuer.trim());
    const encodedAccount = encodeURIComponent(accountName.trim());
    const label = `${encodedIssuer}:${encodedAccount}`;

    return `otpauth://totp/${label}?secret=${cleanSecret}&issuer=${encodedIssuer}&algorithm=${algorithm}&digits=${digits}&period=${period}`;
  }

  /**
   * Generates a QR Code as a high-resolution Base64 PNG Data URL from an otpauth:// URI.
   */
  public static async generateQRCodeDataUrl(
    otpAuthUri: string,
    qrOptions?: { width?: number; margin?: number; darkColor?: string; lightColor?: string }
  ): Promise<string> {
    return QRCode.toDataURL(otpAuthUri, {
      width: qrOptions?.width || 280,
      margin: qrOptions?.margin ?? 2,
      errorCorrectionLevel: 'M',
      color: {
        dark: qrOptions?.darkColor || '#0f172a',
        light: qrOptions?.lightColor || '#ffffff',
      },
    });
  }

  /**
   * Generates a QR Code as vector SVG markup.
   */
  public static async generateQRCodeSvg(
    otpAuthUri: string,
    qrOptions?: { width?: number; margin?: number; darkColor?: string; lightColor?: string }
  ): Promise<string> {
    return QRCode.toString(otpAuthUri, {
      type: 'svg',
      width: qrOptions?.width || 280,
      margin: qrOptions?.margin ?? 2,
      errorCorrectionLevel: 'M',
      color: {
        dark: qrOptions?.darkColor || '#0f172a',
        light: qrOptions?.lightColor || '#ffffff',
      },
    });
  }

  /**
   * All-in-one generator for setting up MFA on an account.
   * Produces secret, formatted secret, otpauth URI, QR code Data URL & SVG, and backup codes.
   */
  public static async createMfaSetup(params: GenerateMfaSetupParams): Promise<TotpSetupResult> {
    const issuer = params.issuer || this.DEFAULT_ISSUER;
    const period = params.options?.period || this.DEFAULT_PERIOD;
    const digits = params.options?.digits || this.DEFAULT_DIGITS;
    const algorithm = params.options?.algorithm || this.DEFAULT_ALGORITHM;

    // Generate secret
    const secret = this.generateSecret(params.secretBytesLength || 20);
    const formattedSecret = formatSecretKey(secret);

    // Build standard URI
    const otpAuthUri = this.generateOtpAuthUri(secret, params.accountName, issuer, {
      period,
      digits,
      algorithm,
    });

    // Generate QR Code formats
    const [qrCodeDataUrl, qrCodeSvg] = await Promise.all([
      this.generateQRCodeDataUrl(otpAuthUri),
      this.generateQRCodeSvg(otpAuthUri),
    ]);

    // Generate 8 backup recovery codes
    const backupCodes = this.generateBackupCodes(8, 8);

    return {
      secret,
      formattedSecret,
      otpAuthUri,
      qrCodeDataUrl,
      qrCodeSvg,
      backupCodes,
      period,
      digits,
      algorithm,
    };
  }

  /**
   * Calculates the remaining seconds before the current TOTP step code changes.
   * Useful for real-time countdown progress meters.
   */
  public static getTimeRemaining(period: number = this.DEFAULT_PERIOD): {
    secondsRemaining: number;
    progressPercentage: number;
  } {
    const epochSeconds = Math.floor(Date.now() / 1000);
    const secondsRemaining = period - (epochSeconds % period);
    const progressPercentage = (secondsRemaining / period) * 100;
    return { secondsRemaining, progressPercentage };
  }

  /**
   * Generates the RFC 6238 TOTP code for a given timestamp using Web Crypto HMAC.
   */
  public static async generateCode(
    secret: string,
    timestampMs: number = Date.now(),
    options?: TotpOptions
  ): Promise<string> {
    const period = options?.period || this.DEFAULT_PERIOD;
    const digits = options?.digits || this.DEFAULT_DIGITS;
    const algorithmName = options?.algorithm || this.DEFAULT_ALGORITHM;

    const counter = Math.floor(timestampMs / 1000 / period);
    return this.generateHOTP(secret, counter, digits, algorithmName);
  }

  /**
   * Verifies an input TOTP token against a secret with clock-drift window tolerance.
   * @param token The 6-digit code entered by user
   * @param secret The user's Base32 secret
   * @param windowSteps Allowed clock skew steps (default: 1 step = ±30s)
   * @param options TOTP configuration options
   */
  public static async verifyCode(
    token: string,
    secret: string,
    windowSteps: number = 1,
    options?: TotpOptions
  ): Promise<TotpVerificationResult> {
    const cleanToken = token.replace(/\s+/g, '');
    const expectedDigits = options?.digits || this.DEFAULT_DIGITS;

    if (!cleanToken || cleanToken.length !== expectedDigits || !/^\d+$/.test(cleanToken)) {
      return {
        isValid: false,
        error: `Code must be exactly ${expectedDigits} numeric digits.`,
      };
    }

    try {
      const period = options?.period || this.DEFAULT_PERIOD;
      const algorithm = options?.algorithm || this.DEFAULT_ALGORITHM;
      const currentCounter = Math.floor(Date.now() / 1000 / period);

      // Test counter across the allowed window: [-windowSteps, ..., +windowSteps]
      for (let delta = -windowSteps; delta <= windowSteps; delta++) {
        const candidateCounter = currentCounter + delta;
        const candidateCode = await this.generateHOTP(secret, candidateCounter, expectedDigits, algorithm);

        if (this.timingSafeEqual(cleanToken, candidateCode)) {
          return {
            isValid: true,
            delta,
          };
        }
      }

      return {
        isValid: false,
        error: 'Invalid verification code or code has expired.',
      };
    } catch (err: any) {
      return {
        isValid: false,
        error: err?.message || 'Failed to verify token.',
      };
    }
  }

  /**
   * Low-level RFC 4226 HOTP generator using Web Crypto API
   */
  private static async generateHOTP(
    secret: string,
    counter: number,
    digits: number,
    algorithm: 'SHA-1' | 'SHA-256' | 'SHA-512'
  ): Promise<string> {
    const keyBytes = decodeBase32(secret);

    // Convert 64-bit integer counter to 8-byte big-endian buffer
    const counterBuffer = new ArrayBuffer(8);
    const counterView = new DataView(counterBuffer);
    // Since JS numbers are double precision floats up to 2^53 - 1, we write high 32 and low 32 bits
    const high = Math.floor(counter / 0x100000000);
    const low = counter >>> 0;
    counterView.setUint32(0, high, false);
    counterView.setUint32(4, low, false);

    // Web Crypto subtle HMAC import
    const cryptoSubtle = (typeof window !== 'undefined' ? window.crypto?.subtle : null) || globalThis.crypto?.subtle;
    if (!cryptoSubtle) {
      throw new Error('Web Crypto subtle API is required for TOTP calculation.');
    }

    const hashName = algorithm === 'SHA-1' ? 'SHA-1' : algorithm === 'SHA-256' ? 'SHA-256' : 'SHA-512';

    const cryptoKey = await cryptoSubtle.importKey(
      'raw',
      keyBytes.buffer.slice(keyBytes.byteOffset, keyBytes.byteOffset + keyBytes.byteLength) as ArrayBuffer,
      { name: 'HMAC', hash: { name: hashName } },
      false,
      ['sign']
    );

    const hmacSignature = await cryptoSubtle.sign('HMAC', cryptoKey, counterBuffer);
    const hmacBytes = new Uint8Array(hmacSignature);

    // RFC 4226 Dynamic Truncation:
    // Extract low 4 bits of the last byte to use as offset
    const offset = hmacBytes[hmacBytes.length - 1] & 0x0f;

    // Generate 4-byte dynamic binary code (masking MSB for 31-bit integer)
    const binary =
      ((hmacBytes[offset] & 0x7f) << 24) |
      ((hmacBytes[offset + 1] & 0xff) << 16) |
      ((hmacBytes[offset + 2] & 0xff) << 8) |
      (hmacBytes[offset + 3] & 0xff);

    // Modulo 10^digits
    const otp = binary % Math.pow(10, digits);

    // Left pad with zeros to specified digits length
    return otp.toString().padStart(digits, '0');
  }

  /**
   * Constant-time comparison helper to mitigate side-channel timing attacks
   */
  private static timingSafeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }
    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0;
  }
}
