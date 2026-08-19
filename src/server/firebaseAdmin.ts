import { getApps, initializeApp, cert, AppOptions } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';

let adminCredentialsConfigured = false;

export function hasAdminCredentials(): boolean {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    return true;
  }
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS && fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
    return true;
  }
  return adminCredentialsConfigured;
}

export function initializeFirebaseAdmin() {
  if (!getApps().length) {
    try {
      let config: AppOptions = {};
      
      // 1. Check for explicit service account key JSON in env
      if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
        try {
          const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
          config.credential = cert(sa);
          config.projectId = sa.project_id || sa.projectId;
          adminCredentialsConfigured = true;
        } catch (parseErr) {
          console.warn('[Firebase Admin] Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY JSON:', parseErr);
        }
      }

      // 2. Fallback to firebase-applet-config.json for projectId
      if (!config.projectId) {
        try {
          const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
          if (fs.existsSync(configPath)) {
            const appletConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            if (appletConfig.projectId) {
              config.projectId = appletConfig.projectId;
            }
          }
        } catch (e) {
          console.warn('[Firebase Admin] Could not read firebase-applet-config.json', e);
        }
      }

      initializeApp(config);
      console.log('[Firebase Admin] Initialized with config (hasCredentials=' + hasAdminCredentials() + ')');
    } catch (err) {
      console.error('[Firebase Admin] Initialization error:', err);
    }
  }
}

export function getAdminDb(): Firestore {
  try {
    const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      const appletConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (appletConfig.firestoreDatabaseId && appletConfig.firestoreDatabaseId !== '(default)') {
        // @ts-ignore - The admin SDK supports dynamic databaseId
        return getFirestore(getApps()[0], appletConfig.firestoreDatabaseId);
      }
    }
  } catch (e) {
    // fallback
  }
  return getFirestore();
}
