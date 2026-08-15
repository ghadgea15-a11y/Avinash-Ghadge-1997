import { UserSession, CompanyTenant } from '../types';

const STORAGE_KEYS = {
  ACTIVE_COMPANY: 'lsm_active_company_v1',
  USER_SESSION: 'lsm_user_session_v1',
  REMEMBER_ME: 'lsm_remember_me_v1',
  BIOMETRIC_BINDING: 'lsm_biometric_binding_v1',
  IDLE_TIMEOUT: 'lsm_idle_timeout_mins_v1',
  OFFLINE_QUEUE: 'lsm_offline_queue_v1'
};

export class SessionManager {
  static getActiveCompany(): CompanyTenant | null {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ACTIVE_COMPANY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  static setActiveCompany(company: CompanyTenant): void {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_COMPANY, JSON.stringify(company));
  }

  static clearActiveCompany(): void {
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_COMPANY);
  }

  static getUserSession(): UserSession | null {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.USER_SESSION);
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
    localStorage.setItem(STORAGE_KEYS.USER_SESSION, JSON.stringify(session));
  }

  static clearUserSession(): void {
    localStorage.removeItem(STORAGE_KEYS.USER_SESSION);
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
    localStorage.setItem(STORAGE_KEYS.BIOMETRIC_BINDING, JSON.stringify(enabled));
  }

  static isBiometricEnabled(): boolean {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.BIOMETRIC_BINDING) || 'false');
    } catch {
      return false;
    }
  }

  static getSavedCredentials(): { emailOrId: string; passwordOrPin?: string; companyCode?: string; remember: boolean } {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.REMEMBER_ME);
      if (!data) return { emailOrId: '', remember: false };

      const parsed = JSON.parse(data);
      const savedAt = parsed.savedAt || 0;
      const MAX_REMEMBER_DURATION_MS = 5 * 60 * 1000; // 5 minutes validity

      // If expired (older than 5 minutes), clear storage immediately
      if (!savedAt || (Date.now() - savedAt > MAX_REMEMBER_DURATION_MS)) {
        localStorage.removeItem(STORAGE_KEYS.REMEMBER_ME);
        return { emailOrId: '', passwordOrPin: '', companyCode: parsed.companyCode || '', remember: false };
      }

      return {
        emailOrId: parsed.emailOrId || '',
        passwordOrPin: parsed.passwordOrPin || '',
        companyCode: parsed.companyCode || '',
        remember: true
      };
    } catch {
      return { emailOrId: '', remember: false };
    }
  }

  static setSavedCredentials(emailOrId: string, passwordOrPin: string, companyCode: string, remember: boolean): void {
    if (remember) {
      localStorage.setItem(
        STORAGE_KEYS.REMEMBER_ME,
        JSON.stringify({
          emailOrId,
          passwordOrPin,
          companyCode,
          remember: true,
          savedAt: Date.now()
        })
      );
    } else {
      localStorage.removeItem(STORAGE_KEYS.REMEMBER_ME);
    }
  }
}
