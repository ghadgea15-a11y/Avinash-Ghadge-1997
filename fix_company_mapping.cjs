const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');

admin.initializeApp({ projectId: 'log-sheet-af97a' });
const db = getFirestore();

async function run() {
  await db.collection('company_codes').doc('SUPREMEFACILITY.COM').set({
    companyId: 'supremeFacility.com'
  });
  console.log("Company code mapping added.");
}
run().catch(console.error);
