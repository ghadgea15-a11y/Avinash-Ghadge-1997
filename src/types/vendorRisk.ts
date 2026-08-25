export type VendorRiskStatus = 'REGISTERED' | 'VERIFICATION_PENDING' | 'VERIFIED' | 'CONTRACT_ACTIVE' | 'SUSPENDED' | 'EXPIRED' | 'TERMINATED' | 'RENEWAL_PENDING';

export interface VendorContract {
  id: string;
  vendorId: string;
  companyId: string;
  title: string;
  startDate: string;
  endDate: string;
  status: 'DRAFT' | 'ACTIVE' | 'EXPIRED' | 'TERMINATED';
  assignedServices: string[];
  authorizedSites: string[]; // Strict site isolation
  createdAt: string;
}

export interface VendorComplianceDoc {
  id: string;
  vendorId: string;
  companyId: string;
  docType: string;
  issueDate: string;
  expiryDate: string;
  status: 'VALID' | 'EXPIRED' | 'PENDING_REVIEW';
  documentUrl?: string;
}

export interface ExternalPersonnel {
  id: string;
  vendorId: string;
  companyId: string;
  name: string;
  role: string;
  authorizedSites: string[]; // Site isolation
  accessExpiryDate: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'EXPIRED' | 'REVOKED';
  internalPermissionsGranted: boolean; // Must be FALSE
}
