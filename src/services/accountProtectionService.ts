export class AccountProtectionService {
  static async recordUnauthorizedAction(...args: any[]): Promise<void> {}
  static async recordFailedLogin(...args: any[]): Promise<void> {}
  static async isAccountLocked(...args: any[]): Promise<any> { return { locked: false }; }
  static async recordSuccessfulLogin(...args: any[]): Promise<void> {}
  static getSafeErrorMessage(...args: any[]): string { return "Error"; }
}
