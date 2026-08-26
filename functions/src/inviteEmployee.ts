import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

export const inviteEmployee = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
  }

  const { companyId, employeeId } = data;
  if (!companyId || !employeeId) {
    throw new functions.https.HttpsError('invalid-argument', 'companyId and employeeId are required');
  }

  const callerUid = context.auth.uid;
  const callerDoc = await admin.firestore().collection('users').doc(callerUid).get();
  const callerRole = callerDoc.data()?.role;
  
  if (!['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR_ADMIN'].includes(callerRole)) {
    throw new functions.https.HttpsError('permission-denied', 'Unauthorized to invite employees.');
  }

  if (callerRole !== 'SUPER_ADMIN' && callerDoc.data()?.companyId !== companyId) {
     throw new functions.https.HttpsError('permission-denied', 'Cannot invite employee to another company.');
  }

  const db = admin.firestore();
  
  const empRef = db.collection('companies').doc(companyId).collection('employees').doc(employeeId);
  const empSnap = await empRef.get();
  
  if (!empSnap.exists) {
    throw new functions.https.HttpsError('not-found', 'Employee record not found.');
  }
  
  const empData = empSnap.data()!;
  
  if (!empData.hasSystemAccess) {
    throw new functions.https.HttpsError('failed-precondition', 'Employee is not marked for system access.');
  }
  
  if (empData.authUid) {
     return { success: true, message: 'Employee already has system access.' };
  }
  
  const email = empData.email?.trim().toLowerCase();
  if (!email) {
     throw new functions.https.HttpsError('failed-precondition', 'Employee must have an email address to receive an invitation.');
  }

  let authUid = '';
  try {
    const existingUser = await admin.auth().getUserByEmail(email);
    authUid = existingUser.uid;
  } catch (error: any) {
    if (error.code === 'auth/user-not-found') {
      const newUser = await admin.auth().createUser({
        email: email,
        password: 'TempPassword!' + Math.random().toString(36).substring(2, 8),
        displayName: `${empData.firstName} ${empData.lastName}`,
        emailVerified: false
      });
      authUid = newUser.uid;
    } else {
      throw new functions.https.HttpsError('internal', 'Error creating user: ' + error.message);
    }
  }

  await admin.auth().setCustomUserClaims(authUid, {
    companyId: companyId,
    role: empData.role || 'EMPLOYEE',
    employeeId: employeeId,
    siteId: empData.assignedSiteId || ''
  });

  const timestamp = new Date().toISOString();

  await empRef.set({ authUid, updatedAt: timestamp }, { merge: true });

  const userDoc = {
    uid: authUid,
    email: email,
    fullName: `${empData.firstName} ${empData.lastName}`,
    companyId: companyId,
    companyName: empData.companyName || companyId,
    departmentId: empData.departmentId || '',
    mobileNumber: empData.contactNumber || '',
    role: empData.role || 'EMPLOYEE',
    accountStatus: 'ACTIVE',
    emailVerified: false,
    companyAdminApproval: 'APPROVED',
    hrApproval: 'APPROVED',
    provisioningSource: 'COMPANY_ADMIN',
    createdAt: timestamp,
    updatedAt: timestamp
  };
  await db.collection('users').doc(authUid).set(userDoc, { merge: true });

  await db.collection('users').doc(authUid).collection('memberships').doc(companyId).set({
      companyId: companyId,
      employeeId: employeeId,
      siteId: empData.assignedSiteId || '',
      departmentId: empData.departmentId || '',
      role: empData.role || 'EMPLOYEE',
      status: 'ACTIVE',
      assignedAt: timestamp
  }, { merge: true });

  let resetLink = '';
  try {
    resetLink = await admin.auth().generatePasswordResetLink(email);
    console.log(`[INVITATION] Reset link for ${email}: ${resetLink}`);
  } catch (err) {
    console.warn('[INVITATION] Could not generate reset link', err);
  }

  return { success: true, authUid, resetLink };
});
