import * as fs from 'fs';

const file = 'functions/src/index.ts';
let content = fs.readFileSync(file, 'utf8');

const srmFunctions = `
// ============================================================================
// MODULE 14.1: VENDOR MANAGEMENT SYSTEM
// ============================================================================

export const onVendorDocUpload = functionsV1.firestore
  .document("companies/{companyId}/vendor_documents/{docId}")
  .onWrite(async (change, context) => {
    const { companyId, docId } = context.params;
    
    if (!change.after.exists) return null; // Deleted
    
    const docData = change.after.data()!;
    const vendorId = docData.vendorId;
    if (!vendorId) return null;

    const db = admin.firestore();
    const vendorRef = db.collection('companies').doc(companyId).collection('srm_vendors').doc(vendorId);
    
    // Check if the document was just uploaded and needs verification
    if (docData.verificationStatus === 'PENDING') {
      // In a real system, you might trigger OCR or an async process here
      // For now, we will flag the vendor's compliance score to be recalculated
      await vendorRef.update({
        updatedAt: new Date().toISOString()
      }, { merge: true });
    }
    
    return null;
  });

export const calculateVendorScore = functionsV1.pubsub
  .schedule("0 2 * * 0") // Run at 2 AM every Sunday
  .timeZone("UTC")
  .onRun(async (context) => {
    const db = admin.firestore();
    const vendorsSnapshot = await db.collectionGroup('srm_vendors').get();
    
    const batch = db.batch();
    let batchCount = 0;

    const commitBatchIfNeeded = async () => {
      if (batchCount >= 450) {
        await batch.commit();
        batchCount = 0;
      }
    };

    const now = new Date();

    for (const doc of vendorsSnapshot.docs) {
      const data = doc.data();
      const companyId = data.companyId;
      const vendorId = data.id || doc.id;
      
      // Calculate compliance based on documents
      const docsSnapshot = await db.collection('companies').doc(companyId).collection('vendor_documents').where('vendorId', '==', vendorId).get();
      
      let verifiedDocs = 0;
      let totalMandatory = 3; // e.g. GST, PAN, Cancelled Cheque
      let hasExpiredMandatory = false;

      docsSnapshot.forEach(d => {
        const dData = d.data();
        if (dData.verificationStatus === 'VERIFIED') {
          if (dData.expiryDate && new Date(dData.expiryDate) < now) {
            hasExpiredMandatory = true;
          } else {
            verifiedDocs++;
          }
        }
      });
      
      let newComplianceScore = Math.min(100, Math.round((verifiedDocs / totalMandatory) * 100));
      if (hasExpiredMandatory) newComplianceScore = Math.max(0, newComplianceScore - 30);

      // In a real app, this would also aggregate from vendor_performance_logs
      // For this implementation, we will check if score dropped below threshold to demote tier
      
      let newTier = data.tier;
      if (newComplianceScore < 60 && newTier !== 'BLACKLISTED') {
         newTier = 'TIER_3_PROVISIONAL';
      }

      if (newComplianceScore !== data.complianceScore || newTier !== data.tier) {
         batch.update(doc.ref, {
           complianceScore: newComplianceScore,
           tier: newTier,
           updatedAt: now.toISOString()
         });
         batchCount++;
         await commitBatchIfNeeded();
      }
    }

    if (batchCount > 0) {
      await batch.commit();
    }
    console.log("calculateVendorScore completed.");
    return null;
  });

export const toggleVendorStatus = https.onCall(async (request) => {
  const data = request.data;
  const auth = request.auth;

  if (!auth) throw new https.HttpsError("unauthenticated", "User must be authenticated.");
  
  const { companyId, vendorId, newStatus, newTier, reason } = data;

  if (!companyId || !vendorId || (!newStatus && !newTier)) {
    throw new https.HttpsError("invalid-argument", "Missing required fields.");
  }

  const db = admin.firestore();

  // Validate admin rights
  const callerClaims = auth.token;
  if (callerClaims.cId !== companyId) {
    throw new https.HttpsError("permission-denied", "Company ID mismatch.");
  }
  
  // Only A0, A1, A2 can blacklist or suspend
  const allowedRoles = ['A0_OWNER', 'A1_DIRECTOR_CEO', 'A2_GENERAL_MANAGER'];
  if (!allowedRoles.includes(callerClaims.aLvl)) {
     throw new https.HttpsError("permission-denied", "Insufficient permissions to toggle vendor status.");
  }

  const vendorRef = db.collection('companies').doc(companyId).collection('srm_vendors').doc(vendorId);

  try {
    await db.runTransaction(async (transaction) => {
      const vendorDoc = await transaction.get(vendorRef);
      if (!vendorDoc.exists) {
        throw new https.HttpsError("not-found", "Vendor record not found.");
      }

      const updates: any = { updatedAt: new Date().toISOString() };
      if (newStatus) updates.status = newStatus;
      if (newTier) updates.tier = newTier;

      transaction.update(vendorRef, updates);

      // Log to GRC Audit
      const auditRef = db.collection('companies').doc(companyId).collection('security_audit_events').doc();
      transaction.set(auditRef, {
        eventId: auditRef.id,
        companyId: companyId,
        timestamp: new Date().toISOString(),
        action: 'VENDOR_STATUS_UPDATED',
        resource: 'VENDOR',
        resourceId: vendorId,
        userId: auth.uid,
        success: true,
        severity: (newStatus === 'BLACKLISTED' || newTier === 'BLACKLISTED') ? 'HIGH' : 'MEDIUM',
        reason: \`Vendor status updated to \${newStatus || ''} \${newTier || ''}. Reason: \${reason || 'Not provided'}\`
      });
    });

    return { success: true, message: "Vendor status updated successfully." };
  } catch (error: any) {
    console.error("Transaction failed: ", error);
    if (error instanceof https.HttpsError) throw error;
    throw new https.HttpsError("internal", error.message);
  }
});

`;

if (!content.includes('toggleVendorStatus')) {
  content = content + '\n' + srmFunctions;
  fs.writeFileSync(file, content);
  console.log('Added Vendor Functions');
}
