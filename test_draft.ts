import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { config } from 'dotenv';
config();

const app = initializeApp({
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
});
const db = getFirestore(app);

async function test() {
  const draftRef = doc(db, 'landing_page_config', 'draft');
  const draftSnap = await getDoc(draftRef);
  console.log('Draft exists?', draftSnap.exists());
  if (draftSnap.exists()) {
    console.log(JSON.stringify(draftSnap.data(), null, 2));
  }
  process.exit(0);
}
test();
