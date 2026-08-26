export class SuperAdminService {
  static subscribeToTenants(cb: (data: any) => void) {
    return () => {};
  }
  static async createTenant(session: any, data: any) {}
  static async updateTenantStatus(session: any, tenantId: string, status: string, reason: string) {}
  static async updateModuleEntitlements(session: any, tenantId: string, modules: string[]) {}
}
