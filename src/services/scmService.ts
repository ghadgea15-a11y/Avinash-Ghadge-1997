export class ScmService {
  static async handleThresholdAlerts(t: any, session: any, companyId: string, locationId: string, itemData: any, oldQty: number, newQty: number): Promise<string> {
    return 'OK';
  }
  static async getRfqBids(...args: any[]): Promise<any[]> { return []; }
  static async getSrmVendors(...args: any[]): Promise<any[]> { return []; }
  static async getGatePasses(...args: any[]): Promise<any[]> { return []; }
  static async approveGatePass(...args: any[]): Promise<void> {}
  static async dispatchGatePass(...args: any[]): Promise<void> {}
  static async receiveGatePass(...args: any[]): Promise<void> {}
  static async returnGatePassMaterials(...args: any[]): Promise<void> {}
  static async getLocations(...args: any[]): Promise<any[]> { return []; }
  static async getItems(...args: any[]): Promise<any[]> { return []; }
  static async submitGatePass(...args: any[]): Promise<void> {}
  static async verifyGatePass(...args: any[]): Promise<void> {}
  static async saveItem(...args: any[]): Promise<void> {}
  static async getBalances(...args: any[]): Promise<any[]> { return []; }
  static async saveLocation(...args: any[]): Promise<void> {}
  static async issueStock(...args: any[]): Promise<void> {}
  static async getRfqs(...args: any[]): Promise<any[]> { return []; }
}
