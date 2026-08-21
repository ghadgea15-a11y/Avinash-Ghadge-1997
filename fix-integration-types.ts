import * as fs from 'fs';

const types = 'src/types/index.ts';
let tContent = fs.readFileSync(types, 'utf8');

if (!tContent.includes("lmsComplianceStatus")) {
  tContent = tContent.replace(
    "lifecycleStatus: EmployeeLifecycleStatus;",
    "lifecycleStatus: EmployeeLifecycleStatus;\n  lmsComplianceStatus?: 'COMPLIANT' | 'NON_COMPLIANT' | 'PENDING_TRAINING' | 'EXPIRED';\n  latestLmsCertExpiry?: string;\n  convertedFromCandidateId?: string;"
  );
}

if (!tContent.includes("convertedToEmployeeId")) {
  // Let's check if CandidateRecord exists. If not, don't worry.
  if (tContent.includes("export interface CandidateRecord")) {
     tContent = tContent.replace(
       "export interface CandidateRecord {",
       "export interface CandidateRecord {\n  convertedToEmployeeId?: string;\n  backgroundCheckStatus?: 'PENDING' | 'CLEARED' | 'FAILED';"
     );
  }
}

fs.writeFileSync(types, tContent);
console.log('Added integration fields to types');
