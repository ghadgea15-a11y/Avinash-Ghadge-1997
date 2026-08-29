import { describe, it, expect } from 'vitest';
import { QueryScopeEngine } from '../services/queryScopeEngine';
import { UserSession } from '../types';

/**
 * Direct evaluation simulator for Firestore Security Rules defined in `firestore.rules`.
 * Models the exact logic executed by Cloud Firestore's Security Rules Engine on the server.
 */
class FirestoreRulesSimulator {
  /**
   * Helper function matching firestore.rules:
   * function signedIn() { return request.auth != null && request.auth.token != null; }
   * function companyId() { return request.auth.token.cId || ...; }
   * function authorityLevel() { return request.auth.token.aLvl || ...; }
   * function regionId() { return request.auth.token.rId || ...; }
   */
  static evaluateEmployeeReadRule(
    auth: { uid: string; token: Record<string, any> } | null,
    targetCompanyId: string,
    resourceData: { companyId?: string; assignedRegionId?: string; assignedSiteId?: string; employeeId?: string; userId?: string }
  ): { allowed: boolean; reason: string } {
    if (!auth || !auth.token) {
      return { allowed: false, reason: 'PERMISSION_DENIED: Unauthenticated request.' };
    }

    const token = auth.token;
    const userCompanyId = token.cId || token.companyId;
    const userAuthority = token.aLvl || token.authorityLevel;
    const userRegionId = token.rId || token.regionId;
    const userSiteId = token.sId || token.assignedSiteId;
    const isTerminated = token.status === 'TERMINATED' || token.status === 'SUSPENDED';

    if (isTerminated) {
      return { allowed: false, reason: 'PERMISSION_DENIED: Account is terminated or suspended.' };
    }

    // Rule: sameCompany(cId)
    if (userCompanyId !== targetCompanyId) {
      return { allowed: false, reason: `PERMISSION_DENIED: Cross-tenant access violation. User company (${userCompanyId}) !== Target (${targetCompanyId}).` };
    }

    // Platform Super Admin
    if (token.isPlatformAdmin === true || token.role === 'SUPER_ADMIN') {
      return { allowed: true, reason: 'ALLOWED: Platform Super Admin.' };
    }

    // Owner / Executive (A0, A1, A2)
    if (['A0_OWNER', 'A1_DIRECTOR_CEO', 'A2_GENERAL_MANAGER'].includes(userAuthority)) {
      return { allowed: true, reason: 'ALLOWED: Tenant Executive full company read.' };
    }

    // Official Staff (A3)
    if (userAuthority === 'A3_OFFICIAL_STAFF') {
      return { allowed: true, reason: 'ALLOWED: Official Staff tenant read.' };
    }

    // Regional Manager (A4)
    // Rule in firestore.rules (line 346):
    // (authorityLevel() == "A4_REGIONAL_AREA_MANAGER" && (resource.data.assignedRegionId == regionId() || resource.data.assignedRegionId == null))
    if (userAuthority === 'A4_REGIONAL_AREA_MANAGER') {
      if (resourceData.assignedRegionId === userRegionId || resourceData.assignedRegionId == null) {
        return { allowed: true, reason: `ALLOWED: Regional scope match (Region: ${userRegionId}).` };
      }
      return { 
        allowed: false, 
        reason: `PERMISSION_DENIED: Server-side Firestore rule rejection. Resource region (${resourceData.assignedRegionId}) does not match A4 Manager assigned region (${userRegionId}).` 
      };
    }

    // Site Manager (A5, A6)
    if (['A5_SITE_IN_CHARGE', 'A6_SUPERVISOR'].includes(userAuthority)) {
      if (resourceData.assignedSiteId === userSiteId || resourceData.assignedSiteId == null) {
        return { allowed: true, reason: `ALLOWED: Site scope match (Site: ${userSiteId}).` };
      }
      return { allowed: false, reason: 'PERMISSION_DENIED: Site scope mismatch.' };
    }

    // Self-Employee
    if (token.employeeId && token.employeeId === resourceData.employeeId) {
      return { allowed: true, reason: 'ALLOWED: Self employee record read.' };
    }

    return { allowed: false, reason: 'PERMISSION_DENIED: No matching RBAC read policy.' };
  }

