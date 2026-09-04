import { getAdminDb, initializeFirebaseAdmin } from './src/server/firebaseAdmin.js';
initializeFirebaseAdmin();
async function run() {
  const db = getAdminDb();
  
  // also check audit logs
  const logs = await db.collection('platform_audit_logs').where('actorEmail', '==', 'ghadgea15@gmail.com').get();
  console.log('User audit logs:', logs.size);
  logs.forEach(l => console.log(l.data()));
}
run();
