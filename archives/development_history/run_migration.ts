import { db } from './src/firebase';
import { collection, getDocs, query, limit } from 'firebase/firestore';

async function run() {
  console.log("Starting Migration Dry Run...");
  const companiesSnap = await getDocs(query(collection(db, 'companies'), limit(10)));
  console.log(`Found ${companiesSnap.size} companies.`);
  
  let totalScanned = 0;
  let safeToMigrate = 0;
  let missingSourceData = 0;
  let conflicts = 0;
  
  for (const companyDoc of companiesSnap.docs) {
    console.log(`\nAnalyzing Company: ${companyDoc.id}`);
    
    // Build employee lookup
    const empSnap = await getDocs(collection(db, 'companies', companyDoc.id, 'employees'));
    const empMap = new Map();
    empSnap.docs.forEach(d => {
      empMap.set(d.id, d.data());
    });
    console.log(` Loaded ${empMap.size} employees for lookup.`);

    // 1. Check Leave Requests
    const leavesSnap = await getDocs(collection(db, 'companies', companyDoc.id, 'leave_requests'));
    let leaveMissingSite = 0;
    leavesSnap.docs.forEach(d => {
      totalScanned++;
      const data = d.data();
      const emp = empMap.get(data.employeeId);
      
      if (!data.siteId) {
        if (emp && emp.assignedSiteId) {
          safeToMigrate++;
          leaveMissingSite++;
        } else {
          missingSourceData++;
        }
      }
      
      if (data.siteId && emp && data.siteId !== emp.assignedSiteId) {
        conflicts++;
      }
    });
    console.log(` Leave Requests: ${leavesSnap.size} scanned. Missing site: ${leaveMissingSite}`);
    
    // 2. Check Approval Requests
    const approvalsSnap = await getDocs(collection(db, 'companies', companyDoc.id, 'approval_requests'));
    let approvalMissingSite = 0;
    approvalsSnap.docs.forEach(d => {
      totalScanned++;
      const data = d.data();
      // ApprovalRequestRecord uses uid
      const emp = Array.from(empMap.values()).find(e => e.authUid === data.uid);
      
      if (!data.siteId) {
        if (emp && emp.assignedSiteId) {
          safeToMigrate++;
          approvalMissingSite++;
        } else {
          missingSourceData++;
        }
      }
    });
    console.log(` Approval Requests: ${approvalsSnap.size} scanned. Missing site: ${approvalMissingSite}`);

    // 3. Attendance Logs (Check assignedRegionId)
    const attSnap = await getDocs(collection(db, 'companies', companyDoc.id, 'attendance_logs'));
    let attMissingRegion = 0;
    attSnap.docs.forEach(d => {
      totalScanned++;
      const data = d.data();
      const emp = empMap.get(data.employeeId);
      
      if (!data.assignedRegionId) {
        if (emp && emp.assignedRegionId) {
          safeToMigrate++;
          attMissingRegion++;
        } else {
          missingSourceData++;
        }
      }
    });
    console.log(` Attendance Logs: ${attSnap.size} scanned. Missing region: ${attMissingRegion}`);
  }
  
  console.log("\nDRY RUN RESULTS");
  console.log("Total Scanned:", totalScanned);
  console.log("Safe To Migrate:", safeToMigrate);
  console.log("Missing Source Data:", missingSourceData);
  console.log("Conflicts:", conflicts);
}

run().catch(console.error).then(() => process.exit(0));
