const fs = require('fs');

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
      const alertId = \`ALT-\${Date.now()}-\${Math.floor(Math.random()*1000)}\`;
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
      
      // Also generate standard AppNotification for users
      const notifRef = doc(collection(db, 'notifications'));
      t.set(notifRef, {
        id: notifRef.id,
        companyId,
        title: \`\${newStatus.replace('_', ' ')}: \${item.itemName}\`,
        message: \`Stock for \${item.itemName} is now \${newBalance} \${item.unit} (Previous: \${previousBalance}).\`,
        type: newStatus === 'OUT_OF_STOCK' || newStatus === 'CRITICAL_STOCK' ? 'ALERT' : 'WARNING',
        timestamp: new Date().toISOString(),
        isRead: false,
        roleScope: ['admin', 'manager', 'incharge'], // escalate appropriately
        siteId: locationId
      });
    }
    
    return newStatus;
  }
`;
