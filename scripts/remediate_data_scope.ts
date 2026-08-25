import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
// This script is meant to be run via Firebase Admin SDK locally to backfill missing scope fields
// from employee parent records into operational collections (e.g. attendance).
// Instructions: Add service-account.json and run via ts-node

async function remediateData() {
  const db = getFirestore();
  const companiesSnap = await db.collection('companies').get();
  
  for (const compDoc of companiesSnap.docs) {
    const companyId = compDoc.id;
    console.log(`Remediating company: ${companyId}`);
    
    // Example: Remediate attendance
    const attendanceSnap = await db.collection('companies').doc(companyId).collection('attendance').get();
    for (const att of attendanceSnap.docs) {
       const data = att.data();
       if (!data.siteId || !data.regionId) {
          // fetch employee to get siteId/regionId
          if (data.employeeId) {
             const emp = await db.collection('companies').doc(companyId).collection('employees').doc(data.employeeId).get();
             if (emp.exists) {
                const empData = emp.data();
                await att.ref.update({
                   siteId: data.siteId || empData?.assignedSiteId || '',
                   branchId: data.branchId || empData?.assignedBranchId || '',
                   regionId: data.regionId || empData?.assignedRegionId || '',
                });
             }
          }
       }
    }
  }
}
