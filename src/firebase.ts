import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, enableIndexedDbPersistence, doc, getDocFromServer } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import firebaseAppletConfig from '../firebase-applet-config.json';

const getEnv = (key: string) => {
  try {
    return typeof import.meta !== 'undefined' && import.meta?.env ? import.meta.env[key] : undefined;
  } catch {
    return undefined;
  }
};

const firebaseConfig = {
  apiKey: getEnv('VITE_FIREBASE_API_KEY') || firebaseAppletConfig.apiKey || 'demo-api-key',
  authDomain: getEnv('VITE_FIREBASE_AUTH_DOMAIN') || firebaseAppletConfig.authDomain || 'log-sheet-muster.firebaseapp.com',
  projectId: getEnv('VITE_FIREBASE_PROJECT_ID') || firebaseAppletConfig.projectId || 'log-sheet-muster-demo',
  storageBucket: getEnv('VITE_FIREBASE_STORAGE_BUCKET') || firebaseAppletConfig.storageBucket || 'log-sheet-muster.appspot.com',
  messagingSenderId: getEnv('VITE_FIREBASE_MESSAGING_SENDER_ID') || firebaseAppletConfig.messagingSenderId || '123456789',
  appId: getEnv('VITE_FIREBASE_APP_ID') || firebaseAppletConfig.appId || '1:123456789:web:abcdef'
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const db = firebaseAppletConfig.firestoreDatabaseId 
  ? getFirestore(app, firebaseAppletConfig.firestoreDatabaseId) 
  : getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

// Enable Firestore offline persistence
try {
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn('Firestore offline persistence: Multiple tabs active');
    } else if (err.code === 'unimplemented') {
      console.warn('Firestore offline persistence not supported in this browser environment');
    }
  });
} catch (e) {
  console.log('IndexedDB persistence init handled');
}

// Validate Connection to Firestore on boot with non-blocking timeout
async function validateFirestoreConnection() {
  try {
    const checkPromise = getDocFromServer(doc(db, '_health', 'check'));
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('connection-timeout')), 3000)
    );
    await Promise.race([checkPromise, timeoutPromise]);
  } catch (error) {
    if (error instanceof Error) {
      console.warn('Firestore initial connection status handled:', error.message);
    }
  }
}
validateFirestoreConnection();

export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.apiKey !== 'demo-api-key');

