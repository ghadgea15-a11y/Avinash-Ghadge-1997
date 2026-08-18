const fs = require('fs');
let code = fs.readFileSync('src/types/index.ts', 'utf8');

// 1. Extend InventoryItemRecord with threshold config
code = code.replace(
  "reorderLevel?: number;",
  "reorderLevel?: number;\n  criticalStockLevel?: number;\n  thresholdEnabled?: boolean;\n  notificationEnabled?: boolean;\n  thresholdScope?: 'COMPANY' | 'LOCATION';"
);

// 2. Extend StockBalanceRecord with status
code = code.replace(
  "reservedQuantity?: number;\n  lastUpdatedAt: string;",
  "reservedQuantity?: number;\n  lastUpdatedAt: string;\n  status?: 'NORMAL' | 'LOW_STOCK' | 'CRITICAL_STOCK' | 'OUT_OF_STOCK' | 'OVER_STOCK';"
);

// 3. Add Threshold Alert Type
code += `
export interface InventoryAlertRecord {
  id: string;
  companyId: string;
  locationId: string;
  itemId: string;
  itemName: string;
  previousStatus: string;
  newStatus: string;
  previousQuantity: number;
  currentQuantity: number;
  thresholdValue: number;
  eventType: 'LOW_STOCK_DETECTED' | 'CRITICAL_STOCK_DETECTED' | 'OUT_OF_STOCK_DETECTED' | 'RECOVERY_DETECTED';
  notificationId?: string;
  acknowledged: boolean;
  acknowledgedByUid?: string;
  acknowledgedByName?: string;
  acknowledgedAt?: string;
  notes?: string;
  createdAt: string;
}
`;

fs.writeFileSync('src/types/index.ts', code);
