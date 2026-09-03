import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PlatformAuthClient } from '../services/platformAuthClient';
import { PlatformAuthService } from '../server/platformAuthService';
import { SuperAdminService } from '../services/superAdminService';
import { SubscriptionService } from '../services/subscriptionService';
import { FirestoreService } from '../services/firestoreService';
import { getNavItemsForRole } from '../config/navigationArchitecture';
import { UserSession } from '../types';

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
            }
            return { exists: false };
          }),
          set: vi.fn(async () => {})
        }))
      }))
    }))
  };
});

// Mock client firestore operations
const mockGetDoc = vi.fn();
const mockSetDoc = vi.fn();
const mockUpdateDoc = vi.fn();
const mockGetDocs = vi.fn();
const mockOnSnapshot = vi.fn();
const mockAddDoc = vi.fn();

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({})),
  doc: vi.fn((_db, ...parts) => ({ path: parts.join('/') })),
  collection: vi.fn((_db, ...parts) => ({ path: parts.join('/') })),
  query: vi.fn((col) => col),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  getDoc: (...args: any[]) => mockGetDoc(...args),
  getDocFromServer: (...args: any[]) => mockGetDoc(...args),
  setDoc: (...args: any[]) => mockSetDoc(...args),
  updateDoc: (...args: any[]) => mockUpdateDoc(...args),
  getDocs: (...args: any[]) => mockGetDocs(...args),
  onSnapshot: (...args: any[]) => mockOnSnapshot(...args),
  addDoc: (...args: any[]) => mockAddDoc(...args),
  serverTimestamp: vi.fn(() => 'MOCK_TIMESTAMP'),
}));

