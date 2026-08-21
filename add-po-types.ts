import * as fs from 'fs';

const file = 'src/types/index.ts';
let content = fs.readFileSync(file, 'utf8');

const poTypes = `
// ============================================================================
// MODULE 14.3: PURCHASE ORDERS (PO) MANAGEMENT
// ============================================================================

export type PoStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'ISSUED_TO_VENDOR' | 'PARTIALLY_DELIVERED' | 'COMPLETED' | 'CANCELLED';

export interface PoLineItem {
  itemId: string;
  itemCode: string;
  itemName: string;
  description: string;
  category: string;
  quantity: number;
  uom: string;
  unitPrice: number;
  gstRate: number;
  taxAmount: number;
  totalAmount: number;
  deliveredQuantity: number;
  pendingQuantity: number;
}

export interface PoApprovalStep {
  tier: 'A2' | 'A1' | 'A0';
  approvedBy?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  timestamp?: string; // ISO
  comments?: string;
}

export interface PurchaseOrderRecord {
  id: string; // poId
  companyId: string;
  poNumber: string;
  rfqId?: string;
  vendorId: string;
  vendorName: string;
  vendorGst?: string;
  vendorAddress?: string;
  billingAddress: string;
  deliverySiteId: string;
  deliveryAddress: string;
  siteManagerId?: string;
  status: PoStatus;
  currency: string; // default INR
  lineItems: PoLineItem[];
  subTotal: number;
  totalTax: number;
  shippingCharges: number;
  grandTotal: number;
  paymentTerms: string;
  deliveryDueDate: string; // ISO
  termsAndConditions: string;
  approvalWorkflow: {
    currentApprovalTier: 'A2' | 'A1' | 'A0' | 'COMPLETED';
    approvalTrail: PoApprovalStep[];
  };
  pdfUrl?: string;
  version: number;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
}

export interface PoAmendmentRecord {
  id: string; // amendmentId
  companyId: string;
  poId: string;
  previousVersion: number;
  updatedVersion: number;
  changeLog: any[]; // Delta fields
  revisedBy: string;
  approvedBy?: string;
  reasonForAmendment: string;
  timestamp: string; // ISO
}
`;

if (!content.includes('PurchaseOrderRecord')) {
  content = content + '\n' + poTypes;
  fs.writeFileSync(file, content);
  console.log('Added PO Management Types');
} else {
  console.log('PO Types already exist');
}
