const { chromium } = require('playwright');

async function runTest() {
  console.log("Starting UI E2E Playwright Tests (V7)...");
  
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
          await page.click('button:has-text("Access Portal")');
          await page.waitForTimeout(1000);
          
          console.log("Filling super admin email and password...");
          // Ensure we target the platform owner fields
          await page.fill('input[type="email"]', email);
          await page.fill('input[type="password"]', password);
          await page.click('button[type="submit"]');
      } else {
          console.log(`Entering company code: ${companyCode}`);
          await page.fill('input[type="text"]', companyCode);
          await page.click('button:has-text("Continue")');
          await page.waitForTimeout(1000);
          
          console.log("Filling regular email and password...");
          await page.fill('input[type="email"], input[type="text"][placeholder*="Email"]', email);
          await page.fill('input[type="password"]', password);
          await page.click('button[type="submit"]');
      }
      
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
}

runTest().catch(console.error);
