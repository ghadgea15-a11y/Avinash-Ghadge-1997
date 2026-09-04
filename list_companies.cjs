const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');

admin.initializeApp({ projectId: 'log-sheet-af97a' });
const db = getFirestore();

async function run() {
  const snap = await db.collection('companies').get();
  snap.forEach(doc => {
    console.log(doc.id, doc.data().companyId);
  });
}
run().catch(console.error);
