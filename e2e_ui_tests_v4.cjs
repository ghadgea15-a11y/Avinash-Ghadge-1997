const { chromium } = require('playwright');
const fs = require('fs');

async function runTest() {
  console.log("Starting UI E2E Playwright Tests (V4) - Taking Screenshots...");
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  let results = [];

  const runLoginAndCheck = async (role, email, password, companyCode, isSuperAdmin) => {
    console.log(`\n--- Testing ${role} ---`);
    try {
      await page.goto('http://localhost:3000/login');
      await page.waitForLoadState('networkidle');
      
      console.log("Taking initial screenshot");
      await page.screenshot({ path: `screenshot_initial_${role}.png` });

      if (isSuperAdmin) {
          console.log("Clicking Access Portal for Super Admin...");
          await page.click('button:has-text("Access Portal")');
      } else {
          console.log(`Entering company code: ${companyCode}`);
          const companyCodeInput = page.locator('input[type="text"]');
          await companyCodeInput.fill(companyCode);
          await page.click('button:has-text("Continue")');
      }
      
      await page.waitForTimeout(2000);
      console.log("Taking screenshot after company code");
      await page.screenshot({ path: `screenshot_after_cc_${role}.png` });
      
      const emailInput = page.locator('input[type="email"]');
      if (await emailInput.count() > 0) {
          console.log("Found email input, proceeding with auth.");
          await emailInput.fill(email);
          const passwordInput = page.locator('input[type="password"]');
          await passwordInput.fill(password);
          await page.click('button[type="submit"]');
          
          await page.waitForTimeout(4000);
          console.log("Taking screenshot after submit");
          await page.screenshot({ path: `screenshot_after_submit_${role}.png` });
          
          const currentUrl = page.url();
          if (currentUrl.includes('/login')) {
             throw new Error("Stuck on login page. Auth failed.");
          }
          console.log(`Logged in successfully. URL: ${currentUrl}`);
          results.push({ Role: role, Status: "PASS", Issue: "None" });
      } else {
          console.log("Email input NOT FOUND. Saving body text.");
          const text = await page.innerText('body');
          throw new Error("Email input not found. UI text: " + text.substring(0, 100));
      }

    } catch (e) {
      console.error(`Error in ${role}:`, e.message);
      results.push({ Role: role, Status: "FAIL", Issue: e.message });
    } finally {
      await context.clearCookies(); 
    }
  };

  await runLoginAndCheck('SUPER_ADMIN', 'ghadgea162@gmail.com', 'Pass@123', 'GLOBAL_ADMIN', true);
  await runLoginAndCheck('COMPANY_ADMIN', 'test_company_admin@supremefacility.com', 'Pass@123', 'supremeFacility.com', false);

  await browser.close();
  console.log("\n--- FINAL E2E RESULTS ---");
  console.table(results);
}

runTest().catch(console.error);
