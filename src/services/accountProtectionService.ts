import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  query, 
  where 
} from 'firebase/firestore';
import { db } from '../firebase';
import { SuperAdminService } from './superAdminService';
import { SecurityAuditService } from './securityAuditService';

export interface AccountLockRecord {
  companyId: string;
  identifier: string;
  failedCount: number;
  lastFailedAt: string;
  locked: boolean;
  lockedUntil: string | null;
  lockReason?: string;
  ipAddress?: string;
  updatedAt: string;
  history?: Array<{
    timestamp: string;
    ipAddress?: string;
    reason: string;
    action: string;
  }>;
}

export interface LockCheckResult {
  locked: boolean;
  remainingMinutes?: number;
  remainingAttempts?: number;
  failedCount?: number;
  reason?: string;
  message?: string;
}

// In-memory cache for deterministic ultra-fast verification & offline resilience
const inMemoryLockStore = new Map<string, AccountLockRecord>();

// Support mocking for tests
let _setDocAPS = setDoc;
export function _setSetDocMockAPS(mock: any) { _setDocAPS = mock; }

let _getDocAPS = getDoc;
export function _setGetDocMockAPS(mock: any) { _getDocAPS = mock; }

let _getDocsAPS = getDocs;
export function _setGetDocsMockAPS(mock: any) { _getDocsAPS = mock; }

export class AccountProtectionService {
  private static readonly MAX_FAILED_ATTEMPTS = 3;
  private static readonly LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
  private static readonly WINDOW_MS = 15 * 60 * 1000; // 15 minutes failure window

  private static getStorageKey(companyId: string, identifier: string): string {
    const cleanComp = (companyId || 'GLOBAL').trim().toUpperCase();
    const cleanId = (identifier || 'UNKNOWN').trim().toLowerCase().replace(/[^a-z0-9@._-]/g, '_');
    return `${cleanComp}__${cleanId}`;
  }

  /**
   * Check if an account is currently locked
   */
  static async isAccountLocked(companyId: string, identifier: string): Promise<LockCheckResult> {
    if (!identifier) return { locked: false, remainingAttempts: this.MAX_FAILED_ATTEMPTS, failedCount: 0 };
    const key = this.getStorageKey(companyId, identifier);
    const now = Date.now();

    try {
      let record = inMemoryLockStore.get(key);

      // Attempt to retrieve from Firestore if not in local cache
      if (!record && db) {
        try {
          const docRef = doc(db, 'companies', companyId, 'account_locks', key);
          const snap = await _getDocAPS(docRef);
          if (snap?.exists()) {
            record = snap.data() as AccountLockRecord;
            inMemoryLockStore.set(key, record);
          }
        } catch {
          // Fallback to inMemoryLockStore
        }
      }

      if (!record) {
        return { locked: false, remainingAttempts: this.MAX_FAILED_ATTEMPTS, failedCount: 0 };
      }

      // Check if lockout period has expired
      if (record.locked && record.lockedUntil) {
        const lockExpiry = new Date(record.lockedUntil).getTime();
        if (now >= lockExpiry) {
          // Lock has expired - auto unlock
          record.locked = false;
          record.lockedUntil = null;
          record.failedCount = 0;
          record.lockReason = undefined;
          record.updatedAt = new Date().toISOString();
          inMemoryLockStore.set(key, record);

          // Update Firestore in background
          this.persistLockRecord(companyId, key, record).catch(() => {});

          return { locked: false, remainingAttempts: this.MAX_FAILED_ATTEMPTS, failedCount: 0 };
        }

        const remainingMs = lockExpiry - now;
        const remainingMinutes = Math.max(1, Math.ceil(remainingMs / 60000));
        const reason = record.lockReason || `Account is temporarily locked due to multiple failed login attempts. Please try again in ${remainingMinutes} minute(s) or contact your Administrator.`;

        return {
          locked: true,
          remainingMinutes,
          remainingAttempts: 0,
          failedCount: record.failedCount,
          reason,
          message: reason
        };
      }

      // Check if failure window expired without lockout
      if (record.lastFailedAt) {
        const lastFailed = new Date(record.lastFailedAt).getTime();
        if (now - lastFailed > this.WINDOW_MS) {
          record.failedCount = 0;
          inMemoryLockStore.set(key, record);
        }
      }

      const remainingAttempts = Math.max(0, this.MAX_FAILED_ATTEMPTS - record.failedCount);
      return {
        locked: false,
        remainingAttempts,
        failedCount: record.failedCount
      };
    } catch (err) {
      console.warn('[AccountProtectionService] isAccountLocked check error:', err);
      return { locked: false, remainingAttempts: this.MAX_FAILED_ATTEMPTS, failedCount: 0 };
    }
  }

