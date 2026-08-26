export class SecurityAuditService {
  static async logUnauthorizedAttempt(...args: any[]) {}
  static async logEvent(...args: any[]): Promise<void> {}
  static async updateAnomalyStatus(...args: any[]): Promise<boolean> { return true; }
  static async getEvents(...args: any[]): Promise<any[]> { return []; }
  static async getAnomalies(...args: any[]): Promise<any[]> { return []; }
  static _setSetDocMock(mock: any) {}
}
