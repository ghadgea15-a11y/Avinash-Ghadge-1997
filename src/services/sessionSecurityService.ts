import { auth, db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { UserSession, UserRole, AuthorityLevel } from '../types';
import { StandardPermission, AccessContext } from '../types/permissions';
import { PermissionRegistry } from './permissionRegistry';
import { SecurityAuditService } from './securityAuditService';
import { SessionManager } from './sessionManager';
import { AccountProtectionService } from './accountProtectionService';
import { FirebaseAuthService } from './firebaseAuthService';

export type PrivilegedActionType = 
  | 'ROLE_CHANGE'
  | 'PERMISSION_CHANGE'
  | 'COMPANY_ADMINISTRATION'
  | 'SECURITY_SETTINGS'
  | 'BPM_ADMINISTRATION'
  | 'BPM_DELEGATION'
  | 'BPM_THRESHOLD_ROUTING'
  | 'ANOMALY_RESOLUTION';

export interface SessionValidationResult {
  valid: boolean;
  isStale: boolean;
  isIdleLocked: boolean;
  isTampered: boolean;
  authoritativeSession?: UserSession;
  reason?: string;
}

export class SessionSecurityService {

  /**
   * Validates a session against local constraints (token expiry, idle lock)
   * and optionally reconciles against authoritative Firestore state.
   */
  public static async validateSession(
    session: UserSession | null,
    options: { requireOnlineCheck?: boolean } = {}
  ): Promise<SessionValidationResult> {
    if (!session) {
      return {
        valid: false,
        isStale: true,
        isIdleLocked: false,
        isTampered: false,
        reason: 'No active session found.'
      };
    }

    const now = Date.now();

    // 1. Check Token Expiry
    if (session.tokenExpiresAt && now > session.tokenExpiresAt) {
      SessionManager.clearUserSession();
      return {
        valid: false,
        isStale: true,
        isIdleLocked: false,
        isTampered: false,
        reason: 'Session token has expired. Please sign in again.'
      };
    }

    // 2. Check Idle Timeout Lock
    if (SessionManager.isIdleLocked()) {
      return {
        valid: false,
        isStale: false,
        isIdleLocked: true,
        isTampered: false,
        reason: 'Session locked due to inactivity.'
      };
    }

    // 3. Online Authoritative Firestore Re-check (if requested or for high privilege roles)
    const isHighPrivilege = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER_PROMOTER', 'DIRECTOR_CEO'].includes(session.role);
    if (options.requireOnlineCheck || isHighPrivilege) {
      try {
        const userDocRef = doc(db, 'users', session.userId);
        const userSnap = await getDoc(userDocRef);

        if (userSnap.exists()) {
          const uData = userSnap.data();

          // Account status verification
          if (
            uData.accountStatus === 'DISABLED' ||
            uData.accountStatus === 'REJECTED' ||
            uData.accountStatus === 'SUSPENDED' ||
            uData.accountStatus === 'TERMINATED'
          ) {
            SessionManager.clearSession();
            await SecurityAuditService.logEvent(
              session.companyId,
              session.userId,
              session.role,
              session.employeeId,
              'SESSION_TERMINATED',
              'authentication',
              session.userId,
              false,
              'HIGH',
              `Terminated session for disabled account (${uData.accountStatus}).`
            ).catch(() => {});

            return {
              valid: false,
              isStale: true,
              isIdleLocked: false,
              isTampered: false,
              reason: `Your account is ${uData.accountStatus}. Session terminated.`
            };
          }

          // Detect client-side role tampering
          const authoritativeRole: UserRole = uData.role || 'GUARD';
          if (session.role !== authoritativeRole && session.role !== 'SUPER_ADMIN' && authoritativeRole !== 'SUPER_ADMIN') {
            await SecurityAuditService.logEvent(
              session.companyId,
              session.userId,
              session.role,
              session.employeeId,
              'PRIVILEGE_ESCALATION_BLOCKED',
              'SESSION_INTEGRITY',
              session.userId,
              false,
              'CRITICAL',
              `Session role tampering detected! Client claimed '${session.role}', database holds '${authoritativeRole}'.`
            ).catch(() => {});

            SessionManager.clearSession();
            return {
              valid: false,
              isStale: false,
              isIdleLocked: false,
              isTampered: true,
              reason: 'Session integrity verification failed. Please sign in again.'
            };
          }

          // Detect client-side company/tenant tampering
          const authoritativeCompany = uData.companyId;
          if (authoritativeCompany && authoritativeCompany !== 'PENDING' && session.companyId !== authoritativeCompany && session.role !== 'SUPER_ADMIN') {
            await SecurityAuditService.logEvent(
              session.companyId,
              session.userId,
              session.role,
              session.employeeId,
              'CROSS_COMPANY_ACCESS_DENIED',
              'SESSION_INTEGRITY',
              session.companyId,
              false,
              'CRITICAL',
              `Session company tampering detected! Client claimed '${session.companyId}', database holds '${authoritativeCompany}'.`
            ).catch(() => {});

            SessionManager.clearSession();
            return {
              valid: false,
              isStale: false,
              isIdleLocked: false,
              isTampered: true,
              reason: 'Cross-tenant session violation detected.'
            };
          }

          // Return reconciled authoritative session
          const authoritativeSession: UserSession = {
            ...session,
            role: authoritativeRole,
            companyId: authoritativeCompany || session.companyId,
            assignedSiteId: uData.assignedSiteId || session.assignedSiteId,
            accountStatus: uData.accountStatus || session.accountStatus
          };

          return {
            valid: true,
            isStale: false,
            isIdleLocked: false,
            isTampered: false,
            authoritativeSession
          };
        }
      } catch (err) {
        // If Firestore is offline or query failed, fallback gracefully to valid local session
        console.warn('[SessionSecurityService] Authoritative session check offline/fallback:', err);
      }
    }

    return {
      valid: true,
      isStale: false,
      isIdleLocked: false,
      isTampered: false,
      authoritativeSession: session
    };
  }

  /**
   * Applies rigorous step-up verification on privileged operations.
   */
  public static async verifyPrivilegedAction(
    session: UserSession | null,
    actionType: PrivilegedActionType,
    context?: AccessContext
  ): Promise<{ allowed: boolean; reason?: string }> {
    if (!session) {
      return { allowed: false, reason: 'Authentication required for privileged operations.' };
    }

    // 1. Validate session freshness & integrity
    const sessionVal = await this.validateSession(session, { requireOnlineCheck: true });
    if (!sessionVal.valid) {
      return { allowed: false, reason: sessionVal.reason || 'Invalid session state.' };
    }

    const activeSession = sessionVal.authoritativeSession || session;

    // 2. Super Admin Bypass
    if (activeSession.role === 'SUPER_ADMIN') {
      return { allowed: true };
    }

    // 3. Action-specific authority requirement checks
    let requiredPermission: StandardPermission;
    switch (actionType) {
      case 'ROLE_CHANGE':
      case 'PERMISSION_CHANGE':
        requiredPermission = 'GRC_SECURITY:PRIVILEGE_GOVERNANCE:UPDATE';
        break;
      case 'COMPANY_ADMINISTRATION':
        requiredPermission = 'HCM:ORG_CHART:UPDATE';
        break;
      case 'SECURITY_SETTINGS':
        requiredPermission = 'GRC_SECURITY:COMPLIANCE_POLICY:UPDATE';
        break;
      case 'BPM_ADMINISTRATION':
        requiredPermission = 'BPM:ROUTING_RULE:UPDATE';
        break;
      case 'BPM_DELEGATION':
        requiredPermission = 'BPM:DELEGATION:CREATE';
        break;
      case 'BPM_THRESHOLD_ROUTING':
        requiredPermission = 'BPM:THRESHOLD:UPDATE';
        break;
      case 'ANOMALY_RESOLUTION':
        requiredPermission = 'GRC_SECURITY:INVESTIGATION:UPDATE';
        break;
      default:
        requiredPermission = 'GRC_SECURITY:SECURITY_AUDIT:ADMIN';
    }

    const evalResult = PermissionRegistry.evaluatePermission(activeSession, requiredPermission, context);
    if (!evalResult.allowed) {
      await SecurityAuditService.logEvent(
        activeSession.companyId,
        activeSession.userId,
        activeSession.role,
        activeSession.employeeId,
        'PRIVILEGE_ESCALATION_BLOCKED',
        'PRIVILEGED_ACTION',
        actionType,
        false,
        'CRITICAL',
        `Blocked attempt to perform privileged action '${actionType}': ${evalResult.reason}`
      ).catch(() => {});

      // Track repeated unauthorized action for account protection
      await AccountProtectionService.recordUnauthorizedAction(
        activeSession,
        actionType,
        'PRIVILEGED_ACTION',
        evalResult.reason || 'Unauthorized'
      );

      return { allowed: false, reason: evalResult.reason };
    }

    return { allowed: true };
  }

  /**
   * Securely logs out user, clears all storage artifacts, and logs security event.
   */
  public static async secureLogout(): Promise<void> {
    await FirebaseAuthService.logoutUser();
  }
}
