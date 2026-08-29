import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PlatformAuthService } from '../server/platformAuthService';

// Mock firebase-admin
vi.mock('firebase-admin/firestore', () => {
  return {
    getFirestore: vi.fn(() => ({
      collection: vi.fn((name) => ({
        doc: vi.fn((id) => ({
          get: vi.fn(async () => {
            if (name === 'super_admins') {
              if (id === 'active-admin') {
                return {
                  exists: true,
                  data: () => ({ status: 'ACTIVE', permissions: ['COMPANY_CREATE'] })
                };
              }
              if (id === 'inactive-admin') {
                return {
                  exists: true,
                  data: () => ({ status: 'INACTIVE', permissions: ['COMPANY_CREATE'] })
                };
              }
              if (id === 'restricted-admin') {
                return {
                  exists: true,
                  data: () => ({ status: 'ACTIVE', permissions: ['COMPANY_UPDATE'] })
                };
              }
            }
            return { exists: false };
          }),
          set: vi.fn(async () => {})
        }))
      }))
    }))
  };
});

describe('PlatformAuthService Security Tests', () => {
  describe('validatePermission', () => {
    it('should allow active admin with correct permission', async () => {
      const hasAccess = await PlatformAuthService.validatePermission('active-admin', 'COMPANY_CREATE');
      expect(hasAccess).toBe(true);
    });

    it('should deny inactive admin', async () => {
      const hasAccess = await PlatformAuthService.validatePermission('inactive-admin', 'COMPANY_CREATE');
      expect(hasAccess).toBe(false);
    });

    it('should deny admin without specific permission', async () => {
      const hasAccess = await PlatformAuthService.validatePermission('restricted-admin', 'COMPANY_CREATE');
      expect(hasAccess).toBe(false);
    });

    it('should deny non-existent admin record', async () => {
      const hasAccess = await PlatformAuthService.validatePermission('unknown-user', 'COMPANY_CREATE');
      expect(hasAccess).toBe(false);
    });
  });

  describe('isSuperAdminClaim', () => {
    it('should identify role based claims', () => {
      expect(PlatformAuthService.isSuperAdminClaim({ role: 'SUPER_ADMIN' })).toBe(true);
    });

    it('should identify platformRole and isPlatformAdmin claims', () => {
      expect(PlatformAuthService.isSuperAdminClaim({ platformRole: 'SUPER_ADMIN' })).toBe(true);
      expect(PlatformAuthService.isSuperAdminClaim({ isPlatformAdmin: true })).toBe(true);
    });

    it('should reject tenant authorityLevel claims attempting to spoof super admin', () => {
      expect(PlatformAuthService.isSuperAdminClaim({ authorityLevel: 'SUPER_ADMIN' })).toBe(false);
      expect(PlatformAuthService.isSuperAdminClaim({ aLvl: 'A0_OWNER' })).toBe(false);
    });

    it('should reject non-admin claims', () => {
      expect(PlatformAuthService.isSuperAdminClaim({ role: 'USER' })).toBe(false);
      expect(PlatformAuthService.isSuperAdminClaim({})).toBe(false);
    });
  });
});
