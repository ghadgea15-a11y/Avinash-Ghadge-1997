import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
initializeApp({ projectId: 'log-sheet-af97a' });
const db = getFirestore();
async function run() {
  try {
    const snap = await db.collection('companies').limit(1).get();
    console.log('Success, found', snap.size, 'companies.');
  } catch (err) {
    console.error('Error:', err.message);
  }
}
run();
