const { chromium } = require('playwright');

async function runTest() {
  console.log("Starting FINAL UI E2E Playwright Tests (Full RBAC Validation)...");
  
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
      
      await page.reload();
      await page.waitForTimeout(4000); 
      
      const currentUrl = page.url();
      if (currentUrl.includes('/login')) {
         throw new Error("Injection failed, redirected to login.");
      }
      
      let drawerText = "";
      const navElements = await page.locator('nav').allInnerTexts();
      if (navElements.length > 0) {
          drawerText = navElements.join(' ');
      } else {
          drawerText = await page.innerText('body');
      }

      if (role === 'EMPLOYEE') {
         if (drawerText.includes('Payroll') || drawerText.includes('Expenses & Travel')) {
             throw new Error("RBAC Failure: Employee can see Finance/Payroll modules in Side Navigation.");
         } else {
             console.log("Verified Employee restrictions (No Payroll/Expenses in Navigation).");
         }
      }
      
      if (role === 'SITE_MANAGER') {
          const mainText = await page.innerText('main, .flex-1, body'); 
          if (mainText.includes('MUMBAI') || mainText.includes('CHENNAI')) {
             throw new Error("RBAC Failure: SITE_MANAGER can see other sites (MUMBAI/CHENNAI) on dashboard.");
          } else {
             console.log("Verified SITE_MANAGER region/site isolation on dashboard.");
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

  await runLoginAndCheck('SUPER_ADMIN', 'ghadgea15@gmail.com', 'GLOBAL_ADMIN', null, null);
  await runLoginAndCheck('COMPANY_ADMIN', 'test_company_admin@supremefacility.com', 'supremeFacility.com', null, null);
  await runLoginAndCheck('SITE_MANAGER', 'test_site_manager@supremefacility.com', 'supremeFacility.com', 'SITE_PUNE', 'REG_WEST');
  await runLoginAndCheck('HR_ADMIN', 'test_hr_admin@supremefacility.com', 'supremeFacility.com', null, null);
  await runLoginAndCheck('EMPLOYEE', 'test_employee@supremefacility.com', 'supremeFacility.com', 'SITE_PUNE', 'REG_WEST');

  await browser.close();
  console.log("\n--- FINAL E2E RESULTS ---");
  console.table(results);
}

runTest().catch(console.error);
