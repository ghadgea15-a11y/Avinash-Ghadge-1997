import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { FirestoreService } from './firestoreService';
import { CompanyTenant as PlatformCompanyTenant, CreateTenantDTO, TenantStatus } from '../types/platform';
import { UserSession } from '../types';

export class SuperAdminService {
  /**
   * Subscribe to real-time company tenants list from Firestore
   */
  static subscribeToTenants(cb: (data: PlatformCompanyTenant[]) => void) {
    try {
      const colRef = collection(db, 'companies');
      return onSnapshot(colRef, (snapshot) => {
        const tenants: PlatformCompanyTenant[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          tenants.push({
            id: docSnap.id,
            companyCode: data.companyId || docSnap.id,
            name: data.brandName || data.companyLegalName || docSnap.id,
            subscriptionPlan: (data.licenseTier as any) || 'ENTERPRISE',
            enabledModules: data.enabledModules || [],
            status: (data.status as TenantStatus) || 'ACTIVE',
            adminEmail: data.adminEmail || data.email || '',
            maxEmployees: Number(data.maxEmployeesAllowed) || 1000,
            maxSites: Number(data.maxSitesAllowed) || 50,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt
          });
        });

        tenants.sort((a, b) => {
          const dateA = typeof a.createdAt === 'string' ? a.createdAt : '';
          const dateB = typeof b.createdAt === 'string' ? b.createdAt : '';
          return dateB.localeCompare(dateA);
        });

        cb(tenants);
      }, (err) => {
        console.warn('[SuperAdminService] subscribeToTenants fallback:', err);
        FirestoreService.getAllCompanies().then((list) => {
          cb(list.map(c => ({
            id: c.companyId,
            companyCode: c.companyId,
            name: c.brandName,
            subscriptionPlan: (c.licenseTier as any) || 'ENTERPRISE',
            enabledModules: c.enabledModules || [],
            status: (c.status as TenantStatus) || 'ACTIVE',
            adminEmail: c.adminEmail || c.email || '',
            maxEmployees: c.maxEmployeesAllowed || 1000,
            maxSites: c.maxSitesAllowed || 50,
            createdAt: c.createdAt as any,
            updatedAt: c.updatedAt as any
          })));
        });
      });
    } catch (err) {
      console.warn('[SuperAdminService] subscribeToTenants catch:', err);
      FirestoreService.getAllCompanies().then((list) => {
        cb(list.map(c => ({
          id: c.companyId,
          companyCode: c.companyId,
          name: c.brandName,
          subscriptionPlan: (c.licenseTier as any) || 'ENTERPRISE',
          enabledModules: c.enabledModules || [],
          status: (c.status as TenantStatus) || 'ACTIVE',
          adminEmail: c.adminEmail || c.email || '',
          maxEmployees: c.maxEmployeesAllowed || 1000,
          maxSites: c.maxSitesAllowed || 50,
          createdAt: c.createdAt as any,
          updatedAt: c.updatedAt as any
        })));
      });
      return () => {};
    }
  }

  /**
   * Provision a new tenant using standard FirestoreService
   */
  static async createTenant(session: UserSession, data: CreateTenantDTO) {
    const cleanCode = data.companyCode.trim().toUpperCase();
    const result = await FirestoreService.createCompanyWithAdmin({
      company: {
        companyId: cleanCode,
        companyLegalName: data.name.trim(),
        brandName: data.name.trim(),
        licenseTier: data.subscriptionPlan || 'ENTERPRISE',
        status: 'ACTIVE',
        primaryColorHex: '#4f46e5',
        secondaryColorHex: '#06b6d4',
        allowedBranches: ['MAIN'],
        maxEmployeesAllowed: data.maxEmployees || 1000,
        maxSitesAllowed: data.maxSites || 50,
        enabledModules: data.enabledModules || [],
        email: data.adminEmail.trim().toLowerCase(),
        adminEmail: data.adminEmail.trim().toLowerCase(),
        adminName: data.adminEmail.split('@')[0]
      },
      adminInfo: {
        fullName: data.adminEmail.split('@')[0],
        email: data.adminEmail.trim().toLowerCase()
      },
      enabledModules: data.enabledModules || [],
      createdByUid: session.userId,
      createdByName: session.fullName || 'System Super Admin'
    });

    if (!result.success) {
      throw new Error(result.message);
    }
    return result;
  }

  /**
   * Update Tenant Status
   */
  static async updateTenantStatus(session: UserSession, tenantId: string, status: TenantStatus, reason?: string) {
    const validStatus: 'ACTIVE' | 'SUSPENDED' = status === 'SUSPENDED' ? 'SUSPENDED' : 'ACTIVE';
    const ok = await FirestoreService.updateCompanyDetails(tenantId, { status: validStatus });
    if (!ok) {
      throw new Error(`Failed to update status for tenant ${tenantId}`);
    }
    await FirestoreService.logAuditEvent(
      tenantId,
      session.userId,
      session.fullName || 'Super Admin',
      'SUPER_ADMIN',
      `UPDATE_TENANT_STATUS_${status}`,
      `Status changed to ${status}. Reason: ${reason || 'Manual Super Admin Action'}`
    );
    return true;
  }

  /**
   * Update Module Entitlements
   */
  static async updateModuleEntitlements(session: UserSession, tenantId: string, modules: string[]) {
    const ok = await FirestoreService.updateCompanyDetails(tenantId, { enabledModules: modules });
    if (!ok) {
      throw new Error(`Failed to update module entitlements for tenant ${tenantId}`);
    }
    await FirestoreService.logAuditEvent(
      tenantId,
      session.userId,
      session.fullName || 'Super Admin',
      'SUPER_ADMIN',
      'UPDATE_MODULE_ENTITLEMENTS',
      `Updated enabled modules (${modules.length} active): ${modules.join(', ')}`
    );
    return true;
  }
}
