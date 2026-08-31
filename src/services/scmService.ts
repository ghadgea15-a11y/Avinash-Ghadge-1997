
import { db } from '../firebase';
import { FirestoreService } from './firestoreService';
import { 
  collection, query, where, getDocs, addDoc, serverTimestamp, orderBy, 
  doc, runTransaction, getDoc, setDoc 
} from 'firebase/firestore';
import {
  StockBalanceRecord,
  GatePassRecord,
  StockLocationRecord,
  InventoryItemRecord,
  TransferOrderRecord,
  StockTransactionRecord
} from '../types/scm';

export type {
  StockBalanceRecord,
  GatePassRecord,
  StockLocationRecord,
  InventoryItemRecord,
  TransferOrderRecord,
  StockTransactionRecord
};

export interface StockLedgerRecord { [key: string]: any; }
export interface InventoryVendorRecord { [key: string]: any; }
export interface PaymentBatchItemRecord { [key: string]: any; }
export interface PoLineItem { [key: string]: any; }

/**
 * Enterprise Supply Chain Management (SCM) Service
 */
export class ScmService {

  public static async getGatePasses(companyId: string): Promise<GatePassRecord[]> {
    const q = query(collection(db, `companies/${companyId}/gate_passes`), where('companyId', '==', companyId));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as GatePassRecord));
  }

  public static async approveGatePass(session: any, passId: string, companyId: string) {
    return this.updateGatePassStatus(passId, companyId, 'APPROVED', session);
  }

  public static async dispatchGatePass(session: any, passId: string, companyId: string) {
    return this.updateGatePassStatus(passId, companyId, 'DISPATCHED', session);
  }

  public static async receiveGatePass(session: any, passId: string, companyId: string) {
    return this.updateGatePassStatus(passId, companyId, 'RECEIVED', session);
  }

  public static async returnGatePassMaterials(session: any, passId: string, companyId: string, returns: any[]) {
    // Basic logic to return materials
    return this.updateGatePassStatus(passId, companyId, 'PARTIAL_RETURN', session);
  }

  public static async submitGatePass(session: any, pass: any) {
    const compId = pass.companyId || session?.companyId;
    pass.status = 'DRAFT';
    pass.createdAt = new Date().toISOString();
    await addDoc(collection(db, `companies/${compId}/gate_passes`), pass);
    FirestoreService.logAuditEvent(compId, session.uid || session.userId, session.email || 'System', 'GATE_PASS_SUBMITTED', `Gate pass submitted for ${pass.type}`);
    return { success: true };
  }

  public static async verifyGatePass(session: any, passId: string, companyId: string) {
    return this.updateGatePassStatus(passId, companyId, 'VERIFIED', session);
  }

  private static async updateGatePassStatus(passId: string, companyId: string, status: string, session: any) {
    await runTransaction(db, async (t) => {
      const ref = doc(db, `companies/${companyId}/gate_passes`, passId);
      const snap = await t.get(ref);
      if (!snap.exists()) throw new Error('Gate pass not found');
      if (snap.data().companyId !== companyId) throw new Error('Unauthorized');
      
      t.update(ref, { 
        status, 
        updatedAt: new Date().toISOString(),
        updatedBy: session.uid
      });
      FirestoreService.logAuditEvent(companyId, session.uid, session.email || 'System', 'GATE_PASS_STATUS_UPDATE', `Gate pass ${passId} updated to ${status}`, passId);
    });
    return { success: true };
  }

  public static async getBalances(companyId: string): Promise<StockBalanceRecord[]> {
    const q = query(collection(db, `companies/${companyId}/stock_balances`), where('companyId', '==', companyId));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as StockBalanceRecord));
  }

  public static async saveLocation(companyId: string, loc: any) {
    const id = loc.id || `LOC-${Date.now()}`;
    await setDoc(doc(db, `companies/${companyId}/stock_locations`, id), {
      ...loc,
      companyId,
      updatedAt: new Date().toISOString()
    });
    return { success: true };
  }

  public static async getLocations(companyId: string): Promise<StockLocationRecord[]> {
    const q = query(collection(db, `companies/${companyId}/stock_locations`), where('companyId', '==', companyId));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as StockLocationRecord));
  }

  public static async issueStock(session: any, companyId: string, locId: string, itemId: string, quantity: number, reason: string) {
    await runTransaction(db, async (t) => {
       const balanceId = `${locId}_${itemId}`;
       const balanceRef = doc(db, `companies/${companyId}/stock_balances`, balanceId);
       const bSnap = await t.get(balanceRef);
       let currentQty = 0;
       
       if (bSnap.exists() && bSnap.data().companyId === companyId) {
         currentQty = bSnap.data().quantity || 0;
       }

       if (currentQty < quantity) {
         throw new Error(`Insufficient stock. Available: ${currentQty}`);
       }

       t.set(balanceRef, {
         companyId,
         locationId: locId,
         itemId,
         quantity: currentQty - quantity,
         updatedAt: new Date().toISOString()
       }, { merge: true });

       // Also update global item stock
       const itemRef = doc(db, `companies/${companyId}/inventory_items`, itemId);
       const itemSnap = await t.get(itemRef);
       if (itemSnap.exists()) {
          const globalQty = itemSnap.data().currentStock || 0;
          t.update(itemRef, { currentStock: globalQty - quantity });
       }

       const txRef = doc(collection(db, `companies/${companyId}/stock_transactions`));
       t.set(txRef, {
         companyId, locationId: locId, itemId, quantity: -quantity, 
         type: 'ISSUE', reason, performedBy: session.uid, timestamp: new Date().toISOString()
       });
    });
    FirestoreService.logAuditEvent(companyId, session.uid, session.email || 'System', 'STOCK_ISSUE', `Issued ${quantity} of item ${itemId} from ${locId}. Reason: ${reason}`, itemId);
    return { success: true };
  }

  public static async receiveStock(session: any, companyId: string, locId: string, itemId: string, quantity: number, reason: string) {
    await runTransaction(db, async (t) => {
       const balanceId = `${locId}_${itemId}`;
       const balanceRef = doc(db, `companies/${companyId}/stock_balances`, balanceId);
       const bSnap = await t.get(balanceRef);
       let currentQty = 0;
       
       if (bSnap.exists() && bSnap.data().companyId === companyId) {
         currentQty = bSnap.data().quantity || 0;
       }

       t.set(balanceRef, {
         companyId,
         locationId: locId,
         itemId,
         quantity: currentQty + quantity,
         updatedAt: new Date().toISOString()
       }, { merge: true });

       // Update global item stock
       const itemRef = doc(db, `companies/${companyId}/inventory_items`, itemId);
       const itemSnap = await t.get(itemRef);
       if (itemSnap.exists()) {
          const globalQty = itemSnap.data().currentStock || 0;
          t.update(itemRef, { currentStock: globalQty + quantity });
       }

       const txRef = doc(collection(db, `companies/${companyId}/stock_transactions`));
       t.set(txRef, {
         companyId, locationId: locId, itemId, quantity: quantity, 
         type: 'RECEIVE', reason, performedBy: session.userId, timestamp: new Date().toISOString()
       });
    });
    FirestoreService.logAuditEvent(companyId, session.userId, session.fullName || 'System', 'STOCK_RECEIVE', `Received ${quantity} of item ${itemId} into ${locId}. Reason: ${reason}`, itemId);
    return { success: true };
  }

  public static async saveItem(companyId: string, item: any) {
    const id = item.id || `ITEM-${Date.now()}`;
    await setDoc(doc(db, `companies/${companyId}/inventory_items`, id), {
      ...item,
      companyId,
      updatedAt: new Date().toISOString()
    });
    return { success: true };
  }

  public static async getItems(companyId: string): Promise<InventoryItemRecord[]> {
    const q = query(collection(db, `companies/${companyId}/inventory_items`), where('companyId', '==', companyId));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as InventoryItemRecord));
  }

  public static async getRfqs(session: any, companyId: string) { 
    const q = query(collection(db, `companies/${companyId}/rfqs`), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }

  public static async getRfqBids(session: any, companyId: string) { 
    const q = query(collection(db, `companies/${companyId}/rfq_bids`), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }

  public static async getSrmVendors(session: any, companyId: string, type?: string) { 
    let q = query(collection(db, `companies/${companyId}/vendors`), where('status', '==', 'ACTIVE'));
    if (type) q = query(q, where('category', '==', type));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }

  public static async getInventoryItems(companyId: string): Promise<InventoryItemRecord[]> {
    return this.getItems(companyId);
  }

  public static async recordStockMovement(
    companyId: string, itemId: string, quantity: number, type: 'IN' | 'OUT', reason: string, session: any
  ) {
    // This is now a convenience method. Usually we use receiveStock or issueStock.
    if (type === 'IN') return this.receiveStock(session, companyId, 'MAIN_STORE', itemId, quantity, reason);
    return this.issueStock(session, companyId, 'MAIN_STORE', itemId, quantity, reason);
  }

  public static async handleThresholdAlerts(
    companyId: string, itemId: string, newQty: number
  ): Promise<string | undefined> {
    try {
      const itemRef = doc(db, `companies/${companyId}/inventory_items`, itemId);
      const itemSnap = await getDoc(itemRef);
      if (itemSnap.exists()) {
        const item = itemSnap.data();
        const reorderLevel = item.reorderLevel || 10;
        if (newQty <= reorderLevel) {
          const alertMessage = `Low stock alert for ${item.name || itemId}. Current: ${newQty}, Reorder Level: ${reorderLevel}`;
          // In a real system, this would trigger a notification
          return alertMessage;
        }
      }
    } catch (err) {
      console.error('[ScmService] handleThresholdAlerts error:', err);
    }
    return undefined;
  }
}
