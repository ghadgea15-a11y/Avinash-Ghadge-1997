import * as fs from 'fs';

const file = 'src/types/index.ts';
let content = fs.readFileSync(file, 'utf8');

const rfqTypes = `
// ============================================================================
// MODULE 14.2: RFQ MANAGEMENT SYSTEM
// ============================================================================

export type RfqStatus = 'DRAFT' | 'PUBLISHED' | 'CLOSED_FOR_BIDDING' | 'UNDER_EVALUATION' | 'AWARDED' | 'CANCELLED';
export type BidStatus = 'DRAFT' | 'SUBMITTED' | 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN';

export interface RfqLineItem {
  itemId: string;
  itemName: string;
  specification: string;
  quantity: number;
  uom: string;
  targetUnitPrice?: number; // internal
}

export interface RfqRequest {
  id: string; // rfqId
  companyId: string;
  rfqNumber: string;
  title: string;
  category: string;
  description: string;
  scopeOfWork: string;
  requiredDeliveryDate: string; // ISO
  deliverySiteId: string;
  deliveryAddress: string;
  submissionDeadline: string; // ISO
  status: RfqStatus;
  invitedVendorIds: string[]; // array of vendor IDs or 'ALL_CATEGORY_VENDORS'
  lineItems: RfqLineItem[];
  evaluationCriteria: {
    priceWeightage: number;
    deliverySpeedWeightage: number;
    vendorRatingWeightage: number;
  };
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface RfqLineItemQuote {
  itemId: string;
  offeredUnitPrice: number;
  taxPercent: number;
  hsnCode: string;
  lineTotal: number;
  leadTimeDays: number;
  remarks: string;
}

export interface RfqBid {
  id: string; // bidId
  companyId: string;
  rfqId: string;
  vendorId: string;
  vendorName: string;
  bidStatus: BidStatus;
  lineItemQuotes: RfqLineItemQuote[];
  subTotal: number;
  totalTax: number;
  grandTotal: number;
  paymentTermsOffered: string;
  quoteValidityDate: string; // ISO
  attachedQuoteUrl?: string;
  submittedAt?: string;
  score?: {
    technicalScore: number;
    commercialScore: number;
    totalRank: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface RfqEvaluationLog {
  id: string; // evalId
  companyId: string;
  rfqId: string;
  comparisonMatrix: string; // JSON snapshot
  awardedBidId: string;
  awardedVendorId: string;
  justification: string;
  approvedBy: string;
  awardedAt: string;
}
`;

if (!content.includes('RfqRequest')) {
  content = content + '\n' + rfqTypes;
  fs.writeFileSync(file, content);
  console.log('Added RFQ Management Types');
} else {
  console.log('RFQ Types already exist');
}
