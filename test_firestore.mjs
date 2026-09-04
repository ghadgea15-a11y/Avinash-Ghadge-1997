import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBv9P5Xs67mtFth7SWGSRVi_gpoDohbKZ8",
  authDomain: "log-sheet-af97a.firebaseapp.com",
  projectId: "log-sheet-af97a",
  storageBucket: "log-sheet-af97a.firebasestorage.app",
  messagingSenderId: "885364646635",
  appId: "1:885364646635:web:453e38933c08cbdf114ae"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function test() {
  try {
    const cred = await signInWithEmailAndPassword(auth, "test_agent_123@example.com", "Pass@123");
    const uid = cred.user.uid;
    console.log("Logged in user:", uid);
    
    await setDoc(doc(db, "users", uid), {
      userId: uid,
      email: "test_agent_123@example.com",
      role: "SUPER_ADMIN",
      fullName: "Test Super Admin",
      accountStatus: "ACTIVE",
      companyId: "GLOBAL_ADMIN"
    }, { merge: true });
    
    console.log("Firestore write successful!");
    
    const d = await getDoc(doc(db, "users", uid));
    console.log("Read:", d.data());
  } catch (e) {
    console.error("Failed:", e.message);
  }
  process.exit(0);
}
test();
