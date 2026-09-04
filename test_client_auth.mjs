import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";

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

async function test() {
  try {
    const cred = await createUserWithEmailAndPassword(auth, "test_agent_123@example.com", "Pass@123");
    console.log("Created user:", cred.user.uid);
  } catch (e) {
    console.error("Create failed:", e.message);
    if (e.message.includes('email-already-in-use')) {
        try {
            const cred2 = await signInWithEmailAndPassword(auth, "test_agent_123@example.com", "Pass@123");
            console.log("Logged in user:", cred2.user.uid);
        } catch (e2) {
            console.error("Login failed:", e2.message);
        }
    }
  }
  process.exit(0);
}
test();
