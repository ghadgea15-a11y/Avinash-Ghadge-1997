import * as fs from 'fs';

const file = 'src/types/index.ts';
let content = fs.readFileSync(file, 'utf8');

const vendorTypes = `
// ============================================================================
// MODULE 14.1: VENDOR MANAGEMENT SYSTEM
// ============================================================================

export type VendorTier = 'TIER_1_PREFERRED' | 'TIER_2_APPROVED' | 'TIER_3_PROVISIONAL' | 'BLACKLISTED';
export type VendorStatus = 'DRAFT' | 'UNDER_REVIEW' | 'ACTIVE' | 'SUSPENDED' | 'INACTIVE';
export type VendorDocType = 'GST_CERTIFICATE' | 'PAN_CARD' | 'MSME_CERTIFICATE' | 'CANCELLED_CHEQUE' | 'PSARA_LICENSE' | 'ISO_CERTIFICATE';

export interface VendorRecord {
  id: string; // vendorId
  companyId: string;
  businessName: string;
  legalEntityName: string;
  category: string;
  subCategories: string[];
  tier: VendorTier;
  status: VendorStatus;
  contactPerson: {
    name: string;
    phone: string;
    email: string;
  };
  billingAddress: string;
  bankDetails: {
    accountName: string;
    accountNumber: string;
    ifscCode: string;
    bankName: string;
  };
  taxDetails: {
    gstin: string;
    panNumber: string;
    msmeRegistrationNumber: string;
  };
  complianceScore: number;
  ratingAverage: number;
  creditPeriodDays: number;
  createdAt: string;
  updatedAt: string;
}

export interface VendorDocumentRecord {
  id: string; // docId
  companyId: string;
  vendorId: string;
  docType: VendorDocType;
  fileUrl: string;
  expiryDate?: string;
  verificationStatus: 'PENDING' | 'VERIFIED' | 'REJECTED';
  verifiedBy?: string;
  verifiedAt?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface VendorPerformanceLog {
  id: string; // logId
  companyId: string;
  vendorId: string;
  evaluationDate: string; // ISO
  onTimeDeliveryRate: number;
  qualityDefectRate: number;
  priceCompetitivenessScore: number;
  slaBreachCount: number;
  overallScore: number;
  evaluatedBy: string;
  createdAt: string;
}
`;

if (!content.includes('VendorRecord')) {
  content = content + '\n' + vendorTypes;
  fs.writeFileSync(file, content);
  console.log('Added Vendor Management Types');
} else {
  console.log('Already exists');
}

