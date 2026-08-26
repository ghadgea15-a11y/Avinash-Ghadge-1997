const admin = require('firebase-admin');
const serviceAccount = require('./google-services.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function runMigration() {
  console.log('Starting user provisioning migration...');
  const usersRef = db.collection('users');
  const snapshot = await usersRef.where('accountStatus', '==', 'PENDING_APPROVAL').get();
  
  if (snapshot.empty) {
    console.log('No pending users found.');
    return;
  }
  
  let migrated = 0;
  for (const doc of snapshot.docs) {
    const data = doc.data();
    const uid = doc.id;
    const email = (data.email || '').toLowerCase();
    const companyId = data.companyId;
    
    if (!email || !companyId) continue;
    
    // Check if employee record exists
    const empsRef = db.collection('companies').doc(companyId).collection('employees');
    const empsSnap = await empsRef.where('email', '==', email).get();
    
    if (!empsSnap.empty) {
      console.log(`Fixing admin-provisioned user: ${email} (${uid})`);
      
      const empDoc = empsSnap.docs[0];
      const empData = empDoc.data();
      
      const batch = db.batch();
      
      // Update root user
      batch.update(doc.ref, {
        accountStatus: 'ACTIVE',
        companyAdminApproval: 'APPROVED',
        hrApproval: 'APPROVED',
        provisioningSource: 'COMPANY_ADMIN',
        role: empData.role || data.role,
        updatedAt: new Date().toISOString()
      });
      
      // Update membership
      const memRef = db.collection('users').doc(uid).collection('memberships').doc(companyId);
      batch.update(memRef, {
        status: 'ACTIVE',
        role: empData.role || data.role,
        updatedAt: new Date().toISOString()
      });
      
      // Update employee record
      batch.update(empDoc.ref, {
        authUid: uid,
        hasSystemAccess: true,
        updatedAt: new Date().toISOString()
      });
      
      // Delete approval request if exists
      const reqRef = db.collection('approval_requests').doc(`REQ-${uid}`);
      batch.delete(reqRef);
      
      await batch.commit();
      migrated++;
    }
  }
  
  console.log(`Migration complete. Fixed ${migrated} users.`);
}

runMigration().catch(console.error).finally(() => process.exit(0));
