import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FirestoreService } from '../services/firestoreService';
import { 
  BranchRecord, 
  SiteRecord, 
  DepartmentRecord, 
  DesignationRecord, 
  VendorRecord, 
  CostCentreRecord, 
  UserMembershipRecord,
  CompanyTenant,
  UserSession
} from '../types';

vi.mock('../firebase', () => ({
  db: {}
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn((_db, ...pathSegments) => ({ path: pathSegments.join('/') })),
  doc: vi.fn((_db, ...pathSegments) => ({ id: pathSegments[pathSegments.length - 1], path: pathSegments.join('/') })),
  getDocs: vi.fn().mockResolvedValue({
    docs: [
      { id: 'item-1', data: () => ({ id: 'item-1', name: 'Sample Item', status: 'ACTIVE' }) }
    ]
  }),
  getDoc: vi.fn().mockResolvedValue({
    exists: () => true,
    id: 'test-comp',
    data: () => ({ companyId: 'test-comp', brandName: 'Acme Security Corp', licenseTier: 'ENTERPRISE' })
  }),
  setDoc: vi.fn().mockResolvedValue(undefined),
  updateDoc: vi.fn().mockResolvedValue(undefined),
  deleteDoc: vi.fn().mockResolvedValue(undefined),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  onSnapshot: vi.fn(() => () => {})
}));

