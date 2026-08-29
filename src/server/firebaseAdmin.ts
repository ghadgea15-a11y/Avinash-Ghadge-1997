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
          if (sa.project_id || sa.projectId) {
            config.projectId = sa.project_id || sa.projectId;
          }
          adminCredentialsConfigured = true;
        } catch (parseErr) {
          console.warn('[Firebase Admin] Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY JSON:', parseErr);
        }
      }

      // 2. Fallback to firebase-applet-config.json for projectId ONLY if no credentials
      // BUT: If no credentials are provided, it's often safer to let initializeApp() 
      // discover the project ID from the environment (ADC) to avoid permission mismatches.
      if (!config.credential) {
        try {
          const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
          if (fs.existsSync(configPath)) {
            const appletConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            if (appletConfig.projectId && !config.projectId) {
              // In AI Studio, when using a custom provisioned Firebase project,
              // we must supply the projectId so verifyIdToken checks the correct audience.
              config.projectId = appletConfig.projectId;
              process.env.GOOGLE_CLOUD_PROJECT = appletConfig.projectId;
              process.env.GOOGLE_CLOUD_QUOTA_PROJECT = appletConfig.projectId;
              adminCredentialsConfigured = true;
            }
          }
        } catch (e) {
          console.warn('[Firebase Admin] Could not read firebase-applet-config.json', e);
        }
      }

      // In AI Studio, calling initializeApp() with no arguments 
      // allows it to use the platform's default service account and project ID.
      if (Object.keys(config).length === 0) {
        initializeApp();
      } else {
        initializeApp(config);
      }
      
      console.log('[Firebase Admin] Initialized (hasCredentials=' + hasAdminCredentials() + ')');
    } catch (err) {
      console.error('[Firebase Admin] Initialization error:', err);
    }
  }
}

export function getAdminDb(): Firestore {
  let db: Firestore | null = null;
  try {
    const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      const appletConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (appletConfig.firestoreDatabaseId && appletConfig.firestoreDatabaseId !== '(default)') {
        // @ts-ignore - The admin SDK supports dynamic databaseId
        db = getFirestore(getApps()[0], appletConfig.firestoreDatabaseId);
      }
    }
  } catch (e) {
    // fallback
  }
  if (!db) {
    db = getFirestore();
  }
  try {
    db.settings({ ignoreUndefinedProperties: true });
  } catch (e) {
    // Settings can only be set once per instance, ignore if already set.
  }
  return db;
}
