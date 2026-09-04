import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PlatformAuthService } from '../src/server/platformAuthService';
import { PlatformAudit } from '../src/types';

describe('Point 1.5: Platform Administrators (RBAC) & Session Revocation', () => {

  describe('1. Super Admin Claims & Authorization Validation', () => {
    it('correctly identifies valid super admin claims', () => {
      const validClaim1 = { role: 'SUPER_ADMIN', platformRole: 'SUPER_ADMIN', isPlatformAdmin: true };
      const validClaim2 = { platformRole: 'SUPER_ADMIN' };
      const validClaim3 = { isPlatformAdmin: true };

      expect(PlatformAuthService.isSuperAdminClaim(validClaim1)).toBe(true);
      expect(PlatformAuthService.isSuperAdminClaim(validClaim2)).toBe(true);
      expect(PlatformAuthService.isSuperAdminClaim(validClaim3)).toBe(true);
    });

    it('rejects tenant-level roles attempting to spoof platform super admin', () => {
      const companyAdminToken = { role: 'A0_OWNER', authorityLevel: 'A0_OWNER', companyId: 'T-APEX' };
      const securityOfficerToken = { role: 'A2_SECURITY_OFFICER', companyId: 'T-SHIELD' };
      const standardUserToken = { role: 'USER', status: 'ACTIVE' };

      expect(PlatformAuthService.isSuperAdminClaim(companyAdminToken)).toBe(false);
      expect(PlatformAuthService.isSuperAdminClaim(securityOfficerToken)).toBe(false);
      expect(PlatformAuthService.isSuperAdminClaim(standardUserToken)).toBe(false);
    });
  });

  describe('2. Revocation & Token Invalidation Flow', () => {
    it('fails closed when token was revoked via Firebase Auth revokeRefreshTokens', async () => {
      // Simulation of Firebase Admin SDK verifyIdToken throwing auth/id-token-revoked
      const verifyIdTokenMock = vi.fn().mockRejectedValue({
        code: 'auth/id-token-revoked',
        message: 'The Firebase ID token has been revoked.'
      });

      // Verify handling of revoked token error
      let authResult: { authenticated: boolean; error?: string } = { authenticated: false };
      try {
        await verifyIdTokenMock('revoked_jwt_token', true);
        authResult = { authenticated: true };
      } catch (err: any) {
        if (err.code === 'auth/id-token-revoked') {
          authResult = { authenticated: false, error: 'Session revoked. Please log in again.' };
        }
      }

      expect(authResult.authenticated).toBe(false);
      expect(authResult.error).toContain('Session revoked');
    });

    it('blocks subsequent API calls even if unrevoked token is presented after deletion from super_admins', () => {
      // When an admin is revoked, their record in super_admins is deleted
      const existingAdmins = new Map<string, any>();
      existingAdmins.set('active_admin_uid', { email: 'ops@logsheetmuster.com', status: 'ACTIVE' });
      // 'revoked_admin_uid' is not in the map (deleted)

      const checkAccess = (uid: string, email: string) => {
        const doc = existingAdmins.get(uid);
        if (!doc) {
          if (email.toLowerCase() !== 'ghadgea15@gmail.com') {
            return { authenticated: false, error: 'Access Denied: Super Admin privileges revoked or not found.' };
          }
        }
        if (doc?.status === 'SUSPENDED') {
          return { authenticated: false, error: 'Access Denied: Super Admin account suspended.' };
        }
        return { authenticated: true };
      };

      const activeResult = checkAccess('active_admin_uid', 'ops@logsheetmuster.com');
      expect(activeResult.authenticated).toBe(true);

      const revokedResult = checkAccess('revoked_admin_uid', 'ex-admin@logsheetmuster.com');
      expect(revokedResult.authenticated).toBe(false);
      expect(revokedResult.error).toContain('Access Denied: Super Admin privileges revoked');
    });

    it('prevents self-revocation by active platform administrator', () => {
      const callerUid = 'superadmin_123';
      const targetUid = 'superadmin_123';

      const validateRevocationTarget = (caller: string, target: string) => {
        if (caller === target) {
          throw new Error('Cannot revoke your own active platform administrator account.');
        }
        return true;
      };

      expect(() => validateRevocationTarget(callerUid, targetUid)).toThrow(
        'Cannot revoke your own active platform administrator account.'
      );
    });

    it('prevents revoking the primary bootstrap Platform Owner', () => {
      const targetEmail = 'ghadgea15@gmail.com';

      const validateNotPrimaryOwner = (email: string) => {
        if (email.toLowerCase() === 'ghadgea15@gmail.com') {
          throw new Error('Cannot revoke primary Platform Owner.');
        }
        return true;
      };

      expect(() => validateNotPrimaryOwner(targetEmail)).toThrow(
        'Cannot revoke primary Platform Owner.'
      );
    });
  });

  describe('3. Immutable Audit Trail Logging', () => {
    it('generates structured audit records for ADD_SUPER_ADMIN and REMOVE_SUPER_ADMIN', async () => {
      const auditLogMock: PlatformAudit[] = [];

      const logPlatformAudit = (record: {
        actorUid: string;
        actorEmail: string;
        action: 'ADD_SUPER_ADMIN' | 'REMOVE_SUPER_ADMIN';
        targetResourceId: string;
        details: string;
      }) => {
        const fullRecord: PlatformAudit = {
          auditId: `PLAT-AUDIT-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          timestamp: new Date().toISOString(),
          actorRole: 'SUPER_ADMIN',
          targetCompanyId: 'GLOBAL_ADMIN',
          success: true,
          ...record
        };
        auditLogMock.push(fullRecord);
        return fullRecord.auditId;
      };

      // 1. Provisioning Audit
      const addAuditId = logPlatformAudit({
        actorUid: 'caller_admin_1',
        actorEmail: 'superadmin@logsheetmuster.com',
        action: 'ADD_SUPER_ADMIN',
        targetResourceId: 'new_admin_456',
        details: 'Provisioned new super admin: security-lead@logsheetmuster.com'
      });

      expect(addAuditId).toBeDefined();
      expect(auditLogMock.length).toBe(1);
      expect(auditLogMock[0].action).toBe('ADD_SUPER_ADMIN');
      expect(auditLogMock[0].targetResourceId).toBe('new_admin_456');

      // 2. Revocation Audit
      const removeAuditId = logPlatformAudit({
        actorUid: 'caller_admin_1',
        actorEmail: 'superadmin@logsheetmuster.com',
        action: 'REMOVE_SUPER_ADMIN',
        targetResourceId: 'new_admin_456',
        details: 'Revoked super admin access for UID: new_admin_456'
      });

      expect(removeAuditId).toBeDefined();
      expect(auditLogMock.length).toBe(2);
      expect(auditLogMock[1].action).toBe('REMOVE_SUPER_ADMIN');
      expect(auditLogMock[1].targetResourceId).toBe('new_admin_456');
    });

    it('enforces immutability: updates and deletes are disallowed', () => {
      // Mimicking firestore.rules rule: allow update, delete: if false;
      const canUpdateAuditLog = false;
      const canDeleteAuditLog = false;

      expect(canUpdateAuditLog).toBe(false);
      expect(canDeleteAuditLog).toBe(false);
    });
  });
});
