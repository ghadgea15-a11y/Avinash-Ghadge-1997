const fs = require('fs');
let code = fs.readFileSync('src/services/scmService.ts', 'utf8');

const logic = `
  static evaluateThreshold(quantity: number, item: InventoryItemRecord): 'NORMAL' | 'LOW_STOCK' | 'CRITICAL_STOCK' | 'OUT_OF_STOCK' | 'OVER_STOCK' {
    if (!item.thresholdEnabled) return 'NORMAL';
    if (quantity <= 0) return 'OUT_OF_STOCK';
    
    const crit = item.criticalStockLevel ?? 0;
    const min = item.minStockThreshold ?? 0;
    const reorder = item.reorderLevel ?? 0;
    const max = item.maxStockLimit ?? Infinity;
    
    if (crit > 0 && quantity <= crit) return 'CRITICAL_STOCK';
    if (min > 0 && quantity <= min) return 'LOW_STOCK';
    if (reorder > 0 && quantity <= reorder) return 'LOW_STOCK';
    if (max > 0 && quantity > max) return 'OVER_STOCK';
    
    return 'NORMAL';
  }

  static async handleThresholdAlerts(
    t: any, 
    session: UserSession, 
    companyId: string, 
    locationId: string, 
    item: InventoryItemRecord, 
    previousBalance: number, 
    newBalance: number
  ) {
    if (!item.thresholdEnabled) return 'NORMAL';
    
    const oldStatus = this.evaluateThreshold(previousBalance, item);
    const newStatus = this.evaluateThreshold(newBalance, item);
    
    if (oldStatus !== newStatus && item.notificationEnabled && newStatus !== 'NORMAL' && newStatus !== 'OVER_STOCK') {
      const alertRef = doc(collection(db, 'companies', companyId, 'inventory_alerts'));
      
      let eventType = 'LOW_STOCK_DETECTED';
      if (newStatus === 'CRITICAL_STOCK') eventType = 'CRITICAL_STOCK_DETECTED';
      if (newStatus === 'OUT_OF_STOCK') eventType = 'OUT_OF_STOCK_DETECTED';
      if (newStatus === 'NORMAL') eventType = 'RECOVERY_DETECTED';
      
      t.set(alertRef, {
        id: alertRef.id,
        companyId,
        locationId,
        itemId: item.id,
        itemName: item.itemName,
        previousStatus: oldStatus,
        newStatus,
        previousQuantity: previousBalance,
        currentQuantity: newBalance,
        thresholdValue: newStatus === 'CRITICAL_STOCK' ? item.criticalStockLevel : item.minStockThreshold,
        eventType,
        acknowledged: false,
        createdAt: new Date().toISOString()
      });
      
      const notifRef = doc(collection(db, 'notifications'));
      t.set(notifRef, {
        id: notifRef.id,
        companyId,
        title: \`\${newStatus.replace('_', ' ')}: \${item.itemName}\`,
        message: \`Stock for \${item.itemName} is now \${newBalance} \${item.unit} (Previous: \${previousBalance}).\`,
        type: newStatus === 'OUT_OF_STOCK' || newStatus === 'CRITICAL_STOCK' ? 'ALERT' : 'WARNING',
        timestamp: new Date().toISOString(),
        isRead: false,
        roleScope: ['admin', 'manager', 'incharge'], 
        siteId: locationId
      });
    }
    
    return newStatus;
  }

  // ---------------------------------------------------------
`;

code = code.replace("// ---------------------------------------------------------\n  // LOCATIONS", logic + "  // LOCATIONS");

code = code.replace(
  "// 1. Update Balance\n      const balanceData: StockBalanceRecord = {\n        id: balanceId,\n        companyId,\n        locationId,\n        itemId,\n        quantity: newBalance,\n        lastUpdatedAt: new Date().toISOString()\n      };\n      t.set(balanceRef, balanceData, { merge: true });",
  "// 1. Update Balance & Thresholds\n      const newStatus = await this.handleThresholdAlerts(t, session, companyId, locationId, itemDoc.data() as InventoryItemRecord, previousBalance, newBalance);\n      const balanceData: StockBalanceRecord = {\n        id: balanceId,\n        companyId,\n        locationId,\n        itemId,\n        quantity: newBalance,\n        status: newStatus,\n        lastUpdatedAt: new Date().toISOString()\n      };\n      t.set(balanceRef, balanceData, { merge: true });"
);

// We need to patch dispatchGatePass, receiveGatePass, returnGatePassMaterials similarly where `t.set(bRef` happens
code = code.replace(
  "t.set(bRef, { quantity: nBal, lastUpdatedAt: new Date().toISOString() }, { merge: true });",
  "const itemData = iDoc.exists() ? (iDoc.data() as InventoryItemRecord) : null;\n          let status = undefined;\n          if (itemData) status = await this.handleThresholdAlerts(t, session, companyId, pass.sourceLocationId || pass.destinationLocationId || '', itemData, pBal, nBal);\n          t.set(bRef, { quantity: nBal, status, lastUpdatedAt: new Date().toISOString() }, { merge: true });"
); // Wait, this might replace multiple. Let's do it precisely via regex.

fs.writeFileSync('src/services/scmService_temp.ts', code);
