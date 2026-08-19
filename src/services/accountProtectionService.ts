import { db } from '../firebase';
import { doc, getDoc, setDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { SecuritySeverity, UserSession } from '../types';
import { SecurityAuditService } from './securityAuditService';

export interface AccountLockRecord {
  identifier: string; // email or employeeId
  companyId: string;
  failedCount: number;
  lastFailedAt: string;
  lockedUntil?: string | null;
  isLocked: boolean;
  lockReason?: string;
}

export interface FailedActionTracker {
  sessionKey: string;
  actions: { timestamp: number; action: string; resource: string }[];
}

export class AccountProtectionService {
  private static readonly MAX_FAILED_LOGINS = 5;
  private static readonly LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
  private static readonly FAILED_ACTION_THRESHOLD = 5;
  private static readonly FAILED_ACTION_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

  // In-memory cache for fast rate-limiting resilience
  private static localLockMemory: Map<string, { count: number; lastFailed: number; lockedUntil: number }> = new Map();
  private static failedActionMemory: Map<string, { timestamp: number; action: string; resource: string }[]> = new Map();

  /**
   * Generates a sanitized lookup key
   */
  private static getLockKey(companyId: string, identifier: string): string {
    const cleanCompany = (companyId || 'GLOBAL').trim().toUpperCase();
    const cleanId = (identifier || 'UNKNOWN').trim().toLowerCase().replace(/[^a-z0-9_@.-]/g, '_');
    return `${cleanCompany}___${cleanId}`;
  }

  /**
   * Checks if an account/identifier is currently locked out due to repeated failed logins.
   */
  public static async isAccountLocked(companyId: string, identifier: string): Promise<{ locked: boolean; remainingMinutes?: number; reason?: string }> {
    const key = this.getLockKey(companyId, identifier);
    const now = Date.now();

    // 1. Check local memory first
    const mem = this.localLockMemory.get(key);
    if (mem && mem.lockedUntil > now) {
      const remainingMinutes = Math.ceil((mem.lockedUntil - now) / (60 * 1000));
      return {
        locked: true,
        remainingMinutes,
        reason: `Account is temporarily locked due to multiple failed login attempts. Please try again in ${remainingMinutes} minute(s).`
      };
    } else if (mem && mem.lockedUntil <= now && mem.lockedUntil > 0) {
      // Lock expired
      this.localLockMemory.delete(key);
    }

    // 2. Check Firestore lock document if online
    try {
      const lockDocRef = doc(db, 'companies', companyId || 'GLOBAL', 'account_locks', key);
      const snap = await getDoc(lockDocRef);
      if (snap.exists()) {
        const data = snap.data() as AccountLockRecord;
        if (data.isLocked && data.lockedUntil) {
          const lockedUntilTs = new Date(data.lockedUntil).getTime();
          if (lockedUntilTs > now) {
            const remainingMinutes = Math.ceil((lockedUntilTs - now) / (60 * 1000));
            // Cache locally
            this.localLockMemory.set(key, {
              count: data.failedCount || this.MAX_FAILED_LOGINS,
              lastFailed: new Date(data.lastFailedAt).getTime(),
              lockedUntil: lockedUntilTs
            });
            return {
              locked: true,
              remainingMinutes,
              reason: `Account is temporarily locked due to multiple failed login attempts. Please try again in ${remainingMinutes} minute(s).`
            };
          }
        }
      }
    } catch {
      // Fallback gracefully to in-memory state if Firestore query fails
    }

    return { locked: false };
  }

  /**
   * Records a failed login attempt and applies progressive lockout / severity escalation.
   */
  public static async recordFailedLogin(
    companyId: string,
    identifier: string,
    ipAddress?: string
  ): Promise<{ locked: boolean; remainingAttempts: number; message: string }> {
    const key = this.getLockKey(companyId, identifier);
    const now = Date.now();

    let mem = this.localLockMemory.get(key);
    if (!mem) {
      mem = { count: 0, lastFailed: now, lockedUntil: 0 };
    }

    // Reset counter if previous attempt was older than lockout duration
    if (now - mem.lastFailed > this.LOCKOUT_DURATION_MS && mem.lockedUntil === 0) {
      mem.count = 0;
    }

    mem.count += 1;
    mem.lastFailed = now;

    let severity: SecuritySeverity = 'LOW';
    if (mem.count >= 4) {
      severity = 'HIGH';
    } else if (mem.count >= 2) {
      severity = 'MEDIUM';
    }

    let isLocked = false;
    let lockedUntilTs = 0;
    let message = 'Invalid email or password. Please verify your login details.';

    if (mem.count >= this.MAX_FAILED_LOGINS) {
      isLocked = true;
      lockedUntilTs = now + this.LOCKOUT_DURATION_MS;
      mem.lockedUntil = lockedUntilTs;
      severity = 'CRITICAL';
      message = 'Account has been temporarily locked due to excessive failed attempts. Please try again in 15 minutes or reset your password.';
    }

    this.localLockMemory.set(key, mem);

    // Asynchronously update Firestore lock record & audit log
    const auditReason = isLocked
      ? `Account locked: ${mem.count} consecutive failed login attempts recorded for ${identifier}.`
      : `Failed login attempt (${mem.count}/${this.MAX_FAILED_LOGINS}) for ${identifier}.`;

    SecurityAuditService.logEvent(
      companyId || 'GLOBAL',
      identifier,
      'UNKNOWN',
      undefined,
      isLocked ? 'ACCOUNT_LOCKOUT' : 'LOGIN_FAILED',
      'authentication',
      identifier,
      false,
      severity,
      auditReason,
      ipAddress
    ).catch(() => {});

    try {
      const lockDocRef = doc(db, 'companies', companyId || 'GLOBAL', 'account_locks', key);
      const lockData: AccountLockRecord = {
        identifier,
        companyId: companyId || 'GLOBAL',
        failedCount: mem.count,
        lastFailedAt: new Date(now).toISOString(),
        isLocked,
        lockedUntil: isLocked ? new Date(lockedUntilTs).toISOString() : null,
        lockReason: isLocked ? auditReason : undefined
      };
      // Clean undefined fields
      const cleanData: any = { ...lockData };
      Object.keys(cleanData).forEach(k => cleanData[k] === undefined && delete cleanData[k]);
      setDoc(lockDocRef, cleanData, { merge: true }).catch(() => {});
    } catch {
      // Non-critical fallback
    }

    const remainingAttempts = Math.max(0, this.MAX_FAILED_LOGINS - mem.count);
    return {
      locked: isLocked,
      remainingAttempts,
      message
    };
  }

  /**
   * Resets failed login counters on successful authentication.
   */
  public static async recordSuccessfulLogin(companyId: string, identifier: string): Promise<void> {
    const key = this.getLockKey(companyId, identifier);
    this.localLockMemory.delete(key);

    try {
      const lockDocRef = doc(db, 'companies', companyId || 'GLOBAL', 'account_locks', key);
      setDoc(lockDocRef, {
        identifier,
        companyId: companyId || 'GLOBAL',
        failedCount: 0,
        lastFailedAt: new Date().toISOString(),
        isLocked: false,
        lockedUntil: null
      }, { merge: true }).catch(() => {});
    } catch {
      // Non-critical
    }
  }

  /**
   * Tracks repeated unauthorized actions within an active session.
   * If user exceeds threshold within rolling window, logs a HIGH severity anomaly.
   */
  public static async recordUnauthorizedAction(
    session: UserSession,
    action: string,
    resource: string,
    reason: string
  ): Promise<{ flagged: boolean; anomalyDetected: boolean }> {
    const sessionKey = `${session.companyId}___${session.userId}`;
    const now = Date.now();

    let history = this.failedActionMemory.get(sessionKey) || [];
    // Prune entries outside rolling window
    history = history.filter(h => now - h.timestamp < this.FAILED_ACTION_WINDOW_MS);
    history.push({ timestamp: now, action, resource });
    this.failedActionMemory.set(sessionKey, history);

    const isThresholdExceeded = history.length >= this.FAILED_ACTION_THRESHOLD;

    if (isThresholdExceeded) {
      await SecurityAuditService.logEvent(
        session.companyId,
        session.userId,
        session.role,
        session.employeeId,
        'SUSPICIOUS_ACTIVITY',
        'ACCOUNT_PROTECTION',
        resource,
        false,
        'CRITICAL',
        `Repeated unauthorized actions detected: ${history.length} violations in 5 minutes (${action} on ${resource}). ${reason}`
      ).catch(() => {});

      return { flagged: true, anomalyDetected: true };
    }

    return { flagged: false, anomalyDetected: false };
  }

  /**
   * Provides safe, sanitized user-facing error message without leaking sensitive internal details.
   */
  public static getSafeErrorMessage(error: any): string {
    if (!error) return 'An unexpected error occurred. Please try again.';

    const msg = typeof error === 'string' ? error : error.message || '';
    const code = error.code || '';

    if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
      return 'Invalid email or password. Please verify your login details.';
    }

    if (code === 'auth/too-many-requests') {
      return 'Access to this account has been temporarily disabled due to many failed login attempts. You can immediately restore it by resetting your password or you can try again later.';
    }

    if (code === 'auth/network-request-failed') {
      return 'Network connection error. Please check your internet connection and try again.';
    }

    if (code === 'auth/popup-blocked') {
      return 'Sign-in popup was blocked by your browser. Please allow popups for this site.';
    }

    if (msg.includes('Account has been temporarily locked') || msg.includes('temporarily locked')) {
      return msg;
    }

    if (msg.includes('Company Code is inactive') || msg.includes('Invalid Company Code')) {
      return msg;
    }

    if (msg.includes('not authorized for company')) {
      return 'You are not authorized to access this company.';
    }

    return 'Authentication failed. Please check your credentials and try again.';
  }
}
