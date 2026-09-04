import { getAdminDb, initializeFirebaseAdmin } from './src/server/firebaseAdmin.js';
initializeFirebaseAdmin();
async function run() {
  const db = getAdminDb();
  
  await db.collection('companies').doc('SUPREME-001').set({
    companyId: 'SUPREME-001',
    companyCode: 'SUPREME-001',
    companyLegalName: 'SUPREME FACILITY MANAGEMENT',
    brandName: 'SUPREME FACILITY MANAGEMENT',
    licenseTier: 'ENTERPRISE',
    status: 'ACTIVE',
    adminEmail: 'ghadgea162@gmail.com',
    adminName: 'Pratiksha Ghadge',
    emailDeliveryStatus: 'SENT',
    enabledModules: ['DASHBOARD', 'COMPANIES', 'ORGANIZATION_MASTER', 'PEOPLE_WORKFORCE', 'OPERATIONS', 'ASSETS_INVENTORY', 'FINANCE', 'PROCUREMENT', 'CRM', 'COMPLIANCE_RISK', 'APPROVALS_WORKFLOWS', 'REPORTS_ANALYTICS', 'NOTIFICATIONS', 'SECURITY_AUDIT', 'SETTINGS'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
  
  await db.collection('company_codes').doc('SUPREME-001').set({
    companyId: 'SUPREME-001',
    claimedAt: new Date().toISOString()
  });
  
  console.log('Recreated SUPREME-001 company');
}
run();