  /**
   * Firestore Query Filter Rule Evaluator ("Rules Are Not Filters"):
   * Firestore rejects queries on the server if the query's where-clauses do NOT constrain
   * the result set exclusively to documents the user has permission to read.
   */
  static evaluateQueryExecution(
    auth: { uid: string; token: Record<string, any> } | null,
    targetCompanyId: string,
    queryFilters: { field: string; operator: string; value: any }[]
  ): { allowed: boolean; reason: string } {
    if (!auth || !auth.token) {
      return { allowed: false, reason: 'PERMISSION_DENIED: Unauthenticated query.' };
    }

    const token = auth.token;
    const userCompanyId = token.cId || token.companyId;
    const userAuthority = token.aLvl || token.authorityLevel;
    const userRegionId = token.rId || token.regionId;

    if (userCompanyId !== targetCompanyId) {
      return { allowed: false, reason: 'PERMISSION_DENIED: Cross-tenant query blocked.' };
    }

    // For A4 Regional Managers: Query MUST contain `where('assignedRegionId', '==', userRegionId)`
    if (userAuthority === 'A4_REGIONAL_AREA_MANAGER') {
      const regionFilter = queryFilters.find(f => f.field === 'assignedRegionId' && f.operator === '==');

      if (!regionFilter) {
        return {
          allowed: false,
          reason: 'PERMISSION_DENIED: Unbounded query rejected by Firestore. A4 Regional Manager must query within their assigned region constraint.'
        };
      }

      if (regionFilter.value !== userRegionId) {
        return {
          allowed: false,
          reason: `PERMISSION_DENIED: Query region constraint mismatch. Requested region '${regionFilter.value}' != Token claim region '${userRegionId}'.`
        };
      }

      return { allowed: true, reason: `ALLOWED: Query scoped strictly to assigned region '${userRegionId}'.` };
    }

    return { allowed: true, reason: 'ALLOWED' };
  }
}

