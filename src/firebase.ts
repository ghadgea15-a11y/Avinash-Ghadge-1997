import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, inMemoryPersistence } from 'firebase/auth';
import { getFirestore, enableMultiTabIndexedDbPersistence, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';

const env = (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env : (process.env as any || {});

const firebaseConfig = {
  apiKey: (env.VITE_FIREBASE_API_KEY && env.VITE_FIREBASE_API_KEY !== 'false' && env.VITE_FIREBASE_API_KEY !== 'undefined' ? env.VITE_FIREBASE_API_KEY : "AIzaSyBv9P5Xs67mtFth7SWGSRVi_gpoDohbKZ8"),
  authDomain: (env.VITE_FIREBASE_AUTH_DOMAIN && env.VITE_FIREBASE_AUTH_DOMAIN !== 'false' && env.VITE_FIREBASE_AUTH_DOMAIN !== 'undefined' ? env.VITE_FIREBASE_AUTH_DOMAIN : "log-sheet-af97a.firebaseapp.com"),
  projectId: (env.VITE_FIREBASE_PROJECT_ID && env.VITE_FIREBASE_PROJECT_ID !== 'false' && env.VITE_FIREBASE_PROJECT_ID !== 'undefined' ? env.VITE_FIREBASE_PROJECT_ID : "log-sheet-af97a"),
  storageBucket: (env.VITE_FIREBASE_STORAGE_BUCKET && env.VITE_FIREBASE_STORAGE_BUCKET !== 'false' && env.VITE_FIREBASE_STORAGE_BUCKET !== 'undefined' ? env.VITE_FIREBASE_STORAGE_BUCKET : "log-sheet-af97a.firebasestorage.app"),
  messagingSenderId: (env.VITE_FIREBASE_MESSAGING_SENDER_ID && env.VITE_FIREBASE_MESSAGING_SENDER_ID !== 'false' && env.VITE_FIREBASE_MESSAGING_SENDER_ID !== 'undefined' ? env.VITE_FIREBASE_MESSAGING_SENDER_ID : "885364646635"),
  appId: (env.VITE_FIREBASE_APP_ID && env.VITE_FIREBASE_APP_ID !== 'false' && env.VITE_FIREBASE_APP_ID !== 'undefined' ? env.VITE_FIREBASE_APP_ID : "1:885364646635:web:453e38933c08cbdf114ae")
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Enforce strictly in-memory persistence to automatically logout on page refresh
setPersistence(auth, inMemoryPersistence).catch((err) => {
  console.warn('[Firebase Auth] Persistence configuration notice:', err?.message || err);
});

// Initialize Firestore with multi-tab offline persistence, with safe fallback
let firestoreDb;
try {
  firestoreDb = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
  });
} catch {
  firestoreDb = getFirestore(app);
}

export const db = firestoreDb;
export const storage = getStorage(app);
export const functions = getFunctions(app);

export default app;
