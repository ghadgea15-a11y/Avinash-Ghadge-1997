import { runPrivilegeGovernanceVerification } from './verifyPrivilegeGovernance';
import { runSessionSecurityVerification } from './verifySessionSecurity';
import { runDataProtectionTests } from './verifyDataProtection';

export async function runAllEnterpriseSecurityTests() {
  console.log('===============================================================');
  console.log('   ENTERPRISE SECURITY & PRIVILEGE GOVERNANCE TEST RUNNER     ');
  console.log('===============================================================');

  // 1. Run Privilege Governance Suite (Module 10 Point 2)
  console.log('\n--- Running Suite: Privilege Governance & RBAC (Point 2) ---');
  const privRes = await runPrivilegeGovernanceVerification();
  privRes.results.forEach(r => {
    console.log(`[${r.passed ? 'PASS' : 'FAIL'}] ${r.name} ${!r.passed ? `-> Reason: ${r.message}` : ''}`);
  });

  // 2. Run Session Security & Account Protection Suite (Module 10 Point 3)
  console.log('\n--- Running Suite: Session Security & Account Protection (Point 3) ---');
  const sessionRes = await runSessionSecurityVerification();
  sessionRes.results.forEach(r => {
    console.log(`[${r.passed ? 'PASS' : 'FAIL'}] ${r.name} ${r.error ? `-> Error: ${r.error}` : ''}`);
  });

  // 3. Run Data Protection, Privacy & DDM Suite (Module 10 Point 4)
  console.log('\n--- Running Suite: Data Protection, Privacy & DDM (Point 4) ---');
  const dataProtRes = await runDataProtectionTests();

  const totalTests = privRes.results.length + sessionRes.results.length + (dataProtRes.passed + dataProtRes.failed);
  const totalPassed = privRes.passedCount + sessionRes.results.filter(r => r.passed).length + dataProtRes.passed;
  const allPassed = privRes.failedCount === 0 && sessionRes.passed && dataProtRes.failed === 0;

  console.log('\n===============================================================');
  console.log(` MASTER SUMMARY: ${totalPassed}/${totalTests} Security & Privacy Tests Passed (${allPassed ? 'ALL PASSED' : 'SOME FAILED'})`);
  console.log('===============================================================');

  if (typeof process !== 'undefined' && process.exit) {
    process.exit(allPassed ? 0 : 1);
  }

  return { allPassed, totalTests, totalPassed };
}

// Auto-run if executed directly
if (typeof window === 'undefined') {
  runAllEnterpriseSecurityTests().catch((err) => {
    console.error(err);
    if (typeof process !== 'undefined' && process.exit) {
      process.exit(1);
    }
  });
}
