import { getAdminDb, initializeFirebaseAdmin } from './src/server/firebaseAdmin.js';
import { getAuth } from 'firebase-admin/auth';
initializeFirebaseAdmin();
async function run() {
  const db = getAdminDb();
  const auth = getAuth();
  const user = await auth.getUserByEmail('ghadgea15@gmail.com');
  const doc = await db.collection('super_admins').doc(user.uid).get();
  console.log('Doc exists?', doc.exists);
  console.log(doc.data());
}
run();
