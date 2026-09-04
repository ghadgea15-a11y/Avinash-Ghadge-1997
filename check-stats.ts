import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const app = initializeApp();
const db = getFirestore();

async function run() {
  const companiesSnap = await db.collection('companies').get();
  console.log('Companies count:', companiesSnap.size);
  companiesSnap.forEach(doc => {
    const d = doc.data();
    console.log(`Company [${doc.id}]: status=${d.status}, brand=${d.brandName || d.companyLegalName}, tier=${d.licenseTier}`);
  });

  const usersSnap = await db.collection('users').get();
  console.log('Users count:', usersSnap.size);
  let activeUsers = 0;
  let guards = 0;
  let staff = 0;
  let superAdmins = 0;
  usersSnap.forEach(doc => {
    const d = doc.data();
    if (d.accountStatus === 'ACTIVE' || d.status === 'ACTIVE' || !d.accountStatus) activeUsers++;
    if (d.role === 'GUARD' || d.role === 'WORKER') guards++;
    else if (d.role === 'SUPER_ADMIN') superAdmins++;
    else staff++;
    console.log(`User [${doc.id}]: email=${d.email}, role=${d.role}, status=${d.accountStatus || d.status}, company=${d.companyId}`);
  });
  console.log({ activeUsers, guards, staff, superAdmins });

  const approvalsSnap = await db.collection('approval_requests').get();
  console.log('Approval requests count:', approvalsSnap.size);
  approvalsSnap.forEach(doc => {
    const d = doc.data();
    console.log(`Approval [${doc.id}]: status=${d.accountStatus || d.status}, role=${d.requestedRole}, company=${d.companyId}`);
  });

  const leadsSnap = await db.collection('leads').get();
  console.log('Leads count:', leadsSnap.size);
  leadsSnap.forEach(doc => {
    const d = doc.data();
    console.log(`Lead [${doc.id}]: status=${d.status}, name=${d.fullName || d.name}, company=${d.companyName}`);
  });
}

run().catch(console.error);