  /**
   * Record a failed login attempt with progressive warning & lockout
   */
  static async recordFailedLogin(
    companyId: string, 
    identifier: string, 
    ipAddress?: string
  ): Promise<{ locked: boolean; message: string; remainingAttempts: number; failedCount: number }> {
    const key = this.getStorageKey(companyId, identifier);
    const now = Date.now();
    const nowIso = new Date(now).toISOString();

    let record = inMemoryLockStore.get(key) || {
      companyId,
      identifier,
      failedCount: 0,
      lastFailedAt: nowIso,
      locked: false,
      lockedUntil: null,
      updatedAt: nowIso,
      history: []
    };

    // If lock had expired or failure window expired, reset counter
    if (record.lockedUntil && now >= new Date(record.lockedUntil).getTime()) {
      record.failedCount = 0;
      record.locked = false;
      record.lockedUntil = null;
    } else if (record.lastFailedAt && now - new Date(record.lastFailedAt).getTime() > this.WINDOW_MS) {
      record.failedCount = 0;
    }

    record.failedCount += 1;
    record.lastFailedAt = nowIso;
    record.updatedAt = nowIso;
    record.ipAddress = ipAddress || 'client-web';
    record.history = record.history || [];
    record.history.push({
      timestamp: nowIso,
      ipAddress: record.ipAddress,
      reason: 'INVALID_CREDENTIALS',
      action: 'LOGIN_FAILURE'
    });

    const isLockedNow = record.failedCount >= this.MAX_FAILED_ATTEMPTS;

    if (isLockedNow) {
      record.locked = true;
      record.lockedUntil = new Date(now + this.LOCKOUT_DURATION_MS).toISOString();
      const lockDurationMinutes = Math.round(this.LOCKOUT_DURATION_MS / 60000);
      record.lockReason = `Account temporarily locked for ${lockDurationMinutes} minutes due to ${record.failedCount} consecutive failed login attempts.`;
      
      // Update memory immediately
      inMemoryLockStore.set(key, record);
      await this.persistLockRecord(companyId, key, record);

      // Trigger High / Critical Security Alarm to Super Admin Platform & Tenant Anomaly
      const isBruteForce = record.failedCount > this.MAX_FAILED_ATTEMPTS;
      const severity = isBruteForce ? 'CRITICAL' : 'HIGH';
      const eventType = isBruteForce ? 'BRUTE_FORCE_SUSPECTED' : 'SUSPICIOUS_LOGIN_ATTEMPTS';

      // 1. Log to Super Admin platform_security_events
      try {
        await SuperAdminService.logSecurityEvent({
          eventType: 'FAILED_LOGIN',
          type: eventType,
          severity,
          companyId,
          actorEmail: identifier,
          userEmail: identifier,
          details: `${isBruteForce ? 'Brute force attack suspected' : 'Suspicious activity detected'}: ${record.failedCount} failed login attempts for user "${identifier}" on tenant ${companyId}. Account locked for 15 minutes.`,
          ipAddress: record.ipAddress
        });
      } catch (logErr) {
        console.warn('[AccountProtectionService] Platform security event log failed:', logErr);
      }

      // 2. Log to Tenant Security Audit & create in-app Anomaly
      try {
        await SecurityAuditService.createAnomaly(
          companyId,
          isBruteForce ? 'BRUTE_FORCE_LOGIN_ATTACK' : 'MULTIPLE_FAILED_LOGINS',
          severity,
          isBruteForce ? 95 : 80,
          [`EVT-LOCK-${Date.now()}`],
          `Account locked for ${identifier} in tenant ${companyId} after ${record.failedCount} failed credential attempts.`
        );
      } catch (anomErr) {
        console.warn('[AccountProtectionService] Anomaly creation failed:', anomErr);
      }

      const lockMsg = isBruteForce
        ? `Account is temporarily locked due to repeated failed login attempts (${record.failedCount} attempts). Please try again in 15 minutes or contact your Administrator.`
        : `Account is temporarily locked for 15 minutes due to 3 failed login attempts. An alert has been raised to the Super Admin.`;

      return {
        locked: true,
        remainingAttempts: 0,
        failedCount: record.failedCount,
        message: lockMsg
      };
    }

    // Attempt 1 or 2: Progressive warning message
    inMemoryLockStore.set(key, record);
    await this.persistLockRecord(companyId, key, record);

    // Log individual failed attempt as WARNING in platform security
    try {
      await SuperAdminService.logSecurityEvent({
        eventType: 'FAILED_LOGIN',
        type: 'INVALID_CREDENTIALS',
        severity: 'WARNING',
        companyId,
        actorEmail: identifier,
        userEmail: identifier,
        details: `Failed login attempt (${record.failedCount} of ${this.MAX_FAILED_ATTEMPTS}) for user "${identifier}" on tenant ${companyId}.`,
        ipAddress: record.ipAddress
      });
    } catch {}

    const remaining = this.MAX_FAILED_ATTEMPTS - record.failedCount;
    const warningMsg = remaining === 1
      ? `Invalid credentials. Warning: Attempt ${record.failedCount} of ${this.MAX_FAILED_ATTEMPTS}. Next failed attempt will temporarily lock this account.`
      : `Invalid credentials. Attempt ${record.failedCount} of ${this.MAX_FAILED_ATTEMPTS}. Account will be locked after ${this.MAX_FAILED_ATTEMPTS} failed attempts.`;

    return {
      locked: false,
      remainingAttempts: remaining,
      failedCount: record.failedCount,
      message: warningMsg
    };
  }

