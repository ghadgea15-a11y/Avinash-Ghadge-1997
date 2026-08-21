import * as functionsV1 from "firebase-functions/v1";
import * as https from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

admin.initializeApp();

type EmploymentStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED" | "TERMINATED" | "ON_LEAVE" | "PROBATION";

function mapRoleToAuthorityLevel(role: string): string {
  if (!role) return "A9_SUPPORT";
  const upperRole = role.toUpperCase();
  switch (upperRole) {
    case "A0_OWNER": case "OWNER": case "PROMOTER": case "OWNER_PROMOTER": return "A0_OWNER";
    case "A1_DIRECTOR_CEO": case "DIRECTOR": case "CEO": case "DIRECTOR_CEO": return "A1_DIRECTOR_CEO";
    case "A2_GENERAL_MANAGER": case "GENERAL_MANAGER": case "GM": return "A2_GENERAL_MANAGER";
    case "A3_OFFICIAL_STAFF": case "COMPANY_ADMIN": case "ADMIN": case "HR": case "HR_ADMIN":
    case "FINANCE": case "FINANCE_MANAGER": case "PROCUREMENT": case "EHS": case "QUALITY":
    case "COMMERCIAL": case "MIS": case "CLIENT_MANAGEMENT": case "IT": case "OPERATIONS_OFFICE": return "A3_OFFICIAL_STAFF";
    case "A4_REGIONAL_AREA_MANAGER": case "REGIONAL_MANAGER": case "AREA_MANAGER": return "A4_REGIONAL_AREA_MANAGER";
    case "A5_SITE_IN_CHARGE": case "SITE_IN_CHARGE": case "OPS_MANAGER": return "A5_SITE_IN_CHARGE";
    case "A6_SUPERVISOR": case "SUPERVISOR": case "FIELD_OFFICER": case "MANAGER": return "A6_SUPERVISOR";
    case "A7_SKILLED": case "SKILLED": return "A7_SKILLED";
    case "A8_SEMI_SKILLED": case "SEMI_SKILLED": case "GUARD": return "A8_SEMI_SKILLED";
    case "A9_SUPPORT": case "SUPPORT": return "A9_SUPPORT";
    default: return "A9_SUPPORT";
  }
}

export const syncUserClaims = functionsV1.firestore
  .document("companies/{companyId}/employees/{employeeId}")
  .onWrite(async (change, context) => {
    const companyId = context.params.companyId;

    if (!change.after.exists) {
      return null;
    }

    const empData = change.after.data() || {};
    const authUid = empData.authUid;

    if (!authUid) {
      return null;
    }

    try {
      const authAdmin = (admin as any).auth();
      try {
        await authAdmin.getUser(authUid);
      } catch (err: any) {
        if (err.code === "auth/user-not-found") return null;
        throw err;
      }

      const status = (empData.status || "INACTIVE") as EmploymentStatus;
      const isUnsafeStatus = ["TERMINATED", "INACTIVE", "SUSPENDED"].includes(status.toUpperCase());
      let customClaims: Record<string, any>;

      if (isUnsafeStatus) {
        customClaims = { cId: companyId, aLvl: "NONE", status, pV: Date.now() };
        if (["TERMINATED", "SUSPENDED"].includes(status.toUpperCase())) {
          await authAdmin.revokeRefreshTokens(authUid);
        }
      } else {
        const rawRole = empData.role || empData.designation || "";
        const authorityLevel = mapRoleToAuthorityLevel(rawRole);
        const assignedRegionId = empData.assignedRegionId || null;
        const assignedSiteId = empData.assignedSiteId || null;
        const departmentId = empData.departmentId || null;

        customClaims = { cId: companyId, aLvl: authorityLevel, pV: Date.now() };
        if (assignedRegionId) customClaims.rId = assignedRegionId;
        if (assignedSiteId) customClaims.sId = assignedSiteId;
        if (departmentId) customClaims.dId = departmentId;
        
        const userRecord = await authAdmin.getUser(authUid);
        if (userRecord.customClaims && userRecord.customClaims.superAdmin) {
          customClaims.superAdmin = true;
        }
      }

      await authAdmin.setCustomUserClaims(authUid, customClaims);
      return null;
    } catch (error) {
      console.error(error);
      return null;
    }
  });

