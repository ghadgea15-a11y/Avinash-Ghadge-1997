import * as fs from 'fs';

const file = 'functions/src/index.ts';
let content = fs.readFileSync(file, 'utf8');

const matchFunctions = `
// ============================================================================
// MODULE 14.4: 3-WAY MATCHING
// ============================================================================

export const executeThreeWayMatch = functionsV1.firestore
  .document("companies/{companyId}/vendor_invoices/{invoiceId}")
  .onCreate(async (snap, context) => {
    const { companyId, invoiceId } = context.params;
    const invoiceData = snap.data()!;
    const db = admin.firestore();

    const poId = invoiceData.poId;
    const grnId = invoiceData.grnId; // Optionally provided, else we find the latest verified GRN for this PO

    if (!poId) {
       console.log('Invoice has no PO ID, skipping 3-way match.');
       return null;
    }

    try {
      const poDoc = await db.collection('companies').doc(companyId).collection('purchase_orders').doc(poId).get();
      if (!poDoc.exists) throw new Error('PO not found');
      const poData = poDoc.data()!;

      let grnData: any = null;
      let actualGrnId = grnId;
      if (grnId) {
         const grnDoc = await db.collection('companies').doc(companyId).collection('goods_receipt_notes').doc(grnId).get();
         if (grnDoc.exists) grnData = grnDoc.data();
      } else {
         const grnsSnap = await db.collection('companies').doc(companyId).collection('goods_receipt_notes')
            .where('poId', '==', poId)
            // .where('status', '==', 'VERIFIED')
            .limit(1)
            .get();
         if (!grnsSnap.empty) {
            grnData = grnsSnap.docs[0].data();
            actualGrnId = grnsSnap.docs[0].id;
         }
      }

      if (!grnData) {
         await snap.ref.update({ paymentStatus: 'MATCH_FAILED_HOLD' });
         console.log('No GRN found for this PO. Match failed.');
         return null;
      }

      // Configure Tolerance
      const toleranceConfig = {
        quantityTolerancePercent: 0, 
        priceTolerancePercent: 1.5,
        maxAmountVarianceLimit: 100 // up to 100 Rs flat tolerance on total
      };

      const lineItemMatches: any[] = [];
      let overallMatch = true;
      let varianceType = 'NONE';
      
      const invoiceTotal = invoiceData.totalAmount || 0;
      const poTotal = poData.grandTotal || 0;
      // We don't always have a strict GRN total if it only tracks qty, but we can compute from PO prices
      let grnTotal = 0;

      invoiceData.lineItems.forEach((invItem: any) => {
         const poItem = poData.lineItems?.find((i: any) => i.itemId === invItem.itemId || i.itemName === invItem.itemName);
         const grnItem = grnData.itemsReceived?.find((i: any) => i.itemName === invItem.itemName || i.itemId === invItem.itemId);

         const poQty = poItem ? poItem.quantity : 0;
         const grnQty = grnItem ? grnItem.quantityAccepted : 0;
         const poRate = poItem ? poItem.unitPrice : 0;

         grnTotal += grnQty * poRate;

         const qtyMatch = invItem.billedQty <= grnQty; 
         
         // Price match with tolerance
         const rateVariance = invItem.unitRate - poRate;
         const rateVariancePercent = (rateVariance / poRate) * 100;
         const rateMatch = rateVariancePercent <= toleranceConfig.priceTolerancePercent;

         const taxMatch = poItem ? invItem.taxRate === poItem.gstRate : false;

         let varianceNotes = [];
         if (!qtyMatch) { varianceNotes.push('Billed qty exceeds received'); varianceType = 'UNRECEIVED_GOODS_BILLED'; }
         if (!rateMatch) { varianceNotes.push('Invoiced rate exceeds PO rate'); varianceType = 'RATE_HIKE'; }
         if (!taxMatch) { varianceNotes.push('Tax rate mismatch'); varianceType = varianceType === 'NONE' ? 'TAX_MISMATCH' : 'MULTIPLE'; }

         if (!qtyMatch || !rateMatch || !taxMatch) {
            overallMatch = false;
         }

         lineItemMatches.push({
            itemId: invItem.itemId,
            itemName: invItem.itemName,
            poQty,
            grnQty,
            invQty: invItem.billedQty,
            poRate,
            invRate: invItem.unitRate,
            qtyMatch,
            rateMatch,
            taxMatch,
            varianceNotes: varianceNotes.join(', ')
         });
      });

      const totalVarianceAmount = Math.abs(invoiceTotal - poTotal);
      if (totalVarianceAmount <= toleranceConfig.maxAmountVarianceLimit && overallMatch) {
         overallMatch = true;
      } else if (totalVarianceAmount > toleranceConfig.maxAmountVarianceLimit) {
         overallMatch = false;
         if (varianceType === 'NONE') varianceType = 'MULTIPLE';
      }

      const matchStatus = overallMatch ? (totalVarianceAmount > 0 ? 'TOLERANCE_PASSED' : 'PERFECT_MATCH') : 'VARIANCE_DETECTED';

      const matchRecordRef = db.collection('companies').doc(companyId).collection('three_way_match_records').doc();
      await matchRecordRef.set({
         id: matchRecordRef.id,
         companyId,
         poId,
         grnId: actualGrnId || '',
         invoiceId,
         vendorId: invoiceData.vendorId,
         matchStatus,
         toleranceConfigUsed: toleranceConfig,
         lineItemMatches,
         totalPoAmount: poTotal,
         totalGrnAmount: grnTotal,
         totalInvoiceAmount: invoiceTotal,
         varianceAmount: totalVarianceAmount,
         varianceType,
         auditTrail: [{
            action: 'MATCH_EXECUTED',
            actionBy: 'SYSTEM',
            timestamp: new Date().toISOString(),
            comments: 'Automated 3-way match executed.'
         }],
         createdAt: new Date().toISOString()
      });

      // Update Invoice status
      const paymentStatus = (matchStatus === 'PERFECT_MATCH' || matchStatus === 'TOLERANCE_PASSED') ? 'MATCH_PASSED' : 'MATCH_FAILED_HOLD';
      await snap.ref.update({ paymentStatus });
      
      console.log(\`3-way match complete for Invoice \${invoiceId}. Result: \${matchStatus}\`);

    } catch (err) {
      console.error('Error in 3-way match:', err);
    }
    return null;
  });


export const resolveMatchVariance = https.onCall(async (request) => {
  const data = request.data;
  const auth = request.auth;

  if (!auth) throw new https.HttpsError("unauthenticated", "User must be authenticated.");
  
  const { companyId, matchId, action, resolutionComments } = data; // action: 'OVERRIDE' | 'REQUEST_CREDIT_NOTE' | 'REJECT'
  if (!companyId || !matchId || !action) throw new https.HttpsError("invalid-argument", "Missing required fields.");

  const db = admin.firestore();
  
  const callerClaims = auth.token;
  if (callerClaims.cId !== companyId) throw new https.HttpsError("permission-denied", "Company ID mismatch.");
  const allowedRoles = ['A0_OWNER', 'A1_DIRECTOR_CEO', 'A2_GENERAL_MANAGER'];

  if (!allowedRoles.includes(callerClaims.aLvl)) {
     throw new https.HttpsError("permission-denied", "Insufficient permissions to override or resolve variances.");
  }

  const matchRef = db.collection('companies').doc(companyId).collection('three_way_match_records').doc(matchId);

  try {
    return await db.runTransaction(async (transaction) => {
      const matchDoc = await transaction.get(matchRef);
      if (!matchDoc.exists) throw new https.HttpsError("not-found", "Match record not found.");
      
      const matchData = matchDoc.data()!;
      if (matchData.matchStatus === 'MANUALLY_OVERRIDDEN' || matchData.matchStatus === 'REJECTED') {
          throw new https.HttpsError("failed-precondition", "Match record is already resolved.");
      }

      let newStatus = matchData.matchStatus;
      let newPaymentStatus = 'MATCH_FAILED_HOLD';
      
      if (action === 'OVERRIDE') {
         newStatus = 'MANUALLY_OVERRIDDEN';
         newPaymentStatus = 'MATCH_PASSED'; // ready to pay
      } else if (action === 'REJECT') {
         newStatus = 'REJECTED';
         newPaymentStatus = 'REJECTED'; // Vendor invoice rejected completely
      }
      // if REQUEST_CREDIT_NOTE, status remains VARIANCE_DETECTED, payment on hold.
      
      transaction.update(matchRef, { 
         matchStatus: newStatus,
         passedAt: newStatus === 'MANUALLY_OVERRIDDEN' ? new Date().toISOString() : null,
         reviewedBy: auth.uid,
         auditTrail: admin.firestore.FieldValue.arrayUnion({
            action,
            actionBy: auth.uid,
            timestamp: new Date().toISOString(),
            comments: resolutionComments || ''
         })
      });

      const invoiceRef = db.collection('companies').doc(companyId).collection('vendor_invoices').doc(matchData.invoiceId);
      if (action === 'OVERRIDE' || action === 'REJECT') {
         transaction.update(invoiceRef, { paymentStatus: newPaymentStatus });
      }

      // Audit Log
      const auditRef = db.collection('companies').doc(companyId).collection('security_audit_events').doc();
      transaction.set(auditRef, {
         eventId: auditRef.id,
         companyId,
         timestamp: new Date().toISOString(),
         action: '3WAY_MATCH_RESOLUTION',
         resource: 'MATCH_RECORD',
         resourceId: matchId,
         userId: auth.uid,
         success: true,
         severity: 'HIGH',
         reason: \`Variance resolved via \${action}. \${resolutionComments || ''}\`
      });

      return { success: true, message: "Variance resolved successfully." };
    });
  } catch (error: any) {
    console.error("Variance resolution failed: ", error);
    if (error instanceof https.HttpsError) throw error;
    throw new https.HttpsError("internal", error.message);
  }
});
`;

if (!content.includes('executeThreeWayMatch')) {
  content = content + '\n' + matchFunctions;
  fs.writeFileSync(file, content);
  console.log('Added 3-Way Match Functions');
} else {
  console.log('3-Way Match Functions already exist');
}