  /**
   * Record successful login: Resets failed attempt counter and clears locks
   */
  static async recordSuccessfulLogin(companyId: string, identifier: string): Promise<void> {
    if (!identifier) return;
    const key = this.getStorageKey(companyId, identifier);

    const record = inMemoryLockStore.get(key) || {
      companyId,
      identifier,
      failedCount: 0,
      lastFailedAt: '',
      locked: false,
      lockedUntil: null,
      updatedAt: new Date().toISOString()
    };

    record.failedCount = 0;
    record.locked = false;
    record.lockedUntil = null;
    record.lockReason = undefined;
    record.updatedAt = new Date().toISOString();

    inMemoryLockStore.set(key, record);
    await this.persistLockRecord(companyId, key, record);
  }

  /**
   * Manually unlock an account (by Super Admin or Company Admin)
   */
  static async unlockAccount(companyId: string, identifier: string, unlockedBy: string = 'SUPER_ADMIN'): Promise<boolean> {
    const key = this.getStorageKey(companyId, identifier);
    const nowIso = new Date().toISOString();

    const record = inMemoryLockStore.get(key) || {
      companyId,
      identifier,
      failedCount: 0,
      lastFailedAt: '',
      locked: false,
      lockedUntil: null,
      updatedAt: nowIso
    };

    record.failedCount = 0;
    record.locked = false;
    record.lockedUntil = null;
    record.lockReason = `Account unlocked by ${unlockedBy}`;
    record.updatedAt = nowIso;
    record.history = record.history || [];
    record.history.push({
      timestamp: nowIso,
      reason: `Manual unlock by ${unlockedBy}`,
      action: 'ACCOUNT_UNLOCKED'
    });

    inMemoryLockStore.set(key, record);
    await this.persistLockRecord(companyId, key, record);

    // Log resolution event in Platform Security
    try {
      await SuperAdminService.logSecurityEvent({
        eventType: 'UNAUTHORIZED_ACCESS_ATTEMPT',
        type: 'ACCOUNT_UNLOCKED',
        severity: 'INFO',
        companyId,
        actorEmail: unlockedBy,
        userEmail: identifier,
        details: `Account lock cleared for user "${identifier}" on tenant ${companyId} by ${unlockedBy}.`,
        ipAddress: 'admin-console'
      });
    } catch {}

    return true;
  }

  /**
   * Get all currently locked accounts across the platform or for a tenant
   */
  static async getLockedAccounts(companyId?: string): Promise<AccountLockRecord[]> {
    const now = Date.now();
    const lockedList: AccountLockRecord[] = [];

    // Check in-memory store first
    inMemoryLockStore.forEach((rec) => {
      if (rec.locked && rec.lockedUntil && new Date(rec.lockedUntil).getTime() > now) {
        if (!companyId || rec.companyId.toUpperCase() === companyId.toUpperCase()) {
          lockedList.push(rec);
        }
      }
    });

    // Also check Firestore
    try {
      if (companyId) {
        const col = collection(db, 'companies', companyId, 'account_locks');
        const snap = await _getDocsAPS(col);
        (snap.docs || []).forEach(d => {
          const data = d.data() as AccountLockRecord;
          if (data.locked && data.lockedUntil && new Date(data.lockedUntil).getTime() > now) {
            if (!lockedList.some(l => l.identifier === data.identifier && l.companyId === data.companyId)) {
              lockedList.push(data);
            }
          }
        });
      }
    } catch (err) {
      console.warn('[AccountProtectionService] getLockedAccounts firestore query error:', err);
    }

    return lockedList;
  }

  /**
   * Record unauthorized action attempt
   */
  static async recordUnauthorizedAction(
    companyId: string, 
    identifier: string, 
    action: string, 
    details: string
  ): Promise<void> {
    try {
      await SuperAdminService.logSecurityEvent({
        eventType: 'UNAUTHORIZED_ACCESS_ATTEMPT',
        type: 'UNAUTHORIZED_ACTION',
        severity: 'HIGH',
        companyId,
        actorEmail: identifier,
        userEmail: identifier,
        details: `Unauthorized action attempted: ${action}. ${details}`
      });
    } catch {}
  }

  /**
   * Safe error message helper
   */
  static getSafeErrorMessage(err: any): string {
    if (!err) return 'An unexpected security error occurred.';
    if (typeof err === 'string') return err;
    if (err.message) return err.message;
    return 'Authentication operation failed.';
  }

  /**
   * Internal helper to persist lock record into Firestore
   */
  private static async persistLockRecord(companyId: string, key: string, record: AccountLockRecord): Promise<void> {
    try {
      if (db && companyId) {
        const docRef = doc(db, 'companies', companyId, 'account_locks', key);
        await _setDocAPS(docRef, record);
      }
    } catch (err) {
      console.warn('[AccountProtectionService] Firestore persistLockRecord non-blocking warning:', err);
    }
  }

  /**
   * Reset store (for testing purposes)
   */
  static _resetMemoryStore(): void {
    inMemoryLockStore.clear();
  }
}