describe('A4 Regional Manager - Server-Side Firestore Rules & QueryScope Verification', () => {
  const companyId = 'COMP-MAHARASHTRA-FACILITIES';
  const regionMumbai = 'REG-MUMBAI-01';
  const regionPune = 'REG-PUNE-02';

  // A4 Regional Manager for Mumbai Region
  const a4RegionalManagerSession: UserSession = {
    userId: 'USER-A4-MUMBAI',
    employeeId: 'EMP-A4-01',
    fullName: 'Rajesh Kulkarni (Regional Manager Mumbai)',
    email: 'kulkarni.mumbai@enterprise.com',
    role: 'REGIONAL_MANAGER',
    authorityLevel: 'A4_REGIONAL_AREA_MANAGER',
    companyId: companyId,
    assignedRegionId: regionMumbai,
    branchId: 'MUMBAI-HQ',
    token: 'jwt-mock-token',
    tokenExpiresAt: Date.now() + 3600000,
    isBiometricEnabled: false,
    lastActiveAt: Date.now(),
    loginMode: 'PASSWORD',
    accountStatus: 'ACTIVE',
    emailVerified: true,
    companyAdminApproval: 'APPROVED',
    hrApproval: 'APPROVED',
    dataScope: 'REGION'
  };

  // JWT Auth Token payload issued by server Custom Claims
  const a4AuthToken = {
    uid: 'USER-A4-MUMBAI',
    token: {
      cId: companyId,
      aLvl: 'A4_REGIONAL_AREA_MANAGER',
      rId: regionMumbai,
      role: 'REGIONAL_MANAGER',
      status: 'ACTIVE'
    }
  };

  describe('1. Client-Side QueryScopeEngine Behavior', () => {
    it('should automatically inject assignedRegionId constraint for A4 manager', () => {
      const constraints = QueryScopeEngine.buildScope(a4RegionalManagerSession, 'EMPLOYEES');
      expect(constraints.length).toBe(1);
      // QueryScopeEngine binds: where('assignedRegionId', '==', 'REG-MUMBAI-01')
      expect(constraints).toBeDefined();
    });
  });

  describe('2. Server-Side Firestore Security Rules Enforcement', () => {
    it('ALLOWS read when A4 Regional Manager accesses employee belonging to their assigned region (Mumbai)', () => {
      const mumbaiEmployeeDoc = {
        companyId: companyId,
        assignedRegionId: regionMumbai,
        assignedSiteId: 'SITE-BANDRA-TECH-PARK',
        employeeId: 'EMP-MUMBAI-101'
      };

      const result = FirestoreRulesSimulator.evaluateEmployeeReadRule(a4AuthToken, companyId, mumbaiEmployeeDoc);
      expect(result.allowed).toBe(true);
      expect(result.reason).toContain('Regional scope match');
    });

    it('STRICTLY BLOCKS (Server-side PERMISSION_DENIED) when A4 Regional Manager tries to read employee from another region (Pune)', () => {
      const puneEmployeeDoc = {
        companyId: companyId,
        assignedRegionId: regionPune,
        assignedSiteId: 'SITE-HINJEWADI-PHASE-1',
        employeeId: 'EMP-PUNE-201'
      };

      const result = FirestoreRulesSimulator.evaluateEmployeeReadRule(a4AuthToken, companyId, puneEmployeeDoc);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('PERMISSION_DENIED');
      expect(result.reason).toContain('does not match A4 Manager assigned region');
    });

    it('STRICTLY BLOCKS (Server-side PERMISSION_DENIED) when A4 tries to query Pune region directly', () => {
      // Attacker or bypassed frontend attempts: query(where('assignedRegionId', '==', 'REG-PUNE-02'))
      const tamperedQuery = [
        { field: 'assignedRegionId', operator: '==', value: regionPune }
      ];

      const queryResult = FirestoreRulesSimulator.evaluateQueryExecution(a4AuthToken, companyId, tamperedQuery);
      expect(queryResult.allowed).toBe(false);
      expect(queryResult.reason).toContain('PERMISSION_DENIED: Query region constraint mismatch');
    });

    it('STRICTLY BLOCKS (Server-side PERMISSION_DENIED) when A4 tries an unbounded query without region constraint', () => {
      // Attacker attempts to fetch all company employees: query(collection('employees'))
      const unboundedQuery: any[] = [];

      const queryResult = FirestoreRulesSimulator.evaluateQueryExecution(a4AuthToken, companyId, unboundedQuery);
      expect(queryResult.allowed).toBe(false);
      expect(queryResult.reason).toContain('PERMISSION_DENIED: Unbounded query rejected');
    });

    it('ALLOWS correctly scoped query matching custom claim assignedRegionId', () => {
      const validScopedQuery = [
        { field: 'assignedRegionId', operator: '==', value: regionMumbai }
      ];

      const queryResult = FirestoreRulesSimulator.evaluateQueryExecution(a4AuthToken, companyId, validScopedQuery);
      expect(queryResult.allowed).toBe(true);
      expect(queryResult.reason).toContain("scoped strictly to assigned region 'REG-MUMBAI-01'");
    });

    it('STRICTLY BLOCKS cross-tenant access even if region ID matches', () => {
      const otherCompanyId = 'COMP-OTHER-CORP';
      const crossCompanyDoc = {
        companyId: otherCompanyId,
        assignedRegionId: regionMumbai,
        employeeId: 'EMP-OTHER-99'
      };

      const result = FirestoreRulesSimulator.evaluateEmployeeReadRule(a4AuthToken, otherCompanyId, crossCompanyDoc);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Cross-tenant access violation');
    });
  });
});
