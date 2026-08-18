const fs = require('fs');
let code = fs.readFileSync('src/types/index.ts', 'utf8');

// 1. Add transferOrderId to GatePassRecord
code = code.replace(
  "evidenceUrls?: string[];",
  "evidenceUrls?: string[];\n  transferOrderId?: string;"
);

// 2. Add Transfer Order Models
const newModels = `
export interface TransferOrderLine {
  itemId: string;
  itemName: string;
  requestedQuantity: number;
  approvedQuantity?: number;
  reservedQuantity?: number;
  dispatchedQuantity?: number;
  receivedQuantity?: number;
  damagedQuantity?: number;
  missingQuantity?: number;
  unitOfMeasure: string;
}

export type TransferOrderStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'RESERVED' | 'DISPATCHED' | 'IN_TRANSIT' | 'RECEIVED' | 'PARTIALLY_RECEIVED' | 'COMPLETED' | 'REJECTED' | 'CANCELLED' | 'EXCEPTION';

export interface TransferOrderRecord {
  id: string;
  companyId: string;
  transferNumber: string;
  sourceLocationId: string;
  destinationLocationId: string;
  sourceSiteId?: string;
  destinationSiteId?: string;
  requestedByUid: string;
  requestedByName: string;
  approvedByUid?: string;
  approvedByName?: string;
  dispatchedByUid?: string;
  dispatchedByName?: string;
  receivedByUid?: string;
  receivedByName?: string;
  
  purpose: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: TransferOrderStatus;
  
  expectedDeliveryDate?: string;
  actualDispatchDate?: string;
  actualReceiptDate?: string;
  remarks?: string;
  
  gatePassId?: string;
  incidentId?: string; 
  
  lines: TransferOrderLine[];
  
  createdAt: string;
  updatedAt: string;
}
`;

code += newModels;

fs.writeFileSync('src/types/index.ts', code);
