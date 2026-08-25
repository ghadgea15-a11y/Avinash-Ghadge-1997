const fs = require('fs');
let code = fs.readFileSync('src/services/firestoreService.ts', 'utf8');

const targetStr = \`  static async recordStockTransaction(
    companyId: string,
    transaction: Omit<StockTransactionRecord, 'id' | 'createdAt' | 'previousStock' | 'newStock'>,
    actor: { uid: string; name: string }
  ): Promise<{ success: boolean; transactionId: string; newStock: number }> {\`;

if (!code.includes(targetStr)) {
  console.log("Could not find recordStockTransaction start string.");
  process.exit(1);
}

const replacement = \`  static async recordStockTransaction(
    companyId: string,
    transaction: Omit<StockTransactionRecord, 'id' | 'createdAt' | 'previousStock' | 'newStock'>,
    actor: { uid: string; name: string }
  ): Promise<{ success: boolean; transactionId: string; newStock: number }> {
    const txId = \`STX-\${Date.now()}-\${Math.random().toString(36).substring(2, 6).toUpperCase()}\`;
    const now = new Date().toISOString();
    
    try {
      const newStockResult = await runTransaction(db, async (t) => {
        const itemRef = doc(db, 'companies', companyId, 'inventory_items', transaction.itemId);
        const itemSnap = await t.get(itemRef);
        
        if (!itemSnap.exists()) {
          throw new Error(\`Inventory item with ID \${transaction.itemId} not found.\`);
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
              throw new Error(\`Insufficient stock for \${itemData.itemName}. Available: \${prevStock}, Requested: \${qty}\`);
            }
            newStock = prevStock - qty;
            break;
          case 'SITE_TRANSFER':
            if (prevStock < qty) {
              throw new Error(\`Insufficient stock for transfer. Available: \${prevStock}, Requested: \${qty}\`);
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
        
        // Also build and log the audit record
        const auditRec = AuditTrailService.buildAuditRecord(
          { userId: actor.uid, companyId },
          companyId,
          'INVENTORY',
          \`STOCK_\${transaction.transactionType}\`,
          'UPDATE',
          'InventoryItemRecord',
          transaction.itemId,
          true,
          'MEDIUM',
          txId,
          \`Item: \${itemData.itemName}, Type: \${transaction.transactionType}, Qty: \${qty}, Stock: \${prevStock} -> \${newStock}\`,
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
  }\`;

// I will extract the current function body and replace it.
// Finding the end of the method is tricky with regex, so I'll slice from the start string to the end string.
const startIdx = code.indexOf(targetStr);
const endMarker = \`console.error('[FirestoreService] recordStockTransaction error:', err);\`;
const endIdxRaw = code.indexOf(endMarker, startIdx);
const endIdx = code.indexOf('}', endIdxRaw) + 1; // get the closing brace of catch
const nextEndIdx = code.indexOf('}', endIdx) + 1; // get the closing brace of the method

const newCode = code.substring(0, startIdx) + replacement + code.substring(nextEndIdx);

fs.writeFileSync('src/services/firestoreService.ts', newCode);
