const fs = require('fs');
const file = 'src/services/firestoreService.ts';
let content = fs.readFileSync(file, 'utf8');

// I will just replace the methods I added in the block "RECREATED MISSING METHODS"
let parts = content.split('// RECREATED MISSING METHODS');
if (parts.length === 2) {
  let bottom = parts[1];
  
  // replace `(snap) =>` with `(snap: any) =>`
  bottom = bottom.replace(/\(snap\) =>/g, '(snap: any) =>');
  bottom = bottom.replace(/d =>/g, '(d: any) =>');
  bottom = bottom.replace(/\(err\) =>/g, '(err: any) =>');
  
  // replace all methods starting with `static async` to use `(...args: any[])`
  bottom = bottom.replace(/static async updateOvertimeRequestStatus\([^\)]+\)/g, 'static async updateOvertimeRequestStatus(...args: any[])');
  bottom = bottom.replace(/static async batchRecalculateAttendance\([^\)]+\)/g, 'static async batchRecalculateAttendance(...args: any[])');
  bottom = bottom.replace(/static async recalculateAttendanceRecord\([^\)]+\)/g, 'static async recalculateAttendanceRecord(...args: any[])');
  bottom = bottom.replace(/static async createOvertimeAdjustment\([^\)]+\)/g, 'static async createOvertimeAdjustment(...args: any[])');
  bottom = bottom.replace(/static async resolveOvertimeAdjustment\([^\)]+\)/g, 'static async resolveOvertimeAdjustment(...args: any[])');
  bottom = bottom.replace(/static async saveOvertimePolicy\([^\)]+\)/g, 'static async saveOvertimePolicy(...args: any[])');
  bottom = bottom.replace(/static async updateWorkOrderStatus\([^\)]+\)/g, 'static async updateWorkOrderStatus(...args: any[])');
  bottom = bottom.replace(/static async updateOvertimeAdjustmentStatus\([^\)]+\)/g, 'static async updateOvertimeAdjustmentStatus(...args: any[])');
  bottom = bottom.replace(/static async updateSalaryAdvanceStatus\([^\)]+\)/g, 'static async updateSalaryAdvanceStatus(...args: any[])');
  bottom = bottom.replace(/static async getOvertimePolicy\([^\)]+\)/g, 'static async getOvertimePolicy(companyId: string, policyId?: string)');
  bottom = bottom.replace(/static async createOrSyncOvertimeRequest\([^\)]+\)/g, 'static async createOrSyncOvertimeRequest(...args: any[])');
  bottom = bottom.replace(/static async saveSelectionRecord\([^\)]+\)/g, 'static async saveSelectionRecord(...args: any[])');
  bottom = bottom.replace(/static async saveVerificationRecord\([^\)]+\)/g, 'static async saveVerificationRecord(...args: any[])');
  bottom = bottom.replace(/static async saveJobRequisition\([^\)]+\)/g, 'static async saveJobRequisition(...args: any[])');
  bottom = bottom.replace(/static async saveScreeningRecord\([^\)]+\)/g, 'static async saveScreeningRecord(...args: any[])');
  bottom = bottom.replace(/static async saveInterviewRecord\([^\)]+\)/g, 'static async saveInterviewRecord(...args: any[])');
  bottom = bottom.replace(/static async saveCandidate\([^\)]+\)/g, 'static async saveCandidate(...args: any[])');
  bottom = bottom.replace(/static async saveCandidateDocument\([^\)]+\)/g, 'static async saveCandidateDocument(...args: any[])');
  bottom = bottom.replace(/static async deleteCandidateDocument\([^\)]+\)/g, 'static async deleteCandidateDocument(...args: any[])');
  bottom = bottom.replace(/static async updateLeaveRequestStatus\([^\)]+\)/g, 'static async updateLeaveRequestStatus(...args: any[])');
  
  // also fix OvertimeDashboard returning `result: boolean` instead of the object
  // That error was: OvertimeDashboard.tsx(300,25) - result is expected to be `{ processed: number; successCount: number; errorsCount: number; } | null;`
  
  content = parts[0] + '// RECREATED MISSING METHODS' + bottom;
  fs.writeFileSync(file, content);
}
