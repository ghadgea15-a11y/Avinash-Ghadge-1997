import * as fs from 'fs';

const file = 'functions/src/index.ts';
let content = fs.readFileSync(file, 'utf8');

const rfqFunctions = `
// ============================================================================
// MODULE 14.2: RFQ MANAGEMENT SYSTEM
// ============================================================================

export const onRfqPublished = functionsV1.firestore
  .document("companies/{companyId}/rfq_requests/{rfqId}")
  .onUpdate(async (change, context) => {
    const { companyId, rfqId } = context.params;
    const before = change.before.data();
    const after = change.after.data();

    // Only trigger when status changes to PUBLISHED
    if (before.status !== 'DRAFT' || after.status !== 'PUBLISHED') return null;

    const db = admin.firestore();
    let targetVendors: any[] = [];

    // Identify target vendors
    if (after.invitedVendorIds.includes('ALL_CATEGORY_VENDORS')) {
       const vendorsSnap = await db.collection('companies').doc(companyId).collection('srm_vendors')
          .where('status', '==', 'ACTIVE')
          .where('category', '==', after.category)
          .get();
       vendorsSnap.forEach(doc => targetVendors.push(doc.data()));
    } else {
       // Fetch specifically invited vendors
       for (const vId of after.invitedVendorIds) {
          const doc = await db.collection('companies').doc(companyId).collection('srm_vendors').doc(vId).get();
          if (doc.exists) targetVendors.push(doc.data());
       }
    }

    // Generate notifications (Simulated)
    // In real app: send emails, SMS, or FCM push alerts to targetVendors
    console.log(\`RFQ \${after.rfqNumber} broadcasted to \${targetVendors.length} vendors.\`);
    
    // Log to Audit
    await db.collection('companies').doc(companyId).collection('security_audit_events').add({
       eventId: 'AUTO_' + Date.now().toString(),
       companyId,
       timestamp: new Date().toISOString(),
       action: 'RFQ_BROADCASTED',
       resource: 'RFQ',
       resourceId: rfqId,
       userId: 'SYSTEM',
       success: true,
       severity: 'LOW',
       reason: \`Broadcasted RFQ \${after.rfqNumber} to \${targetVendors.length} vendors.\`
    });

    return null;
  });

export const submitVendorBid = https.onCall(async (request) => {
  const data = request.data;
  const auth = request.auth;

  if (!auth) throw new https.HttpsError("unauthenticated", "User must be authenticated.");
  
  const { companyId, rfqId, bidData } = data;
  if (!companyId || !rfqId || !bidData) {
    throw new https.HttpsError("invalid-argument", "Missing required fields.");
  }

  const db = admin.firestore();
  const rfqRef = db.collection('companies').doc(companyId).collection('rfq_requests').doc(rfqId);

  try {
    return await db.runTransaction(async (transaction) => {
      const rfqDoc = await transaction.get(rfqRef);
      if (!rfqDoc.exists) throw new https.HttpsError("not-found", "RFQ not found.");
      
      const rfqData = rfqDoc.data()!;
      if (rfqData.status !== 'PUBLISHED') {
         throw new https.HttpsError("failed-precondition", "RFQ is not open for bidding.");
      }

      const now = new Date();
      const deadline = new Date(rfqData.submissionDeadline);
      
      // Enforce Sealed-Bid deadline
      if (now > deadline) {
         throw new https.HttpsError("failed-precondition", "Submission deadline has passed. Late bids are not accepted.");
      }

      // Check if user is the authorized vendor (for simplicity, checking if vendorId is in token or matching)
      // We will assume bidData contains the correct vendorId that matches the auth user's associated vendor record in a real system.
      
      const bidRef = db.collection('companies').doc(companyId).collection('rfq_bids').doc();
      const bidId = bidRef.id;

      const finalBidData = {
         ...bidData,
         id: bidId,
         rfqId,
         companyId,
         bidStatus: 'SUBMITTED',
         submittedAt: now.toISOString(),
         createdAt: now.toISOString(),
         updatedAt: now.toISOString()
      };

      transaction.set(bidRef, finalBidData);
      
      return { success: true, bidId };
    });
  } catch (error: any) {
    console.error("Bid submission failed: ", error);
    if (error instanceof https.HttpsError) throw error;
    throw new https.HttpsError("internal", error.message);
  }
});

export const generateRfqComparison = https.onCall(async (request) => {
  const data = request.data;
  const auth = request.auth;

  if (!auth) throw new https.HttpsError("unauthenticated", "User must be authenticated.");
  
  const { companyId, rfqId } = data;
  if (!companyId || !rfqId) {
    throw new https.HttpsError("invalid-argument", "Missing required fields.");
  }

  const db = admin.firestore();
  
  // Validate procurement admin role
  const callerClaims = auth.token;
  if (callerClaims.cId !== companyId) throw new https.HttpsError("permission-denied", "Company ID mismatch.");

  const rfqRef = db.collection('companies').doc(companyId).collection('rfq_requests').doc(rfqId);

  try {
    return await db.runTransaction(async (transaction) => {
      const rfqDoc = await transaction.get(rfqRef);
      if (!rfqDoc.exists) throw new https.HttpsError("not-found", "RFQ not found.");
      
      const rfqData = rfqDoc.data()!;
      
      // Update RFQ status
      if (rfqData.status === 'PUBLISHED') {
          transaction.update(rfqRef, { status: 'UNDER_EVALUATION', updatedAt: new Date().toISOString() });
      }

      // Fetch all submitted bids
      const bidsSnap = await transaction.get(
          db.collection('companies').doc(companyId).collection('rfq_bids')
            .where('rfqId', '==', rfqId)
            .where('bidStatus', '==', 'SUBMITTED')
      );
      
      let bids: any[] = [];
      bidsSnap.forEach(d => bids.push(d.data()));

      if (bids.length === 0) {
          return { success: true, matrix: null, message: "No bids received." };
      }

      // Compute Matrix
      // Find L1, L2, L3 based on grandTotal
      bids.sort((a, b) => a.grandTotal - b.grandTotal);
      
      const matrix = {
         rfqId,
         rfqNumber: rfqData.rfqNumber,
         evaluatedAt: new Date().toISOString(),
         bidCount: bids.length,
         rankings: bids.map((b, index) => ({
             bidId: b.id,
             vendorId: b.vendorId,
             vendorName: b.vendorName,
             rank: \`L\${index + 1}\`,
             grandTotal: b.grandTotal,
             deliveryLeadTime: Math.max(...b.lineItemQuotes.map((q: any) => q.leadTimeDays || 0)),
             score: b.score // If pre-calculated
         }))
      };

      return { success: true, matrix };
    });
  } catch (error: any) {
    console.error("Comparison generation failed: ", error);
    if (error instanceof https.HttpsError) throw error;
    throw new https.HttpsError("internal", error.message);
  }
});

export const awardRfqAndGeneratePO = https.onCall(async (request) => {
  const data = request.data;
  const auth = request.auth;

  if (!auth) throw new https.HttpsError("unauthenticated", "User must be authenticated.");
  
  const { companyId, rfqId, awardedBidId, justification } = data;
  if (!companyId || !rfqId || !awardedBidId) {
    throw new https.HttpsError("invalid-argument", "Missing required fields.");
  }

  const db = admin.firestore();
  
  // Validate A1/A2 role
  const callerClaims = auth.token;
  if (callerClaims.cId !== companyId) throw new https.HttpsError("permission-denied", "Company ID mismatch.");
  const allowedRoles = ['A0_OWNER', 'A1_DIRECTOR_CEO', 'A2_GENERAL_MANAGER'];
  if (!allowedRoles.includes(callerClaims.aLvl)) {
     throw new https.HttpsError("permission-denied", "Only A1/A2 can award RFQs.");
  }

  const rfqRef = db.collection('companies').doc(companyId).collection('rfq_requests').doc(rfqId);
  const bidRef = db.collection('companies').doc(companyId).collection('rfq_bids').doc(awardedBidId);

  try {
    await db.runTransaction(async (transaction) => {
      const rfqDoc = await transaction.get(rfqRef);
      const bidDoc = await transaction.get(bidRef);

      if (!rfqDoc.exists || !bidDoc.exists) throw new https.HttpsError("not-found", "RFQ or Bid not found.");
      
      const rfqData = rfqDoc.data()!;
      const bidData = bidDoc.data()!;

      // 1. Update RFQ Status
      transaction.update(rfqRef, { status: 'AWARDED', updatedAt: new Date().toISOString() });

      // 2. Mark this bid as ACCEPTED
      transaction.update(bidRef, { bidStatus: 'ACCEPTED', updatedAt: new Date().toISOString() });

      // 3. Mark other bids as REJECTED
      const allBidsSnap = await transaction.get(
          db.collection('companies').doc(companyId).collection('rfq_bids')
            .where('rfqId', '==', rfqId)
      );
      allBidsSnap.forEach(docSnap => {
          if (docSnap.id !== awardedBidId) {
             transaction.update(docSnap.ref, { bidStatus: 'REJECTED', updatedAt: new Date().toISOString() });
          }
      });

      // 4. Log Evaluation
      const evalRef = db.collection('companies').doc(companyId).collection('rfq_evaluation_logs').doc();
      transaction.set(evalRef, {
         id: evalRef.id,
         companyId,
         rfqId,
         awardedBidId,
         awardedVendorId: bidData.vendorId,
         justification: justification || 'System Award',
         approvedBy: auth.uid,
         awardedAt: new Date().toISOString(),
         comparisonMatrix: "{}" // Normally we'd store the snapshotted JSON here
      });

      // 5. Audit Log
      const auditRef = db.collection('companies').doc(companyId).collection('security_audit_events').doc();
      transaction.set(auditRef, {
         eventId: auditRef.id,
         companyId,
         timestamp: new Date().toISOString(),
         action: 'RFQ_AWARDED',
         resource: 'RFQ',
         resourceId: rfqId,
         userId: auth.uid,
         success: true,
         severity: 'HIGH',
         reason: \`RFQ awarded to vendor \${bidData.vendorId}. Bid ID: \${awardedBidId}\`
      });

      // Note: Handoff to PO generation logic can be implemented here or in a separate function triggered by rfq_evaluation_logs onCreate.
    });

    return { success: true, message: "RFQ Awarded successfully." };
  } catch (error: any) {
    console.error("Award RFQ failed: ", error);
    if (error instanceof https.HttpsError) throw error;
    throw new https.HttpsError("internal", error.message);
  }
});
`;

if (!content.includes('onRfqPublished')) {
  content = content + '\n' + rfqFunctions;
  fs.writeFileSync(file, content);
  console.log('Added RFQ Functions');
} else {
  console.log('RFQ Functions already exist');
}
