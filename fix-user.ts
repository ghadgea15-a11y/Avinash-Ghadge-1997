import { getAdminDb, initializeFirebaseAdmin } from './src/server/firebaseAdmin.js';
import { getAuth } from 'firebase-admin/auth';
initializeFirebaseAdmin();
async function run() {
  const db = getAdminDb();
  const auth = getAuth();
  
  const uid = 'zDusHPnMTMWXaM1beQitDUzsa152'; // ghadgea162@gmail.com
  
  // Update custom claims
  await auth.setCustomUserClaims(uid, {
    cId: 'SUPREME-001',
    companyId: 'SUPREME-001',
    companyCode: 'SUPREME-001',
    role: 'COMPANY_ADMIN',
    aLvl: 'A0_OWNER',
    status: 'ACTIVE',
    pV: 1
  });
  
  // Update users collection
  await db.collection('users').doc(uid).set({
    accountStatus: 'ACTIVE',
    companyId: 'SUPREME-001',
    role: 'COMPANY_ADMIN',
    authorityLevel: 'A0_OWNER',
    fullName: 'Pratiksha Ghadge',
    employeeId: 'ADM-001',
    userId: uid,
    email: 'ghadgea162@gmail.com',
    companyAdminApproval: 'APPROVED',
    uid: uid,
    hrApproval: 'APPROVED',
    updatedAt: new Date().toISOString()
  });
  
  // Delete from super_admins
  await db.collection('super_admins').doc(uid).delete();
  
  console.log('Fixed user ghadgea162@gmail.com back to COMPANY_ADMIN of SUPREME-001');
}
run();
