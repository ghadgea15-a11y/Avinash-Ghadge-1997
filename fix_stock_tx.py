import sys

with open('src/services/firestoreService.ts', 'r') as f:
    code = f.read()

target_str = """  static async recordStockTransaction(
    companyId: string,
    transaction: Omit<StockTransactionRecord, 'id' | 'createdAt' | 'previousStock' | 'newStock'>,
    actor: { uid: string; name: string }
  ): Promise<{ success: boolean; transactionId: string; newStock: number }> {"""

replacement = """  static async recordStockTransaction(
    companyId: string,
    transaction: Omit<StockTransactionRecord, 'id' | 'createdAt' | 'previousStock' | 'newStock'>,
    actor: { uid: string; name: string }
  ): Promise<{ success: boolean; transactionId: string; newStock: number }> {
    const txId = `STX-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const now = new Date().toISOString();
    try {
      const newStockResult = await runTransaction(db, async (t) => {
        const itemRef = doc(db, 'companies', companyId, 'inventory_items', transaction.itemId);
        const itemSnap = await t.get(itemRef);

        if (!itemSnap.exists()) {
          throw new Error(`Inventory item with ID ${transaction.itemId} not found.`);
        }

        const itemData = itemSnap.data() as InventoryItemRecord;
        const prevStock = Number(itemData.currentStock) || 0;
        const qty = Number(transaction.quantity) || 0;

        let newStock = prevStock;
        switch (transaction.transactionType) {
          case 'PURCHASE_INWARD':
          case 'RETURN_FROM_EMPLOYEE':
            newStock = prevStock + qty;
            break;
          case 'ISSUE_TO_EMPLOYEE':
          case 'DAMAGE_SCRAP':
            if (prevStock < qty) {
              throw new Error(`Insufficient stock for ${itemData.itemName}. Available: ${prevStock}, Requested: ${qty}`);
            }
            newStock = prevStock - qty;
            break;
          case 'SITE_TRANSFER':
            if (prevStock < qty) {
              throw new Error(`Insufficient stock for transfer. Available: ${prevStock}, Requested: ${qty}`);
            }
            newStock = prevStock - qty;
            break;
          case 'AUDIT_ADJUSTMENT':
            newStock = qty;
            break;
          default:
            newStock = prevStock;
        }

        let newStatus: InventoryItemRecord['status'] = itemData.status;
        if (newStatus !== 'DISCONTINUED') {
          if (newStock <= 0) {
            newStatus = 'OUT_OF_STOCK';
          } else if (newStock <= (itemData.minStockThreshold || 5)) {
            newStatus = 'LOW_STOCK';
          } else {
            newStatus = 'IN_STOCK';
          }
        }

        t.update(itemRef, {
          currentStock: newStock,
          status: newStatus,
          updatedAt: now
        });

        const txPayload: StockTransactionRecord = {
          ...transaction,
          id: txId,
          companyId,
          previousStock: prevStock,
          newStock,
          performedByUid: actor.uid,
          performedByName: actor.name,
          createdAt: now
        };

        const txRef = doc(db, 'companies', companyId, 'inventory_transactions', txId);
        t.set(txRef, txPayload);

        const auditRec = AuditTrailService.buildAuditRecord(
          { userId: actor.uid, companyId },
          companyId,
          'INVENTORY',
          `STOCK_${transaction.transactionType}`,
          'UPDATE',
          'InventoryItemRecord',
          transaction.itemId,
          true,
          'MEDIUM',
          txId,
          `Item: ${itemData.itemName} (${itemData.itemCode}), Type: ${transaction.transactionType}, Qty: ${qty}, Stock: ${prevStock} -> ${newStock}`,
          undefined,
          { txId, qty, prevStock, newStock }
        );
        if (auditRec) {
          const auditRef = doc(db, 'companies', companyId, 'audit_logs', auditRec.id);
          t.set(auditRef, auditRec);
        }

        return newStock;
      });

      return { success: true, transactionId: txId, newStock: newStockResult };
    } catch (err: any) {
      console.error('[FirestoreService] recordStockTransaction error:', err);
      return { success: false, transactionId: '', newStock: 0 };
    }
  }"""

start_idx = code.find(target_str)
if start_idx == -1:
    print("Not found")
    sys.exit(1)

end_marker = "console.error('[FirestoreService] recordStockTransaction error:', err);"
end_idx_raw = code.find(end_marker, start_idx)
end_idx = code.find('}', end_idx_raw) + 1
next_end_idx = code.find('}', end_idx) + 1

new_code = code[:start_idx] + replacement + code[next_end_idx:]

with open('src/services/firestoreService.ts', 'w') as f:
    f.write(new_code)

