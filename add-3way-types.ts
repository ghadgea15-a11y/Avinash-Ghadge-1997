import * as fs from 'fs';

const file = 'src/types/index.ts';
let content = fs.readFileSync(file, 'utf8');

const matchTypes = `
// ============================================================================
// MODULE 14.4: 3-WAY MATCHING
// ============================================================================

export interface VendorInvoiceRecord {
  id: string;
  companyId: string;
  invoiceNumber: string;
  vendorId: string;
  poId: string;
  poNumber: string;
  grnId?: string;
  invoiceDate: string;
  receivedDate: string;
  dueDate: string;
  currency: string;
  subTotal: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalAmount: number;
  invoicePdfUrl?: string;
  paymentStatus: 'UNMATCHED' | 'MATCH_PASSED' | 'MATCH_FAILED_HOLD' | 'APPROVED_FOR_PAYMENT' | 'PAID';
  lineItems: {
    itemId: string;
    itemName: string;
    hsnCode?: string;
    billedQty: number;
    unitRate: number;
    taxRate: number;
    lineTotal: number;
  }[];
  uploadedBy: string;
  createdAt: string;
}

export interface ThreeWayMatchRecord {
  id: string;
  companyId: string;
  poId: string;
  grnId: string;
  invoiceId: string;
  vendorId: string;
  matchStatus: 'PERFECT_MATCH' | 'TOLERANCE_PASSED' | 'VARIANCE_DETECTED' | 'MANUALLY_OVERRIDDEN' | 'REJECTED';
  toleranceConfigUsed: {
    quantityTolerancePercent: number;
    priceTolerancePercent: number;
    maxAmountVarianceLimit: number;
  };
  lineItemMatches: {
    itemId: string;
    itemName?: string;
    poQty: number;
    grnQty: number;
    invQty: number;
    poRate: number;
    invRate: number;
    qtyMatch: boolean;
    rateMatch: boolean;
    taxMatch: boolean;
    varianceNotes?: string;
  }[];
  totalPoAmount: number;
  totalGrnAmount: number;
  totalInvoiceAmount: number;
  varianceAmount: number;
  varianceType: 'NONE' | 'OVER_BILLING_QTY' | 'RATE_HIKE' | 'TAX_MISMATCH' | 'UNRECEIVED_GOODS_BILLED' | 'MULTIPLE';
  auditTrail: {
    action: string;
    actionBy: string;
    timestamp: string;
    comments?: string;
  }[];
  passedAt?: string;
  reviewedBy?: string;
}
`;

if (!content.includes('VendorInvoiceRecord')) {
  content = content + '\n' + matchTypes;
  fs.writeFileSync(file, content);
  console.log('Added 3-Way Match Types');
} else {
  console.log('3-Way Match Types already exist');
}
