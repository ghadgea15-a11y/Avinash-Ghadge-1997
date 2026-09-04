import { initializeFirebaseAdmin } from '../src/server/firebaseAdmin';
import { SeedTestDataService } from '../src/server/seedTestDataService';
import fs from 'fs';
import path from 'path';

async function main() {
  console.log('====================================================');
  console.log('  LSM PLATFORM — TEST DATA SEED & CREDENTIAL GENERATOR');
  console.log('  Target: 3 Tenant Companies + 150 Employees Each (450 Total)');
  console.log('====================================================\n');

  try {
    initializeFirebaseAdmin();
  } catch (err) {
    console.warn('Firebase Admin Init warning:', err);
  }

  console.log('Starting seed execution across all 3 tenant companies...');
  const result = await SeedTestDataService.executeFullSeed();

  console.log('\n====================================================');
  console.log('  SEED EXECUTION COMPLETED SUCCESSFULLY');
  console.log('====================================================');
  console.log(`- Companies Created: ${result.companiesCreated}`);
  console.log(`- Total Employees Seeded: ${result.employeesCreated}`);
  console.log(`- Firebase Auth Records Linked: ${result.allCredentials.length}`);
  console.log(`- Custom Claims Set: ${result.claimsVerified}\n`);

  console.log('Summary Breakdown by Company:');
  console.log(JSON.stringify(result.summary, null, 2));

  // Write out test-credentials.csv
  const csvContent = SeedTestDataService.generateCredentialsCsv(result.allCredentials);
  const csvPath = path.resolve(process.cwd(), 'test-credentials.csv');
  fs.writeFileSync(csvPath, csvContent, 'utf8');
  console.log(`\n CSV Credentials file saved to: ${csvPath}`);

  // Write out test-credentials.json
  const jsonPath = path.resolve(process.cwd(), 'test-credentials.json');
  fs.writeFileSync(jsonPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    totalCompanies: result.companiesCreated,
    totalEmployees: result.employeesCreated,
    summary: result.summary,
    credentials: result.allCredentials
  }, null, 2), 'utf8');
  console.log(` JSON Credentials file saved to: ${jsonPath}`);
}

main().catch(err => {
  console.error('Seed execution fatal error:', err);
  process.exit(1);
});
