const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');
const { initializeApp } = require('firebase/app');
const { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } = require('firebase/auth');
const fs = require('fs');
const { execSync } = require('child_process');

// 1. Initialize Admin
admin.initializeApp({ projectId: 'log-sheet-af97a' });
const db = getFirestore();

// 2. Initialize Client Auth
const firebaseConfig = {
  apiKey: "AIzaSyBv9P5Xs67mtFth7SWGSRVi_gpoDohbKZ8",
  authDomain: "log-sheet-af97a.firebaseapp.com",
  projectId: "log-sheet-af97a"
};
const clientApp = initializeApp(firebaseConfig);
const clientAuth = getAuth(clientApp);

const roles = [
  'SUPER_ADMIN', 'COMPANY_ADMIN', 'ADMIN', 'CLIENT_MANAGEMENT', 'clientUser', 
  'HR_ADMIN', 'HR', 'GENERAL_MANAGER', 'DIRECTOR_CEO', 'OWNER_PROMOTER', 
  'OPS_MANAGER', 'OPERATIONS_MANAGER', 'FINANCE_MANAGER', 'MANAGER', 
  'SITE_MANAGER', 'SITE_IN_CHARGE', 'SUPERVISOR', 'SITE_SUPERVISOR', 
  'EMPLOYEE', 'GUARD'
];

async function seed() {
  console.log("Seeding database...");
  const companyId = "supremeFacility.com";
  
  // Create Company
  await db.collection('companies').doc(companyId).set({
    companyId,
    name: "Supreme Facility",
    status: "ACTIVE",
    createdAt: Date.now()
  });

  const credentials = [];
  
  for (const role of roles) {
    const email = role === 'SUPER_ADMIN' ? 'ghadgea162@gmail.com' : `test_${role.toLowerCase()}@supremefacility.com`;
    const password = "Pass@123";
    let uid;
    
    try {
      const cred = await createUserWithEmailAndPassword(clientAuth, email, password);
      uid = cred.user.uid;
    } catch (e) {
      if (e.code === 'auth/email-already-in-use') {
        const cred = await signInWithEmailAndPassword(clientAuth, email, password);
        uid = cred.user.uid;
      } else {
        throw e;
      }
    }
    
    // Create user doc
    await db.collection('users').doc(uid).set({
      userId: uid,
      email,
      role,
      fullName: `Test ${role}`,
      accountStatus: "ACTIVE",
      companyId: role === 'SUPER_ADMIN' ? "GLOBAL_ADMIN" : companyId,
      assignedSiteId: role.includes('SITE') ? "SITE_1" : null,
      departmentId: "DEPT_1",
      employeeId: `EMP_${role}`
    }, { merge: true });

    credentials.push({
      Role: role,
      Name: `Test ${role}`,
      Email: email,
      Password: password,
      Company: role === 'SUPER_ADMIN' ? "GLOBAL_ADMIN" : "Supreme Facility",
      Site: role.includes('SITE') ? "SITE_1" : "N/A",
      Status: "ACTIVE"
    });
  }
  
  // Batch create 1000 employees
  console.log("Seeding 1000 employees...");
  let batch = db.batch();
  let count = 0;
  for (let i = 1; i <= 1000; i++) {
    const empRef = db.collection(`employees_${companyId}`).doc(`EMP_${i}`);
    batch.set(empRef, {
      employeeId: `EMP_${i}`,
      fullName: `Employee ${i}`,
      companyId,
      status: 'ACTIVE'
    });
    count++;
    if (count === 400) {
      await batch.commit();
      batch = db.batch();
      count = 0;
    }
  }
  if (count > 0) await batch.commit();

  fs.writeFileSync('test_credentials.json', JSON.stringify(credentials, null, 2));
  console.log("Seeding complete! Credentials saved to test_credentials.json");
}

seed().catch(console.error);
