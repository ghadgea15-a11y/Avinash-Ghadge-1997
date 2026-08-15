import { initializeApp, getApps, getApp, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getAuth, Auth } from 'firebase-admin/auth';
import firebaseConfig from '../firebase-applet-config.json';

let adminApp: App;

export function getAdminApp(): App {
  if (!adminApp) {
    if (getApps().length > 0) {
      adminApp = getApp();
    } else {
      const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
      if (serviceAccountKey) {
        try {
          const parsed = JSON.parse(serviceAccountKey);
          adminApp = initializeApp({
            credential: cert(parsed),
            projectId: firebaseConfig.projectId || 'log-sheet-af97a',
            storageBucket: firebaseConfig.storageBucket
          });
        } catch (e) {
          console.warn('[FirebaseAdmin] Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY, falling back to default credentials:', e);
          adminApp = initializeApp({
            projectId: firebaseConfig.projectId || 'log-sheet-af97a',
            storageBucket: firebaseConfig.storageBucket
          });
        }
      } else {
        adminApp = initializeApp({
          projectId: firebaseConfig.projectId || 'log-sheet-af97a',
          storageBucket: firebaseConfig.storageBucket
        });
      }
    }
  }
  return adminApp;
}

export function getAdminDb(): Firestore {
  const app = getAdminApp();
  const dbId = firebaseConfig.firestoreDatabaseId || '(default)';
  return getFirestore(app, dbId);
}

export function getAdminAuth(): Auth {
  const app = getAdminApp();
  return getAuth(app);
}
