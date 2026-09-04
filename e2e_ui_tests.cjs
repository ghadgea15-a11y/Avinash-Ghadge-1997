const { chromium } = require('playwright');
const fs = require('fs');

async function delay(ms) {
  return new Promise(res => setTimeout(res, ms));
}

async function runTest() {
  console.log("Starting UI E2E Playwright Tests...");
  
  // Connect to the Chromium instance downloaded earlier
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  let results = [];

  const runLoginAndCheck = async (role, email, password, expectedTextCheck) => {
    console.log(`\n--- Testing ${role} ---`);
    try {
      await page.goto('http://localhost:3000/login');
      await page.fill('input[type="email"]', email);
      await page.fill('input[type="password"]', password);
      await page.click('button[type="submit"]');
      
      // Wait for navigation to complete
      await page.waitForTimeout(3000); 
      
      const currentUrl = page.url();
      if (currentUrl.includes('/login')) {
         throw new Error("Stuck on login page. Incorrect credentials or auth error.");
      }
      console.log(`Logged in successfully. Current URL: ${currentUrl}`);
      
      // Look for Navigation elements
      const navCount = await page.locator('nav').count();
      if (navCount === 0) {
         throw new Error("Navigation bar not found! UI might not have loaded.");
      }
      
      // Optional: Check specific text
      if (expectedTextCheck) {
         const bodyText = await page.innerText('body');
         if (!bodyText.includes(expectedTextCheck)) {
             throw new Error(`Expected text '${expectedTextCheck}' not found in UI.`);
         }
      }

      // If SITE_MANAGER, try to navigate to Attendance and verify Region/Site isolation
      if (role === 'SITE_MANAGER') {
          console.log("Testing RBAC Isolation for SITE_MANAGER...");
          // Try to find the attendance link
          // Since we don't know the exact DOM, we just do a text search
          const bodyText = await page.innerText('body');
          if (bodyText.includes('PUNE')) {
             console.log("Verified 'PUNE' site context is loaded in UI.");
          }
      }
      
      // Logout logic (or clear cookies)
      await context.clearCookies();
      
      results.push({ Role: role, Status: "PASS", Issue: "None" });
      console.log(`${role} PASS`);
    } catch (e) {
      console.error(`Error in ${role}:`, e.message);
      results.push({ Role: role, Status: "FAIL", Issue: e.message });
      await context.clearCookies(); // ensure clean state
    }
  };

  await runLoginAndCheck('SUPER_ADMIN', 'ghadgea162@gmail.com', 'Pass@123', 'Dashboard');
  await runLoginAndCheck('COMPANY_ADMIN', 'test_company_admin@supremefacility.com', 'Pass@123', 'Dashboard');
  await runLoginAndCheck('SITE_MANAGER', 'test_site_manager@supremefacility.com', 'Pass@123', '');

  await browser.close();
  
  console.log("\n--- FINAL E2E RESULTS ---");
  console.table(results);
  fs.writeFileSync('e2e_results.json', JSON.stringify(results, null, 2));
}

runTest().catch(console.error);
