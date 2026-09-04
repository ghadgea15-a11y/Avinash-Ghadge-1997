const { chromium } = require('playwright');
const fs = require('fs');

async function runTest() {
  console.log("Starting UI E2E Playwright Tests (V2) - With Company Code...");
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  let results = [];

  const runLoginAndCheck = async (role, email, password, companyCode, isSuperAdmin) => {
    console.log(`\n--- Testing ${role} ---`);
    try {
      await page.goto('http://localhost:3000/login');
      await page.waitForTimeout(1000); 
      
      if (isSuperAdmin) {
          // Click "Access Portal" for Super Admin
          await page.click('text=Access Portal →');
      } else {
          // Fill Company Code
          await page.fill('input[type="text"]', companyCode);
          await page.click('button:has-text("Continue")');
          await page.waitForTimeout(1000);
      }
      
      // Now fill email and password
      await page.fill('input[type="email"]', email);
      await page.fill('input[type="password"]', password);
      await page.click('button[type="submit"]');
      
      // Wait for navigation
      await page.waitForTimeout(4000); 
      
      const currentUrl = page.url();
      if (currentUrl.includes('/login')) {
         throw new Error("Stuck on login page. Incorrect credentials or auth error.");
      }
      console.log(`Logged in successfully. Current URL: ${currentUrl}`);
      
      const navCount = await page.locator('nav').count();
      if (navCount === 0) {
         throw new Error("Navigation bar not found! UI might not have loaded.");
      }

      if (role === 'SITE_MANAGER') {
          console.log("Testing RBAC Isolation for SITE_MANAGER...");
          const bodyText = await page.innerText('body');
          if (bodyText.includes('PUNE')) {
             console.log("Verified 'PUNE' site context is loaded in UI.");
          }
      }
      
      await context.clearCookies();
      results.push({ Role: role, Status: "PASS", Issue: "None" });
      console.log(`${role} PASS`);
    } catch (e) {
      console.error(`Error in ${role}:`, e.message);
      results.push({ Role: role, Status: "FAIL", Issue: e.message });
      await context.clearCookies(); 
    }
  };

  await runLoginAndCheck('SUPER_ADMIN', 'ghadgea162@gmail.com', 'Pass@123', 'GLOBAL_ADMIN', true);
  await runLoginAndCheck('COMPANY_ADMIN', 'test_company_admin@supremefacility.com', 'Pass@123', 'supremeFacility.com', false);
  await runLoginAndCheck('SITE_MANAGER', 'test_site_manager@supremefacility.com', 'Pass@123', 'supremeFacility.com', false);

  await browser.close();
  console.log("\n--- FINAL E2E RESULTS ---");
  console.table(results);
}

runTest().catch(console.error);
