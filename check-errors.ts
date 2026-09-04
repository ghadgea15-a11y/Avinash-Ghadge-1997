import { getAdminDb, initializeFirebaseAdmin } from './src/server/firebaseAdmin.js';
initializeFirebaseAdmin();
async function run() {
  const db = getAdminDb();
  const errors = await db.collection('platform_audit_logs').where('success', '==', false).orderBy('timestamp', 'desc').limit(10).get();
  console.log('Errors:', errors.size);
  errors.forEach(e => console.log(e.data()));
}
run();
