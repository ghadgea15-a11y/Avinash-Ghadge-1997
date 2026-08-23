import { UserSession, CompanyTenant } from '../types';

const STORAGE_KEYS = {
  ACTIVE_COMPANY: 'lsm_active_company_v1',
  USER_SESSION: 'lsm_user_session_v1',
  REMEMBER_ME: 'lsm_remember_me_v1',
  BIOMETRIC_BINDING: 'lsm_biometric_binding_v1',
  IDLE_TIMEOUT: 'lsm_idle_timeout_mins_v1',
  OFFLINE_QUEUE: 'lsm_offline_queue_v1'
};

// Resilient memory storage fallback if localStorage is unavailable
const memoryStorage: Map<string, string> = new Map();

function getItem(key: string): string | null {
  try {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(key);
    }
  } catch {
    // ignore
  }
  return memoryStorage.get(key) || null;
}

function setItem(key: string, value: string): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, value);
    }
  } catch {
    // ignore
  }
  memoryStorage.set(key, value);
}

function removeItem(key: string): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(key);
    }
  } catch {
    // ignore
  }
  memoryStorage.delete(key);
}

export class SessionManager {
  static getActiveCompany(): CompanyTenant | null {
    try {
      const data = getItem(STORAGE_KEYS.ACTIVE_COMPANY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  static setActiveCompany(company: CompanyTenant): void {
    setItem(STORAGE_KEYS.ACTIVE_COMPANY, JSON.stringify(company));
  }

  static clearActiveCompany(): void {
    removeItem(STORAGE_KEYS.ACTIVE_COMPANY);
  }

  static getUserSession(): UserSession | null {
    try {
      const data = getItem(STORAGE_KEYS.USER_SESSION);
      if (!data) return null;
      const session: UserSession = JSON.parse(data);
      // Check if token expired
      if (Date.now() > session.tokenExpiresAt) {
        this.clearUserSession();
        return null;
      }
      return session;
    } catch {
      return null;
    }
  }

  static setUserSession(session: UserSession): void {
    setItem(STORAGE_KEYS.USER_SESSION, JSON.stringify(session));
  }

  static clearUserSession(): void {
    removeItem(STORAGE_KEYS.USER_SESSION);
  }

  static clearSession(): void {
    this.clearUserSession();
    this.clearActiveCompany();
  }

  static updateLastActive(): void {
    const session = this.getUserSession();
    if (session) {
      session.lastActiveAt = Date.now();
      this.setUserSession(session);
    }
  }

  static isIdleLocked(maxIdleMinutes = 5): boolean {
    const session = this.getUserSession();
    if (!session) return false;
    const elapsedMinutes = (Date.now() - (session.lastActiveAt || Date.now())) / (1000 * 60);
    return elapsedMinutes >= maxIdleMinutes;
  }

  static setBiometricEnabled(enabled: boolean): void {
    const session = this.getUserSession();
    if (session) {
      session.isBiometricEnabled = enabled;
      this.setUserSession(session);
    }
    setItem(STORAGE_KEYS.BIOMETRIC_BINDING, JSON.stringify(enabled));
  }

  static isBiometricEnabled(): boolean {
    try {
      return JSON.parse(getItem(STORAGE_KEYS.BIOMETRIC_BINDING) || 'false');
    } catch {
      return false;
    }
  }

  static getSavedCredentials(): { emailOrId: string; companyCode?: string; remember: boolean } {
    try {
      const data = getItem(STORAGE_KEYS.REMEMBER_ME);
      if (!data) return { emailOrId: '', remember: false };

      const parsed = JSON.parse(data);
      const savedAt = parsed.savedAt || 0;
      const MAX_REMEMBER_DURATION_MS = 5 * 60 * 1000; // 5 minutes validity

      // If expired (older than 5 minutes), clear storage immediately
      if (!savedAt || (Date.now() - savedAt > MAX_REMEMBER_DURATION_MS)) {
        removeItem(STORAGE_KEYS.REMEMBER_ME);
        return { emailOrId: '', companyCode: parsed.companyCode || '', remember: false };
      }

      return {
        emailOrId: parsed.emailOrId || '',
        companyCode: parsed.companyCode || '',
        remember: true
      };
    } catch {
      return { emailOrId: '', remember: false };
    }
  }

  static setSavedCredentials(emailOrId: string, companyCode: string, remember: boolean): void {
    if (remember) {
      setItem(
        STORAGE_KEYS.REMEMBER_ME,
        JSON.stringify({
          emailOrId,
          companyCode,
          remember: true,
          savedAt: Date.now()
        })
      );
    } else {
      removeItem(STORAGE_KEYS.REMEMBER_ME);
    }
  }
}
