
export interface InventoryItemRecord {
  id: string;
  companyId: string;
  itemCode: string;
  itemName: string;
  category: string;
  unit: string;
  serialTracking: boolean;
  batchTracking: boolean;
  minStockThreshold: number;
  criticalStockLevel: number;
  reorderLevel: number;
  thresholdEnabled: boolean;
  notificationEnabled: boolean;
  unitCost: number;
  currentStock: number;
  status: 'IN_STOCK' | 'LOW_STOCK' | 'CRITICAL_STOCK' | 'OUT_OF_STOCK';
  createdAt: string;
  updatedAt: string;
}

export interface StockLocationRecord {
  id: string;
  companyId: string;
  name: string;
  code: string;
  description?: string;
  type: 'WAREHOUSE' | 'STORE' | 'SITE_OFFICE' | 'TRANSIT';
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
}

export interface StockBalanceRecord {
  id: string; // usually locationId_itemId
  companyId: string;
  locationId: string;
  itemId: string;
  quantity: number;
  updatedAt: string;
}

export interface StockTransactionRecord {
  id: string;
  companyId: string;
  locationId: string;
  itemId: string;
  quantity: number; // positive for receive, negative for issue
  type: 'RECEIVE' | 'ISSUE' | 'TRANSFER_IN' | 'TRANSFER_OUT' | 'ADJUSTMENT' | 'RETURN';
  reason: string;
  performedBy: string; // userId
  timestamp: string;
  referenceId?: string; // e.g., gatePassId, transferOrderId
}

export interface StockAlertRecord {
  id: string;
  companyId: string;
  itemId: string;
  itemName: string;
  locationId?: string;
  previousStatus: string;
  newStatus: string;
  currentQuantity: number;
  acknowledged: boolean;
  acknowledgedByUid?: string;
  acknowledgedByName?: string;
  acknowledgedAt?: string;
  createdAt: string;
}

export interface GatePassRecord {
  id: string;
  companyId: string;
  type: 'INWARD' | 'OUTWARD' | 'RETURNABLE' | 'NON_RETURNABLE';
  status: 'DRAFT' | 'PENDING' | 'APPROVED' | 'DISPATCHED' | 'RECEIVED' | 'VERIFIED' | 'CANCELLED';
  referenceNo: string;
  requestorName: string;
  requestorDepartment?: string;
  receiverName?: string;
  receiverContact?: string;
  vehicleNo?: string;
  driverName?: string;
  securityGuardName?: string;
  lines: GatePassLine[];
  createdAt: string;
  updatedAt: string;
  updatedBy?: string;
}

export interface GatePassLine {
  itemId: string;
  itemName: string;
  quantity: number;
  uom: string;
  remarks?: string;
}

export interface TransferOrderRecord {
  id: string;
  companyId: string;
  fromLocationId: string;
  toLocationId: string;
  sourceLocationId?: string; // fallback alias
  destinationLocationId?: string; // fallback alias
  status: 'DRAFT' | 'PENDING' | 'RESERVED' | 'DISPATCHED' | 'IN_TRANSIT' | 'RECEIVED' | 'CANCELLED';
  requestedBy: string;
  requestedByName?: string;
  approvedByUid?: string;
  approvedByName?: string;
  gatePassId?: string;
  lines: TransferOrderLine[];
  createdAt: string;
  updatedAt: string;
}

export interface TransferOrderLine {
  itemId: string;
  itemName: string;
  itemCode?: string;
  quantity: number;
  requestedQuantity?: number;
  approvedQuantity?: number;
  reservedQuantity?: number;
  dispatchedQuantity?: number;
  receivedQuantity?: number;
  damagedQuantity?: number;
  missingQuantity?: number;
  uom: string;
  unitOfMeasure?: string;
}