export const generatePinToken = https.onCall(async (request) => {
  const data = request.data;
  const companyId = data.companyId;
  const employeeId = data.employeeId;
  const pin = data.pin;

  if (!companyId || typeof companyId !== "string") throw new https.HttpsError("invalid-argument", "companyId is required");
  if (!employeeId || typeof employeeId !== "string") throw new https.HttpsError("invalid-argument", "employeeId is required");
  if (!pin || typeof pin !== "string") throw new https.HttpsError("invalid-argument", "pin is required");

  try {
    const db = (admin as any).firestore();
    const authAdmin = (admin as any).auth();

    const empRef = db.collection("companies").doc(companyId).collection("employees").doc(employeeId);
    const empSnap = await empRef.get();

    if (!empSnap.exists) throw new https.HttpsError("not-found", "Invalid credentials or employee not found.");
    
    const empData = empSnap.data()!;
    if (empData.companyId !== companyId) throw new https.HttpsError("permission-denied", "Invalid company context.");

    const status = (empData.status || "").toUpperCase();
    if (status === "TERMINATED" || status === "SUSPENDED" || status === "INACTIVE") {
      throw new https.HttpsError("permission-denied", `Account is ${status}. Login denied.`);
    }

    const storedPin = empData.pin || empData.password;
    if (!storedPin || storedPin !== pin) throw new https.HttpsError("unauthenticated", "Invalid PIN provided.");

    const authUid = empData.authUid;
    if (!authUid) throw new https.HttpsError("failed-precondition", "MISSING_AUTH_UID: This employee account has not been fully registered for login.");

    try {
      await authAdmin.getUser(authUid);
    } catch (err: any) {
      if (err.code === "auth/user-not-found") {
        throw new https.HttpsError("failed-precondition", "AUTH_USER_NOT_FOUND: The authentication record is missing.");
      }
      throw err;
    }

    const rawRole = empData.role || empData.designation || "";
    const authorityLevel = mapRoleToAuthorityLevel(rawRole);
    const assignedRegionId = empData.assignedRegionId || null;
    const assignedSiteId = empData.assignedSiteId || null;
    const departmentId = empData.departmentId || null;

    const customClaims: Record<string, any> = { cId: companyId, aLvl: authorityLevel, pV: Date.now() };
    if (assignedRegionId) customClaims.rId = assignedRegionId;
    if (assignedSiteId) customClaims.sId = assignedSiteId;
    if (departmentId) customClaims.dId = departmentId;

    const customToken = await authAdmin.createCustomToken(authUid, customClaims);
    return { token: customToken };
  } catch (error: any) {
    if (error instanceof https.HttpsError) throw error;
    throw new https.HttpsError("internal", "An internal error occurred during authentication.");
  }
});

// ============================================================================
// MODULE 13.3: MANDATORY REFRESHERS SYSTEM
// ============================================================================

