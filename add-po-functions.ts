import * as fs from 'fs';

const file = 'functions/src/index.ts';
let content = fs.readFileSync(file, 'utf8');

const poFunctions = `
// ============================================================================
// MODULE 14.3: PURCHASE ORDERS (PO) MANAGEMENT
// ============================================================================

export const onPOCreateOrUpdate = functionsV1.firestore
  .document("companies/{companyId}/purchase_orders/{poId}")
  .onWrite(async (change, context) => {
    const { companyId, poId } = context.params;
    
    if (!change.after.exists) return null; // deleted
    
    const poData = change.after.data()!;
    const db = admin.firestore();

    // Threshold logic
    // Below 25,000: Auto-approvable by A2
    // 25,000 to 1,00,000: Requires A1
    // Above 1,00,000: Requires A1 + A0
    
    const amount = poData.grandTotal || 0;
    let requiredTier = 'A2';
    if (amount > 100000) {
       requiredTier = 'A0';
    } else if (amount >= 25000) {
       requiredTier = 'A1';
    }

    const updates: any = {};
    let needsUpdate = false;

    if (poData.status === 'PENDING_APPROVAL') {
       if (!poData.approvalWorkflow) {
          updates.approvalWorkflow = {
             currentApprovalTier: requiredTier,
             approvalTrail: []
          };
          needsUpdate = true;
       }
       // Dispatch notifications (Simulated)
       console.log(\`PO \${poData.poNumber} requires approval at tier \${requiredTier}.\`);
    }

    if (needsUpdate) {
       await change.after.ref.update(updates);
    }
    
    return null;
  });

export const generatePOPdf = https.onCall(async (request) => {
  const data = request.data;
  const auth = request.auth;

  if (!auth) throw new https.HttpsError("unauthenticated", "User must be authenticated.");
  
  const { companyId, poId } = data;
  if (!companyId || !poId) throw new https.HttpsError("invalid-argument", "Missing required fields.");

  const db = admin.firestore();
  const poRef = db.collection('companies').doc(companyId).collection('purchase_orders').doc(poId);

  try {
    return await db.runTransaction(async (transaction) => {
      const poDoc = await transaction.get(poRef);
      if (!poDoc.exists) throw new https.HttpsError("not-found", "PO not found.");
      
      const poData = poDoc.data()!;
      if (poData.status !== 'APPROVED') {
          throw new https.HttpsError("failed-precondition", "PO must be APPROVED before generating PDF.");
      }

      // Simulated PDF Generation
      const mockPdfUrl = \`https://storage.googleapis.com/log-sheet-mock/po/\${poData.poNumber}.pdf\`;

      transaction.update(poRef, { 
         pdfUrl: mockPdfUrl,
         updatedAt: new Date().toISOString()
      });

      return { success: true, pdfUrl: mockPdfUrl };
    });
  } catch (error: any) {
    console.error("PDF generation failed: ", error);
    if (error instanceof https.HttpsError) throw error;
    throw new https.HttpsError("internal", error.message);
  }
});

export const dispatchPOToVendor = https.onCall(async (request) => {
  const data = request.data;
  const auth = request.auth;

  if (!auth) throw new https.HttpsError("unauthenticated", "User must be authenticated.");
  
  const { companyId, poId } = data;
  if (!companyId || !poId) throw new https.HttpsError("invalid-argument", "Missing required fields.");

  const db = admin.firestore();
  
  const callerClaims = auth.token;
  if (callerClaims.cId !== companyId) throw new https.HttpsError("permission-denied", "Company ID mismatch.");
  const allowedRoles = ['A0_OWNER', 'A1_DIRECTOR_CEO', 'A2_GENERAL_MANAGER', 'A3_SUPERVISOR_MANAGER']; // Including procurement team

  if (!allowedRoles.includes(callerClaims.aLvl)) {
     throw new https.HttpsError("permission-denied", "Insufficient permissions to dispatch PO.");
  }

  const poRef = db.collection('companies').doc(companyId).collection('purchase_orders').doc(poId);

  try {
    return await db.runTransaction(async (transaction) => {
      const poDoc = await transaction.get(poRef);
      if (!poDoc.exists) throw new https.HttpsError("not-found", "PO not found.");
      
      const poData = poDoc.data()!;
      if (poData.status !== 'APPROVED') {
          throw new https.HttpsError("failed-precondition", "PO must be APPROVED to dispatch.");
      }

      transaction.update(poRef, { 
         status: 'ISSUED_TO_VENDOR',
         updatedAt: new Date().toISOString()
      });

      // Audit Log
      const auditRef = db.collection('companies').doc(companyId).collection('security_audit_events').doc();
      transaction.set(auditRef, {
         eventId: auditRef.id,
         companyId,
         timestamp: new Date().toISOString(),
         action: 'PO_DISPATCHED',
         resource: 'PURCHASE_ORDER',
         resourceId: poId,
         userId: auth.uid,
         success: true,
         severity: 'MEDIUM',
         reason: \`PO \${poData.poNumber} dispatched to vendor \${poData.vendorName}.\`
      });

      return { success: true, message: "PO dispatched successfully." };
    });
  } catch (error: any) {
    console.error("Dispatch failed: ", error);
    if (error instanceof https.HttpsError) throw error;
    throw new https.HttpsError("internal", error.message);
  }
});
`;

if (!content.includes('onPOCreateOrUpdate')) {
  content = content + '\n' + poFunctions;
  fs.writeFileSync(file, content);
  console.log('Added PO Functions');
} else {
  console.log('PO Functions already exist');
}
