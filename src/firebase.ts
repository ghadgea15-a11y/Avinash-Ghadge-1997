import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, inMemoryPersistence } from 'firebase/auth';
import { getFirestore, enableMultiTabIndexedDbPersistence, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBv9P5Xs67mtFth7SWGSRVi_gpoDohbKZ8",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "log-sheet-af97a.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "log-sheet-af97a",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "log-sheet-af97a.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "885364646635",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:885364646635:web:453e38933c08cbdf114ae"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Enforce strictly in-memory persistence to automatically logout on page refresh
setPersistence(auth, inMemoryPersistence).catch(console.error);

// Initialize Firestore with multi-tab offline persistence
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
});
export const storage = getStorage(app);
export const functions = getFunctions(app);

export default app;
