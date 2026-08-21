import * as fs from 'fs';

const file = 'src/types/index.ts';
let content = fs.readFileSync(file, 'utf8');

const certTypes = `
// ============================================================================
// MODULE 13: POINT 2 - CERTIFICATION EXPIRY TRACKING
// ============================================================================
export type CertificationStatus = 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED' | 'RENEWED' | 'REVOKED';

export interface EmployeeCertificationRecord {
  id: string; // Internal GUID
  companyId: string;
  employeeId: string;
  employeeName: string;
  certificationName: string;
  certificationType: string;
  issuingAuthority: string;
  certificateNumber: string;
  issueDate: string; // ISO Date
  expiryDate?: string; // ISO Date
  isMandatory: boolean;
  status: CertificationStatus;
  documentUrl?: string;
  verificationStatus: 'PENDING' | 'VERIFIED' | 'REJECTED';
  verifiedBy?: string;
  verifiedAt?: string;
  siteId?: string;
  department?: string;
  designation?: string;
  previousCertificationId?: string; // For renewal chain
  renewedByCertificationId?: string; // Points to the new active certificate
  createdAt: string;
  updatedAt: string;
}

`;

if (!content.includes('EmployeeCertificationRecord')) {
  content = content.replace(
    '// ============================================================================',
    certTypes + '\n// ============================================================================'
  );
  fs.writeFileSync(file, content);
  console.log('Added EmployeeCertificationRecord');
} else {
  console.log('Already exists');
}
