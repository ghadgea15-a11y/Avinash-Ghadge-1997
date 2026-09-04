import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBv9P5Xs67mtFth7SWGSRVi_gpoDohbKZ8",
  authDomain: "log-sheet-af97a.firebaseapp.com",
  projectId: "log-sheet-af97a"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function test() {
  let uid;
  try {
    const cred = await signInWithEmailAndPassword(auth, "ghadgea162@gmail.com", "Pass@123");
    uid = cred.user.uid;
    console.log("Logged in existing:", uid);
  } catch (e) {
    if (e.code === 'auth/user-not-found' || e.code === 'auth/invalid-credential') {
       try {
         const cred2 = await createUserWithEmailAndPassword(auth, "ghadgea162@gmail.com", "Pass@123");
         uid = cred2.user.uid;
         console.log("Created new:", uid);
       } catch (e2) {
         console.error("Create failed:", e2.message);
         process.exit(1);
       }
    } else {
       console.error("Login failed:", e.message);
       process.exit(1);
    }
  }

  try {
      await setDoc(doc(db, "users", uid), {
          userId: uid,
          email: "ghadgea162@gmail.com",
          role: "SUPER_ADMIN",
          fullName: "Super Admin",
          accountStatus: "ACTIVE",
          companyId: "GLOBAL_ADMIN"
      }, { merge: true });
      console.log("Set SUPER_ADMIN doc!");
  } catch (e) {
      console.error("Doc failed:", e.message);
  }
  process.exit(0);
}
test();
