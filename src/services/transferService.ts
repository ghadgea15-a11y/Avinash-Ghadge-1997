import { collection, doc, getDoc, getDocs, setDoc, updateDoc, query, orderBy, runTransaction } from 'firebase/firestore';
import { db } from '../firebase';
import { 
  UserSession, TransferOrderRecord, TransferOrderLine, StockBalanceRecord, 
  InventoryItemRecord, GatePassRecord, StockLedgerRecord
} from '../types';
import { ScmService } from './scmService';

export class TransferService {
  static async getTransfers(companyId: string): Promise<TransferOrderRecord[]> {
    const q = query(collection(db, 'companies', companyId, 'transfer_orders'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as TransferOrderRecord);
  }

  static async createTransfer(session: UserSession, transfer: TransferOrderRecord): Promise<void> {
    const ref = doc(db, 'companies', transfer.companyId, 'transfer_orders', transfer.id);
    await setDoc(ref, transfer);
    
    // Notification
    const notifRef = doc(collection(db, 'companies', transfer.companyId, 'notifications'));
    await setDoc(notifRef, {
      id: notifRef.id,
      companyId: transfer.companyId,
      title: `Transfer Request: ${transfer.transferNumber}`,
      message: `${session.fullName} requested a material transfer from ${transfer.sourceLocationId} to ${transfer.destinationLocationId}.`,
      type: 'INFO',
      timestamp: new Date().toISOString(),
      isRead: false,
      roleScope: ['admin', 'manager', 'incharge'], 
      siteId: transfer.sourceLocationId
    });
  }

  static async approveTransfer(session: UserSession, companyId: string, transferId: string): Promise<void> {
    const ref = doc(db, 'companies', companyId, 'transfer_orders', transferId);
    
    await runTransaction(db, async (t) => {
      const docSnap = await t.get(ref);
      if (!docSnap.exists()) throw new Error('Transfer not found');
      
      const transfer = docSnap.data() as TransferOrderRecord;
      if (transfer.status !== 'SUBMITTED' && transfer.status !== 'DRAFT') {
        throw new Error('Invalid status for approval');
      }

      // Check stock and reserve
      for (const line of transfer.lines) {
        const balId = `${transfer.sourceLocationId}_${line.itemId}`;
        const balRef = doc(db, 'companies', companyId, 'stock_balances', balId);
        const balDoc = await t.get(balRef);
        
        const available = (balDoc.exists() ? balDoc.data().quantity : 0) - (balDoc.exists() ? (balDoc.data().reservedQuantity || 0) : 0);
        
        if (available < line.requestedQuantity) {
          throw new Error(`Insufficient available stock for ${line.itemName}. Needed: ${line.requestedQuantity}, Available: ${available}`);
        }
        
        line.approvedQuantity = line.requestedQuantity;
        line.reservedQuantity = line.requestedQuantity;
        
        t.set(balRef, {
          reservedQuantity: (balDoc.exists() ? (balDoc.data().reservedQuantity || 0) : 0) + line.requestedQuantity
        }, { merge: true });
      }

      t.update(ref, {
        status: 'RESERVED',
        approvedByUid: session.userId,
        approvedByName: session.fullName,
        lines: transfer.lines,
        updatedAt: new Date().toISOString()
      });
    });
  }

  static async rejectTransfer(session: UserSession, companyId: string, transferId: string, reason: string): Promise<void> {
    const ref = doc(db, 'companies', companyId, 'transfer_orders', transferId);
    await updateDoc(ref, {
      status: 'REJECTED',
      remarks: reason,
      updatedAt: new Date().toISOString()
    });
  }

  static async dispatchTransfer(session: UserSession, companyId: string, transferId: string, vehicleNumber?: string): Promise<void> {
    const ref = doc(db, 'companies', companyId, 'transfer_orders', transferId);
    
    await runTransaction(db, async (t) => {
      const docSnap = await t.get(ref);
      if (!docSnap.exists()) throw new Error('Transfer not found');
      
      const transfer = docSnap.data() as TransferOrderRecord;
      if (transfer.status !== 'RESERVED') {
        throw new Error('Transfer must be RESERVED before dispatch.');
      }

      // Deduct stock (total and reserved)
      for (const line of transfer.lines) {
        const balId = `${transfer.sourceLocationId}_${line.itemId}`;
        const balRef = doc(db, 'companies', companyId, 'stock_balances', balId);
        const iRef = doc(db, 'companies', companyId, 'inventory_items', line.itemId);
        
        const balDoc = await t.get(balRef);
        const iDoc = await t.get(iRef);
        
        const qty = balDoc.exists() ? balDoc.data().quantity : 0;
        const res = balDoc.exists() ? (balDoc.data().reservedQuantity || 0) : 0;
        
        const deduct = line.reservedQuantity || 0;
        const newQty = qty - deduct;
        const newRes = res - deduct;
        
        if (newQty < 0 || newRes < 0) throw new Error(`Stock mismatch on dispatch for ${line.itemName}`);
        
        line.dispatchedQuantity = deduct;
        
        const itemData = (iDoc && iDoc.exists()) ? iDoc.data() : null;
        let statusStr = undefined;
        if (itemData) statusStr = await ScmService.handleThresholdAlerts(t, session, companyId, transfer.sourceLocationId, itemData as InventoryItemRecord, qty, newQty);
        
        t.set(balRef, { quantity: newQty, reservedQuantity: newRes, status: statusStr, lastUpdatedAt: new Date().toISOString() }, { merge: true });
        
        const lRef = doc(collection(db, 'companies', companyId, 'stock_ledger'));
        t.set(lRef, {
          id: lRef.id,
          companyId,
          itemId: line.itemId,
          locationId: transfer.sourceLocationId,
          transactionType: 'ISSUE',
          quantity: -deduct,
          previousBalance: qty,
          newBalance: newQty,
          referenceId: transfer.id,
          referenceType: 'TRANSFER_ORDER',
          performedByUid: session.userId,
          performedByName: session.fullName,
          createdAt: new Date().toISOString()
        });
        
        if (iDoc.exists()) {
          t.update(iRef, { currentStock: (iDoc.data().currentStock || 0) - deduct });
        }
      }

      // Generate Gate Pass
      const gpRef = doc(collection(db, 'companies', companyId, 'gate_passes'));
      const passData: GatePassRecord = {
        id: gpRef.id,
        companyId,
        passNumber: `GP-TR-${Math.floor(Math.random()*10000)}`,
        passType: 'OUTWARD',
        status: 'DISPATCHED', // Starts dispatched so security verifies it out
        sourceLocationId: transfer.sourceLocationId,
        destinationLocationId: transfer.destinationLocationId,
        lines: transfer.lines.map((l: TransferOrderLine) => ({ itemId: l.itemId, itemName: l.itemName, itemCode: 'NA', unit: l.unitOfMeasure, quantity: l.dispatchedQuantity || 0 })),
        requesterId: session.userId,
        requesterName: session.fullName,
        recipientName: transfer.requestedByName,
        purpose: 'INTERNAL_TRANSFER',
        transferOrderId: transfer.id,
        vehicleNumber,
        createdAt: new Date().toISOString()
      };
      t.set(gpRef, passData);

      t.update(ref, {
        status: 'DISPATCHED',
        gatePassId: gpRef.id,
        dispatchedByUid: session.userId,
        dispatchedByName: session.fullName,
        actualDispatchDate: new Date().toISOString(),
        lines: transfer.lines,
        updatedAt: new Date().toISOString()
      });
    });
  }

  static async receiveTransfer(
    session: UserSession, 
    companyId: string, 
    transferId: string, 
    receiptLines: { itemId: string; received: number; damaged: number; missing: number }[]
  ): Promise<void> {
    const ref = doc(db, 'companies', companyId, 'transfer_orders', transferId);
    
    await runTransaction(db, async (t) => {
      const docSnap = await t.get(ref);
      if (!docSnap.exists()) throw new Error('Transfer not found');
      
      const transfer = docSnap.data() as TransferOrderRecord;
      if (transfer.status !== 'IN_TRANSIT' && transfer.status !== 'DISPATCHED') { // Some processes might skip gate verification
        throw new Error('Transfer must be IN_TRANSIT or DISPATCHED to receive.');
      }

      let isPartial = false;
      let hasException = false;

      for (const rLine of receiptLines) {
        const line = transfer.lines.find((l: TransferOrderLine) => l.itemId === rLine.itemId);
        if (line) {
          line.receivedQuantity = (line.receivedQuantity || 0) + rLine.received;
          line.damagedQuantity = (line.damagedQuantity || 0) + rLine.damaged;
          line.missingQuantity = (line.missingQuantity || 0) + rLine.missing;
          
          const totalAccounted = line.receivedQuantity + line.damagedQuantity + line.missingQuantity;
          if (totalAccounted < (line.dispatchedQuantity || 0)) {
            isPartial = true;
          }
          if (line.damagedQuantity > 0 || line.missingQuantity > 0) {
            hasException = true;
          }

          // Add only received stock to destination
          if (rLine.received > 0) {
            const balId = `${transfer.destinationLocationId}_${line.itemId}`;
            const balRef = doc(db, 'companies', companyId, 'stock_balances', balId);
            const iRef = doc(db, 'companies', companyId, 'inventory_items', line.itemId);
            
            const balDoc = await t.get(balRef);
            const iDoc = await t.get(iRef);
            
            const pBal = balDoc.exists() ? balDoc.data().quantity : 0;
            const nBal = pBal + rLine.received;
            
            const itemData = (iDoc && iDoc.exists()) ? iDoc.data() : null;
            let statusStr = undefined;
            if (itemData) statusStr = await ScmService.handleThresholdAlerts(t, session, companyId, transfer.destinationLocationId, itemData as InventoryItemRecord, pBal, nBal);
            
            t.set(balRef, { quantity: nBal, status: statusStr, lastUpdatedAt: new Date().toISOString() }, { merge: true });
            
            const lRef = doc(collection(db, 'companies', companyId, 'stock_ledger'));
            t.set(lRef, {
              id: lRef.id,
              companyId,
              itemId: line.itemId,
              locationId: transfer.destinationLocationId,
              transactionType: 'RECEIPT',
              quantity: rLine.received,
              previousBalance: pBal,
              newBalance: nBal,
              referenceId: transfer.id,
              referenceType: 'TRANSFER_ORDER',
              performedByUid: session.userId,
              performedByName: session.fullName,
              createdAt: new Date().toISOString()
            });
            
            if (iDoc.exists()) {
              t.update(iRef, { currentStock: (iDoc.data().currentStock || 0) + rLine.received });
            }
          }
        }
      }

      let finalStatus: import('../types').TransferOrderStatus = transfer.status;
      if (isPartial) {
        finalStatus = 'PARTIALLY_RECEIVED';
      } else if (hasException) {
        finalStatus = 'EXCEPTION';
      } else {
        finalStatus = 'COMPLETED';
      }

      t.update(ref, {
        status: finalStatus,
        receivedByUid: session.userId,
        receivedByName: session.fullName,
        actualReceiptDate: new Date().toISOString(),
        lines: transfer.lines,
        updatedAt: new Date().toISOString()
      });

      // Update gate pass to received if it exists
      if (transfer.gatePassId && finalStatus === 'COMPLETED') {
        const gpRef = doc(db, 'companies', companyId, 'gate_passes', transfer.gatePassId);
        t.update(gpRef, { status: 'CLOSED', receivedAt: new Date().toISOString(), closedAt: new Date().toISOString() });
      }

    });
  }
}
