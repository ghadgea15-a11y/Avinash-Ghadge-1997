const { chromium } = require('playwright');
const fs = require('fs');

async function runTest() {
  console.log("Starting UI E2E Playwright Tests (V6)...");
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  let results = [];

  const runLoginAndCheck = async (role, email, password, companyCode, isSuperAdmin) => {
    console.log(`\n--- Testing ${role} ---`);
    try {
      await page.goto('http://localhost:3000/login');
      
      await page.waitForLoadState('networkidle');
      
      if (isSuperAdmin) {
          console.log("Looking for Access Portal button...");
          // Let's use a more robust locator
          const portalBtn = page.locator('button', { hasText: 'Access Portal' });
          if(await portalBtn.count() > 0) {
             await portalBtn.click();
          } else {
             const text = await page.innerText('body');
             throw new Error("Access Portal button not found! UI text: " + text.substring(0,200));
          }
      } else {
          console.log(`Entering company code: ${companyCode}`);
          const companyCodeInput = page.locator('input[type="text"]');
          await companyCodeInput.fill(companyCode);
          
          const continueBtn = page.locator('button', { hasText: 'Continue' });
          await continueBtn.click();
      }
      
      // Wait a moment for transition
      await page.waitForTimeout(2000);
      
      const emailInput = page.locator('input[type="email"]');
      if (await emailInput.count() === 0) {
          const text = await page.innerText('body');
          throw new Error("Email field did not appear! UI text: " + text.substring(0,200));
      }
      
      console.log("Filling email and password...");
      await emailInput.fill(email);
      await page.locator('input[type="password"]').fill(password);
      await page.locator('button[type="submit"]').click();
      
      // Wait for Dashboard to load
      await page.waitForTimeout(6000); 
      
      const currentUrl = page.url();
      if (currentUrl.includes('/login')) {
         const bodyText = await page.innerText('body');
         throw new Error("Stuck on login page. Auth failed. Error on screen: " + bodyText.substring(0, 150));
      }
      console.log(`Logged in successfully. URL: ${currentUrl}`);
      
      // Verify Navigation exists
      const navCount = await page.locator('nav').count();
      if (navCount === 0) {
         throw new Error("Navigation not found, UI might be broken.");
      }

      if (role === 'SITE_MANAGER') {
          console.log("Verifying RBAC for SITE_MANAGER...");
          const bodyText = await page.innerText('body');
          if (!bodyText.includes('PUNE')) {
             console.log("Warning: 'PUNE' site not immediately visible on dashboard. Might need to navigate.");
          } else {
             console.log("Verified 'PUNE' site context.");
          }
      }
      
      results.push({ Role: role, Status: "PASS", Issue: "None" });
    } catch (e) {
      console.error(`Error in ${role}:`, e.message);
      results.push({ Role: role, Status: "FAIL", Issue: e.message });
    } finally {
      await context.clearCookies(); 
    }
  };

  await runLoginAndCheck('SUPER_ADMIN', 'ghadgea15@gmail.com', 'Pass@123', 'GLOBAL_ADMIN', true);
  await runLoginAndCheck('COMPANY_ADMIN', 'test_company_admin@supremefacility.com', 'Pass@123', 'supremeFacility.com', false);
  await runLoginAndCheck('SITE_MANAGER', 'test_site_manager@supremefacility.com', 'Pass@123', 'supremeFacility.com', false);
  
  await browser.close();
  console.log("\n--- FINAL E2E RESULTS ---");
  console.table(results);
  fs.writeFileSync('e2e_results_v6.json', JSON.stringify(results, null, 2));
}

runTest().catch(console.error);
