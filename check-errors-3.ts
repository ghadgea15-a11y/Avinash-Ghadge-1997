import { getAdminDb, initializeFirebaseAdmin } from './src/server/firebaseAdmin.js';
initializeFirebaseAdmin();
async function run() {
  const db = getAdminDb();
  const allLogs = await db.collection('platform_audit_logs').orderBy('timestamp', 'desc').limit(20).get();
  console.log('Logs:');
  allLogs.forEach(e => {
     console.log(e.data().action, e.data().success, e.data().errorMessage || e.data().targetCompanyId);
  });
}
run();
