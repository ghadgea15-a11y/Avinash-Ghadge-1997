export class MaintenanceService {
  static async schedulePreventiveMaintenance(companyId: string): Promise<void> {}
  static async completeWorkOrder(companyId: string, woId: string): Promise<void> {}
}
