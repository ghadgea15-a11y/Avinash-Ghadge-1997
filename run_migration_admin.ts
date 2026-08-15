import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

admin.initializeApp();
const db = getFirestore();

async function run() {
  console.log("Starting Migration Dry Run via Admin SDK...");
  
  const companiesSnap = await db.collection('companies').limit(10).get();
  console.log(`Found ${companiesSnap.size} companies.`);
  
  let totalScanned = 0;
  let safeToMigrate = 0;
  let missingSourceData = 0;
  let conflicts = 0;
  let ambiguous = 0;
  let manualReview = 0;

  for (const companyDoc of companiesSnap.docs) {
    console.log(`\nAnalyzing Company: ${companyDoc.id}`);
    
    // Build employee lookup
    const empSnap = await db.collection(`companies/${companyDoc.id}/employees`).get();
    const empMap = new Map();
    empSnap.docs.forEach(d => {
      empMap.set(d.id, d.data());
    });
    console.log(`  Loaded ${empMap.size} employees for lookup.`);

    // Build site lookup for region fallback
    const siteSnap = await db.collection(`companies/${companyDoc.id}/sites`).get();
    const siteMap = new Map();
    siteSnap.docs.forEach(d => {
      siteMap.set(d.id, d.data());
    });

    // 1. Check Leave Requests
    const leavesSnap = await db.collection(`companies/${companyDoc.id}/leave_requests`).get();
    let leaveMissingSite = 0;
    leavesSnap.docs.forEach(d => {
      totalScanned++;
      const data = d.data();
      const emp = empMap.get(data.employeeId);
      
      if (!data.siteId || !data.assignedRegionId) {
        if (emp && emp.assignedSiteId) {
          safeToMigrate++;
          leaveMissingSite++;
        } else {
          missingSourceData++;
        }
      } else if (data.siteId && emp && data.siteId !== emp.assignedSiteId) {
        conflicts++;
      }
    });
    console.log(`  Leave Requests: ${leavesSnap.size} scanned. Needs scope footprint: ${leaveMissingSite}`);
    
    // 2. Check Approval Requests
    const approvalsSnap = await db.collection(`companies/${companyDoc.id}/approval_requests`).get();
    let approvalMissingSite = 0;
    approvalsSnap.docs.forEach(d => {
      totalScanned++;
      const data = d.data();
      const emp = Array.from(empMap.values()).find(e => e.authUid === data.uid);
      
      if (!data.siteId || !data.assignedRegionId) {
        if (emp && emp.assignedSiteId) {
          safeToMigrate++;
          approvalMissingSite++;
        } else {
          // If no site, might be corporate approval
          ambiguous++;
        }
      }
    });
    console.log(`  Approval Requests: ${approvalsSnap.size} scanned. Needs scope footprint: ${approvalMissingSite}`);

    // 3. Attendance Logs
    const attSnap = await db.collection(`companies/${companyDoc.id}/attendance_logs`).get();
    let attMissingRegion = 0;
    attSnap.docs.forEach(d => {
      totalScanned++;
      const data = d.data();
      const emp = empMap.get(data.employeeId);
      const site = siteMap.get(data.siteId);
      
      if (!data.assignedRegionId) {
        if (emp && emp.assignedRegionId) {
          safeToMigrate++;
          attMissingRegion++;
        } else if (site && site.regionId) {
          safeToMigrate++;
          attMissingRegion++;
        } else {
          missingSourceData++;
        }
      }
    });
    console.log(`  Attendance Logs: ${attSnap.size} scanned. Needs region footprint: ${attMissingRegion}`);
    
    // Other collections
    for (const col of ['incident_reports', 'visitor_logs', 'material_movement_logs', 'patrol_logs']) {
      const snap = await db.collection(`companies/${companyDoc.id}/${col}`).get();
      let missingRegion = 0;
      snap.docs.forEach(d => {
        totalScanned++;
        const data = d.data();
        const site = siteMap.get(data.siteId);

        if (!data.assignedRegionId) {
            if (site && site.regionId) {
              safeToMigrate++;
              missingRegion++;
            } else {
              ambiguous++;
            }
        }
      });
      console.log(`  ${col}: ${snap.size} scanned. Needs region footprint: ${missingRegion}`);
    }
  }

  // Global Approvals Fallback
  const globalAppSnap = await db.collection('approval_requests').get();
  console.log(`\nAnalyzing Global Approvals: ${globalAppSnap.size} scanned.`);
  globalAppSnap.docs.forEach(d => {
      totalScanned++;
      ambiguous++;
  });
  
  console.log("\n=================================");
  console.log("PHASE 2A RESULT");
  console.log("Records scanned:", totalScanned);
  console.log("Safe to migrate:", safeToMigrate);
  console.log("Conflicts:", conflicts);
  console.log("Ambiguous (Corporate/Global):", ambiguous);
  console.log("Manual review required:", missingSourceData);
  console.log("=================================");
}

run().catch(console.error).then(() => process.exit(0));
