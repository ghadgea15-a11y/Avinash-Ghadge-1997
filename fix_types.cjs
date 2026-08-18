const fs = require('fs');
let code = fs.readFileSync('src/types/index.ts', 'utf8');

const updatedInventoryItem = `export interface InventoryItemRecord {
  id: string;
  companyId: string;
  itemCode: string;
  itemName: string;
  category: InventoryCategory;
  subCategory?: string;
  description?: string;
  unit: InventoryUnit;
  serialTracking?: boolean;
  batchTracking?: boolean;
  
  currentStock: number;
  minStockThreshold: number;
  maxStockLimit?: number;
  reorderLevel?: number;
  
  unitCost: number;
  warehouseLocation?: string; 
  siteId?: string;
  siteName?: string;
  supplierVendorId?: string;
  supplierVendorName?: string;
  
  status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'DISCONTINUED';
  active?: boolean;
  
  barcode?: string;
  isAssetTracked?: boolean;
  
  createdAt: string;
  createdBy?: string;
  updatedAt: string;
  updatedBy?: string;
}`;

code = code.replace(/export interface InventoryItemRecord \{[\s\S]*?\n\}/, updatedInventoryItem);

code = code.replace('// SCM & INVENTORY ENHANCEMENTS', `export type StockTransactionType = 
  | 'PURCHASE_INWARD' 
  | 'ISSUE_TO_EMPLOYEE' 
  | 'SITE_TRANSFER' 
  | 'RETURN_FROM_EMPLOYEE' 
  | 'DAMAGE_SCRAP' 
  | 'AUDIT_ADJUSTMENT';

export interface StockTransactionRecord {
  id: string;
  companyId: string;
  itemId: string;
  itemName: string;
  itemCode: string;
  transactionType: StockTransactionType;
  quantity: number;
  previousStock: number;
  newStock: number;
  unitCost?: number;
  totalValue?: number;
  referenceNumber?: string;
  employeeId?: string;
  employeeName?: string;
  fromSiteId?: string;
  toSiteId?: string;
  siteName?: string;
  vendorSupplier?: string;
  remarks?: string;
  performedByUid: string;
  performedByName: string;
  createdAt: string;
}

// SCM & INVENTORY ENHANCEMENTS`);

fs.writeFileSync('src/types/index.ts', code);