describe('Company Admin End-to-End FirestoreService Operations', () => {
  const companyId = 'COMP-TEST-001';
  const mockSession: UserSession = {
    userId: 'admin-1',
    companyId: 'COMP-TEST-001',
    role: 'COMPANY_ADMIN',
    email: 'admin@acme.com',
    fullName: 'Admin User'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Branches CRUD', () => {
    it('should save a branch record successfully', async () => {
      const branch: BranchRecord = {
        id: 'BR-MUM',
        companyId,
        name: 'Mumbai Regional HQ',
        code: 'MUM-HQ',
        city: 'Mumbai',
        address: 'Bandra Kurla Complex',
        status: 'ACTIVE',
        regionId: 'reg-west',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const result = await FirestoreService.saveBranch(companyId, branch);
      expect(result).toBe(true);
    });

    it('should delete a branch record successfully', async () => {
      const result = await FirestoreService.deleteBranch(companyId, 'BR-MUM');
      expect(result).toBe(true);
    });

    it('should fetch branches successfully', async () => {
      const branches = await FirestoreService.getBranches(companyId);
      expect(Array.isArray(branches)).toBe(true);
      expect(branches.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Sites CRUD', () => {
    it('should save a site location with geofence parameters', async () => {
      const site: SiteRecord = {
        id: 'SITE-01',
        companyId,
        name: 'Tech Zone Hub',
        code: 'TECH_ZONE',
        branchId: 'BR-MUM',
        clientName: 'Microsoft Tech Park',
        address: 'Gate 4, Hinjewadi Phase 2',
        status: 'ACTIVE',
        attendanceMode: 'GEO_FENCE',
        geofenceEnabled: true,
        latitude: 18.5913,
        longitude: 73.7389,
        geofenceRadius: 150,
        accuracyThreshold: 40,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const result = await FirestoreService.saveSite(companyId, site);
      expect(result).toBe(true);
    });

    it('should delete a site successfully', async () => {
      const result = await FirestoreService.deleteSite(companyId, 'SITE-01');
      expect(result).toBe(true);
    });

    it('should fetch sites successfully', async () => {
      const sites = await FirestoreService.getSites(companyId);
      expect(Array.isArray(sites)).toBe(true);
      expect(sites.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Departments CRUD', () => {
    it('should save a department successfully', async () => {
      const dept: DepartmentRecord = {
        id: 'DEPT-OPS',
        companyId,
        name: 'Field Operations',
        code: 'OPS',
        description: 'On-ground patrolling and guard muster operations',
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const result = await FirestoreService.saveDepartment(companyId, dept);
      expect(result).toBe(true);
    });

    it('should delete a department successfully', async () => {
      const result = await FirestoreService.deleteDepartment(companyId, 'DEPT-OPS');
      expect(result).toBe(true);
    });

    it('should fetch departments successfully', async () => {
      const depts = await FirestoreService.getDepartments(companyId);
      expect(Array.isArray(depts)).toBe(true);
    });
  });

  describe('Designations CRUD', () => {
    it('should save a designation hierarchy record', async () => {
      const desig: DesignationRecord = {
        id: 'DESIG-SUP',
        companyId,
        title: 'Area Field Supervisor',
        level: 'L4'
      };

      const result = await FirestoreService.saveDesignation(companyId, desig);
      expect(result).toBe(true);
    });

    it('should delete a designation successfully', async () => {
      const result = await FirestoreService.deleteDesignation(companyId, 'DESIG-SUP');
      expect(result).toBe(true);
    });

    it('should fetch designations successfully', async () => {
      const desigs = await FirestoreService.getDesignations(companyId);
      expect(Array.isArray(desigs)).toBe(true);
    });
  });

  describe('Vendors CRUD', () => {
    it('should save a vendor agency record', async () => {
      const vendor: VendorRecord = {
        id: 'VEND-01',
        companyId,
        vendorName: 'Eagle Guarding Services Pvt Ltd',
        vendorCode: 'EAGLE-01',
        serviceType: 'SECURITY_AGENCY',
        gstinNumber: '27AABCU9603R1ZM',
        panNumber: 'AABCU9603R',
        contactPerson: 'Vikram Singh',
        contactPhone: '+91 9820012345',
        contactEmail: 'contact@eagleservices.com',
        address: 'Andheri East, Mumbai',
        contractStartDate: '2024-01-01',
        status: 'ACTIVE',
        createdAt: new Date().toISOString()
      };

      const result = await FirestoreService.saveVendor(companyId, vendor);
      expect(result).toBe(true);
    });

    it('should delete a vendor agency successfully', async () => {
      const result = await FirestoreService.deleteVendor(companyId, 'VEND-01');
      expect(result).toBe(true);
    });

    it('should fetch vendors successfully', async () => {
      const vendors = await FirestoreService.getVendors(companyId);
      expect(Array.isArray(vendors)).toBe(true);
    });
  });

  describe('Cost Centres CRUD', () => {
    it('should save a cost centre record', async () => {
      const costCentre: CostCentreRecord = {
        id: 'CC-OPS-01',
        companyId,
        code: 'CC-OPS-01',
        name: 'West Zone Operational Budget',
        description: 'Patrol fuel and site logistics allocation',
        budgetAllocated: 750000,
        status: 'ACTIVE'
      };

      const result = await FirestoreService.saveCostCentre(companyId, costCentre);
      expect(result).toBe(true);
    });

    it('should delete a cost centre successfully', async () => {
      const result = await FirestoreService.deleteCostCentre(companyId, 'CC-OPS-01');
      expect(result).toBe(true);
    });

    it('should fetch cost centres successfully', async () => {
      const ccList = await FirestoreService.getCostCentres(companyId);
      expect(Array.isArray(ccList)).toBe(true);
    });
  });

  describe('User Memberships CRUD', () => {
    it('should create a new company user membership', async () => {
      const member: UserMembershipRecord = {
        userId: 'usr-new-001',
        companyId,
        fullName: 'Sunil Verma',
        email: 'sunil@acmesecurity.com',
        phone: '+91 9988776655',
        role: 'SUPERVISOR',
        status: 'ACTIVE',
        createdAt: new Date().toISOString()
      };

      const result = await FirestoreService.createUserMembership(companyId, member);
      expect(result).toBe(true);
    });

    it('should update user membership role and status', async () => {
      const member: UserMembershipRecord = {
        userId: 'usr-new-001',
        companyId,
        fullName: 'Sunil Verma',
        email: 'sunil@acmesecurity.com',
        role: 'OPS_MANAGER',
        status: 'ACTIVE'
      };

      const result = await FirestoreService.updateUserMembership(mockSession, companyId, member);
      expect(result).toBe(true);
    });

    it('should delete user membership', async () => {
      const result = await FirestoreService.deleteUserMembership(companyId, 'usr-new-001');
      expect(result).toBe(true);
    });
  });

  describe('Tenant Profile & Branding', () => {
    it('should update company tenant profile and branding details', async () => {
      const tenantUpdate: CompanyTenant = {
        companyId,
        brandName: 'Acme Global Security',
        companyLegalName: 'Acme Global Security Services India Pvt Ltd',
        companyCode: 'AGS',
        licenseTier: 'ENTERPRISE',
        status: 'ACTIVE',
        tagline: 'Leading 24/7 Asset & Personnel Protection',
        primaryColorHex: '#4338ca',
        secondaryColorHex: '#0891b2',
        logoUrl: 'https://cdn.acme.com/brand/logo.png',
        loginBackgroundUrl: 'https://cdn.acme.com/brand/bg.jpg',
        adminEmail: 'ops-admin@acmesecurity.com',
        phone: '+91 22 2847 9000',
        websiteUrl: 'https://acmeglobalsecurity.com',
        address: 'Tower B, World Trade Center',
        city: 'Mumbai',
        country: 'India',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const result = await FirestoreService.updateCompanyTenantDetails(tenantUpdate);
      expect(result).toBe(true);
    });

    it('should fetch company tenant details', async () => {
      const tenant = await FirestoreService.getCompanyTenantDetails(companyId);
      expect(tenant).not.toBeNull();
      expect(tenant?.companyId).toBe('test-comp');
    });
  });
});