export const dailyRefresherAuditor = functionsV1.pubsub
  .schedule("1 0 * * *") // 00:01 AM daily
  .timeZone("UTC")
  .onRun(async (context) => {
    const db = admin.firestore();
    const now = new Date();
    
    // In a real multi-tenant scenario, we might iterate all companies,
    // or use collectionGroup queries. We'll use a collectionGroup for efficiency.
    const refresherStatusesSnapshot = await db.collectionGroup('employee_refresher_status').get();
    
    const batch = db.batch();
    let batchCount = 0;

    const commitBatchIfNeeded = async () => {
      if (batchCount >= 450) { // Firestore batch limit is 500
        await batch.commit();
        batchCount = 0;
      }
    };

    for (const doc of refresherStatusesSnapshot.docs) {
      const data = doc.data();
      const status = data.status; // 'ACTIVE', 'DUE_SOON', 'IN_GRACE_PERIOD', 'OVERDUE_LOCKED'
      
      if (!data.nextDueDate) continue;
      
      const nextDueDate = new Date(data.nextDueDate);
      const gracePeriodExpiryDate = data.gracePeriodExpiryDate ? new Date(data.gracePeriodExpiryDate) : nextDueDate;
      const daysUntilDue = Math.ceil((nextDueDate.getTime() - now.getTime()) / (1000 * 3600 * 24));
      
      let newStatus = status;
      let shouldNotify = false;
      let notifyMessage = '';

      if (now > gracePeriodExpiryDate) {
        newStatus = 'OVERDUE_LOCKED';
      } else if (now > nextDueDate) {
        newStatus = 'IN_GRACE_PERIOD';
      } else if (daysUntilDue <= 30) {
        newStatus = 'DUE_SOON';
      }

      if (newStatus !== status) {
        batch.update(doc.ref, { status: newStatus, updatedAt: now.toISOString() });
        batchCount++;
        await commitBatchIfNeeded();

        // 30, 15, 7 days reminders logic
        if (daysUntilDue === 30 || daysUntilDue === 15 || daysUntilDue === 7) {
          shouldNotify = true;
          notifyMessage = `Mandatory training '${data.courseName}' is due in ${daysUntilDue} days.`;
        } else if (newStatus === 'IN_GRACE_PERIOD' && status !== 'IN_GRACE_PERIOD') {
          shouldNotify = true;
          notifyMessage = `Mandatory training '${data.courseName}' is OVERDUE. You are in the grace period.`;
        } else if (newStatus === 'OVERDUE_LOCKED' && status !== 'OVERDUE_LOCKED') {
          shouldNotify = true;
          notifyMessage = `Mandatory training '${data.courseName}' has expired and grace period ended. Roster restrictions may apply.`;
          
          // Trigger roster block logic
          // Hook into Module 2: WorkForce Management / Rostering
          // We mark the employee as NON_DEPLOYABLE in their employee record if blockingPolicy is applied
          if (data.blockingPolicy === 'BLOCK_ROSTER' || data.blockingPolicy === 'MARK_NON_DEPLOYABLE') {
            const empRef = db.collection('companies').doc(data.companyId).collection('employees').doc(data.employeeId);
            batch.update(empRef, {
              isDeployable: false,
              rosterBlockReason: \`Blocked due to expired mandatory training: \${data.courseName}\`,
              updatedAt: now.toISOString()
            });
            batchCount++;
            await commitBatchIfNeeded();
            
            // Also log to GRC Audit
            const auditRef = db.collection('companies').doc(data.companyId).collection('security_audit_events').doc();
            batch.set(auditRef, {
              eventId: auditRef.id,
              companyId: data.companyId,
              timestamp: now.toISOString(),
              action: 'ROSTER_BLOCKED',
              resource: 'EMPLOYEE_ROSTER',
              resourceId: data.employeeId,
              success: true,
              severity: 'HIGH',
              reason: notifyMessage
            });
            batchCount++;
            await commitBatchIfNeeded();
          }
        }
      } else if (daysUntilDue === 30 || daysUntilDue === 15 || daysUntilDue === 7) {
         // Even if status didn't just change, send the 15/7 day reminder
         shouldNotify = true;
         notifyMessage = `Reminder: Mandatory training '${data.courseName}' is due in ${daysUntilDue} days.`;
      }

      if (shouldNotify) {
        const notifRef = db.collection('companies').doc(data.companyId).collection('notifications').doc();
        batch.set(notifRef, {
          id: notifRef.id,
          companyId: data.companyId,
          title: 'Mandatory Refresher Alert',
          message: notifyMessage,
          type: 'WARNING',
          timestamp: now.toISOString(),
          isRead: false,
          targetEmployeeId: data.employeeId,
          actionRoute: 'TRAINING_LMS'
        });
        batchCount++;
        await commitBatchIfNeeded();
      }
    }

    if (batchCount > 0) {
      await batch.commit();
    }

    console.log("Daily Refresher Auditor completed successfully.");
    return null;
  });

export const completeRefresherTraining = https.onCall(async (request) => {
  const data = request.data;
  const auth = request.auth;

  if (!auth) throw new https.HttpsError("unauthenticated", "User must be authenticated.");
  
  const { companyId, employeeId, courseId, completionDate, score, trainerName } = data;

  if (!companyId || !employeeId || !courseId || !completionDate) {
    throw new https.HttpsError("invalid-argument", "Missing required fields.");
  }

  const db = admin.firestore();

  // Validate admin rights
  const callerClaims = auth.token;
  if (callerClaims.cId !== companyId) {
    throw new https.HttpsError("permission-denied", "Company ID mismatch.");
  }
  
  const allowedRoles = ['A0_OWNER', 'A1_DIRECTOR_CEO', 'A2_GENERAL_MANAGER', 'A3_OFFICIAL_STAFF'];
  if (!allowedRoles.includes(callerClaims.aLvl)) {
     // Check if the user is the trainer or has specific module rights (simplifying for this implementation)
     throw new https.HttpsError("permission-denied", "Insufficient permissions to complete training.");
  }

  const refresherStatusRef = db.collection('companies').doc(companyId)
    .collection('employee_refresher_status').doc(`${employeeId}_${courseId}`);
    
  const refresherConfigRef = db.collection('companies').doc(companyId)
    .collection('mandatory_refreshers_config').doc(courseId);

  try {
    await db.runTransaction(async (transaction) => {
      const statusDoc = await transaction.get(refresherStatusRef);
      const configDoc = await transaction.get(refresherConfigRef);

      if (!statusDoc.exists) {
        throw new https.HttpsError("not-found", "Refresher status record not found.");
      }
      if (!configDoc.exists) {
        throw new https.HttpsError("not-found", "Refresher config record not found.");
      }

      const statusData = statusDoc.data()!;
      const configData = configDoc.data()!;

      // Calculate new dates
      const completedAt = new Date(completionDate);
      const nextDue = new Date(completedAt);
      nextDue.setMonth(nextDue.getMonth() + (configData.recurrenceIntervalMonths || 12));
      
      const graceExpiry = new Date(nextDue);
      graceExpiry.setDate(graceExpiry.getDate() + (configData.gracePeriodDays || 0));

      const completionRecord = {
        completionDate: completedAt.toISOString(),
        score: score || null,
        trainerName: trainerName || 'System',
      };
      
      const history = statusData.completionHistory || [];
      history.push(completionRecord);

      transaction.update(refresherStatusRef, {
        lastCompletedDate: completedAt.toISOString(),
        nextDueDate: nextDue.toISOString(),
        gracePeriodExpiryDate: graceExpiry.toISOString(),
        status: 'ACTIVE',
        completionHistory: history,
        updatedAt: new Date().toISOString()
      });

      // Unlock Roster Restrictions
      if (statusData.status === 'OVERDUE_LOCKED' && (configData.blockingPolicy === 'BLOCK_ROSTER' || configData.blockingPolicy === 'MARK_NON_DEPLOYABLE')) {
        const empRef = db.collection('companies').doc(companyId).collection('employees').doc(employeeId);
        transaction.update(empRef, {
          isDeployable: true,
          rosterBlockReason: null,
          updatedAt: new Date().toISOString()
        });
      }

      // Log to GRC Audit
      const auditRef = db.collection('companies').doc(companyId).collection('security_audit_events').doc();
      transaction.set(auditRef, {
        eventId: auditRef.id,
        companyId: companyId,
        timestamp: new Date().toISOString(),
        action: 'REFRESHER_COMPLETED',
        resource: 'EMPLOYEE_REFRESHER',
        resourceId: employeeId,
        userId: auth.uid,
        success: true,
        severity: 'LOW',
        reason: `Completed refresher: ${configData.courseName}`
      });
    });

    return { success: true, message: "Refresher completed and roster unlocked if applicable." };
  } catch (error: any) {
    console.error("Transaction failed: ", error);
    if (error instanceof https.HttpsError) throw error;
    throw new https.HttpsError("internal", error.message);
  }
});


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
        reason: `Vendor status updated to ${newStatus || ''} ${newTier || ''}. Reason: ${reason || 'Not provided'}`
      });
    });

    return { success: true, message: "Vendor status updated successfully." };
  } catch (error: any) {
    console.error("Transaction failed: ", error);
    if (error instanceof https.HttpsError) throw error;
    throw new https.HttpsError("internal", error.message);
  }
});



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
    console.log(`RFQ ${after.rfqNumber} broadcasted to ${targetVendors.length} vendors.`);
    
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
       reason: `Broadcasted RFQ ${after.rfqNumber} to ${targetVendors.length} vendors.`
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
             rank: `L${index + 1}`,
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
         reason: `RFQ awarded to vendor ${bidData.vendorId}. Bid ID: ${awardedBidId}`
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
       console.log(`PO ${poData.poNumber} requires approval at tier ${requiredTier}.`);
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
      const mockPdfUrl = `https://storage.googleapis.com/log-sheet-mock/po/${poData.poNumber}.pdf`;

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
         reason: `PO ${poData.poNumber} dispatched to vendor ${poData.vendorName}.`
      });

      return { success: true, message: "PO dispatched successfully." };
    });
  } catch (error: any) {
    console.error("Dispatch failed: ", error);
    if (error instanceof https.HttpsError) throw error;
    throw new https.HttpsError("internal", error.message);
  }
});


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
      
      console.log(`3-way match complete for Invoice ${invoiceId}. Result: ${matchStatus}`);

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
         reason: `Variance resolved via ${action}. ${resolutionComments || ''}`
      });

      return { success: true, message: "Variance resolved successfully." };
    });
  } catch (error: any) {
    console.error("Variance resolution failed: ", error);
    if (error instanceof https.HttpsError) throw error;
    throw new https.HttpsError("internal", error.message);
  }
});

// Export System Health Checker
export * from './health-checker';
export * from './provisionTenant';
export * from './inviteEmployee';
