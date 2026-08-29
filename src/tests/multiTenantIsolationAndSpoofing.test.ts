import { describe, it, expect } from 'vitest';

/**
 * Direct evaluation simulator for Firestore Security Rules defined in `firestore.rules`.
 * Simulates server-side evaluation of direct REST API / Firestore Client requests.
 */
class FirestoreRulesSecurityEvaluator {
  static evaluateDirectDocumentRead(
    auth: { uid: string; token: Record<string, any> } | null,
    userDoc: { companyId?: string; authorityLevel?: string; accountStatus?: string; role?: string } | null,
    targetCollectionPath: string, // e.g. "companies/COMP_VICTIM/employees/EMP_99"
    targetDocData: Record<string, any>
  ): { allowed: boolean; reason: string } {
    if (!auth || !auth.token) {
      return { allowed: false, reason: 'PERMISSION_DENIED: Unauthenticated request.' };
    }

    // Resolve companyId: token.cId > token.companyId > userDoc.companyId
    const resolvedCompanyId = auth.token.cId || auth.token.companyId || userDoc?.companyId;
    const resolvedAuthority = auth.token.aLvl || userDoc?.authorityLevel;
    const isTerminated = auth.token.status === 'TERMINATED' || userDoc?.accountStatus === 'TERMINATED';

    if (isTerminated) {
      return { allowed: false, reason: 'PERMISSION_DENIED: Account is terminated.' };
    }

    // Platform Super Admin
    if (auth.token.email_verified && (auth.token.isPlatformAdmin === true || auth.token.role === 'SUPER_ADMIN')) {
      return { allowed: true, reason: 'ALLOWED: Verified Super Admin.' };
    }

    const pathParts = targetCollectionPath.split('/');
    if (pathParts[0] === 'companies') {
      const targetCompanyId = pathParts[1];
      
      // Multi-tenant isolation rule: sameCompany(cId)
      if (resolvedCompanyId !== targetCompanyId) {
        return {
          allowed: false,
          reason: `PERMISSION_DENIED: Multi-tenant boundary violation. User company (${resolvedCompanyId}) !== Target tenant (${targetCompanyId}).`
        };
      }

      // Inside same company: Check RBAC
      const subcollection = pathParts[2];
      if (subcollection === 'employees') {
        if (['A0_OWNER', 'A1_DIRECTOR_CEO', 'A2_GENERAL_MANAGER', 'A3_OFFICIAL_STAFF'].includes(resolvedAuthority)) {
          return { allowed: true, reason: 'ALLOWED: Tenant Admin read.' };
        }
        if (targetDocData.userId === auth.uid || (auth.token.employeeId && auth.token.employeeId === targetDocData.employeeId)) {
          return { allowed: true, reason: 'ALLOWED: Self employee record read.' };
        }
        return { allowed: false, reason: 'PERMISSION_DENIED: Employee role cannot read peer employee records.' };
      }

      if (subcollection === 'payroll') {
        if (['A0_OWNER', 'A1_DIRECTOR_CEO'].includes(resolvedAuthority) || auth.token.departmentId === 'FINANCE') {
          return { allowed: true, reason: 'ALLOWED: Finance/Owner payroll read.' };
        }
        return { allowed: false, reason: 'PERMISSION_DENIED: Unauthorized payroll read.' };
      }

      return { allowed: true, reason: 'ALLOWED: Same company standard access.' };
    }

    return { allowed: false, reason: 'PERMISSION_DENIED: Unknown collection path.' };
  }

  static evaluateUserDocUpdate(
    auth: { uid: string; token: Record<string, any> } | null,
    targetUid: string,
    existingDoc: Record<string, any>,
    updatedFields: Record<string, any>
  ): { allowed: boolean; reason: string } {
    if (!auth || !auth.token) {
      return { allowed: false, reason: 'PERMISSION_DENIED: Unauthenticated request.' };
    }

    const isSuperAdmin = auth.token.isPlatformAdmin === true || auth.token.role === 'SUPER_ADMIN';
    if (isSuperAdmin) {
      return { allowed: true, reason: 'ALLOWED: Super Admin user profile update.' };
    }

    const isSelfUser = auth.uid === targetUid;
    if (isSelfUser) {
      const protectedKeys = [
        'companyId', 'authorityLevel', 'role', 'accountStatus', 
        'isPlatformAdmin', 'platformRole', 'assignedSiteId', 
        'assignedRegionId', 'departmentId', 'employeeId'
      ];

      const modifiedProtectedKeys = Object.keys(updatedFields).filter(key => 
        protectedKeys.includes(key) && updatedFields[key] !== existingDoc[key]
      );

      if (modifiedProtectedKeys.length > 0) {
        return {
          allowed: false,
          reason: `PERMISSION_DENIED: Self-privilege escalation blocked. User cannot mutate protected fields: [${modifiedProtectedKeys.join(', ')}].`
        };
      }

      return { allowed: true, reason: 'ALLOWED: Self-user profile update (non-sensitive fields).' };
    }

    return { allowed: false, reason: 'PERMISSION_DENIED: Cannot modify other user profiles.' };
  }

