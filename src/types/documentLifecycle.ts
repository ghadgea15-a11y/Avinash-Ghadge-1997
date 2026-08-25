export type DocLifecycleStatus = 'VALID' | 'EXPIRING_SOON' | 'EXPIRED' | 'RENEWAL_PENDING' | 'REPLACED' | 'ARCHIVED';

export interface LifecycleDocument {
  id: string;
  companyId: string;
  title: string;
  docType: 'CONTRACT' | 'LICENSE' | 'CERTIFICATE' | 'POLICY' | 'OTHER';
  entityRefType: 'COMPANY' | 'SITE' | 'VENDOR' | 'EMPLOYEE';
  entityRefId: string;
  ownerId: string;
  issueDate: string;
  expiryDate: string;
  status: DocLifecycleStatus;
  currentVersionId: string;
  reminderScheduleDays: number[]; // Positive for before expiry, negative for after expiry (escalation)
  lastReminderLevel?: number | null; // The last reminder day triggered
  createdAt: string;
  updatedAt: string;
}

export interface DocumentVersion {
  id: string;
  documentId: string;
  companyId: string;
  versionNumber: number;
  fileUrl: string;
  uploadedBy: string;
  uploadedAt: string;
  approvedBy?: string;
  notes?: string;
  status: 'ACTIVE' | 'ARCHIVED';
}

export interface RenewalRequest {
  id: string;
  documentId: string;
  companyId: string;
  requestedBy: string;
  newIssueDate: string;
  newExpiryDate: string;
  newFileUrl: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  bpmInstanceId?: string;
  createdAt: string;
  updatedAt: string;
}
