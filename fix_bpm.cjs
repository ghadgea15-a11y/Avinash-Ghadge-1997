const fs = require('fs');
let content = fs.readFileSync('src/services/bpmIntegrationService.ts', 'utf8');

// replace FirestoreService.update... in bpmIntegrationService
content = content.replace(/await FirestoreService\.updateLeaveRequestStatus\([^;]+;/g,
  "await this.performWrite(doc(db, 'companies', instance.companyId, 'leaveRequests', instance.sourceRecordId), { status: action === 'REJECT' ? 'REJECTED' : 'APPROVED' }, transaction);");

content = content.replace(/await FirestoreService\.updateOvertimeAdjustmentStatus\([^;]+;/g,
  "await this.performWrite(doc(db, 'companies', instance.companyId, 'overtime_adjustments', instance.sourceRecordId), { status: action === 'REJECT' ? 'REJECTED' : 'APPROVED' }, transaction);");

content = content.replace(/await FirestoreService\.updateSalaryAdvanceStatus\([^;]+;/g,
  "await this.performWrite(doc(db, 'companies', instance.companyId, 'salary_advances', instance.sourceRecordId), { status: action === 'REJECT' ? 'REJECTED' : 'APPROVED' }, transaction);");

fs.writeFileSync('src/services/bpmIntegrationService.ts', content);
