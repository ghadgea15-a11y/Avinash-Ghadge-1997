export class BpmDelegationService {
  static async canUserActOnInstance(...args: any[]): Promise<any> { return { canAct: true }; }
  static async getDelegatedPendingApprovals(...args: any[]): Promise<any[]> { return []; }
  static async getActiveProxiesForApprovers(...args: any[]): Promise<any[]> { return []; }
  static matchesScope(...args: any[]): boolean { return true; }
  static validateDates(...args: any[]): any { return {}; }
  static validateScope(...args: any[]): any { return {}; }
  static async refreshCompanyDelegationStatuses(...args: any[]): Promise<void> {}
  static async getMyCreatedDelegations(...args: any[]): Promise<any[]> { return []; }
  static async getMyActiveProxyAssignments(...args: any[]): Promise<any[]> { return []; }
  static async getAllCompanyDelegations(...args: any[]): Promise<any[]> { return []; }
  static async createDelegation(...args: any[]): Promise<any> {}
  static async revokeDelegation(...args: any[]): Promise<any> {}
}
