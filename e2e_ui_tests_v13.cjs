const { chromium } = require('playwright');
const fs = require('fs');

async function runTest() {
  console.log("Starting UI E2E Playwright Tests (V13) - Excluding Public Footer texts...");
  
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
      
      // Grab the actual Dashboard text, EXCLUDING the footer 
      // The application usually wraps main content in a nav/sidebar and main tag.
      // Let's just look inside the <nav> and <main> tags (if they exist), or filter out footer text manually.
      
      // Attempt to find the specific drawer content where Nav items live:
      let drawerText = "";
      const navElements = await page.locator('nav').allInnerTexts();
      if (navElements.length > 0) {
          drawerText = navElements.join(' ');
      } else {
          drawerText = await page.innerText('body');
      }

      if (role === 'EMPLOYEE') {
         // Specifically check if Payroll or Expense module links are present in the side navigation
         if (drawerText.includes('Payroll') || drawerText.includes('Expenses & Travel')) {
             throw new Error("RBAC Failure: Employee can see Finance/Payroll modules in Side Navigation.");
         } else {
             console.log("Verified Employee restrictions (No Payroll/Expenses in Navigation).");
         }
      }
      
      const mainText = await page.innerText('main, .flex-1, body'); // Fallbacks
      
      if (role === 'SITE_MANAGER') {
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

  await runLoginAndCheck('EMPLOYEE', 'test_employee@supremefacility.com', 'supremeFacility.com', 'SITE_PUNE', 'REG_WEST');

  await browser.close();
  console.log("\n--- FINAL E2E RESULTS ---");
  console.table(results);
}

runTest().catch(console.error);
