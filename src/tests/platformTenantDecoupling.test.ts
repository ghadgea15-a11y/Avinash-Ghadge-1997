import { describe, it, expect, vi } from 'vitest';
import { FirebaseAuthService } from '../services/firebaseAuthService';
import { SessionManager } from '../services/sessionManager';

describe('Platform Tenant Decoupling & Security Architecture', () => {
  describe('FirebaseAuthService.verifyCompanyCode', () => {
    it('should reject GLOBAL_ADMIN with explicit Platform Control Plane message', async () => {
      await expect(FirebaseAuthService.verifyCompanyCode('GLOBAL_ADMIN'))
        .rejects
        .toThrow('GLOBAL-ADMIN is the Platform Control Plane identifier, not a customer tenant code. Please use the Platform Owner login portal.');
    });

    it('should reject GLOBAL-ADMIN with explicit Platform Control Plane message', async () => {
      await expect(FirebaseAuthService.verifyCompanyCode('GLOBAL-ADMIN'))
        .rejects
        .toThrow('GLOBAL-ADMIN is the Platform Control Plane identifier, not a customer tenant code. Please use the Platform Owner login portal.');
    });

    it('should reject empty company code', async () => {
      await expect(FirebaseAuthService.verifyCompanyCode(''))
        .rejects
        .toThrow('Company Code is mandatory for registration.');
    });
  });

  describe('SessionManager Company Decoupling for Platform Owner', () => {
    it('should properly clear active company when switching to Super Admin', () => {
      // Set a customer company
      SessionManager.setActiveCompany({
        companyId: 'ACME_CORP',
        companyLegalName: 'Acme Corporation',
        brandName: 'Acme',
        licenseTier: 'ENTERPRISE',
        allowedBranches: ['HQ'],
        maxEmployeesAllowed: 100,
        maxSitesAllowed: 10,
        primaryColorHex: '#4f46e5',
        secondaryColorHex: '#06b6d4',
        status: 'ACTIVE'
      });

      expect(SessionManager.getActiveCompany()?.companyId).toBe('ACME_CORP');

      // Super Admin login clears active company
      SessionManager.clearActiveCompany();

      expect(SessionManager.getActiveCompany()).toBeNull();
    });
  });
});
