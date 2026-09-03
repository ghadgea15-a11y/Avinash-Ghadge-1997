// ============================================================================
// LICENSING & CERTIFICATION EXPIRY TRACKING (MODULE 4)
// Parity with Belfry & Novagems
// ============================================================================

export type ComplianceDocType = 
  | 'PSARA_LICENSE' 
  | 'POLICE_VERIFICATION' 
  | 'ARMS_LICENSE' 
  | 'MEDICAL_FITNESS' 
  | 'FIRE_SAFETY' 
  | 'FIRST_AID';

export type DocRenewalStatus = 
  | 'ACTIVE' 
  | 'EXPIRING_30' 
  | 'EXPIRING_15' 
  | 'EXPIRING_7' 
  | 'EXPIRED' 
  | 'IN_RENEWAL';

export interface GuardComplianceDocument {
  id: string;
  documentId: string;
  companyId: string;
  employeeId: string;
  employeeName: string;
  documentType: ComplianceDocType;
  documentNumber: string;
  issuingAuthority: string;
  issueDate: string; // YYYY-MM-DD
  expiryDate: string; // YYYY-MM-DD
  renewalStatus: DocRenewalStatus;
  isMandatoryForDeployment: boolean; // E.g. PSARA is strictly mandatory
  verificationStatus: 'PENDING' | 'VERIFIED' | 'REJECTED';
  verifiedBy?: string;
  verifiedAt?: number | string;
  fileUrl?: string;
  notes?: string;
  createdAt: number | string;
  updatedAt: number | string;
}

export interface ExpiryNotificationAlert {
  id: string;
  companyId: string;
  employeeId: string;
  employeeName: string;
  supervisorId?: string;
  documentType: ComplianceDocType;
  expiryDate: string;
  daysRemaining: number;
  urgencyLevel: 'INFO' | 'WARNING' | 'CRITICAL'; // 30d, 15d, 7d/Expired
  notifiedRoles: string[]; // ['EMPLOYEE', 'SUPERVISOR', 'HR_ADMIN']
  timestamp: number | string;
  acknowledged: boolean;
}

export interface ShiftComplianceValidationResult {
  allowed: boolean;
  blockReason?: string;
  expiredDocumentType?: ComplianceDocType;
  expiryDate?: string;
  details?: string;
}
