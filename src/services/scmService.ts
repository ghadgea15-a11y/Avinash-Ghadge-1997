import { 
  collection, doc, getDoc, getDocs, setDoc, updateDoc, 
  query, where, orderBy, runTransaction, Timestamp, deleteDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import { 
  UserSession, InventoryItemRecord, StockLocationRecord, 
  StockLedgerRecord, StockBalanceRecord, GatePassRecord, 
  GatePassLineItem, IncidentReportRecord
} from '../types';

export class ScmService {

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
  ): Promise<string> {
    if (!item.thresholdEnabled) return 'NORMAL';
    
    const oldStatus = this.evaluateThreshold(previousBalance, item);
    const newStatus = this.evaluateThreshold(newBalance, item);
    
    if (oldStatus !== newStatus && item.notificationEnabled && newStatus !== 'OVER_STOCK') {
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
      
      const notifRef = doc(collection(db, 'companies', companyId, 'notifications'));
      t.set(notifRef, {
        id: notifRef.id,
        companyId,
        title: `${newStatus.replace('_', ' ')}: ${item.itemName}`,
        message: `Stock for ${item.itemName} is now ${newBalance} ${item.unit} (Previous: ${previousBalance}).`,
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
  // LOCATIONS
  // ---------------------------------------------------------
  static async getLocations(companyId: string): Promise<StockLocationRecord[]> {
    const q = query(collection(db, 'companies', companyId, 'stock_locations'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => d.data() as StockLocationRecord);
  }

  static async saveLocation(companyId: string, location: StockLocationRecord): Promise<void> {
    await setDoc(doc(db, 'companies', companyId, 'stock_locations', location.id), location);
  }

  // ---------------------------------------------------------
  // ITEMS
  // ---------------------------------------------------------
  static async getItems(companyId: string): Promise<InventoryItemRecord[]> {
    const q = query(collection(db, 'companies', companyId, 'inventory_items'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => d.data() as InventoryItemRecord);
  }

  static async saveItem(companyId: string, item: InventoryItemRecord): Promise<void> {
    const itemRef = doc(db, 'companies', companyId, 'inventory_items', item.id);
    const existing = await getDoc(itemRef);
    if (!existing.exists()) {
      const q = query(collection(db, 'companies', companyId, 'inventory_items'), where('itemCode', '==', item.itemCode));
      const res = await getDocs(q);
      if (!res.empty) {
        throw new Error('Item code already exists.');
      }
    }
    await setDoc(itemRef, item);
  }

  // ---------------------------------------------------------
  // STOCK BALANCES & TRANSACTIONS
  // ---------------------------------------------------------
  static async getBalances(companyId: string, locationId?: string): Promise<StockBalanceRecord[]> {
    let q = query(collection(db, 'companies', companyId, 'stock_balances'));
    if (locationId) {
      q = query(collection(db, 'companies', companyId, 'stock_balances'), where('locationId', '==', locationId));
    }
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => d.data() as StockBalanceRecord);
  }

  static async getLedger(companyId: string, itemId?: string): Promise<StockLedgerRecord[]> {
    let q = query(collection(db, 'companies', companyId, 'stock_ledger'), orderBy('createdAt', 'desc'));
    if (itemId) {
      q = query(collection(db, 'companies', companyId, 'stock_ledger'), where('itemId', '==', itemId), orderBy('createdAt', 'desc'));
    }
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => d.data() as StockLedgerRecord);
  }

  static async receiveStock(
    session: UserSession, 
    companyId: string, 
    locationId: string, 
    itemId: string, 
    quantity: number, 
    unitCost?: number, 
    referenceId?: string
  ): Promise<void> {
    await this.performStockTransaction(session, companyId, locationId, itemId, quantity, 'RECEIPT', referenceId, 'MANUAL', unitCost);
  }

  static async issueStock(
    session: UserSession, 
    companyId: string, 
    locationId: string, 
    itemId: string, 
    quantity: number, 
    reason: string
  ): Promise<void> {
    await this.performStockTransaction(session, companyId, locationId, itemId, -Math.abs(quantity), 'ISSUE', undefined, 'MANUAL', undefined, reason);
  }

  static async adjustStock(
    session: UserSession, 
    companyId: string, 
    locationId: string, 
    itemId: string, 
    quantityDiff: number, 
    reason: string
  ): Promise<void> {
    await this.performStockTransaction(session, companyId, locationId, itemId, quantityDiff, 'ADJUSTMENT', undefined, 'ADJUSTMENT', undefined, reason);
  }

  private static async performStockTransaction(
    session: UserSession,
    companyId: string,
    locationId: string,
    itemId: string,
    quantityChange: number,
    transactionType: StockLedgerRecord['transactionType'],
    referenceId?: string,
    referenceType?: StockLedgerRecord['referenceType'],
    unitCost?: number,
    reason?: string
  ) {
    const balanceId = `${locationId}_${itemId}`;
    const balanceRef = doc(db, 'companies', companyId, 'stock_balances', balanceId);
    const itemRef = doc(db, 'companies', companyId, 'inventory_items', itemId);
    const ledgerRef = doc(collection(db, 'companies', companyId, 'stock_ledger'));

    await runTransaction(db, async (t) => {
      const balanceDoc = await t.get(balanceRef);
      const itemDoc = await t.get(itemRef);

      if (!itemDoc.exists()) throw new Error('Item not found');
      
      let previousBalance = 0;
      if (balanceDoc.exists()) {
        previousBalance = balanceDoc.data().quantity || 0;
      }

      const newBalance = previousBalance + quantityChange;
      if (newBalance < 0) {
        throw new Error('Insufficient stock balance for this operation.');
      }

      const itemData = itemDoc.data() as InventoryItemRecord;
      const newStatus = await this.handleThresholdAlerts(t, session, companyId, locationId, itemData, previousBalance, newBalance) as any;

      const balanceData: StockBalanceRecord = {
        id: balanceId,
        companyId,
        locationId,
        itemId,
        quantity: newBalance,
        status: newStatus,
        lastUpdatedAt: new Date().toISOString()
      };
      t.set(balanceRef, balanceData, { merge: true });

      const ledgerEntry: StockLedgerRecord = {
        id: ledgerRef.id,
        companyId,
        itemId,
        locationId,
        transactionType,
        quantity: quantityChange,
        previousBalance,
        newBalance,
        unitCost,
        referenceId,
        referenceType,
        reason,
        performedByUid: session.userId,
        performedByName: session.fullName,
        createdAt: new Date().toISOString()
      };
      t.set(ledgerRef, ledgerEntry);

      const currentGlobalStock = itemData.currentStock || 0;
      t.update(itemRef, {
        currentStock: currentGlobalStock + quantityChange,
        updatedAt: new Date().toISOString()
      });
    });
  }

  // ---------------------------------------------------------
  // GATE PASSES
  // ---------------------------------------------------------
  static async getGatePasses(companyId: string): Promise<GatePassRecord[]> {
    const q = query(collection(db, 'companies', companyId, 'gate_passes'), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => d.data() as GatePassRecord);
  }

  static async submitGatePass(session: UserSession, pass: GatePassRecord): Promise<void> {
    const passRef = doc(db, 'companies', pass.companyId, 'gate_passes', pass.id);
    pass.submittedAt = new Date().toISOString();
    await setDoc(passRef, pass);
  }

  static async approveGatePass(session: UserSession, passId: string, companyId: string): Promise<void> {
    const passRef = doc(db, 'companies', companyId, 'gate_passes', passId);
    await updateDoc(passRef, {
      status: 'APPROVED',
      approvedAt: new Date().toISOString(),
      approvedByUid: session.userId,
      approvedByName: session.fullName
    });
  }
  
  static async rejectGatePass(session: UserSession, passId: string, companyId: string, reason: string): Promise<void> {
    const passRef = doc(db, 'companies', companyId, 'gate_passes', passId);
    await updateDoc(passRef, {
      status: 'REJECTED',
      rejectionReason: reason,
      closedAt: new Date().toISOString()
    });
  }

  static async dispatchGatePass(session: UserSession, passId: string, companyId: string): Promise<void> {
    const passRef = doc(db, 'companies', companyId, 'gate_passes', passId);
    
    await runTransaction(db, async (t) => {
      const pDoc = await t.get(passRef);
      if (!pDoc.exists()) throw new Error('Gate pass not found');
      
      const pass = pDoc.data() as GatePassRecord;
      if (pass.status !== 'APPROVED') throw new Error('Gate pass must be APPROVED before dispatch.');
      
      if ((pass.passType === 'OUTWARD' || pass.passType === 'RETURNABLE') && pass.sourceLocationId) {
        for (const line of pass.lines) {
          const balanceId = `${pass.sourceLocationId}_${line.itemId}`;
          const bRef = doc(db, 'companies', companyId, 'stock_balances', balanceId);
          const iRef = doc(db, 'companies', companyId, 'inventory_items', line.itemId);
          
          const bDoc = await t.get(bRef);
          const iDoc = await t.get(iRef);
          
          let pBal = 0;
          if (bDoc.exists()) pBal = bDoc.data().quantity || 0;
          
          const nBal = pBal - line.quantity;
          if (nBal < 0) throw new Error(`Insufficient stock for ${line.itemName}`);
          
          let statusStr: any = undefined;
          if (iDoc.exists()) {
             statusStr = await this.handleThresholdAlerts(t, session, companyId, pass.sourceLocationId, iDoc.data() as InventoryItemRecord, pBal, nBal);
          }
          t.set(bRef, { quantity: nBal, status: statusStr, lastUpdatedAt: new Date().toISOString() }, { merge: true });
          
          const lRef = doc(collection(db, 'companies', companyId, 'stock_ledger'));
          t.set(lRef, {
            id: lRef.id,
            companyId,
            itemId: line.itemId,
            locationId: pass.sourceLocationId,
            transactionType: 'ISSUE',
            quantity: -line.quantity,
            previousBalance: pBal,
            newBalance: nBal,
            referenceId: pass.id,
            referenceType: 'GATE_PASS',
            performedByUid: session.userId,
            performedByName: session.fullName,
            createdAt: new Date().toISOString()
          });
          
          if (iDoc.exists()) {
            const curGlobal = iDoc.data().currentStock || 0;
            t.update(iRef, { currentStock: curGlobal - line.quantity });
          }
        }
      }
      
      t.update(passRef, {
        status: 'DISPATCHED',
        dispatchedAt: new Date().toISOString()
      });
    });
  }

  static async verifyGatePass(session: UserSession, passId: string, companyId: string): Promise<void> {
    const passRef = doc(db, 'companies', companyId, 'gate_passes', passId);
    const pDoc = await getDoc(passRef);
    if (!pDoc.exists()) throw new Error('Not found');
    const pass = pDoc.data() as GatePassRecord;
    
    if (pass.status !== 'DISPATCHED' && pass.passType !== 'INWARD') {
        throw new Error('Gate pass cannot be verified at this stage.');
    }

    const updates: Partial<GatePassRecord> = {
      verifiedAt: new Date().toISOString(),
      verifiedByUid: session.userId,
      verifiedByName: session.fullName,
      status: 'GATE_VERIFIED'
    };

    if (pass.transferOrderId) {
      // It remains GATE_VERIFIED or we can just say the pass is verified and transfer is IN_TRANSIT
      const trRef = doc(db, 'companies', companyId, 'transfer_orders', pass.transferOrderId);
      await updateDoc(trRef, { status: 'IN_TRANSIT', updatedAt: new Date().toISOString() });
      updates.status = 'CLOSED'; // Gate pass job is done since it left the gate
      updates.closedAt = new Date().toISOString();
    } else if (pass.passType === 'NON_RETURNABLE' || pass.passType === 'OUTWARD') {
      updates.status = 'CLOSED';
      updates.closedAt = new Date().toISOString();
    } else if (pass.passType === 'RETURNABLE') {
      updates.status = 'RETURN_PENDING';
    }

    await updateDoc(passRef, updates);
  }
  
  static async receiveGatePass(session: UserSession, passId: string, companyId: string): Promise<void> {
    const passRef = doc(db, 'companies', companyId, 'gate_passes', passId);
    
    await runTransaction(db, async (t) => {
      const pDoc = await t.get(passRef);
      if (!pDoc.exists()) throw new Error('Gate pass not found');
      
      const pass = pDoc.data() as GatePassRecord;
      
      if (pass.passType === 'INWARD' && pass.destinationLocationId) {
        for (const line of pass.lines) {
          const balanceId = `${pass.destinationLocationId}_${line.itemId}`;
          const bRef = doc(db, 'companies', companyId, 'stock_balances', balanceId);
          const iRef = doc(db, 'companies', companyId, 'inventory_items', line.itemId);
          
          const bDoc = await t.get(bRef);
          const iDoc = await t.get(iRef);
          
          let pBal = 0;
          if (bDoc.exists()) pBal = bDoc.data().quantity || 0;
          
          const nBal = pBal + line.quantity;
          
          let statusStr: any = undefined;
          if (iDoc.exists()) {
             statusStr = await this.handleThresholdAlerts(t, session, companyId, pass.destinationLocationId, iDoc.data() as InventoryItemRecord, pBal, nBal);
          }
          t.set(bRef, { quantity: nBal, status: statusStr, lastUpdatedAt: new Date().toISOString() }, { merge: true });
          
          const lRef = doc(collection(db, 'companies', companyId, 'stock_ledger'));
          t.set(lRef, {
            id: lRef.id,
            companyId,
            itemId: line.itemId,
            locationId: pass.destinationLocationId,
            transactionType: 'RECEIPT',
            quantity: line.quantity,
            previousBalance: pBal,
            newBalance: nBal,
            referenceId: pass.id,
            referenceType: 'GATE_PASS',
            performedByUid: session.userId,
            performedByName: session.fullName,
            createdAt: new Date().toISOString()
          });
          
          if (iDoc.exists()) {
            const curGlobal = iDoc.data().currentStock || 0;
            t.update(iRef, { currentStock: curGlobal + line.quantity });
          }
        }
      }
      
      t.update(passRef, {
        status: 'CLOSED',
        receivedAt: new Date().toISOString(),
        closedAt: new Date().toISOString()
      });
    });
  }

  static async returnGatePassMaterials(
    session: UserSession, 
    passId: string, 
    companyId: string, 
    returnedLines: { itemId: string; returnedQuantity: number; condition?: string }[]
  ): Promise<void> {
    const passRef = doc(db, 'companies', companyId, 'gate_passes', passId);
    
    await runTransaction(db, async (t) => {
      const pDoc = await t.get(passRef);
      if (!pDoc.exists()) throw new Error('Gate pass not found');
      
      const pass = pDoc.data() as GatePassRecord;
      if (pass.status !== 'RETURN_PENDING') throw new Error('Gate pass is not pending return.');
      
      let allReturned = true;
      const updatedLines = [...pass.lines];
      
      for (const rLine of returnedLines) {
        const pLine = updatedLines.find(l => l.itemId === rLine.itemId);
        if (pLine) {
          pLine.returnedQuantity = (pLine.returnedQuantity || 0) + rLine.returnedQuantity;
          if (pLine.returnedQuantity < pLine.quantity) {
             allReturned = false;
          }
          
          if (pass.sourceLocationId && rLine.returnedQuantity > 0) {
            const balanceId = `${pass.sourceLocationId}_${rLine.itemId}`;
            const bRef = doc(db, 'companies', companyId, 'stock_balances', balanceId);
            const bDoc = await t.get(bRef);
            let pBal = 0;
            if (bDoc.exists()) pBal = bDoc.data().quantity || 0;
            const nBal = pBal + rLine.returnedQuantity;
            
            const iRef = doc(db, 'companies', companyId, 'inventory_items', rLine.itemId);
            const iDoc = await t.get(iRef);
            
            let statusStr: any = undefined;
            if (iDoc.exists()) {
               statusStr = await this.handleThresholdAlerts(t, session, companyId, pass.sourceLocationId, iDoc.data() as InventoryItemRecord, pBal, nBal);
            }
            t.set(bRef, { quantity: nBal, status: statusStr, lastUpdatedAt: new Date().toISOString() }, { merge: true });
            
            const lRef = doc(collection(db, 'companies', companyId, 'stock_ledger'));
            t.set(lRef, {
              id: lRef.id,
              companyId,
              itemId: rLine.itemId,
              locationId: pass.sourceLocationId,
              transactionType: 'RETURN',
              quantity: rLine.returnedQuantity,
              previousBalance: pBal,
              newBalance: nBal,
              referenceId: pass.id,
              referenceType: 'GATE_PASS',
              performedByUid: session.userId,
              performedByName: session.fullName,
              createdAt: new Date().toISOString()
            });
            
            if (iDoc.exists()) {
              t.update(iRef, { currentStock: (iDoc.data().currentStock || 0) + rLine.returnedQuantity });
            }
          }
        }
      }
      
      t.update(passRef, {
        lines: updatedLines,
        status: allReturned ? 'CLOSED' : 'RETURN_PENDING',
        returnedAt: new Date().toISOString(),
        ...(allReturned ? { closedAt: new Date().toISOString() } : {})
      });
    });
  }

}
