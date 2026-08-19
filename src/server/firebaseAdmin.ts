import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';

export function initializeFirebaseAdmin() {
  if (!getApps().length) {
    try {
      let config = {};
      try {
        const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
        if (fs.existsSync(configPath)) {
          const appletConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
          if (appletConfig.projectId) {
            config = { projectId: appletConfig.projectId };
          }
        }
      } catch (e) {
        console.warn('[Firebase Admin] Could not read firebase-applet-config.json', e);
      }

      initializeApp(config);
      console.log('[Firebase Admin] Initialized successfully with config:', config);
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
        // @ts-ignore - The admin SDK might not have type bindings for databaseId in all versions, but it supports it dynamically in newer versions
        return getFirestore(getApps()[0], appletConfig.firestoreDatabaseId);
      }
    }
  } catch (e) {
    // fallback
  }
  return getFirestore();
}