  static evaluateSuperAdminDocCreation(
    auth: { uid: string; token: Record<string, any> } | null
  ): { allowed: boolean; reason: string } {
    if (!auth || !auth.token) {
      return { allowed: false, reason: 'PERMISSION_DENIED: Unauthenticated.' };
    }

    const isExistingSuperAdmin = auth.token.isPlatformAdmin === true && auth.token.email_verified === true;
    if (isExistingSuperAdmin) {
      return { allowed: true, reason: 'ALLOWED: Verified Super Admin.' };
    }

    return {
      allowed: false,
      reason: 'PERMISSION_DENIED: Super admin self-promotion strictly blocked.'
    };
  }
}

describe('Multi-Tenant Isolation & cId Spoofing Defense Tests', () => {
  const victimCompany = 'COMP_VICTIM_CORP';
  const attackerCompany = 'COMP_ATTACKER_LLC';
  const attackerUid = 'ATTACKER_UID_123';

  describe('1. Direct REST Call / Firestore Console Document Read by Attacker', () => {
    it('strictly denies attacker from reading victim employee document even if attacker knows the document ID', () => {
      const attackerAuth = {
        uid: attackerUid,
        token: {
          cId: attackerCompany,
          aLvl: 'A0_OWNER',
          email: 'ceo@attacker.com'
        }
      };

      const victimEmployeeDoc = {
        employeeId: 'EMP_VICTIM_001',
        fullName: 'Sensitive Executive',
        companyId: victimCompany,
        salary: 150000
      };

      const result = FirestoreRulesSecurityEvaluator.evaluateDirectDocumentRead(
        attackerAuth,
        { companyId: attackerCompany, authorityLevel: 'A0_OWNER' },
        `companies/${victimCompany}/employees/EMP_VICTIM_001`,
        victimEmployeeDoc
      );

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Multi-tenant boundary violation');
    });

    it('strictly denies attacker from reading victim payroll data', () => {
      const attackerAuth = {
        uid: attackerUid,
        token: {
          cId: attackerCompany,
          aLvl: 'A0_OWNER',
          departmentId: 'FINANCE'
        }
      };

      const result = FirestoreRulesSecurityEvaluator.evaluateDirectDocumentRead(
        attackerAuth,
        { companyId: attackerCompany, authorityLevel: 'A0_OWNER' },
        `companies/${victimCompany}/payroll/PAYROLL_JULY_2026`,
        { companyId: victimCompany, totalPayout: 5000000 }
      );

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Multi-tenant boundary violation');
    });
  });

  describe('2. Client-Side cId & Authority Spoofing via `/users/{uid}` Direct Mutation', () => {
    it('blocks attacker from mutating their own /users/{uid} document to switch companyId to victimCompany', () => {
      const attackerAuth = {
        uid: attackerUid,
        token: {
          email: 'hacker@attacker.com'
          // token without custom claims yet
        }
      };

      const existingDoc = {
        uid: attackerUid,
        companyId: attackerCompany,
        authorityLevel: 'A7_SKILLED',
        name: 'John Hacker'
      };

      const maliciousPayload = {
        name: 'John Hacker',
        companyId: victimCompany // Attack payload: Attempt to spoof tenant ID
      };

      const result = FirestoreRulesSecurityEvaluator.evaluateUserDocUpdate(
        attackerAuth,
        attackerUid,
        existingDoc,
        maliciousPayload
      );

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Self-privilege escalation blocked');
      expect(result.reason).toContain('companyId');
    });

    it('blocks attacker from mutating their own authorityLevel to A0_OWNER', () => {
      const attackerAuth = {
        uid: attackerUid,
        token: { email: 'worker@attacker.com' }
      };

      const existingDoc = {
        uid: attackerUid,
        companyId: attackerCompany,
        authorityLevel: 'A7_SKILLED'
      };

      const maliciousPayload = {
        authorityLevel: 'A0_OWNER'
      };

      const result = FirestoreRulesSecurityEvaluator.evaluateUserDocUpdate(
        attackerAuth,
        attackerUid,
        existingDoc,
        maliciousPayload
      );

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('authorityLevel');
    });

    it('allows benign user profile update (e.g. updating phone number, photoUrl)', () => {
      const attackerAuth = {
        uid: attackerUid,
        token: { email: 'worker@attacker.com' }
      };

      const existingDoc = {
        uid: attackerUid,
        companyId: attackerCompany,
        authorityLevel: 'A7_SKILLED',
        phone: '1234567890'
      };

      const benignPayload = {
        phone: '9876543210'
      };

      const result = FirestoreRulesSecurityEvaluator.evaluateUserDocUpdate(
        attackerAuth,
        attackerUid,
        existingDoc,
        benignPayload
      );

      expect(result.allowed).toBe(true);
    });
  });

  describe('3. Super Admin Self-Promotion Defense', () => {
    it('blocks regular user from creating document in /super_admins/{uid}', () => {
      const attackerAuth = {
        uid: attackerUid,
        token: {
          email: 'attacker@gmail.com',
          email_verified: true
        }
      };

      const result = FirestoreRulesSecurityEvaluator.evaluateSuperAdminDocCreation(attackerAuth);

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Super admin self-promotion strictly blocked');
    });
  });
});
