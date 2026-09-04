import { getAdminDb, initializeFirebaseAdmin } from './src/server/firebaseAdmin.js';
initializeFirebaseAdmin();
async function run() {
  const db = getAdminDb();
  const allLogs = await db.collection('platform_audit_logs').orderBy('timestamp', 'desc').limit(50).get();
  const errors = allLogs.docs.filter(d => d.data().success === false);
  console.log('Errors:', errors.length);
  errors.forEach(e => console.log(e.data()));
}
run();
