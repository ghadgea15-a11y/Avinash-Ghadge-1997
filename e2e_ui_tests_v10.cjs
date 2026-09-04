const { chromium } = require('playwright');
const fs = require('fs');

async function runTest() {
  console.log("Starting UI E2E Playwright Tests (V10) - Checking the EXACT labels in DOM...");
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  let results = [];

  const runLoginAndCheck = async (role, email, companyCode, siteId, regionId) => {
    console.log(`\n--- Testing ${role} via Direct Session Injection ---`);
    try {
      await page.goto('http://localhost:3000');
      
      await page.evaluate(({role, email, companyCode, siteId, regionId}) => {
          const session = {
              uid: 'mock_uid_' + role,
              email: email,
              role: role,
              companyId: companyCode,
              fullName: 'Test ' + role,
              accountStatus: 'ACTIVE',
              branchId: 'MAIN',
              assignedSiteId: siteId,
              assignedRegionId: regionId,
              isAuthenticated: true,
              token: 'mock_token',
              timestamp: Date.now()
          };
          localStorage.setItem('lsm_auth_session', JSON.stringify(session));
      }, {role, email, companyCode, siteId, regionId});
      
      // Reload to apply the session
      await page.reload();
      await page.waitForTimeout(4000); 
      
      // Read Body Text for RBAC validation
      const bodyText = await page.innerText('body');
      
      if (role === 'EMPLOYEE') {
         // According to navigationArchitecture.ts, the labels are "Payroll" and "Finance"
         if (bodyText.includes('Payroll') || bodyText.includes('Expenses & Travel')) {
             throw new Error("RBAC Failure: Employee can see Finance/Payroll modules in DOM.");
         } else {
             console.log("Verified Employee restrictions (No Payroll/Expenses found).");
         }
      }
      
      if (role === 'SITE_MANAGER') {
          // Check if they only see PUNE and not MUMBAI
          if (bodyText.includes('MUMBAI') || bodyText.includes('CHENNAI')) {
             throw new Error("RBAC Failure: SITE_MANAGER can see other sites (MUMBAI/CHENNAI).");
          } else {
             console.log("Verified SITE_MANAGER region/site isolation.");
          }
      }
      
      results.push({ Role: role, Status: "PASS", Issue: "None" });
    } catch (e) {
      console.error(`Error in ${role}:`, e.message);
      results.push({ Role: role, Status: "FAIL", Issue: e.message });
    } finally {
      await page.evaluate(() => localStorage.clear());
      await context.clearCookies(); 
    }
  };

  await runLoginAndCheck('SITE_MANAGER', 'test_site_manager@supremefacility.com', 'supremeFacility.com', 'SITE_PUNE', 'REG_WEST');
  await runLoginAndCheck('EMPLOYEE', 'test_employee@supremefacility.com', 'supremeFacility.com', 'SITE_PUNE', 'REG_WEST');

  await browser.close();
  console.log("\n--- FINAL E2E RESULTS ---");
  console.table(results);
}

runTest().catch(console.error);
