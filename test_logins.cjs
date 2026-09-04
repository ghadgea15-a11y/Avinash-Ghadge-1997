const { chromium } = require('playwright');
const fs = require('fs');

async function run() {
  const creds = JSON.parse(fs.readFileSync('test_credentials.json', 'utf8'));
  const browser = await chromium.launch({ headless: true });
  
  const results = [];
  
  for (const cred of creds) {
    console.log(`Testing login for ${cred.Role}...`);
    const context = await browser.newContext();
    const page = await context.newPage();
    let status = "PASS";
    let issue = "";
    
    try {
      await page.goto('http://localhost:3000/login');
      // Fill the login form
      await page.fill('input[type="email"]', cred.Email);
      await page.fill('input[type="password"]', cred.Password);
      await page.click('button[type="submit"]');
      
      // Wait for navigation
      await page.waitForNavigation({ timeout: 10000 }).catch(() => {});
      
      // Check if we are on a dashboard
      const url = page.url();
      if (url.includes('/login')) {
         // Check for error toast or message
         status = "FAIL";
         issue = "Login failed, stayed on login page.";
      } else {
         // Verify we landed on some authenticated route
         if (!url.includes('/dashboard') && !url.includes('/')) {
             status = "FAIL";
             issue = `Redirected to unknown URL: ${url}`;
         } else {
             // Let's check for navigation menu presence
             const navMenu = await page.locator('nav').count();
             if (navMenu === 0) {
                 status = "FAIL";
                 issue = "Navigation menu not found after login.";
             }
         }
      }
    } catch (e) {
      status = "FAIL";
      issue = e.message;
    }
    
    results.push({
      ...cred,
      Status: status,
      Issue: issue
    });
    
    await context.close();
  }
  
  await browser.close();
  
  console.table(results);
  fs.writeFileSync('test_results.json', JSON.stringify(results, null, 2));
}
run().catch(console.error);
