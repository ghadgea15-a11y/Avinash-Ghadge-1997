import * as https from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

export const approveTransfer = https.onCall(async (request) => {
  const { companyId, requestId, actor } = request.data;
  
  if (!request.auth) {
    throw new https.HttpsError("unauthenticated", "User must be authenticated.");
  }
  
  if (!companyId || !requestId || !actor) {
    throw new https.HttpsError("invalid-argument", "Missing required fields.");
  }

  const db = admin.firestore();
  const xferRef = db.collection('companies').doc(companyId).collection('transfers').doc(requestId);
  const now = new Date().toISOString();
  const eventId = `EVT-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

  try {
    const result = await db.runTransaction(async (t) => {
      const xferSnap = await t.get(xferRef);
      if (!xferSnap.exists) throw new Error('Transfer not found');
      
      const xfer = xferSnap.data();
      if (!xfer) throw new Error('Transfer data missing');
      
      if (xfer.status !== 'PENDING' && xfer.status !== 'TRANSFER_PENDING') {
        throw new Error('Transfer is not pending approval');
      }
      
      const employeeId = xfer.employeeId;
      const empRef = db.collection('companies').doc(companyId).collection('employees').doc(employeeId);
      const eventRef = empRef.collection('lifecycleEvents').doc(eventId);
      
      t.set(empRef, {
        assignedSiteId: xfer.newSiteId,
        assignedBranchId: xfer.newBranchId,
        assignedRegionId: xfer.newRegionId,
        lifecycleStatus: 'ACTIVE',
        updatedAt: now,
        updatedBy: actor.id
      }, { merge: true });

      t.set(xferRef, {
        status: 'APPROVED',
        approvedBy: actor.id,
        updatedAt: now
      }, { merge: true });

      t.set(eventRef, {
        id: eventId,
        type: 'TRANSFER',
        fromStatus: 'TRANSFER_PENDING',
        toStatus: 'ACTIVE',
        effectiveDate: xfer.effectiveDate,
        reason: 'Transfer Approved',
        initiatedBy: xfer.initiatedBy,
        approvedBy: actor.id,
        timestamp: now,
        details: { requestId, transferData: xfer }
      });
      
      return employeeId;
    });

    // We can also trigger an audit event here if desired, or let the caller do it.
    return { success: true, employeeId: result };
  } catch (error: any) {
    console.error("Error approving transfer:", error);
    throw new https.HttpsError("internal", error.message || "Failed to approve transfer.");
  }
});
