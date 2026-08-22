import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";
import * as fs from "fs";

const rawConfig = fs.readFileSync("firebase-applet-config.json", "utf8");
const firebaseConfig = JSON.parse(rawConfig);
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

async function run() {
    const ADMIN_EMAIL = `admin@logsheetmuster.com`;
    const ADMIN_PASS = "E2eTestPass123!";
    
    await signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASS);
    console.log("Logged in as Super Admin");

    const TEST_COMP = "TEST-" + Date.now();
    await setDoc(doc(db, "companies", TEST_COMP), { status: "ACTIVE" });
    console.log("Company created.");

    // Write attendance as super admin
    try {
        await setDoc(doc(db, "attendance_" + TEST_COMP, "ATT-1"), { status: "TEST" });
        console.log("Attendance created by Super Admin.");
    } catch(e: any) {
        console.log("Super Admin Attendance failed:", e.message);
    }

    // Now as normal user
    const userEmail = `user_${TEST_COMP.toLowerCase()}@test.com`;
    const cred = await createUserWithEmailAndPassword(auth, userEmail, "Pass123!");
    await setDoc(doc(db, "users", cred.user.uid), {
        email: userEmail,
        companyId: TEST_COMP
    });
    console.log("Normal user created.");

    try {
        await setDoc(doc(db, "attendance_" + TEST_COMP, "ATT-2"), { status: "TEST" });
        console.log("Attendance created by Normal User.");
    } catch(e: any) {
        console.log("Normal User Attendance failed:", e.message);
    }
    
    process.exit(0);
}

run();
