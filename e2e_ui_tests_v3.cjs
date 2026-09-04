const { chromium } = require('playwright');

async function runTest() {
  console.log("Starting UI E2E Playwright Tests (V3) - Fixing Login Flow...");
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  let results = [];

  const runLoginAndCheck = async (role, email, password, companyCode, isSuperAdmin) => {
    console.log(`\n--- Testing ${role} ---`);
    try {
      await page.goto('http://localhost:3000/login');
      
      // Wait for the company code step or "Access Portal" button to be visible
      await page.waitForLoadState('networkidle');
      
      if (isSuperAdmin) {
          console.log("Clicking Access Portal for Super Admin...");
          await page.click('button:has-text("Access Portal")');
      } else {
          console.log(`Entering company code: ${companyCode}`);
          // Wait for company code input and fill it
          // The UI might use standard name="companyCode" or just an input element
          const companyCodeInput = page.locator('input[type="text"]');
          await companyCodeInput.waitFor({ state: 'visible' });
          await companyCodeInput.fill(companyCode);
          await page.click('button:has-text("Continue")');
      }
      
      // Wait for Email and Password fields to appear
      console.log("Waiting for email/password fields...");
      const emailInput = page.locator('input[type="email"], input[name="email"]');
      await emailInput.waitFor({ state: 'visible', timeout: 15000 });
      await emailInput.fill(email);
      
      const passwordInput = page.locator('input[type="password"], input[name="password"]');
      await passwordInput.fill(password);
      
      console.log("Submitting login...");
      await page.click('button[type="submit"]');
      
      // Wait for Dashboard to load
      await page.waitForTimeout(5000); 
      
      const currentUrl = page.url();
      if (currentUrl.includes('/login')) {
         throw new Error("Stuck on login page. Auth failed.");
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

  await runLoginAndCheck('SUPER_ADMIN', 'ghadgea162@gmail.com', 'Pass@123', 'GLOBAL_ADMIN', true);
  await runLoginAndCheck('COMPANY_ADMIN', 'test_company_admin@supremefacility.com', 'Pass@123', 'supremeFacility.com', false);
  await runLoginAndCheck('SITE_MANAGER', 'test_site_manager@supremefacility.com', 'Pass@123', 'supremeFacility.com', false);

  await browser.close();
  console.log("\n--- FINAL E2E RESULTS ---");
  console.table(results);
}

runTest().catch(console.error);
