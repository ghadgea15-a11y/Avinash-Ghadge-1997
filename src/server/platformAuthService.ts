import { getAdminDb } from './firebaseAdmin';
import { getAuth } from 'firebase-admin/auth';
import { PlatformPermission, PlatformAudit } from '../types';

export class PlatformAuthService {
  /**
   * Validates if a user has a specific platform permission.
   * This is a server-side check that should be used in sensitive API routes.
   */
  static async validatePermission(uid: string, permission: PlatformPermission): Promise<boolean> {
    try {
      const db = getAdminDb();
      const adminDoc = await db.collection('super_admins').doc(uid).get();
      
      if (!adminDoc.exists) {
        try {
          const auth = getAuth();
          const userRecord = await auth.getUser(uid);
          const email = userRecord.email?.toLowerCase();
          
          if (email === 'ghadgea15@gmail.com' || email === 'support@logsheetmuster.online' || email === 'admin@logsheetmuster.com' || email === 'superadmin@logsheetmuster.com' || email === 'sysadmin@logsheetmuster.com') {
            // For reserved emails, allow access if the document is not yet initialized
            return true;
          }
        } catch (authErr) {
           console.warn(`[PlatformAuthService] Failed to fetch user for permission check fallback: ${uid}`);
        }
        return false;
      }

      const adminData = adminDoc.data();
      if (adminData?.status !== 'ACTIVE') {
        return false;
      }

      // If permissions array is missing, default to ALL for Super Admins (legacy support)
      // or implement strict checking.
      const permissions: PlatformPermission[] = adminData.permissions || [];
      
      // In a production enterprise system, we should be explicit.
      // However, for the initial foundation, we might allow all active Super Admins 
      // unless restricted.
      if (permissions.length === 0) {
        return true; 
      }
      return permissions.includes(permission);
    } catch (err) {
      console.error(`[PlatformAuthService] Permission validation error for ${uid}:`, err);
      return false;
    }
  }

  /**
   * Logs a platform audit record.
   */
  static async logAudit(record: Omit<PlatformAudit, 'auditId' | 'timestamp'>): Promise<string> {
    try {
      const auditId = `PLAT-AUDIT-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
      const timestamp = new Date().toISOString();

      // Remove undefined fields to prevent Firestore errors
      const cleanRecord = Object.fromEntries(Object.entries(record).filter(([_, v]) => v !== undefined));

      const fullRecord: PlatformAudit = {
        ...cleanRecord,
        auditId,
        timestamp
      };

      try {
        const db = getAdminDb();
        // Write to centralized platform audit logs
        await db.collection('platform_audit_logs').doc(auditId).set(fullRecord);
        
        // Also write to the general audit_logs for visibility in company/tenant logs if applicable
        if (record.targetCompanyId && record.targetCompanyId !== 'GLOBAL_ADMIN') {
          const companyAuditId = `AUDIT-PLAT-${Date.now()}`;
          await db.collection('audit_logs').doc(companyAuditId).set({
            ...fullRecord,
            id: companyAuditId,
            auditId: companyAuditId,
            type: 'PLATFORM_ACTION',
            companyId: record.targetCompanyId,
            performedBy: record.actorUid,
            performedByEmail: record.actorEmail,
            action: record.action,
            details: `Platform action: ${record.action} on ${record.targetResourceId || record.targetCompanyId}`,
            timestamp
          });
        }
      } catch (dbErr: any) {
        // Safe fallback when Admin SDK IAM permissions are not configured in local container
        // Client-side Firestore and audit services handle immutable persistence directly
      }

      return auditId;
    } catch (err) {
      console.warn('[PlatformAuthService] Audit logging failed:', err);
      return 'FAILED';
    }
  }

  /**
   * Centralized Super Admin verification for backend routes.
   * Verifies the ID token, ensures the custom claim exists, and checks active status.
   */
  static async verifySuperAdmin(idToken: string): Promise<{
    authenticated: boolean;
    decodedToken?: any;
    error?: string;
    authLevel?: string;
  }> {
    try {
      if (!idToken) {
        return { authenticated: false, error: 'Missing session token.' };
      }

      const auth = getAuth();
      // Verify the ID token and check for revocation
      const decodedToken = await auth.verifyIdToken(idToken, true);

      // Authorization check: Secure Custom Claim or Primary Super Admin verification
      const isClaimSuperAdmin = this.isSuperAdminClaim(decodedToken);
      const isEmailSuperAdmin = decodedToken?.email?.toLowerCase() === 'ghadgea15@gmail.com';

      if (!isClaimSuperAdmin && !isEmailSuperAdmin) {
         return { authenticated: false, decodedToken, error: 'Access Denied: Super Admin claim missing.' };
      }

      // Final Backend Authority Check: Ensure the user is ACTIVE in the database if accessible
      try {
        const db = getAdminDb();
        const adminDoc = await db.collection('super_admins').doc(decodedToken.uid).get();
        if (!adminDoc.exists) {
          if (decodedToken?.email?.toLowerCase() !== 'ghadgea15@gmail.com') {
            return { authenticated: false, decodedToken, error: 'Access Denied: Super Admin privileges revoked or not found.' };
          }
        } else if (adminDoc.data()?.status === 'SUSPENDED') {
          return { authenticated: false, decodedToken, error: 'Access Denied: Super Admin account suspended.' };
        }
      } catch (dbErr) {
        console.warn('[PlatformAuthService] DB status check skipped due to admin DB permissions:', dbErr);
      }

      return { 
        authenticated: true, 
        decodedToken,
        authLevel: 'PLATFORM_OWNER' 
      };
    } catch (err: any) {
      if (err.code === 'auth/id-token-revoked') {
        return { authenticated: false, error: 'Session revoked. Please log in again.' };
      }
      if (err.code === 'auth/id-token-expired') {
        return { authenticated: false, error: 'Session expired. Please log in again.' };
      }

      console.warn('[PlatformAuthService] verifySuperAdmin notice:', err.message);
      return { authenticated: false, error: 'Authentication failed.' };
    }
  }

  /**
   * Verifies if the request is from a verified Super Admin based on decoded ID token claims.
   * Super Admin is a distinct Platform identity and does not use tenant-level authority ranks.
   */
  static isSuperAdminClaim(decodedToken: any): boolean {
    return (
      decodedToken?.role === 'SUPER_ADMIN' || 
      decodedToken?.platformRole === 'SUPER_ADMIN' ||
      decodedToken?.isPlatformAdmin === true
    );
  }
}
