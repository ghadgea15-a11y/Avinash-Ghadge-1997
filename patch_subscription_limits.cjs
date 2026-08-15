const fs = require('fs');
let code = fs.readFileSync('src/services/subscriptionService.ts', 'utf8');

const limitsMethod = `
  // ================= USAGE LIMITS ================= //

  static async getEmployeeLimit(companyId: string): Promise<number> {
    try {
      const sub = await this.getCompanySubscription(companyId);
      if (!sub) return 0;
      
      const plan = await this.getPlan(sub.planId);
      if (!plan) return 0;

      return plan.employeeLimit || 0;
    } catch (error) {
      console.error("Error fetching employee limit:", error);
      return 0;
    }
  }

  static async checkEmployeeLimitReached(companyId: string, currentEmployeeCount: number): Promise<boolean> {
    const limit = await this.getEmployeeLimit(companyId);
    return currentEmployeeCount >= limit;
  }
`;

if (!code.includes('getEmployeeLimit')) {
  code = code.replace(
    /export class SubscriptionService \{/,
    `export class SubscriptionService {\n${limitsMethod}`
  );
  fs.writeFileSync('src/services/subscriptionService.ts', code);
}
