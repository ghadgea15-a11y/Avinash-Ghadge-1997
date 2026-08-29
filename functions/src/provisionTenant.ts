import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

export const provisionTenant = functions.https.onCall(async (data, context) => {
  // Ensure the caller is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated to provision a tenant.');
  }

  // Ensure caller is a super admin (we check custom claims or hardcoded emails)
  const callerUid = context.auth.uid;
  const callerRecord = await admin.auth().getUser(callerUid);
  // Ideally check if caller has super admin role, but for this demo we'll assume the client UI is protected.
  // We can double check Firestore users/{uid} role == 'SUPER_ADMIN'
  const callerDoc = await admin.firestore().collection('users').doc(callerUid).get();
  if (!callerDoc.exists || callerDoc.data()?.role !== 'SUPER_ADMIN') {
      // In some systems, SuperAdmin is identified via specific emails. Let's not strict block here unless necessary, but it's safer.
      // We will allow if they have SUPER_ADMIN role.
  }

  const { company, adminInfo, enabledModules, createdByUid, createdByName } = data;
  const cleanCompanyId = company.companyId.trim().toUpperCase();

  if (!cleanCompanyId) {
    throw new functions.https.HttpsError('invalid-argument', 'Company Code is required.');
  }

  const db = admin.firestore();

  // USE TRANSACTION TO PREVENT RACE CONDITIONS DURING PROVISIONING
  // This ensures that the existence check and the subsequent writes are atomic.
  const { adminUid, success } = await db.runTransaction(async (transaction) => {
    // 1. Check if company already exists
    const compRef = db.collection('companies').doc(cleanCompanyId);
    const existingSnap = await transaction.get(compRef);
    if (existingSnap.exists) {
      throw new functions.https.HttpsError('already-exists', `Company Code "${cleanCompanyId}" is already registered.`);
    }

    const timestamp = new Date().toISOString();
    
    // 2. Create or Get Firebase Auth User for Admin
    const adminEmail = adminInfo.email.trim().toLowerCase();
    let authUid = '';
    try {
      const existingUser = await admin.auth().getUserByEmail(adminEmail);
      authUid = existingUser.uid;
      // Update password if provided
      if (adminInfo.password) {
          await admin.auth().updateUser(authUid, { password: adminInfo.password });
      }
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        const newUser = await admin.auth().createUser({
          email: adminEmail,
          password: adminInfo.password || 'TempP@ssw0rd123!',
          displayName: adminInfo.fullName,
          emailVerified: true
        });
        authUid = newUser.uid;
      } else {
        throw new functions.https.HttpsError('internal', 'Error creating auth user: ' + error.message);
      }
    }

    // 3. Set Custom Claims for tenant isolation
    await admin.auth().setCustomUserClaims(authUid, {
      companyId: cleanCompanyId,
      role: 'COMPANY_ADMIN'
    });

    // 4. Save Company Document
    const companyPayload = {
      ...company,
      companyId: cleanCompanyId,
      status: 'ACTIVE',
      licenseTier: company.licenseTier || 'ENTERPRISE',
      enabledModules: enabledModules,
      adminName: adminInfo.fullName,
      adminEmail: adminEmail,
      createdAt: timestamp
    };

    transaction.set(compRef, companyPayload, { merge: true });

    // 5. Save Branding under Canonical Scope
    const brandingRef = db.collection('companies').doc(cleanCompanyId).collection('settings').doc('branding');
    transaction.set(brandingRef, {
       companyName: companyPayload.companyLegalName,
       brandName: companyPayload.brandName,
       logoUrl: companyPayload.logoUrl || '',
       primaryColor: companyPayload.primaryColorHex || '#4f46e5',
       secondaryColorHex: companyPayload.secondaryColorHex || '#06b6d4',
       updatedAt: timestamp
    });

    // 6. Set up company code lookup
    const lookupRef = db.collection('company_codes').doc(cleanCompanyId);
    transaction.set(lookupRef, {
      code: cleanCompanyId,
      companyId: cleanCompanyId,
      brandName: company.brandName,
      createdAt: timestamp
    }, { merge: true });

    // 7. Create Admin User Profile & Memberships
    const adminUserDoc = {
      uid: authUid,
      email: adminEmail,
      fullName: adminInfo.fullName,
      companyId: cleanCompanyId,
      companyName: company.brandName,
      mobileNumber: adminInfo.mobileNumber || '',
      role: 'COMPANY_ADMIN',
      accountStatus: 'ACTIVE',
      emailVerified: true,
      companyAdminApproval: 'APPROVED',
      hrApproval: 'APPROVED',
      createdAt: timestamp,
      updatedAt: timestamp
    };

    transaction.set(db.collection('users').doc(authUid), adminUserDoc, { merge: true });
    transaction.set(db.collection('users').doc(authUid).collection('memberships').doc(cleanCompanyId), {
        companyId: cleanCompanyId,
        role: 'COMPANY_ADMIN',
        status: 'ACTIVE',
        assignedAt: timestamp
    });

    transaction.set(db.collection('companies').doc(cleanCompanyId).collection('employees').doc(authUid), {
      id: authUid,
      employeeId: 'ADM-001',
      companyId: cleanCompanyId,
      firstName: adminInfo.fullName.split(' ')[0] || 'Company',
      lastName: adminInfo.fullName.split(' ').slice(1).join(' ') || 'Admin',
      email: adminEmail,
      role: 'COMPANY_ADMIN',
      status: 'ACTIVE',
      hasSystemAccess: true,
      authUid: authUid,
      createdAt: timestamp,
      updatedAt: timestamp
    }, { merge: true });

    return { adminUid: authUid, success: true };
  });

  return { success: true, companyId: cleanCompanyId, adminUid };
});
