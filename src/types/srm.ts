export type VendorTier = 'TIER_1' | 'TIER_2' | 'TIER_3' | 'TIER_1_PREFERRED' | 'TIER_2_APPROVED' | 'TIER_3_PROVISIONAL' | 'BLACKLISTED';
export type VendorStatus = 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'SUSPENDED' | 'UNDER_REVIEW';

export interface SrmVendorRecord {
  id: string;
  companyId: string;
  name: string;
  businessName?: string;
  code: string;
  type?: string;
  category: string;
  contactPerson: string | { name?: string; email?: string; phone?: string };
  email: string;
  phone: string;
  address?: string;
  tier: VendorTier;
  status: VendorStatus;
  taxId?: string;
  registrationNumber?: string;
  complianceStatus?: 'COMPLIANT' | 'NON_COMPLIANT' | 'PENDING_REVIEW';
  complianceScore?: number;
  ratingAverage?: number;
  createdAt: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
}

export interface SrmClientRecord {
  id: string;
  companyId: string;
  name: string;
  code: string;
  industry: string;
  contactPerson: string;
  email: string;
  phone: string;
  billingAddress: string;
  shippingAddress?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'PROSPECT' | 'CHURNED';
  accountManagerId?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}
