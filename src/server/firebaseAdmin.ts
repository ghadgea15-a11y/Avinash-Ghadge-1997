import * as admin from 'firebase-admin';

export function initializeFirebaseAdmin() {
  if (!admin.apps.length) {
    try {
      admin.initializeApp({
        // In Google Cloud environments (like Cloud Run), application default credentials are used automatically.
        // During local development, set the GOOGLE_APPLICATION_CREDENTIALS environment variable.
      });
      console.log('[Firebase Admin] Initialized successfully.');
    } catch (err) {
      console.error('[Firebase Admin] Initialization error:', err);
    }
  }
}

export function getAdminDb() {
  return admin.firestore();
}
