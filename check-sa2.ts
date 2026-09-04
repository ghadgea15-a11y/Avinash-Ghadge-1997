import { getAdminDb, initializeFirebaseAdmin } from './src/server/firebaseAdmin.js';
initializeFirebaseAdmin();
async function run() {
  const db = getAdminDb();
  const doc = await db.collection('super_admins').doc('zDusHPnMTMWXaM1beQitDUzsa152').get();
  console.log('Exists?', doc.exists);
  if (doc.exists) console.log(doc.data());
}
run();
