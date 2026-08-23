import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';

// Initialize with Application Default Credentials
// Run this with: GOOGLE_APPLICATION_CREDENTIALS="path/to/key.json" npx tsx scripts/audit_production_data.ts
// IMPORTANT: Force the projectId to match the production database so it doesn't default to the AI Studio runner environment
initializeApp({
  projectId: 'log-sheet-af97a'
});
const db = getFirestore();

interface AuditReport {
  timestamp: string;
  orphanedEmployees: string[];
  missingCompanyIds: string[];
  invalidMemberships: string[];
  brokenReferences: string[];
  duplicateCompanies: string[];
}

async function auditDatabase() {
  console.log('Starting Production Database Audit...');
  const report: AuditReport = {
    timestamp: new Date().toISOString(),
    orphanedEmployees: [],
    missingCompanyIds: [],
    invalidMemberships: [],
    brokenReferences: [],
    duplicateCompanies: []
  };

  try {
    // 1. Audit Companies
    const companiesRef = db.collection('companies');
    const companiesSnap = await companiesRef.get();
    const validCompanyIds = new Set<string>();
    const companyCodes = new Map<string, string[]>();

    companiesSnap.forEach(doc => {
      validCompanyIds.add(doc.id);
      const code = doc.data().companyId || doc.id;
      if (!companyCodes.has(code)) companyCodes.set(code, []);
      companyCodes.get(code)!.push(doc.id);
    });

    for (const [code, ids] of companyCodes.entries()) {
      if (ids.length > 1) {
        report.duplicateCompanies.push(`Code ${code} used by documents: ${ids.join(', ')}`);
      }
    }
    console.log(`Audited ${companiesSnap.size} companies. Duplicate codes found: ${report.duplicateCompanies.length}`);

    // 2. Audit Employees
    const employeesSnap = await db.collection('employees').get();
    employeesSnap.forEach(doc => {
      const data = doc.data();
      if (!data.companyId) {
        report.missingCompanyIds.push(`Employee ${doc.id} missing companyId`);
      } else if (!validCompanyIds.has(data.companyId)) {
        report.orphanedEmployees.push(`Employee ${doc.id} belongs to invalid companyId ${data.companyId}`);
      }
    });
    console.log(`Audited ${employeesSnap.size} employees. Orphans found: ${report.orphanedEmployees.length}`);

    // 3. Audit Users & Memberships
    const usersSnap = await db.collection('users').get();
    for (const userDoc of usersSnap.docs) {
      const userData = userDoc.data();
      if (userData.companyId && !validCompanyIds.has(userData.companyId)) {
        report.brokenReferences.push(`User ${userDoc.id} primary companyId ${userData.companyId} is invalid`);
      }

      // Check subcollection memberships
      const membershipsSnap = await userDoc.ref.collection('memberships').get();
      membershipsSnap.forEach(memberDoc => {
        if (!validCompanyIds.has(memberDoc.id)) {
          report.invalidMemberships.push(`User ${userDoc.id} has membership for invalid companyId ${memberDoc.id}`);
        }
      });
    }
    console.log(`Audited ${usersSnap.size} users. Broken refs: ${report.brokenReferences.length}`);

    fs.writeFileSync('audit-report.json', JSON.stringify(report, null, 2));
    console.log('Audit complete. Results saved to audit-report.json');
    console.log('\n--- RECOMMENDATION BEFORE MIGRATION ---');
    console.log('1. Review audit-report.json');
    console.log('2. Perform a GCP native backup: `gcloud firestore export gs://[YOUR_BACKUP_BUCKET]`');
    console.log('3. Formulate cleanup script using Admin SDK for authorized changes.');
  } catch (error) {
    console.error('Audit failed:', error);
  }
}

auditDatabase();