describe('Platform Owner Dashboard & Sub-Screens End-to-End Audit Suite', () => {
  const superAdminSession: UserSession = {
    userId: 'superadmin_1',
    email: 'admin@platform.com',
    fullName: 'System Administrator',
    role: 'SUPER_ADMIN',
    companyId: 'GLOBAL_ADMIN',
    accountStatus: 'ACTIVE',
    mfaVerified: true,
  };

  const tenantAdminSession: UserSession = {
    userId: 'tenant_admin_1',
    email: 'owner@tenant.com',
    fullName: 'Tenant Admin',
    role: 'COMPANY_ADMIN',
    companyId: 'COMP_123',
    accountStatus: 'ACTIVE',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Platform RBAC & SuperAdminGate Verification', () => {
    it('PlatformAuthClient correctly identifies Super Admin sessions', () => {
      expect(PlatformAuthClient.isSuperAdmin(superAdminSession)).toBe(true);
      expect(PlatformAuthClient.isSuperAdmin(tenantAdminSession)).toBe(false);
      expect(PlatformAuthClient.isSuperAdmin(null)).toBe(false);
    });

    it('PlatformAuthService validates active super admin permissions', async () => {
      const allowed = await PlatformAuthService.validatePermission('active-admin', 'COMPANY_CREATE');
      expect(allowed).toBe(true);
    });

    it('PlatformAuthService denies inactive platform admin', async () => {
      const allowed = await PlatformAuthService.validatePermission('inactive-admin', 'COMPANY_CREATE');
      expect(allowed).toBe(false);
    });

    it('PlatformAuthService rejects tenant role spoofing', () => {
      expect(PlatformAuthService.isSuperAdminClaim({ role: 'SUPER_ADMIN' })).toBe(true);
      expect(PlatformAuthService.isSuperAdminClaim({ authorityLevel: 'SUPER_ADMIN' })).toBe(false);
      expect(PlatformAuthService.isSuperAdminClaim({ role: 'COMPANY_ADMIN' })).toBe(false);
    });
  });

  describe('2. Navigation Architecture & Role Isolation', () => {
    it('Super Admin has access to all platform owner sub-screens', () => {
      const navItems = getNavItemsForRole('SUPER_ADMIN', true);
      const screens = navItems.map(i => i.screen);

      expect(screens).toContain('SUPER_ADMIN_DASHBOARD');
      expect(screens).toContain('SUPER_ADMIN_COMPANIES');
      expect(screens).toContain('SUPER_ADMIN_CREATE_COMPANY');
      expect(screens).toContain('SUPER_ADMIN_SUBSCRIPTIONS');
      expect(screens).toContain('SUPER_ADMIN_MODULES');
      expect(screens).toContain('SUPER_ADMIN_SUPPORT');
      expect(screens).toContain('SUPER_ADMIN_LEADS');
      expect(screens).toContain('SUPER_ADMIN_PENDING_APPROVALS');
      expect(screens).toContain('SUPER_ADMIN_REPORTS');
      expect(screens).toContain('SUPER_ADMIN_ADMINS');
      expect(screens).toContain('SUPER_ADMIN_SECURITY');
      expect(screens).toContain('SUPER_ADMIN_AUDIT');
      expect(screens).toContain('SUPER_ADMIN_MONITORING');
      expect(screens).toContain('SUPER_ADMIN_CONFIG');
    });

    it('Regular tenant admin is strictly blocked from all SUPER_ADMIN_* screens', () => {
      const navItems = getNavItemsForRole('COMPANY_ADMIN', false);
      const superAdminScreens = navItems.filter(i => i.isSuperAdminOnly);
      expect(superAdminScreens.length).toBe(0);
    });
  });

  describe('3. Module Entitlements Engine', () => {
    it('updates company module entitlements and creates an audit record', async () => {
      mockSetDoc.mockResolvedValue(undefined);

      const result = await SuperAdminService.updateModuleEntitlements(
        superAdminSession,
        'COMP_ALPHA',
        ['GUARD_TOUR', 'VEHICLE_LOG', 'VISITOR_MANAGEMENT']
      );

      expect(result).toBe(true);
      expect(mockSetDoc).toHaveBeenCalledWith(
        expect.objectContaining({ path: 'companies/COMP_ALPHA' }),
        expect.objectContaining({
          enabledModules: ['GUARD_TOUR', 'VEHICLE_LOG', 'VISITOR_MANAGEMENT'],
        }),
        { merge: true }
      );
    });
  });

  describe('4. Subscription & Plan Management', () => {
    it('assigns subscription plan to company and synchronizes entitlements', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          planId: 'PROFESSIONAL',
          name: 'Professional Plan',
          maxEmployees: 250,
          maxSites: 10,
          priceMonthly: 199,
          priceAnnual: 1990,
          features: ['ATTENDANCE', 'LEAVE_MANAGEMENT', 'PAYROLL_BASIC'],
          isActive: true
        })
      });
      mockSetDoc.mockResolvedValue(undefined);

      const subscription = await SubscriptionService.assignPlanToCompany(
        'COMP_BETA',
        'PROFESSIONAL',
        'MONTHLY',
        12,
        superAdminSession.userId
      );

      expect(subscription.companyId).toBe('COMP_BETA');
      expect(subscription.planId).toBe('PROFESSIONAL');
      expect(subscription.billingCycle).toBe('MONTHLY');
      expect(subscription.status).toBe('ACTIVE');

      expect(mockSetDoc).toHaveBeenCalled();
      const calls = mockSetDoc.mock.calls;
      const subCall = calls.find(call => call[0].path.startsWith('companies/COMP_BETA/subscriptions/'));
      expect(subCall).toBeDefined();
    });
  });

  describe('5. Platform Security Anomaly Resolution', () => {
    it('resolves security threat event with admin metadata', async () => {
      mockUpdateDoc.mockResolvedValue(undefined);
      mockSetDoc.mockResolvedValue(undefined);

      await SuperAdminService.resolveSecurityEvent(
        'SEC_EVT_999',
        'superadmin_1',
        'admin@platform.com',
        'False positive from internal penetration test'
      );

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.objectContaining({ path: 'platform_security_events/SEC_EVT_999' }),
        expect.objectContaining({
          resolved: true,
          resolvedBy: 'admin@platform.com',
          resolutionNote: 'False positive from internal penetration test',
        })
      );
    });
  });

  describe('6. Controlled Support Session Lifecycle', () => {
    it('provisions a time-bounded support access session', async () => {
      mockSetDoc.mockResolvedValue(undefined);

      const sessionRecord = await SuperAdminService.createSupportAccessSession(
        superAdminSession,
        'COMP_GAMMA',
        'Debugging payroll export anomaly and tenant roster',
        240,
        'READ_ONLY'
      );

      expect(sessionRecord.id).toContain('SUP-');
      expect(sessionRecord.isActive).toBe(true);
      expect(sessionRecord.targetCompanyId).toBe('COMP_GAMMA');
      expect(sessionRecord.superAdminUid).toBe(superAdminSession.userId);
    });

    it('revokes an active support session with justification', async () => {
      mockUpdateDoc.mockResolvedValue(undefined);
      mockSetDoc.mockResolvedValue(undefined);

      const revoked = await SuperAdminService.revokeSupportAccessSession(
        superAdminSession,
        'SAS-999',
        'Maintenance completed successfully'
      );

      expect(revoked).toBe(true);
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.objectContaining({ path: 'support_sessions/SAS-999' }),
        expect.objectContaining({
          isActive: false,
          revokedBy: superAdminSession.userId
        })
      );
    });
  });

  describe('7. Global Approvals Subscription Scope', () => {
    it('subscribes to platform root approval_requests collection when scope is GLOBAL_ADMIN or SUPER_ADMIN', () => {
      const mockUnsubscribe = vi.fn();
      mockOnSnapshot.mockReturnValueOnce(mockUnsubscribe);

      const unsubscribe = FirestoreService.subscribeToApprovalRequests(
        superAdminSession,
        'GLOBAL_ADMIN',
        () => {}
      );

      expect(mockOnSnapshot).toHaveBeenCalled();
      const colRefArg = mockOnSnapshot.mock.calls[0][0];
      expect(colRefArg.path).toBe('approval_requests');
      expect(unsubscribe).toBe(mockUnsubscribe);
    });

    it('subscribes to tenant scoped approval_requests collection when companyId is customer tenant', () => {
      const mockUnsubscribe = vi.fn();
      mockOnSnapshot.mockReturnValueOnce(mockUnsubscribe);

      FirestoreService.subscribeToApprovalRequests(
        tenantAdminSession,
        'COMP_123',
        () => {}
      );

      expect(mockOnSnapshot).toHaveBeenCalled();
      const colRefArg = mockOnSnapshot.mock.calls[0][0];
      expect(colRefArg.path).toBe('companies/COMP_123/approval_requests');
    });
  });
});
