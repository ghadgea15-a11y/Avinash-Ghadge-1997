const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');

admin.initializeApp({ projectId: 'log-sheet-af97a' });
const db = getFirestore();
const companyId = "supremeFacility.com";

const REGIONS = [
  { id: 'REG_WEST', name: 'WEST' },
  { id: 'REG_SOUTH', name: 'SOUTH' },
  { id: 'REG_EAST', name: 'EAST' },
  { id: 'REG_NORTH', name: 'NORTH' }
];

const SITES = [
  { id: 'SITE_PUNE', name: 'PUNE', regionId: 'REG_WEST' },
  { id: 'SITE_MUMBAI', name: 'MUMBAI', regionId: 'REG_WEST' },
  { id: 'SITE_PCMC', name: 'PCMC', regionId: 'REG_WEST' },
  { id: 'SITE_CHENNAI', name: 'CHENNAI', regionId: 'REG_SOUTH' },
  { id: 'SITE_BANGALORE', name: 'BANGALORE', regionId: 'REG_SOUTH' },
  { id: 'SITE_LATUR', name: 'LATUR', regionId: 'REG_EAST' },
  { id: 'SITE_TRUCKS', name: 'TRUCKS PLANT', regionId: 'REG_NORTH' },
  { id: 'SITE_CAR', name: 'CAR PLANT', regionId: 'REG_NORTH' }
];

async function run() {
  console.log("1. Setting up Regions & Sites...");
  let batch = db.batch();
  
  for (const r of REGIONS) {
    batch.set(db.collection(`regions_${companyId}`).doc(r.id), {
      regionId: r.id, name: r.name, companyId, status: 'ACTIVE', createdAt: Date.now()
    });
  }
  for (const s of SITES) {
    batch.set(db.collection(`sites_${companyId}`).doc(s.id), {
      siteId: s.id, name: s.name, regionId: s.regionId, companyId, status: 'ACTIVE', createdAt: Date.now()
    });
  }
  await batch.commit();
  console.log("Regions & Sites created.");

  console.log("2. Updating Users and assigning them to new Sites...");
  const usersSnapshot = await db.collection('users').where('companyId', '==', companyId).get();
  batch = db.batch();
  usersSnapshot.forEach(doc => {
    const role = doc.data().role;
    if (role === 'SITE_MANAGER' || role === 'SITE_IN_CHARGE' || role === 'SITE_SUPERVISOR') {
       batch.update(doc.ref, { assignedSiteId: 'SITE_PUNE', assignedRegionId: 'REG_WEST' });
    }
    if (role === 'OPS_MANAGER' || role === 'OPERATIONS_MANAGER') {
       batch.update(doc.ref, { assignedRegionId: 'REG_WEST' });
    }
  });
  await batch.commit();

  console.log("3. Distributing 1000 Employees across Sites...");
  let count = 0;
  batch = db.batch();
  // We will distribute the employees evenly across the 8 sites (125 each)
  for (let i = 1; i <= 1000; i++) {
    const site = SITES[(i - 1) % 8];
    const empRef = db.collection(`employees_${companyId}`).doc(`EMP_${i}`);
    batch.set(empRef, {
      employeeId: `EMP_${i}`,
      fullName: `Employee ${i}`,
      companyId,
      siteId: site.id,
      regionId: site.regionId,
      status: 'ACTIVE',
      baseSalary: 15000 + (Math.random() * 5000)
    }, { merge: true });
    
    count++;
    if (count === 400) {
      await batch.commit();
      batch = db.batch();
      count = 0;
    }
  }
  if (count > 0) await batch.commit();

  console.log("4. Generating 2 Months of Realistic Attendance Data...");
  // Let's generate data for July and August 2026
  const startDate = new Date('2026-07-01T00:00:00Z').getTime();
  const DAY_MS = 24 * 60 * 60 * 1000;
  
  // To keep it manageable in one script execution without timing out, 
  // we will generate history for a subset of employees (e.g. first 24 employees, 3 per site)
  // Generating 60k records takes a few minutes, let's do 24 * 60 = 1440 records first to ensure E2E UI testing has robust data across all sites.
  
  batch = db.batch();
  count = 0;
  for (let day = 0; day < 60; day++) {
    const currentTimestamp = startDate + (day * DAY_MS);
    const dateStr = new Date(currentTimestamp).toISOString().split('T')[0];
    
    for (let i = 1; i <= 24; i++) {
       const site = SITES[(i - 1) % 8];
       const attRef = db.collection(`attendance_${companyId}`).doc(`${dateStr}_EMP_${i}`);
       
       const isAbsent = Math.random() < 0.05; // 5% absenteeism
       
       batch.set(attRef, {
         id: `${dateStr}_EMP_${i}`,
         employeeId: `EMP_${i}`,
         companyId,
         siteId: site.id,
         regionId: site.regionId,
         date: dateStr,
         timestamp: currentTimestamp,
         status: isAbsent ? 'ABSENT' : 'PRESENT',
         shift: 'DAY',
         checkInTime: isAbsent ? null : currentTimestamp + (Math.random() * 3600000), // Random checkin within 1 hour
         checkOutTime: isAbsent ? null : currentTimestamp + (9 * 3600000) + (Math.random() * 3600000) // 9 hours later
       });
       
       count++;
       if (count === 400) {
         await batch.commit();
         batch = db.batch();
         count = 0;
       }
    }
  }
  if (count > 0) await batch.commit();
  console.log("Historical Data Generated!");
}

run().catch(console.error);
