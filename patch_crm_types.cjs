const fs = require('fs');
let code = fs.readFileSync('src/types/index.ts', 'utf8');

// The prompt asks for a normalized Client model, separating Contracts. 
// Right now ClientRecord has contract details mixed in. We should remove them and conform to the request.
const existingClientRegex = /export interface ClientRecord \{[\s\S]*?updatedAt: string;\n\}/;

const newCrmTypes = `
export type ClientContactType = 'COMMERCIAL' | 'OPERATIONS' | 'HR' | 'FINANCE' | 'EMERGENCY' | 'CONTRACT' | 'OTHER';

export interface ClientContactRecord {
  id: string; // contactId
  companyId: string;
  clientId: string;
  name: string;
  designation?: string;
  email: string;
  phone: string;
  department?: string;
  contactType: ClientContactType;
  primaryContact: boolean;
  active: boolean;
}

export interface ClientRecord {
  id: string; // clientId
  companyId: string;
  clientCode: string;
  legalName: string;
  displayName: string;
  clientType: 'CORPORATE' | 'GOVERNMENT' | 'INDUSTRIAL' | 'RESIDENTIAL' | 'INSTITUTIONAL' | 'OTHER';
  industry?: string;
  registrationDetails?: string; // e.g. GST
  billingAddress?: string;
  communicationDetails?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'ONBOARDING' | 'CLOSED';
  notes?: string;
  createdByUid?: string;
  createdByName?: string;
  createdAt: string;
  updatedByUid?: string;
  updatedByName?: string;
  updatedAt: string;
  
  // Kept for backward compatibility if any
  primaryContactName?: string;
  primaryContactPhone?: string;
  primaryContactEmail?: string;
}

export type ContractStatus = 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'ACTIVE' | 'EXPIRING' | 'RENEWAL_PENDING' | 'RENEWED' | 'EXPIRED' | 'TERMINATED' | 'CLOSED';

export interface ContractSiteMapping {
  id: string; // mappingId
  companyId: string;
  contractId: string;
  clientId: string;
  siteId: string;
  serviceStartDate: string;
  serviceEndDate: string;
  scope?: string;
  active: boolean;
}

export interface ContractScopeRecord {
  id: string;
  contractId: string;
  companyId: string;
  serviceCategory: string; // E.g., SECURITY, CLEANING, MAINTENANCE
  description: string;
  frequency?: string;
  manpowerRequirement?: number;
  exclusions?: string;
  siteSpecificScope?: string;
}

export interface ContractAmendmentRecord {
  id: string;
  contractId: string;
  companyId: string;
  amendmentNumber: string;
  effectiveDate: string;
  changedFields: string;
  reason: string;
  approvedByUid?: string;
  approvedByName?: string;
  approvalDate?: string;
  documentUrl?: string;
  createdAt: string;
}

export interface ContractRecord {
  id: string; // contractId
  companyId: string;
  clientId: string;
  contractNumber: string;
  contractTitle: string;
  contractType: 'MASTER_SERVICES' | 'SITE_SPECIFIC' | 'SUBCONTRACT' | 'ONE_OFF';
  startDate: string;
  endDate: string;
  status: ContractStatus;
  scopeOfService?: string;
  termsAndConditions?: string;
  renewalType: 'AUTO' | 'MANUAL' | 'NON_RENEWABLE';
  noticePeriodDays?: number;
  
  // Commercials
  contractValue?: number;
  currency?: string;
  billingModel?: 'FIXED_MONTHLY' | 'PER_SHIFT' | 'HOURLY' | 'MILESTONE';
  billingCycle?: 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'ANNUALLY';
  taxConfiguration?: string;
  paymentTermsDays?: number;
  commercialEffectiveDate?: string;

  ownerUid?: string;
  ownerName?: string;
  
  createdByUid?: string;
  createdByName?: string;
  createdAt: string;
  updatedByUid?: string;
  updatedByName?: string;
  updatedAt: string;
  
  // Storage
  documentUrls?: string[];
}
`;

code = code.replace(existingClientRegex, newCrmTypes);

// Also need to check if there are other occurrences of ClientRecord being imported or used and make sure the interface changes don't break them too heavily.
// E.g., DeploymentRecord might have a relation.
fs.writeFileSync('src/types/index.ts', code);
