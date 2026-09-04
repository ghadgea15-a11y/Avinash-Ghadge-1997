const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');

// Initialize default app using ADC (Application Default Credentials)
admin.initializeApp({ projectId: 'log-sheet-af97a' });

const db = getFirestore();

async function test() {
  try {
    await db.collection('users').doc('admin_test_uid_123').set({
      role: 'SUPER_ADMIN',
      test: true
    });
    console.log("Admin Firestore write successful!");
  } catch (e) {
    console.error("Admin Firestore Failed:", e.message);
  }
}
test();
