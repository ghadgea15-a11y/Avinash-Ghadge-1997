export class BiometricDeviceService {
  static async getDevices() { return []; }
  static async getCompanyDevices(...args: any[]): Promise<any[]> { return []; }
  static subscribeCompanyDevices(...args: any[]): () => void { return () => {}; }
  static async discoverAndAutoMapEmployees(...args: any[]): Promise<any> { return {}; }
  static async saveEmployeeMapping(...args: any[]): Promise<void> {}
  static async registerDevice(...args: any[]): Promise<any> { return {}; }
  static async syncDeviceClock(...args: any[]): Promise<any> { return {}; }
  static async syncDevicePunches(...args: any[]): Promise<any> { return {}; }
  static async getAuditLogs(...args: any[]): Promise<any[]> { return []; }
  static async getDeviceMappings(...args: any[]): Promise<any[]> { return []; }
}
