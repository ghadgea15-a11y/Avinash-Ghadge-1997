import { getAdminDb, initializeFirebaseAdmin } from './src/server/firebaseAdmin.js';
initializeFirebaseAdmin();
async function run() {
  const db = getAdminDb();
  const snaps = await db.collection('companies').get();
  console.log('Companies:', snaps.size);
  snaps.forEach(s => console.log(s.id, s.data().brandName));
  const reqs = await db.collection('approval_requests').get();
  console.log('Approval requests:', reqs.size);
  
  // also check audit logs
  const logs = await db.collection('platform_audit_logs').orderBy('timestamp', 'desc').limit(5).get();
  console.log('Recent audit logs:');
  logs.forEach(l => console.log(l.data()));
}
run();
