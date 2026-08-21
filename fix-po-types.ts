import * as fs from 'fs';

const file = 'src/types/index.ts';
let content = fs.readFileSync(file, 'utf8');

// Replace PurchaseOrderStatus
content = content.replace(
  "export type PurchaseOrderStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'ISSUED' | 'PARTIALLY_RECEIVED' | 'COMPLETED' | 'CANCELLED';",
  "export type PurchaseOrderStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'ISSUED' | 'ISSUED_TO_VENDOR' | 'PARTIALLY_RECEIVED' | 'PARTIALLY_DELIVERED' | 'COMPLETED' | 'CANCELLED';"
);

// Add missing fields to PurchaseOrderRecord
content = content.replace(
  "termsAndConditions?: string;",
  \`termsAndConditions?: string;
  currency?: string;
  approvalWorkflow?: {
    currentApprovalTier: 'A2' | 'A1' | 'A0' | 'COMPLETED';
    approvalTrail: {
      tier: 'A2' | 'A1' | 'A0';
      approvedBy?: string;
      status: 'PENDING' | 'APPROVED' | 'REJECTED';
      timestamp?: string;
      comments?: string;
    }[];
  };
  pdfUrl?: string;
  version?: number;
  rfqId?: string;\`
);

const newPoTypes = \`
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
\`;

if (!content.includes('PoAmendmentRecord')) {
  content = content + '\\n' + newPoTypes;
}

fs.writeFileSync(file, content);
console.log('Updated PO Types');
